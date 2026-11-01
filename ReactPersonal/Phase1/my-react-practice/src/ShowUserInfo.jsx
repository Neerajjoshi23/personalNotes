import User from "./User.jsx";
export default function ShowUserInfo({ users, deleteUserDetail }) {
  return users.map((user, index) => {
    return (
      <User
        user={user}
        deleteUserDetail={deleteUserDetail}
        isOnline={index & 1}
        key={user.userEmail}
      ></User>
    );
  });
}
