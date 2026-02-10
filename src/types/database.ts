import type { Database } from "@/integrations/supabase/types";

// Extract Row types from Supabase-generated schema
type Tables = Database["public"]["Tables"];

export type Project = Tables["projects"]["Row"];
export type Task = Tables["tasks"]["Row"];
export type Material = Tables["materials"]["Row"];
export type MaterialRequest = Tables["material_requests"]["Row"];
export type PurchaseOrder = Tables["purchase_orders"]["Row"];
export type POItem = Tables["po_items"]["Row"];
export type GoodsReceipt = Tables["goods_receipts"]["Row"];
export type GRNItem = Tables["grn_items"]["Row"];
export type StockEntry = Tables["stock_entries"]["Row"];
export type Worker = Tables["workers"]["Row"];
export type Attendance = Tables["attendance"]["Row"];
export type Issue = Tables["issues"]["Row"];
export type PettyCashEntry = Tables["petty_cash_entries"]["Row"];
export type Vendor = Tables["vendors"]["Row"];
export type Drawing = Tables["drawings"]["Row"];
export type Document = Tables["documents"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type Organization = Tables["organizations"]["Row"];
export type ChatMessage = Tables["chat_messages"]["Row"];
export type Notification = Tables["notifications"]["Row"];
export type RABill = Tables["ra_bills"]["Row"];
export type RABillItem = Tables["ra_bill_items"]["Row"];
export type Equipment = Tables["equipment"]["Row"];
export type SafetyIncident = Tables["safety_incidents"]["Row"];
export type MeetingMinute = Tables["meeting_minutes"]["Row"];
export type InventoryTransfer = Tables["inventory_transfers"]["Row"];
export type PhotoProgress = Tables["photo_progress"]["Row"];

// Enum types
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];
export type IssueSeverity = Database["public"]["Enums"]["issue_severity"];
export type IssueStatus = Database["public"]["Enums"]["issue_status"];
export type PaymentMode = Database["public"]["Enums"]["payment_mode"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

// Common join types
export type ProjectWithRelations = Project & {
  profiles?: Pick<Profile, "full_name"> | null;
};

export type TaskWithRelations = Task & {
  projects?: Pick<Project, "name"> | null;
  profiles?: Pick<Profile, "full_name"> | null;
};

export type IssueWithRelations = Issue & {
  projects?: Pick<Project, "name"> | null;
};

export type POWithProject = PurchaseOrder & {
  projects?: Pick<Project, "name"> | null;
};

export type GRNWithRelations = GoodsReceipt & {
  projects?: Pick<Project, "name"> | null;
  purchase_orders?: Pick<PurchaseOrder, "po_number"> | null;
};
