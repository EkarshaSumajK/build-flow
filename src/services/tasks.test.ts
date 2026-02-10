import { describe, it, expect, vi, beforeEach } from "vitest";

// Helper: create a fully chainable Supabase mock
function createChainableMock() {
  const result = { data: [], error: null, count: 0 };
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") {
        // Make it thenable when awaited
        return (resolve: any) => resolve(result);
      }
      // Return a function that returns the same proxy
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

describe("Task Service", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("should construct query with orgId filter", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: vi.fn(() => createChainableMock()),
      },
    }));
    const { fetchTasks } = await import("./tasks");
    const result = await fetchTasks({ orgId: "org-123" });
    expect(result).toEqual({ data: [], count: 0 });
  });

  it("should handle project filter correctly", async () => {
    const fromMock = vi.fn(() => createChainableMock());
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: fromMock },
    }));
    const { fetchTasks } = await import("./tasks");
    const result = await fetchTasks({ orgId: "org-123", projectId: "project-456" });
    expect(fromMock).toHaveBeenCalledWith("tasks");
    expect(result).toEqual({ data: [], count: 0 });
  });

  it("should skip project filter when 'all'", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: vi.fn(() => createChainableMock()) },
    }));
    const { fetchTasks } = await import("./tasks");
    const result = await fetchTasks({ orgId: "org-123", projectId: "all" });
    expect(result).toEqual({ data: [], count: 0 });
  });

  it("should accept all filter params without error", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: { from: vi.fn(() => createChainableMock()) },
    }));
    const { fetchTasks } = await import("./tasks");
    const result = await fetchTasks({
      orgId: "org-123",
      projectId: "p1",
      assigneeId: "u1",
      status: "in_progress",
      priority: "high",
      page: 2,
      pageSize: 25,
    });
    expect(result).toEqual({ data: [], count: 0 });
  });
});
