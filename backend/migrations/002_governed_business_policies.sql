BEGIN;

CREATE TABLE IF NOT EXISTS governed_business_policies (
  id BIGSERIAL PRIMARY KEY,
  tenant_id VARCHAR(128) NOT NULL,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
  version VARCHAR(128) NOT NULL,
  voice VARCHAR(20) NOT NULL CHECK (voice IN ('warm', 'professional', 'direct')),
  closing VARCHAR(120) NOT NULL,
  allowed_topics JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(allowed_topics) = 'array'),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  approved_by VARCHAR(128) NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  idempotency_key VARCHAR(128) NOT NULL,
  UNIQUE (tenant_id, business_id, version),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS governed_business_policies_owner_idx
  ON governed_business_policies(tenant_id, business_id, approved_at DESC);

DROP TRIGGER IF EXISTS governed_business_policies_immutable ON governed_business_policies;
CREATE TRIGGER governed_business_policies_immutable
BEFORE UPDATE OR DELETE ON governed_business_policies
FOR EACH ROW EXECUTE FUNCTION reject_governance_history_mutation();

COMMIT;
