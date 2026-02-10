export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active: "bg-success/10 text-success",
    completed: "bg-primary/10 text-primary",
    on_hold: "bg-warning/10 text-warning",
    cancelled: "bg-destructive/10 text-destructive",
    not_started: "bg-muted text-muted-foreground",
    in_progress: "bg-primary/10 text-primary",
    blocked: "bg-destructive/10 text-destructive",
    open: "bg-warning/10 text-warning",
    resolved: "bg-success/10 text-success",
    closed: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    rejected: "bg-destructive/10 text-destructive",
    fulfilled: "bg-primary/10 text-primary",
    present: "bg-success/10 text-success",
    absent: "bg-destructive/10 text-destructive",
    half_day: "bg-warning/10 text-warning",
    overtime: "bg-primary/10 text-primary",
  };
  return map[status] ?? "bg-muted text-muted-foreground";
}

export function priorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    medium: "bg-primary/10 text-primary",
    high: "bg-warning/10 text-warning",
    critical: "bg-destructive/10 text-destructive",
  };
  return map[priority] ?? "bg-muted text-muted-foreground";
}
