import { useState } from "react";

export default function GetUserInfo({ ...props }) {
  const [userDetail, setUserDetail] = useState({
    userName: "",
    userEmail: "",
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        props.addUserDetails(userDetail);
        alert(`Details of user: ${userDetail.userName} has been saved`);
        setUserDetail({
          userName: "",
          userEmail: "",
        });
      }}
    >
      <label htmlFor="userName">Name :</label>
      <input
        required
        value={userDetail.userName}
        name="userName"
        id="userName"
        onChange={(e) =>
          setUserDetail({
            ...userDetail,
            userName: e.target.value,
          })
        }
      ></input>
      <label htmlFor="userEmail">Email is:</label>
      <input
        value={userDetail.userEmail}
        name="userEmail"
        id="userEmail"
        onChange={(e) =>
          setUserDetail({
            ...userDetail,
            userEmail: e.target.value,
          })
        }
      ></input>
      <button>Add contact</button>
    </form>
  );
}
