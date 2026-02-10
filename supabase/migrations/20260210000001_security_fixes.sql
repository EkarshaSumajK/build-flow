-- ============================================================
-- CRITICAL SECURITY FIXES: Storage, RLS policies, and indexes
-- ============================================================

-- 1. Fix task_comments INSERT policy (cross-tenant vulnerability)
DROP POLICY IF EXISTS "Users can insert comments on their org tasks" ON task_comments;
CREATE POLICY "Users can insert comments on their org tasks" ON task_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    task_id IN (
      SELECT id FROM tasks WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- 2. Fix issue_comments INSERT policy (cross-tenant vulnerability)
DROP POLICY IF EXISTS "Users can insert comments on their org issues" ON issue_comments;
CREATE POLICY "Users can insert comments on their org issues" ON issue_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    issue_id IN (
      SELECT id FROM issues WHERE organization_id = get_user_organization_id(auth.uid())
    )
  );

-- 3. Add organization_id indexes to ALL tables (performance critical for RLS)
CREATE INDEX IF NOT EXISTS idx_projects_org ON projects (organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks (organization_id);
CREATE INDEX IF NOT EXISTS idx_materials_org ON materials (organization_id);
CREATE INDEX IF NOT EXISTS idx_material_requests_org ON material_requests (organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_org ON stock_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_org ON workers (organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance (organization_id);
CREATE INDEX IF NOT EXISTS idx_issues_org ON issues (organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org ON purchase_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_org ON goods_receipts (organization_id);
CREATE INDEX IF NOT EXISTS idx_petty_cash_entries_org ON petty_cash_entries (organization_id);
CREATE INDEX IF NOT EXISTS idx_drawings_org ON drawings (organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents (organization_id);
CREATE INDEX IF NOT EXISTS idx_vendors_org ON vendors (organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_org ON equipment (organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_logs_org ON equipment_logs (organization_id);
CREATE INDEX IF NOT EXISTS idx_safety_incidents_org ON safety_incidents (organization_id);
CREATE INDEX IF NOT EXISTS idx_toolbox_talks_org ON toolbox_talks (organization_id);
CREATE INDEX IF NOT EXISTS idx_inspections_org ON inspections (organization_id);
CREATE INDEX IF NOT EXISTS idx_checklist_templates_org ON checklist_templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_org ON chat_messages (organization_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_org ON meeting_minutes (organization_id);
CREATE INDEX IF NOT EXISTS idx_report_configs_org ON report_configs (organization_id);
CREATE INDEX IF NOT EXISTS idx_photo_progress_org ON photo_progress (organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transfers_org ON inventory_transfers (organization_id);
CREATE INDEX IF NOT EXISTS idx_ra_bills_org ON ra_bills (organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_assignments_org ON worker_assignments (organization_id);
CREATE INDEX IF NOT EXISTS idx_worker_schedules_org ON worker_schedules (organization_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_tokens_org ON client_portal_tokens (organization_id);

-- Additional useful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance (date);
CREATE INDEX IF NOT EXISTS idx_issues_project ON issues (project_id);
CREATE INDEX IF NOT EXISTS idx_stock_entries_project_material ON stock_entries (project_id, material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages (channel, organization_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members (user_id);
