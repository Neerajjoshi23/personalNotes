import { initialTasks, columns } from "./mockData.js";
import NavBar from "./components/react-components/Navbar.jsx";
import { useState } from "react";
import { ScrollArea } from "./components/ui/scroll-area.jsx";
import { Badge } from "./components/ui/badge.jsx";
import CustomCard from "./components/react-components/CustomCard.jsx";
import CustomSelect from "./components/react-components/CustomSelect.jsx";
export default function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [priorityFilter, setPriorityFilter] = useState(null);
  const priorityList = [
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
  ];
  function handleAddTask(task) {
    setTasks([...tasks, task]);
  }
  function handleDeleteTask(id) {
    setTasks(tasks.filter((task) => task.id !== id));
  }
  function handleUpdate(editedTask) {
    const newTaskList = tasks.map((task) => {
      if (editedTask.id === task.id) return editedTask;
      else return task;
    });
    setTasks(newTaskList);
  }
  function handleColumnChange(column, id) {
    const newTaskList = tasks.map((task) => {
      if (task.id === id) {
        return { ...task, columnId: column };
      }
      return task;
    });
    setTasks(newTaskList);
  }
  return (
    <div className="min-h-screen bg-muted/30">
      <NavBar columns={columns} handleAddTask={handleAddTask}></NavBar>
      <div className="flex justify-end px-6 py-3">
        <CustomSelect
          items={priorityList}
          title="Priority"
          placeholder="All priorities"
          value={priorityFilter}
          onChange={setPriorityFilter}
        ></CustomSelect>
      </div>
      <div className="flex flex-row gap-4 px-6 pb-6 items-start">
        {columns.map((column) => {
          // for this column fatch all task
          const filteredTasks = tasks.filter((task) => {
            return (
              task.columnId === column.id &&
              (!priorityFilter || task.priority === priorityFilter)
            );
          });
          return (
            <ScrollArea
              key={column.id}
              className="w-1/3 h-[calc(100vh-140px)] rounded-lg border bg-background"
            >
              <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-row justify-between items-center px-2 py-1">
                  <h1 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {column.title}
                  </h1>
                  <Badge variant="secondary">{filteredTasks.length}</Badge>
                </div>
                {filteredTasks.map((task) => {
                  return (
                    <CustomCard
                      task={task}
                      key={task.id}
                      handleDeleteTask={handleDeleteTask}
                      handleUpdate={handleUpdate}
                      columns={columns}
                      handleColumnChange={handleColumnChange}
                    ></CustomCard>
                  );
                })}
              </div>
            </ScrollArea>
          );
        })}
      </div>
    </div>
  );
}
