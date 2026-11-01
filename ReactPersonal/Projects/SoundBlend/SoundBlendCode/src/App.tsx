import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./Layout/AppLayout";
import HomePage from "./HomePage/HomePage";
import NotFoundPage from "./HomePage/NotFoundPage";
import SearchPage from "./SearchPage/Pages/SearchPage";
import DetailPage from "./SearchPage/Pages/DetailPage";
const BlendPage = lazy(() => import("./BlendPage/Pages/BlendPage"));

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/Search", element: <SearchPage /> },
      { path: "/Search/:kind/:id", element: <DetailPage /> },
      {
        path: "/Blend",
        element: (
          <Suspense fallback={<div>Loading...</div>}>
            <BlendPage />
          </Suspense>
        ),
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
