
-- Update RLS policies on ALL data tables to use can_access_org() instead of direct org match
-- This allows parent org owners to access child org data

-- === PROJECTS ===
DROP POLICY IF EXISTS "Org members can view projects" ON public.projects;
CREATE POLICY "Org members can view projects" ON public.projects
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can create projects" ON public.projects;
CREATE POLICY "Org members can create projects" ON public.projects
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can update projects" ON public.projects;
CREATE POLICY "Org members can update projects" ON public.projects
FOR UPDATE USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Owners can delete projects" ON public.projects;
CREATE POLICY "Owners can delete projects" ON public.projects
FOR DELETE USING (can_access_org(auth.uid(), organization_id) AND has_role(auth.uid(), 'owner'));

-- === TASKS ===
DROP POLICY IF EXISTS "Org members can view tasks" ON public.tasks;
CREATE POLICY "Org members can view tasks" ON public.tasks
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can create tasks" ON public.tasks;
CREATE POLICY "Org members can create tasks" ON public.tasks
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can update tasks" ON public.tasks;
CREATE POLICY "Org members can update tasks" ON public.tasks
FOR UPDATE USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can delete tasks" ON public.tasks;
CREATE POLICY "Org members can delete tasks" ON public.tasks
FOR DELETE USING (can_access_org(auth.uid(), organization_id));

-- === ISSUES ===
DROP POLICY IF EXISTS "Org members can view issues" ON public.issues;
CREATE POLICY "Org members can view issues" ON public.issues
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can create issues" ON public.issues;
CREATE POLICY "Org members can create issues" ON public.issues
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can update issues" ON public.issues;
CREATE POLICY "Org members can update issues" ON public.issues
FOR UPDATE USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can delete issues" ON public.issues;
CREATE POLICY "Org members can delete issues" ON public.issues
FOR DELETE USING (can_access_org(auth.uid(), organization_id));

-- === MATERIALS ===
DROP POLICY IF EXISTS "Org members can manage materials" ON public.materials;
CREATE POLICY "Org members can manage materials" ON public.materials
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view materials" ON public.materials;
CREATE POLICY "Org members can view materials" ON public.materials
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === MATERIAL REQUESTS ===
DROP POLICY IF EXISTS "Org members can view material requests" ON public.material_requests;
CREATE POLICY "Org members can view material requests" ON public.material_requests
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can create material requests" ON public.material_requests;
CREATE POLICY "Org members can create material requests" ON public.material_requests
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can update material requests" ON public.material_requests;
CREATE POLICY "Org members can update material requests" ON public.material_requests
FOR UPDATE USING (can_access_org(auth.uid(), organization_id));

-- === WORKERS ===
DROP POLICY IF EXISTS "Org members can manage workers" ON public.workers;
CREATE POLICY "Org members can manage workers" ON public.workers
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view workers" ON public.workers;
CREATE POLICY "Org members can view workers" ON public.workers
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === ATTENDANCE ===
DROP POLICY IF EXISTS "Org members can manage attendance" ON public.attendance;
CREATE POLICY "Org members can manage attendance" ON public.attendance
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view attendance" ON public.attendance;
CREATE POLICY "Org members can view attendance" ON public.attendance
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === PURCHASE ORDERS ===
DROP POLICY IF EXISTS "Org members can manage POs" ON public.purchase_orders;
CREATE POLICY "Org members can manage POs" ON public.purchase_orders
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view POs" ON public.purchase_orders;
CREATE POLICY "Org members can view POs" ON public.purchase_orders
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === GOODS RECEIPTS ===
DROP POLICY IF EXISTS "Org members can manage GRNs" ON public.goods_receipts;
CREATE POLICY "Org members can manage GRNs" ON public.goods_receipts
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view GRNs" ON public.goods_receipts;
CREATE POLICY "Org members can view GRNs" ON public.goods_receipts
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === STOCK ENTRIES ===
DROP POLICY IF EXISTS "Org members can manage stock" ON public.stock_entries;
CREATE POLICY "Org members can manage stock" ON public.stock_entries
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view stock" ON public.stock_entries;
CREATE POLICY "Org members can view stock" ON public.stock_entries
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === PETTY CASH ===
DROP POLICY IF EXISTS "Org members can manage petty cash" ON public.petty_cash_entries;
CREATE POLICY "Org members can manage petty cash" ON public.petty_cash_entries
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view petty cash" ON public.petty_cash_entries;
CREATE POLICY "Org members can view petty cash" ON public.petty_cash_entries
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === DRAWINGS ===
DROP POLICY IF EXISTS "Org members can manage drawings" ON public.drawings;
CREATE POLICY "Org members can manage drawings" ON public.drawings
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view drawings" ON public.drawings;
CREATE POLICY "Org members can view drawings" ON public.drawings
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === DOCUMENTS ===
DROP POLICY IF EXISTS "Org members can manage documents" ON public.documents;
CREATE POLICY "Org members can manage documents" ON public.documents
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view documents" ON public.documents;
CREATE POLICY "Org members can view documents" ON public.documents
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === VENDORS ===
DROP POLICY IF EXISTS "Org members can manage vendors" ON public.vendors;
CREATE POLICY "Org members can manage vendors" ON public.vendors
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view vendors" ON public.vendors;
CREATE POLICY "Org members can view vendors" ON public.vendors
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === EQUIPMENT ===
DROP POLICY IF EXISTS "Org members can manage equipment" ON public.equipment;
CREATE POLICY "Org members can manage equipment" ON public.equipment
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view equipment" ON public.equipment;
CREATE POLICY "Org members can view equipment" ON public.equipment
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === EQUIPMENT LOGS ===
DROP POLICY IF EXISTS "Org members can manage equipment logs" ON public.equipment_logs;
CREATE POLICY "Org members can manage equipment logs" ON public.equipment_logs
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view equipment logs" ON public.equipment_logs;
CREATE POLICY "Org members can view equipment logs" ON public.equipment_logs
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === SAFETY INCIDENTS ===
DROP POLICY IF EXISTS "Org members can manage safety incidents" ON public.safety_incidents;
CREATE POLICY "Org members can manage safety incidents" ON public.safety_incidents
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view safety incidents" ON public.safety_incidents;
CREATE POLICY "Org members can view safety incidents" ON public.safety_incidents
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === MEETING MINUTES ===
DROP POLICY IF EXISTS "Org members can manage meetings" ON public.meeting_minutes;
CREATE POLICY "Org members can manage meetings" ON public.meeting_minutes
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view meetings" ON public.meeting_minutes;
CREATE POLICY "Org members can view meetings" ON public.meeting_minutes
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === INVENTORY TRANSFERS ===
DROP POLICY IF EXISTS "Org members can manage transfers" ON public.inventory_transfers;
CREATE POLICY "Org members can manage transfers" ON public.inventory_transfers
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view transfers" ON public.inventory_transfers;
CREATE POLICY "Org members can view transfers" ON public.inventory_transfers
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === PHOTO PROGRESS ===
DROP POLICY IF EXISTS "Org members can manage photo progress" ON public.photo_progress;
CREATE POLICY "Org members can manage photo progress" ON public.photo_progress
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view photo progress" ON public.photo_progress;
CREATE POLICY "Org members can view photo progress" ON public.photo_progress
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === CHAT MESSAGES ===
DROP POLICY IF EXISTS "Org members can view chat" ON public.chat_messages;
CREATE POLICY "Org members can view chat" ON public.chat_messages
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can send chat" ON public.chat_messages;
CREATE POLICY "Org members can send chat" ON public.chat_messages
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

