import { useState } from "react";
import useTodoStore, { type Todo } from "../store/TodoStore.ts";
import "./TodoLayout.css";
export default function TodoLayout() {
  const todos = useTodoStore((state) => state.todos);
  const addTodo = useTodoStore((state) => state.addTodo);
  const removeTodo = useTodoStore((state) => state.deleteTodo);
  const updateTodo = useTodoStore((state) => state.updateTodo);

  // Single shared states to capture ONLY ONE item being edited at a time
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Todo>>({});

  const [newTodo, setNewTodo] = useState<
    Pick<Todo, "id" | "title" | "description" | "status">
  >({
    id: Date.now(),
    title: "",
    description: "",
    status: "pending",
  });

  // Captures the active item data into the single edit state
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditForm({
      title: todo.title,
      description: todo.description,
      status: todo.status,
    });
  };

  // Dispatches the partial edit data and closes the view
  const saveUpdate = (id: number) => {
    updateTodo(id, { ...todos[id], ...editForm });
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="todo-layout">
      <h1>Todo App</h1>
      {todos.length === 0 && (
        <p className="empty-message">No todos available</p>
      )}
      {todos.length > 0 && (
        <ul className="todo-list">
          {todos.map((todo) => {
            // Checks if this specific item matches the single captured edit ID
            const isEditing = editingId === todo.id;

            return (
              <li
                key={todo.id}
                className={`todo-item ${isEditing ? "editing" : ""}`}
              >
                {isEditing ? (
                  /* Inline Edit Mode Interface */
                  <div className="edit-fields">
                    <input
                      type="text"
                      className="edit-input"
                      value={editForm.title || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, title: e.target.value })
                      }
                    />
                    <textarea
                      className="edit-textarea"
                      value={editForm.description || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          description: e.target.value,
                        })
                      }
                    />
                    <select
                      className="edit-select"
                      value={editForm.status || "pending"}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          status: e.target.value as Todo["status"],
                        })
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-save"
                        onClick={() => saveUpdate(todo.id)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => {
                          setEditingId(null);
                          setEditForm({});
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Default Display Mode Interface */
                  <>
                    <div className="todo-content">
                      <h3>{todo.title}</h3>
                      {todo.description && (
                        <p className="todo-desc">{todo.description}</p>
                      )}
                      <span className={`status-badge ${todo.status}`}>
                        {todo.status}
                      </span>
                      <div className="todo-timestamps">
                        <small>
                          Created:{" "}
                          {todo.createdAt
                            ? new Date(todo.createdAt).toLocaleString()
                            : "Not Available"}
                        </small>
                        <small>
                          Modified:{" "}
                          {todo.modifiedAt
                            ? new Date(todo.modifiedAt).toLocaleString()
                            : "Not Available"}
                        </small>
                      </div>
                    </div>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="btn-edit"
                        onClick={() => startEditing(todo)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn-delete"
                        onClick={() => removeTodo(todo.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="add-todo-section">
        <h2>Add New Todo</h2>
        <form className="add-todo-form">
          <label>
            Title:
            <input
              type="text"
              value={newTodo.title}
              onChange={(e) =>
                setNewTodo({ ...newTodo, title: e.target.value })
              }
            />
          </label>
          <label>
            Description:
            <textarea
              value={newTodo.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setNewTodo({ ...newTodo, description: e.target.value })
              }
            />
          </label>
          <button
            type="button"
            className="btn-add"
            onClick={() => {
              if (!newTodo.title) {
                alert("Title is required");
                return;
              }
              if (!newTodo.description) {
                alert("Description is required");
                return;
              }
              addTodo({
                id: Date.now(),
                title: newTodo.title,
                description: newTodo.description,
                status: "pending",
                createdAt: new Date(),
                modifiedAt: new Date(),
              });
              setNewTodo({
                id: Date.now(),
                title: "",
                description: "",
                status: "pending",
              });
            }}
          >
            Add Todo
          </button>
        </form>
      </div>
    </div>
  );
}
