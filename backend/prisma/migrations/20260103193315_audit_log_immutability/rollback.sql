-- Rollback migration for REQ-001: Audit Log Immutability
-- This script removes the triggers and function that enforce audit log immutability

-- Drop triggers
DROP TRIGGER IF EXISTS audit_log_prevent_update ON "AuditLog";
DROP TRIGGER IF EXISTS audit_log_prevent_delete ON "AuditLog";

-- Drop function
DROP FUNCTION IF EXISTS prevent_audit_log_modification();

