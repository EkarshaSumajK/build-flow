import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency, formatDate } from "@/lib/formatters";

/**
 * Export a Purchase Order as PDF
 */
export function exportPOPdf(po: any, items: any[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Purchase Order", 14, 22);

  doc.setFontSize(10);
  doc.text(`PO Number: ${po.po_number}`, 14, 32);
  doc.text(`Vendor: ${po.vendor_name}`, 14, 38);
  doc.text(`Project: ${po.projects?.name || "—"}`, 14, 44);
  doc.text(`Date: ${formatDate(po.created_at)}`, 14, 50);
  doc.text(`Status: ${po.status}`, 14, 56);

  autoTable(doc, {
    startY: 64,
    head: [["Material", "Quantity", "Unit Price", "Total"]],
    body: items.map((i: any) => [
      i.materials?.name || "—",
      `${i.quantity} ${i.materials?.unit || ""}`,
      formatCurrency(i.unit_price),
      formatCurrency(i.quantity * i.unit_price),
    ]),
    foot: [["", "", "Total", formatCurrency(po.total_amount)]],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
  });

  if (po.notes) {
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Notes: ${po.notes}`, 14, finalY);
  }

  doc.save(`${po.po_number}.pdf`);
}

/**
 * Export a GRN as PDF
 */
export function exportGRNPdf(grn: any, items: any[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Goods Receipt Note", 14, 22);

  doc.setFontSize(10);
  doc.text(`GRN Number: ${grn.grn_number}`, 14, 32);
  doc.text(`Vendor: ${grn.vendor_name}`, 14, 38);
  doc.text(`Project: ${grn.projects?.name || "—"}`, 14, 44);
  doc.text(`Received: ${formatDate(grn.received_date)}`, 14, 50);
  if (grn.purchase_orders?.po_number) doc.text(`PO: ${grn.purchase_orders.po_number}`, 14, 56);

  autoTable(doc, {
    startY: 64,
    head: [["Material", "Qty Received", "Qty Accepted", "Notes"]],
    body: items.map((i: any) => [
      i.materials?.name || "—",
      `${i.quantity_received} ${i.materials?.unit || ""}`,
      `${i.quantity_accepted} ${i.materials?.unit || ""}`,
      i.notes || "—",
    ]),
    theme: "grid",
    headStyles: { fillColor: [39, 174, 96] },
  });

  doc.save(`${grn.grn_number}.pdf`);
}

/**
 * Export RA Bill as PDF
 */
export function exportRABillPdf(bill: any, items: any[]) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Running Account Bill", 14, 22);

  doc.setFontSize(10);
  doc.text(`Bill Number: ${bill.bill_number}`, 14, 32);
  doc.text(`Project: ${bill.projects?.name || "—"}`, 14, 38);
  doc.text(`Date: ${formatDate(bill.bill_date)}`, 14, 44);
  if (bill.period_from) doc.text(`Period: ${formatDate(bill.period_from)} — ${formatDate(bill.period_to)}`, 14, 50);
  doc.text(`Status: ${bill.status}`, 14, 56);

  autoTable(doc, {
    startY: 64,
    head: [["Description", "Unit", "Rate", "Prev Qty", "Curr Qty", "Cumulative", "Amount"]],
    body: items.map((i: any) => [
      i.description,
      i.unit,
      formatCurrency(i.rate),
      i.previous_quantity,
      i.current_quantity,
      i.cumulative_quantity,
      formatCurrency(i.amount),
    ]),
    theme: "grid",
    headStyles: { fillColor: [142, 68, 173] },
    columnStyles: { 6: { halign: "right" } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(11);
  doc.text(`Total: ${formatCurrency(bill.total_amount)}`, 14, finalY);
  doc.text(`Retention (${bill.retention_percent}%): ${formatCurrency(bill.retention_amount)}`, 14, finalY + 7);
  doc.setFontSize(13);
  doc.text(`Net Payable: ${formatCurrency(bill.net_amount)}`, 14, finalY + 16);

  doc.save(`RA-Bill-${bill.bill_number}.pdf`);
}

/**
 * Export Daily Progress Report as PDF
 */
export function exportDPRPdf(data: {
  project: any;
  date: string;
  tasks: any[];
  attendance: any[];
  issues: any[];
  stockMovements: any[];
}) {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text("Daily Progress Report", 14, 22);

  doc.setFontSize(10);
  doc.text(`Project: ${data.project?.name || "—"}`, 14, 32);
  doc.text(`Date: ${formatDate(data.date)}`, 14, 38);

  let startY = 46;

  // Tasks section
  if (data.tasks.length > 0) {
    doc.setFontSize(12);
    doc.text("Tasks", 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [["Task", "Status", "Progress"]],
      body: data.tasks.map((t: any) => [t.title, t.status, `${t.progress || 0}%`]),
      theme: "striped",
      headStyles: { fillColor: [52, 152, 219] },
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Attendance section
  if (data.attendance.length > 0) {
    doc.setFontSize(12);
    doc.text("Attendance Summary", 14, startY);
    const present = data.attendance.filter((a: any) => a.status === "present" || a.status === "overtime").length;
    const absent = data.attendance.filter((a: any) => a.status === "absent").length;
    doc.setFontSize(10);
    doc.text(`Present: ${present} | Absent: ${absent} | Total: ${data.attendance.length}`, 14, startY + 7);
    startY += 16;
  }

  // Issues section
  if (data.issues.length > 0) {
    doc.setFontSize(12);
    doc.text("Issues", 14, startY);
    autoTable(doc, {
      startY: startY + 4,
      head: [["Issue", "Severity", "Status"]],
      body: data.issues.map((i: any) => [i.title, i.severity, i.status]),
      theme: "striped",
      headStyles: { fillColor: [231, 76, 60] },
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
  }

  doc.save(`DPR-${data.date}.pdf`);
}

/**
 * Export Payroll as PDF
 */
export function exportPayrollPdf(monthLabel: string, workers: any[]) {
  const doc = new jsPDF("landscape");
  doc.setFontSize(18);
  doc.text("Payroll Report", 14, 22);
  doc.setFontSize(10);
  doc.text(`Period: ${monthLabel}`, 14, 30);

  autoTable(doc, {
    startY: 38,
    head: [["Worker", "Trade", "Daily Rate", "Present", "Half Day", "OT Days", "Gross Pay", "Deductions", "Net Pay"]],
    body: workers.map((w: any) => [
      w.name,
      w.trade || "—",
      formatCurrency(w.daily_rate),
      w.daysPresent,
      w.daysHalf,
      w.daysOvertime,
      formatCurrency(w.grossPay),
      formatCurrency(w.deductions),
      formatCurrency(w.grossPay - w.deductions),
    ]),
    theme: "grid",
    headStyles: { fillColor: [44, 62, 80] },
  });

  doc.save(`Payroll-${monthLabel}.pdf`);
}
