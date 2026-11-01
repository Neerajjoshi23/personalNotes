import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  Link,
} from "react-router-dom";
import TodoLayout from "./layouts/TodoLayout.tsx";

const HomePage = () => {
  return (
    <div>
      <h2>Welcome to the Home Page</h2>
      <Link to="/auth">Go to Auth</Link>
      <Link to="/dashboard">Go to Dashboard</Link>
      <Link to="/todo">Go to Todo</Link>
    </div>
  );
};

// === 1. AUTH LAYOUT & COMPONENTS ===
function AuthLayout() {
  return (
    <div className="auth-wrapper">
      <h1>Company Portal</h1>
      <Outlet /> {/* Login / Signup view will inject here */}
    </div>
  );
}

// === 2. DASHBOARD LAYOUT & COMPONENTS ===
function DashboardLayout() {
  return (
    <div className="dashboard-wrapper">
      <aside>
        <nav>
          <Link to="/dashboard">Home</Link>
          <Link to="/dashboard/settings">Settings</Link>
          <Link to="/dashboard/billing">Billing</Link>
        </nav>
      </aside>
      <main>
        <Outlet /> {/* Child views will inject here */}
      </main>
    </div>
  );
}

// Dummy views for the example
const Login = () => <h2>Sign In</h2>;
const Signup = () => <h2>Create Account</h2>;
const DashboardHome = () => <h2>Welcome to your Dashboard</h2>;
const Settings = () => <h2>Account Settings</h2>;
const Billing = () => <h2>Subscription & Billing</h2>;

// === 3. ROUTER CONFIGURATION ===
const router = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />, // Redirect to login for the root path
  },
  // Auth Layout Group
  {
    path: "/auth",
    element: <AuthLayout />,
    children: [
      { index: true, element: <Login /> }, // Matches "/auth" exactly
      { path: "signup", element: <Signup /> }, // Matches "/auth/signup"
    ],
  },
  // Dashboard Layout Group
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardHome /> }, // Matches "/dashboard" exactly
      { path: "settings", element: <Settings /> }, // Matches "/dashboard/settings"
      { path: "billing", element: <Billing /> }, // Matches "/dashboard/billing"
    ],
  },
  {
    path: "/todo",
    element: <TodoLayout />,
  },
]);

// === 4. APP COMPONENT ===
export default function App() {
  return <RouterProvider router={router} />;
}
