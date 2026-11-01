import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { MainLayout } from "./components/Layout/MainLayout";
import { Home } from "./Pages/Home";
import { FetchOld } from "./Pages/FetchOld";
import { FetchRQ } from "./Pages/FetchRQ";

import "./App.css";
import { FetchIndv } from "./components/UI/FetchIndv";
import { InfiniteScroll } from "./Pages/InfiniteScroll";

// Create a router
const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/trad",
        element: <FetchOld />,
      },
      {
        path: "/rq",
        element: <FetchRQ />,
      },
      {
        path: "/rq/:id",
        element: <FetchIndv />,
      },
      {
        path: "/infinite",
        element: <InfiniteScroll />,
      },
    ],
  },
]);

const App = () => {
  // we just have a queryclient and have pass it with a provider by wrapping where we need it
  // query client all us to fetch the data you have to pass a unique query key function to fetch
  // and the the fetch function
  // tanquery give you data,isPending,iserrorand error
  // staleTime: how old the data is refetch => assume you have fetch the data it is cache now you have change page or like
  // thing in normal useffect implemenetation it would have trigger a refetch if tanquery will fetch again in same case if the time the data is fetch >staletime ( like it tells for how much time i can trust the data)
  // if it greator then the api call is made now now
  // if the data is same as cache no need to change the ui ( in this case the data will be taken from cache else data will be updated)
  // gcTime or cachetime is just for how much time the cacahe is there
  // NO fetch happen even if both time get over until there is something which is trigerring it but it will not be because of that this time get over and lets fetch assume the perosn is on same page seeing it doing nothing

  // Polling is the techinque to fetch the data when we want to fetch the at given intervals by itself
  // refetchintervals pass as options just simply in useQuery hook
  // refetchIntervalsBakground to let you task in background even if the if you are not in tab but components is mounted on the app screen
  // queryKey: Your dependency array. When pageNumber changes, it acts like a useEffect trigger to find or create a new cache bucket.queryFn: Your API runner. It executes the actual network fetch whenever the query key changes or becomes stale.
  // useQuery for reading and useMutation ( create ,update and Delete)
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router}></RouterProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default App;
