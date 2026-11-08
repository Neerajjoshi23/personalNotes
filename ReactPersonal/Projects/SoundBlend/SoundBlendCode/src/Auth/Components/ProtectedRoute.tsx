import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../Provider/AuthProvider";
import { t } from "../../SearchPage/constants/messages";

export default function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center gap-3 text-sm text-zinc-400">
        <span className="size-5 animate-spin rounded-full border-2 border-white/10 border-t-indigo-400" />
        {t("auth.loading")}
      </div>
    );
  }
  if (!session) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
