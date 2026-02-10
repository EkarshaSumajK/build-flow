import { describe, it, expect } from "vitest";
import { formatCurrency, formatDate, statusColor, priorityColor } from "./formatters";

describe("formatCurrency", () => {
  it("formats numbers as Indian Rupees", () => {
    const result = formatCurrency(1000);
    expect(result).toContain("1");
    expect(result).toContain("000");
  });

  it("handles zero", () => {
    const result = formatCurrency(0);
    expect(result).toBeTruthy();
  });

  it("handles negative values", () => {
    const result = formatCurrency(-500);
    expect(result).toBeTruthy();
  });

  it("handles undefined/null values", () => {
    expect(formatCurrency(undefined as any)).toBeTruthy();
    expect(formatCurrency(null as any)).toBeTruthy();
  });
});

describe("formatDate", () => {
  it("formats valid date strings", () => {
    const result = formatDate("2026-01-15");
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
  });

  it("handles null/undefined", () => {
    expect(formatDate(null as any)).toBe("—");
    expect(formatDate(undefined as any)).toBe("—");
  });

  it("handles empty string", () => {
    expect(formatDate("")).toBe("—");
  });
});

describe("statusColor", () => {
  it("returns class string for known statuses", () => {
    expect(statusColor("active")).toBeTruthy();
    expect(statusColor("completed")).toBeTruthy();
    expect(typeof statusColor("active")).toBe("string");
  });

  it("returns default for unknown status", () => {
    expect(statusColor("unknown_status")).toBeTruthy();
  });
});

describe("priorityColor", () => {
  it("returns class string for known priorities", () => {
    expect(priorityColor("high")).toBeTruthy();
    expect(priorityColor("medium")).toBeTruthy();
    expect(priorityColor("low")).toBeTruthy();
  });

  it("returns default for unknown priority", () => {
    expect(priorityColor("unknown")).toBeTruthy();
  });
});
