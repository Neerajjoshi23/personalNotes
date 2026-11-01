import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import CustomSelect from "@/components/react-components/CustomSelect.jsx";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
export default function AddTaskDialog({ columns, handleAddTask }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState({
    id: null,
    title: "",
    description: "",
    columnId: null,
    priority: null,
  });
  const prorityList = [
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
  ];
  const columnsList = columns.map((column) => {
    return { label: column.title, value: column.id };
  });
  function handlePriorityChange(prioriy) {
    setTask({
      ...task,
      priority: prioriy,
    });
  }
  function handleCategoryChange(category) {
    setTask({
      ...task,
      columnId: category,
    });
  }
  function addTask() {
    const missingFields = Object.keys(task).filter(
      (key) => key !== "id" && !task[key],
    );
    if (missingFields.length > 0) {
      alert(`For adding a task we require: ${missingFields.join(", ")}`);
      return;
    }
    const newTask = { ...task, id: Date.now() };

    handleAddTask(newTask);
    setTask({
      id: null,
      title: "",
      description: "",
      columnId: null,
      priority: null,
    });
    setOpen(false);
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline">Add Task</Button>} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Task Details</DialogTitle>
          <DialogDescription>Add Task So You can track it.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="title-1">Title</Label>
            <Input
              id="title-1"
              name="title"
              value={task.title}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
            />
          </Field>
          <Field>
            <Label htmlFor="Description">Description</Label>
            <Input
              id="Description"
              name="Description"
              value={task.description}
              onChange={(e) =>
                setTask({ ...task, description: e.target.value })
              }
            />
          </Field>
          <Field>
            <CustomSelect
              items={prorityList}
              title={"Priority"}
              value={task.priority}
              onChange={(priority) => handlePriorityChange(priority)}
            ></CustomSelect>
          </Field>
          <Field>
            <CustomSelect
              items={columnsList}
              title={"Category"}
              value={task.columnId}
              onChange={(category) => handleCategoryChange(category)}
            ></CustomSelect>
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={addTask}>Save Task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
