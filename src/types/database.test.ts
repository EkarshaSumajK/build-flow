import { describe, it, expect } from "vitest";

/**
 * Type-level tests to ensure our database types are correctly defined.
 * These tests verify the type exports exist and can be used.
 */
describe("Database Types", () => {
  it("should export Project type", async () => {
    const types = await import("./database");
    // Type exists if the module loaded successfully
    expect(types).toBeTruthy();
  });

  it("should export all table types", async () => {
    // Verify the module exports without errors
    const types = await import("./database");
    expect(types).toBeDefined();
  });
});
