import { create } from "zustand";
import { persist } from "zustand/middleware"; // 1. Import the persist middleware

type status = "pending" | "in-progress" | "completed";
interface Todo {
  id: number;
  title: string;
  description?: string;
  status: status;
  createdAt?: string | Date; // Updated to handle JSON string dates on reload
  modifiedAt: string | Date; // Updated to handle JSON string dates on reload
}
type TodoStore = {
  todos: Todo[];
  addTodo: (todo: Todo) => void;
  updateTodo: (
    id: number,
    updatedTodo: Partial<Pick<Todo, "title" | "description" | "status">>,
  ) => void;
  deleteTodo: (id: number) => void;
};

// 2. Wrap everything inside create() with persist()
const useTodoStore = create<TodoStore>()(
  persist(
    // I can now persist the todo state in localStorage and even in sessionStorage if needed and even partially if I want to customize it further
    (set) => ({
      todos: [],
      addTodo: (todo) => set((state) => ({ todos: [...state.todos, todo] })),
      updateTodo: (id, updatedTodo) =>
        set((state) => ({
          todos: state.todos.map((todo) =>
            todo.id === id
              ? { ...todo, ...updatedTodo, modifiedAt: new Date() }
              : todo,
          ),
        })),
      deleteTodo: (id) =>
        set((state) => ({
          todos: state.todos.filter((todo) => todo.id !== id),
        })),
    }),
    {
      name: "todo-storage", // 3. The unique key name for your localStorage entry
    },
  ),
);
// middleware for persisting the store in localStorage
// custom middleware can be added here if needed

export default useTodoStore;
export type { Todo, TodoStore };
