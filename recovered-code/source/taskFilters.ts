export type TaskListFilter = "all" | "not_started" | "in_progress" | "completed";

export function filterTasksByStatus<T extends { status: string }>(tasks: T[], filter: TaskListFilter) {
  return filter === "all" ? tasks : tasks.filter(task => task.status === filter);
}
