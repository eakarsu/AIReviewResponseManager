const { createFeaturePackRouter }=require('../featurePack'); const auth=require('../middleware/auth'); module.exports=createFeaturePackRouter({auth});
