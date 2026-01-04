-- REQ-001: Audit Log Immutability
-- This migration adds PostgreSQL triggers to prevent modification or deletion of audit logs
-- for legal compliance and forensic integrity.

-- Create function to prevent audit log modifications
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. Operation % is not allowed on AuditLog table.', TG_OP
    USING HINT = 'Audit logs cannot be modified or deleted for compliance reasons',
          ERRCODE = 'P0001'; -- raise_exception error code
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent UPDATE operations
CREATE TRIGGER audit_log_prevent_update
  BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Create trigger to prevent DELETE operations
CREATE TRIGGER audit_log_prevent_delete
  BEFORE DELETE ON "AuditLog"
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_log_modification();

-- Add comments for documentation
COMMENT ON FUNCTION prevent_audit_log_modification() IS 
  'Prevents any UPDATE or DELETE operations on audit logs to ensure immutability for legal compliance';

COMMENT ON TRIGGER audit_log_prevent_update ON "AuditLog" IS 
  'Prevents any UPDATE operations on audit logs to ensure immutability for legal compliance';

COMMENT ON TRIGGER audit_log_prevent_delete ON "AuditLog" IS 
  'Prevents any DELETE operations on audit logs to ensure immutability for legal compliance';

