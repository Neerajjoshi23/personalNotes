import { createContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType | null>(null);
export default AuthContext;
