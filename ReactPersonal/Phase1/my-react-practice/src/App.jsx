import { useRef, useState } from "react";
import Profile from "./Profile.jsx";
import GetUserInfo from "./GetUserInfo.jsx";
import ShowUserInfo from "./ShowUserInfo.jsx";
const detailsStatic = [
  { name: "Neeraj", marks: 456, id: 1 },
  { name: "Arushi", marks: 346, id: 2 },
  { name: "Ishika", marks: 257, id: 33 },
  { name: "Neeraj", marks: 456, id: 44 },
  { name: "Arushi", marks: 346, id: 22 },
  { name: "Ishika", marks: 257, id: 30 },
];
export function Button({ onClick, children }) {
  let ref = useRef(null);
  function handleDebounceClick(e) {
    if (ref.current) clearTimeout(ref.current);
    let timerId = setTimeout(() => {
      onClick("You have been clicked");
    }, 3000);
    ref.current = timerId;
  }
  return (
    <div>
      <div>{children}</div>
      <button onClick={handleDebounceClick}>Click here</button>
    </div>
  );
}
export default function App() {
  // // const [details, setDetails] = useState(detailsStatic);
  // // function deleteEle(id) {
  // //   setDetails(details.filter((detail) => detail.id != id));
  // // }
  // // return details.map((detail, index) => {
  // //   return (
  // //     <Profile
  // //       key={detail.id}
  // //       detail={detail}
  // //       option={detail & 1}
  // //       deleteEle={deleteEle}
  // //     ></Profile>
  // //   );
  // // });
  // const [users, setUsers] = useState([]);
  // function addUserDetails(user) {
  //   setUsers([...users, user]);
  // }
  // function deleteUserDetail(email) {
  //   setUsers(
  //     users.filter((user) => {
  //       if (user.userEmail != email) return user;
  //     }),
  //   );
  // }
  // return (
  //   <>
  //     <GetUserInfo addUserDetails={addUserDetails}></GetUserInfo>
  //     <ShowUserInfo
  //       users={users}
  //       deleteUserDetail={deleteUserDetail}
  //     ></ShowUserInfo>
  //     {/* <TestCount></TestCount>
  //     <SendMessage></SendMessage> */}
  //   </>
  // );
  const [valueA, setValueA] = useState("A");
  const [valueB, setValueB] = useState("B");
  return (
    <div>
      <Button onClick={(value) => setValueA(value)}>
        <span>{valueA}</span>
      </Button>
      <Button onClick={(value) => setValueB(value)}>
        <span>{valueB}</span>
      </Button>
    </div>
  );
}
