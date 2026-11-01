import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";

import Home from "./Shared/Pages/Home";
import NotFound from "./Shared/Pages/NotFound";
import GitHubRepoSearch from "./GithubRepoSearch/Pages/GitHubRepoSearch";
import RepoDetails from "./GithubRepoSearch/Pages/RepoDetails";
import UserSearchPage from "./UserSearch/Pages/UserSearchPage";
import UserDetailsDashboard from "./UserSearch/Pages/UserDetailsDashboard";

const queryClient = new QueryClient();

// Premium Layout Wrapper containing Header, Footer, and Radial Glowing Mesh Background
function Layout({ children }) {
  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 font-sans text-slate-200 overflow-hidden selection:bg-blue-500/30 selection:text-blue-200">
      {/* Premium Dark Mesh Radial Lighting Flares */}
      <div className="absolute top-0 left-1/4 -translate-x-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-1/4 translate-x-1/2 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Frosted Glass Header */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-6 md:px-12 py-4 bg-slate-950/40 backdrop-blur-xl border-b border-slate-900/80">
        <Link
          to="/"
          className="text-xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 hover:opacity-90 transition-opacity"
        >
          GitScope
        </Link>
        <nav className="flex gap-6">
          <Link
            to="/"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
          >
            Home
          </Link>
          <Link
            to="/search/repo"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
          >
            Repos
          </Link>
          <Link
            to="/search/user"
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors duration-200"
          >
            Users
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>

      {/* Technical SaaS Footer */}
      <footer className="relative z-10 text-center py-6 border-t border-slate-900/60 text-slate-500 text-xs tracking-wide">
        <p>
          &copy; {new Date().getFullYear()} GitScope. Engine powered by React &
          Tailwind.
        </p>
      </footer>
    </div>
  );
}

// Wrapper to inject Framer Motion page entrance & exit animations
function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageWrapper>
              <Home />
            </PageWrapper>
          }
        />
        <Route
          path="/search/repo"
          element={
            <PageWrapper>
              <GitHubRepoSearch />
            </PageWrapper>
          }
        />
        <Route
          path="/search/user"
          element={
            <PageWrapper>
              <UserSearchPage />
            </PageWrapper>
          }
        />
        <Route
          path="/search/repo/:repo/:owner"
          element={
            <PageWrapper>
              <RepoDetails />
            </PageWrapper>
          }
        />
        <Route
          path="/dashboard/users/:username"
          element={
            <PageWrapper>
              <UserDetailsDashboard />
            </PageWrapper>
          }
        />
        {/* 🚨 ADD THIS CATCH-ALL ROUTE AT THE BOTTOM */}
        <Route
          path="*"
          element={
            <PageWrapper>
              <NotFound />
            </PageWrapper>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

// Fancy animation settings for sliding and fading in elements softly
function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
