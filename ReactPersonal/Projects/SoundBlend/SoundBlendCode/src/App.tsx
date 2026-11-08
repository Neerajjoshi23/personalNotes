import { createBrowserRouter, RouterProvider } from "react-router-dom";
import React, { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./Layout/AppLayout";
import NotFoundPage from "./HomePage/NotFoundPage";
import ErrorBoundary from "./components/ErrorBoundary";
import { AuthProvider } from "./Auth/Provider/AuthProvider";
import ProtectedRoute from "./Auth/Components/ProtectedRoute";
const SignInPage = lazy(() =>
  import("./Auth/Pages/SignInPage").then((module) => ({
    default: module.SignInPage,
  })),
);
const SignUpPage = lazy(() =>
  import("./Auth/Pages/SignUpPage").then((module) => ({
    default: module.SignUpPage,
  })),
);
const SearchPage = lazy(() => import("./SearchPage/Pages/SearchPage"));
const HomePage = lazy(() => import("./HomePage/HomePage"));
const DetailPage = lazy(() => import("./SearchPage/Pages/DetailPage"));
const BlendPage = lazy(() => import("./BlendPage/Pages/BlendPage"));

const wrapInSuspense = (component: React.ReactNode) => {
  return <Suspense fallback={<div>Loading...</div>}>{component}</Suspense>;
};
const wrapWithBoundary = (component: React.ReactNode) => (
  <ErrorBoundary>{wrapInSuspense(component)}</ErrorBoundary>
);
const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: wrapInSuspense(<HomePage />) },
      { path: "/signin", element: wrapWithBoundary(<SignInPage />) },
      { path: "/signup", element: wrapWithBoundary(<SignUpPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/Search", element: wrapWithBoundary(<SearchPage />) },
          {
            path: "/Search/:kind/:id",
            element: wrapWithBoundary(<DetailPage />),
          },
          { path: "/Blend", element: wrapWithBoundary(<BlendPage />) },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
