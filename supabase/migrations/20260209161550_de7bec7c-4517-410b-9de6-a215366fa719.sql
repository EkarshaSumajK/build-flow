
-- Petty Cash Entries
CREATE TABLE public.petty_cash_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.petty_cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view petty cash" ON public.petty_cash_entries
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage petty cash" ON public.petty_cash_entries
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view POs" ON public.purchase_orders
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage POs" ON public.purchase_orders
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- PO Line Items
CREATE TABLE public.po_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED
);

ALTER TABLE public.po_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view PO items" ON public.po_items
FOR SELECT USING (po_id IN (SELECT id FROM purchase_orders WHERE organization_id = get_user_organization_id(auth.uid())));

CREATE POLICY "Org members can manage PO items" ON public.po_items
FOR ALL USING (po_id IN (SELECT id FROM purchase_orders WHERE organization_id = get_user_organization_id(auth.uid())));

-- Goods Receipt Notes
CREATE TABLE public.goods_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  po_id UUID REFERENCES public.purchase_orders(id),
  grn_number TEXT NOT NULL,
  vendor_name TEXT NOT NULL,
  received_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  received_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view GRNs" ON public.goods_receipts
FOR SELECT USING (organization_id = get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can manage GRNs" ON public.goods_receipts
FOR ALL USING (organization_id = get_user_organization_id(auth.uid()));

-- GRN Line Items
CREATE TABLE public.grn_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grn_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  quantity_received NUMERIC NOT NULL,
  quantity_accepted NUMERIC NOT NULL,
  notes TEXT
);

ALTER TABLE public.grn_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view GRN items" ON public.grn_items
FOR SELECT USING (grn_id IN (SELECT id FROM goods_receipts WHERE organization_id = get_user_organization_id(auth.uid())));

CREATE POLICY "Org members can manage GRN items" ON public.grn_items
FOR ALL USING (grn_id IN (SELECT id FROM goods_receipts WHERE organization_id = get_user_organization_id(auth.uid())));

-- Sequence for PO/GRN numbers
CREATE SEQUENCE po_number_seq START 1001;
CREATE SEQUENCE grn_number_seq START 1001;