-- === CHECKLIST TEMPLATES ===
DROP POLICY IF EXISTS "Org members can manage checklist templates" ON public.checklist_templates;
CREATE POLICY "Org members can manage checklist templates" ON public.checklist_templates
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view checklist templates" ON public.checklist_templates;
CREATE POLICY "Org members can view checklist templates" ON public.checklist_templates
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === INSPECTIONS ===
DROP POLICY IF EXISTS "Org members can manage inspections" ON public.inspections;
CREATE POLICY "Org members can manage inspections" ON public.inspections
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view inspections" ON public.inspections;
CREATE POLICY "Org members can view inspections" ON public.inspections
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === TOOLBOX TALKS ===
DROP POLICY IF EXISTS "Org members can manage toolbox talks" ON public.toolbox_talks;
CREATE POLICY "Org members can manage toolbox talks" ON public.toolbox_talks
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view toolbox talks" ON public.toolbox_talks;
CREATE POLICY "Org members can view toolbox talks" ON public.toolbox_talks
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === CLIENT PORTAL TOKENS ===
DROP POLICY IF EXISTS "Users can manage tokens in their org" ON public.client_portal_tokens;
CREATE POLICY "Users can manage tokens in their org" ON public.client_portal_tokens
FOR ALL USING (can_access_org(auth.uid(), organization_id));

-- === NOTIFICATIONS ===
DROP POLICY IF EXISTS "Org members can insert notifications" ON public.notifications;
CREATE POLICY "Org members can insert notifications" ON public.notifications
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

-- === REPORT CONFIGS ===
DROP POLICY IF EXISTS "Org members can view reports" ON public.report_configs;
CREATE POLICY "Org members can view reports" ON public.report_configs
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can insert reports" ON public.report_configs;
CREATE POLICY "Org members can insert reports" ON public.report_configs
FOR INSERT WITH CHECK (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can update reports" ON public.report_configs;
CREATE POLICY "Org members can update reports" ON public.report_configs
FOR UPDATE USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can delete reports" ON public.report_configs;
CREATE POLICY "Org members can delete reports" ON public.report_configs
FOR DELETE USING (can_access_org(auth.uid(), organization_id));

-- === RA BILLS ===
DROP POLICY IF EXISTS "Org members can manage RA bills" ON public.ra_bills;
CREATE POLICY "Org members can manage RA bills" ON public.ra_bills
FOR ALL USING (can_access_org(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can view RA bills" ON public.ra_bills;
CREATE POLICY "Org members can view RA bills" ON public.ra_bills
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === PROFILES: allow viewing profiles in accessible orgs ===
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
CREATE POLICY "Users can view profiles in accessible organizations" ON public.profiles
FOR SELECT USING (can_access_org(auth.uid(), organization_id));

-- === USER ROLES: allow viewing roles in accessible orgs ===
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;
CREATE POLICY "Users can view roles in accessible organizations" ON public.user_roles
FOR SELECT USING (can_access_org(auth.uid(), organization_id));
