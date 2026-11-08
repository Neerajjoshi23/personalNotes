import AuthContext from "../Context/AuthContext";
import { useState, useEffect, useContext } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../../superbaseclient";
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    // Here you can add logic to fetch the user session and update the state
    const intializeAuth = async () => {
      // fetching from local storage or Supabase session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    intializeAuth();
    // You might also want to handle cleanup or additional logic here if needed
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => {
      subscription.unsubscribe();
    };
    // For example, using Supabase:
    // const session = supabase.auth.session();
    // setSession(session);
    // setUser(session?.user ?? null);
    // setLoading(false);
  }, []);
  return (
    <AuthContext value={{ user, session, loading }}>{children}</AuthContext>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context!;
};
