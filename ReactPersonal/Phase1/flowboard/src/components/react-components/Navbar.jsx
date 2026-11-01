import AddTaskDialog from "./AddTaskDialog";

export default function NavBar({ columns, handleAddTask }) {
  return (
    <div className="flex flex-row justify-between items-center p-4 border-b">
      <h1 className="text-xl font-bold">FlowBoard</h1>
      {/* 2. Render it safely using standard JSX syntax */}
      <AddTaskDialog
        columns={columns}
        handleAddTask={handleAddTask}
      ></AddTaskDialog>
    </div>
  );
}
