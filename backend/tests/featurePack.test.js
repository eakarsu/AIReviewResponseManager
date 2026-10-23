'use strict';
// Wave 44A tests: offline only. Keys unset BEFORE importing the app module.
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
process.env.OPENROUTER_API_KEY=''; process.env.OPENAI_API_KEY='';
const test=require('node:test'); const assert=require('node:assert/strict');
const fp=require('../src/featurePack');
const SAMPLE=[{id:1,rating:2,sentiment:'negative',response_status:'pending',reviewer_name:'Sam'},{id:2,rating:5,sentiment:'positive',response_status:'responded',reviewer_name:'Jo'}];
const DETAIL_SAMPLE={reviewer_name:'Sam',rating:0,platform:'google',response_status:'',sentiment:'negative',review_text:'',is_flagged:false,response_count:0};

test('deterministic AI fallback is labelled aiGenerated:false and makes no provider call',()=>{
  assert.equal(fp.providerDisabled(), true);
  assert.ok(!process.env.OPENROUTER_API_KEY); assert.ok(!process.env.OPENAI_API_KEY);
  for(const fn of Object.values(fp.AI_FEATURES)){ const out=fn(SAMPLE); assert.equal(out.aiGenerated,false); assert.match(out.label,/Deterministic fallback/); }
});

test('authenticated-scoped tasks list/create/update preserve false/0/empty',()=>{
  const store=fp.createTaskStore();
  const a=store.create('user-1',{title:'First',completed:false,estimateHours:0,notes:''});
  assert.equal(a.completed,false); assert.equal(a.estimateHours,0); assert.equal(a.notes,'');
  store.create('user-2',{title:'Other user task'});
  assert.equal(store.list('user-1').length,1);
  assert.equal(store.list('user-1',{q:'firs'}).length,1);
  assert.equal(store.list('user-1',{q:'nope'}).length,0);
  const upd=store.update('user-1',a.id,{status:'done',completed:false,estimateHours:0});
  assert.equal(upd.status,'done'); assert.equal(upd.completed,false); assert.equal(upd.estimateHours,0);
  assert.equal(store.update('user-2',a.id,{status:'x'}),null);
});

test('search/filter and CSV/JSON export shapes',()=>{
  const rows=[{id:1,title:'Alpha task',status:'todo'},{id:2,title:'Beta task',status:'done'}];
  assert.deepEqual(fp.filterRecords(rows,{q:'alpha'}).map(r=>r.id),[1]);
  assert.deepEqual(fp.filterRecords(rows,{status:'done'}).map(r=>r.id),[2]);
  const csv=fp.toCSV(rows); assert.match(csv,/^id,title,status/); assert.match(csv,/Alpha task/);
  assert.equal(JSON.parse(JSON.stringify({records:rows})).records.length,2);
});

test('labelled detail sections preserve false/0/empty',()=>{
  const rec={}; Object.assign(rec, DETAIL_SAMPLE);
  const sections=fp.buildDetailSections(rec, fp.DETAIL_SPEC);
  assert.ok(sections.length>=3); assert.ok(sections.every(s=>typeof s.label==='string'&&s.label.length>0));
  const byKey=Object.fromEntries(sections.map(s=>[s.key,s]));
  for(const [k,v] of Object.entries(DETAIL_SAMPLE)){ if(k in byKey){ assert.deepEqual(byKey[k].value, v); } }
  const zeroFalseEmpty=fp.buildDetailSections({a:false,b:0,c:''},[{key:'a',label:'A'},{key:'b',label:'B'},{key:'c',label:'C'}]);
  assert.deepEqual(zeroFalseEmpty.map(s=>s.display),['false','0','(empty)']);
});

test('feature-pack router requires auth and serves tasks/export/AI offline', async ()=>{
  const express=require('express');
  const auth=(req,res,next)=> req.headers.authorization?next():res.status(401).json({error:'unauthorized'});
  const app=express(); app.use(express.json()); app.use('/api/feature-pack', fp.createFeaturePackRouter({auth}));
  const srv=await new Promise(r=>{ const s=app.listen(0,()=>r(s)); });
  const base=`http://127.0.0.1:${srv.address().port}/api/feature-pack`;
  try{
    assert.equal((await fetch(base+'/tasks')).status,401);
    const h={authorization:'Bearer test','content-type':'application/json'};
    const created=await (await fetch(base+'/tasks',{method:'POST',headers:h,body:JSON.stringify({title:'Router task',completed:false,estimateHours:0})})).json();
    assert.equal(created.title,'Router task'); assert.equal(created.completed,false);
    const listed=await (await fetch(base+'/tasks?q=Router',{headers:h})).json(); assert.equal(listed.tasks.length,1);
    const updated=await (await fetch(base+'/tasks/'+created.id,{method:'PUT',headers:h,body:JSON.stringify({status:'done'})})).json(); assert.equal(updated.status,'done');
    const csvRes=await fetch(base+'/export?format=csv',{headers:h}); assert.match(csvRes.headers.get('content-type'),/text\/csv/); assert.match(await csvRes.text(),/Router task/);
    const jsonRes=await fetch(base+'/export?format=json',{headers:h}); const j=await jsonRes.json(); assert.equal(j.count,1);
    const feat=Object.keys(fp.AI_FEATURES)[0];
    const ai=await (await fetch(base+'/ai/'+feat,{method:'POST',headers:h,body:JSON.stringify({records:SAMPLE})})).json(); assert.equal(ai.aiGenerated,false);
    const sec=await (await fetch(base+'/detail-sections',{method:'POST',headers:h,body:JSON.stringify({record:DETAIL_SAMPLE})})).json(); assert.ok(sec.sections.length>=3);
  } finally { srv.close(); }
});
