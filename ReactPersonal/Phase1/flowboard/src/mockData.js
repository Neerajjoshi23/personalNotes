export const columns = [
  { id: "todo", title: "To Do" },
  { id: "in-progress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export const initialTasks = [
  {
    id: "1",
    title: "Write onboarding doc",
    description: "Draft steps for new hires",
    priority: "High",
    columnId: "todo",
  },
  {
    id: "2",
    title: "Fix login redirect bug",
    description: "Happens only on Safari",
    priority: "Medium",
    columnId: "todo",
  },
  {
    id: "3",
    title: "Plan Q3 roadmap",
    description: "Rough draft only",
    priority: "Low",
    columnId: "todo",
  },
  {
    id: "4",
    title: "Refactor auth middleware",
    description: "Compliance-driven rewrite",
    priority: "High",
    columnId: "in-progress",
  },
  {
    id: "5",
    title: "Set up project repo",
    description: "Initial scaffolding",
    priority: "Low",
    columnId: "done",
  },
];
