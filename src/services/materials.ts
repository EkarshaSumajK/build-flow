import { supabase } from "@/integrations/supabase/client";
import type { Material, PurchaseOrder, MaterialRequest, Vendor } from "@/types/database";

export async function fetchMaterials(orgId: string) {
  const { data, error } = await supabase
    .from("materials")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data as Material[];
}

export async function fetchVendors(orgId: string) {
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .eq("organization_id", orgId)
    .order("name");
  if (error) throw error;
  return data as Vendor[];
}

export async function fetchApprovedRequests(orgId: string) {
  const { data, error } = await supabase
    .from("material_requests")
    .select("*, materials(name, unit, standard_rate), projects(name)")
    .eq("organization_id", orgId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Create a PO from an approved material request (workflow link)
 */
export async function createPOFromRequest(
  orgId: string,
  userId: string,
  request: any,
  vendorId: string,
  vendorName: string
) {
  const poNumber = `PO-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const unitPrice = request.unit_price || request.materials?.standard_rate || 0;
  const totalAmount = request.quantity * unitPrice;

  const { data: po, error } = await supabase.from("purchase_orders").insert({
    organization_id: orgId,
    project_id: request.project_id,
    po_number: poNumber,
    vendor_name: vendorName,
    total_amount: totalAmount,
    notes: `Auto-created from Material Request`,
    created_by: userId,
  }).select().single();
  if (error) throw error;

  // Create PO line item
  const { error: itemError } = await supabase.from("po_items").insert({
    po_id: po.id,
    material_id: request.material_id,
    quantity: request.quantity,
    unit_price: unitPrice,
  });
  if (itemError) throw itemError;

  // Update request status to "fulfilled"
  await supabase.from("material_requests").update({ status: "fulfilled" }).eq("id", request.id);

  return po;
}

/**
 * Create a GRN pre-filled from PO data (workflow link)
 */
export async function fetchPOWithItems(poId: string) {
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("*, projects(name)")
    .eq("id", poId)
    .single();
  if (poError) throw poError;

  const { data: items, error: itemsError } = await supabase
    .from("po_items")
    .select("*, materials(name, unit)")
    .eq("po_id", poId);
  if (itemsError) throw itemsError;

  return { po, items: items || [] };
}
