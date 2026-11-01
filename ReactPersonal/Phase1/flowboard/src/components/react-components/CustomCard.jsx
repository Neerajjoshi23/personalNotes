import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import CustomSelect from "./CustomSelect";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { useState } from "react";
export default function CustomCard({
  task,
  handleDeleteTask,
  handleUpdate,
  columns,
  handleColumnChange,
}) {
  const [isEditable, setIsEditable] = useState(false);
  const [editedTask, setEditedTask] = useState(task);
  const prorityList = [
    { label: "High", value: "High" },
    { label: "Medium", value: "Medium" },
    { label: "Low", value: "Low" },
  ];
  const columnsList = columns.map((column) => {
    return { label: column.title, value: column.id };
  });
  function handleEditSave() {
    handleUpdate(editedTask);
    setIsEditable(false);
  }
  return (
    <>
      <Card>
        <CardHeader>
          {!isEditable ? (
            <>
              <CardTitle>{task.title}</CardTitle>
              <Badge>{task.priority}</Badge>
            </>
          ) : (
            <>
              <Textarea
                value={editedTask.title}
                onChange={(e) => {
                  setEditedTask({
                    ...editedTask,
                    title: e.target.value,
                  });
                }}
              ></Textarea>
              <CustomSelect
                items={prorityList}
                title={"Priority"}
                value={editedTask.priority}
                onChange={(priority) => {
                  setEditedTask({
                    ...editedTask,
                    priority: priority,
                  });
                }}
              ></CustomSelect>
            </>
          )}
        </CardHeader>
        <CardContent>
          {!isEditable ? (
            <p>{task.description}</p>
          ) : (
            <Textarea
              value={editedTask.description}
              onChange={(e) => {
                setEditedTask({
                  ...editedTask,
                  description: e.target.value,
                });
              }}
            ></Textarea>
          )}
        </CardContent>
        <Button
          onClick={() =>
            !isEditable
              ? (setEditedTask(task), setIsEditable(true))
              : handleEditSave()
          }
        >
          {!isEditable ? "Edit" : "Save"}
        </Button>
        <Button onClick={(e) => handleDeleteTask(task.id)}>Delete</Button>
        <CustomSelect
          items={columnsList}
          title={"Category"}
          value={task.columnId}
          onChange={(category) => {
            handleColumnChange(category, task.id);
          }}
        ></CustomSelect>
      </Card>
    </>
  );
}
