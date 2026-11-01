export default function User({ user, deleteUserDetail, isOnline }) {
  return (
    <div>
      {isOnline ? "●" : "○"}
      {user.userName}
      {user.userEmail}
      <button onClick={() => deleteUserDetail(user.userEmail)}>
        Delete User Info
      </button>
    </div>
  );
}
