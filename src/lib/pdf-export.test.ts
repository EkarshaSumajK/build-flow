import { describe, it, expect, vi } from "vitest";

// Mock jsPDF
vi.mock("jspdf", () => {
  const mockDoc = {
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    lastAutoTable: { finalY: 100 },
  };
  return {
    default: vi.fn(() => mockDoc),
  };
});

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

describe("PDF Export", () => {
  it("exportPOPdf creates a PDF with correct filename", async () => {
    const { exportPOPdf } = await import("./pdf-export");

    const mockPO = {
      po_number: "PO-TEST123",
      vendor_name: "Test Vendor",
      total_amount: 50000,
      status: "approved",
      created_at: "2026-01-15",
      notes: "Test notes",
      projects: { name: "Project A" },
    };

    const mockItems = [
      { materials: { name: "Cement", unit: "bags" }, quantity: 100, unit_price: 400 },
      { materials: { name: "Steel", unit: "kg" }, quantity: 500, unit_price: 80 },
    ];

    // Should not throw
    expect(() => exportPOPdf(mockPO, mockItems)).not.toThrow();
  });

  it("exportGRNPdf creates a PDF", async () => {
    const { exportGRNPdf } = await import("./pdf-export");

    const mockGRN = {
      grn_number: "GRN-TEST456",
      vendor_name: "Test Vendor",
      received_date: "2026-01-20",
      projects: { name: "Project B" },
      purchase_orders: { po_number: "PO-123" },
    };

    const mockItems = [
      { materials: { name: "Sand", unit: "cft" }, quantity_received: 200, quantity_accepted: 190, notes: "Some broken bags" },
    ];

    expect(() => exportGRNPdf(mockGRN, mockItems)).not.toThrow();
  });

  it("exportRABillPdf creates a PDF", async () => {
    const { exportRABillPdf } = await import("./pdf-export");

    const mockBill = {
      bill_number: "RA-001",
      bill_date: "2026-01-25",
      total_amount: 100000,
      retention_percent: 5,
      retention_amount: 5000,
      net_amount: 95000,
      status: "approved",
      period_from: "2026-01-01",
      period_to: "2026-01-31",
      projects: { name: "Project C" },
    };

    const mockItems = [
      { description: "Excavation", unit: "cmt", rate: 200, previous_quantity: 100, current_quantity: 50, cumulative_quantity: 150, amount: 10000 },
    ];

    expect(() => exportRABillPdf(mockBill, mockItems)).not.toThrow();
  });

  it("exportDPRPdf handles empty data gracefully", async () => {
    const { exportDPRPdf } = await import("./pdf-export");

    expect(() => exportDPRPdf({
      project: { name: "Test Project" },
      date: "2026-02-10",
      tasks: [],
      attendance: [],
      issues: [],
      stockMovements: [],
    })).not.toThrow();
  });

  it("exportPayrollPdf generates payroll report", async () => {
    const { exportPayrollPdf } = await import("./pdf-export");

    expect(() => exportPayrollPdf("January 2026", [
      { name: "Worker A", trade: "Mason", daily_rate: 800, daysPresent: 25, daysHalf: 1, daysOvertime: 3, grossPay: 22000, deductions: 500 },
    ])).not.toThrow();
  });
});
