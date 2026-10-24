import { describe, expect, it } from "vitest";
import { filterTasksByStatus } from "./taskFilters";

describe("تصفية مهام اليوم", () => {
  const tasks = [{ id: 1, status: "not_started" }, { id: 2, status: "in_progress" }, { id: 3, status: "completed" }];

  it("يعرض الحالة المطلوبة فقط مع الإبقاء على الكل عند اختيار الكل", () => {
    expect(filterTasksByStatus(tasks, "all").map(task => task.id)).toEqual([1, 2, 3]);
    expect(filterTasksByStatus(tasks, "in_progress").map(task => task.id)).toEqual([2]);
    expect(filterTasksByStatus(tasks, "completed").map(task => task.id)).toEqual([3]);
  });
});
