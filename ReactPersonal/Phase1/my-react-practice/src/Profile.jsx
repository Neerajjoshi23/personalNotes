import { Button } from "./components/ui/button";
const passingMarks = 600 * 0.33;

export default function Profile(props) {
  const isPassed = props.detail.marks > passingMarks;
  function handleDeleteMarksDetails(id) {
    console.log("Deletion is called for", id);
    props.deleteEle(id);
  }
  return (
    <>
      <div>
        {props.detail.name} {isPassed ? "is Passed" : "isFailed"}{" "}
        <input type="checkboc"></input>
      </div>
      <Button onClick={() => handleDeleteMarksDetails(props.detail.id)}>
        Click to del
      </Button>
    </>
  );
}
