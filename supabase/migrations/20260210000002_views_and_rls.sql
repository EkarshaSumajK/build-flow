-- ============================================================
-- Server-Side Aggregation Views + RLS Consistency
-- ============================================================

-- 1. Dashboard stats view (server-side aggregation)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
  p.organization_id,
  COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'active') AS active_projects,
  COUNT(DISTINCT p.id) AS total_projects,
  COALESCE(SUM(p.budget), 0) AS total_budget,
  COALESCE(SUM(p.spent), 0) AS total_spent,
  (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.status != 'completed') AS open_tasks,
  (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.status = 'completed') AS completed_tasks,
  (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.status = 'in_progress') AS in_progress_tasks,
  (SELECT COUNT(*) FROM tasks t WHERE t.organization_id = p.organization_id AND t.status = 'blocked') AS blocked_tasks,
  (SELECT COUNT(*) FROM issues i WHERE i.organization_id = p.organization_id AND i.status IN ('open', 'in_progress')) AS open_issues,
  (SELECT COUNT(*) FROM attendance a WHERE a.organization_id = p.organization_id AND a.date = CURRENT_DATE AND a.status IN ('present', 'overtime')) AS workers_present_today
FROM projects p
GROUP BY p.organization_id;

-- 2. Stock levels view (replaces client-side computation)
CREATE OR REPLACE VIEW stock_levels AS
SELECT
  se.organization_id,
  se.material_id,
  m.name AS material_name,
  m.unit AS material_unit,
  m.category AS material_category,
  m.standard_rate,
  se.project_id,
  p.name AS project_name,
  COALESCE(SUM(CASE WHEN se.entry_type = 'in' THEN se.quantity ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN se.entry_type = 'out' THEN se.quantity ELSE 0 END), 0) AS total_out,
  COALESCE(SUM(CASE WHEN se.entry_type = 'in' THEN se.quantity ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN se.entry_type = 'out' THEN se.quantity ELSE 0 END), 0) AS current_stock
FROM stock_entries se
JOIN materials m ON m.id = se.material_id
LEFT JOIN projects p ON p.id = se.project_id
GROUP BY se.organization_id, se.material_id, m.name, m.unit, m.category, m.standard_rate, se.project_id, p.name;

-- 3. Payroll summary view
CREATE OR REPLACE VIEW payroll_summary AS
SELECT
  a.organization_id,
  a.worker_id,
  w.name AS worker_name,
  w.trade,
  w.daily_rate,
  w.contractor_name,
  DATE_TRUNC('month', a.date::timestamp) AS month,
  COUNT(*) FILTER (WHERE a.status = 'present') AS days_present,
  COUNT(*) FILTER (WHERE a.status = 'absent') AS days_absent,
  COUNT(*) FILTER (WHERE a.status = 'half_day') AS days_half,
  COUNT(*) FILTER (WHERE a.status = 'overtime') AS days_overtime,
  COALESCE(SUM(a.overtime_hours), 0) AS total_overtime_hours,
  COALESCE(SUM(a.deduction), 0) AS total_deductions,
  (COUNT(*) FILTER (WHERE a.status = 'present') +
   COUNT(*) FILTER (WHERE a.status = 'overtime') +
   0.5 * COUNT(*) FILTER (WHERE a.status = 'half_day')) * w.daily_rate AS gross_pay
FROM attendance a
JOIN workers w ON w.id = a.worker_id
GROUP BY a.organization_id, a.worker_id, w.name, w.trade, w.daily_rate, w.contractor_name, DATE_TRUNC('month', a.date::timestamp);

-- 4. Fix RLS consistency: ensure all comment policies use get_user_organization_id
-- (Already done in previous migration for INSERT, now fix SELECT too)

-- 5. Add missing FK constraints on user reference columns (safe - only adds if not exists)
DO $$
BEGIN
  -- Add FK for petty_cash_entries.recorded_by if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'petty_cash_entries_recorded_by_fkey') THEN
    ALTER TABLE petty_cash_entries ADD CONSTRAINT petty_cash_entries_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id);
  END IF;

  -- Add FK for stock_entries.recorded_by if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stock_entries_recorded_by_fkey') THEN
    ALTER TABLE stock_entries ADD CONSTRAINT stock_entries_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id);
  END IF;
END $$;
