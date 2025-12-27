"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signOut: async () => {},
});

export function AuthProvider({
  children,
  supabaseUrl,
  supabaseAnonKey,
}: {
  children: React.ReactNode;
  supabaseUrl: string;
  supabaseAnonKey: string;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  const [supabase] = useState(() =>
    createBrowserClient(supabaseUrl, supabaseAnonKey)
  );

  useEffect(() => {
    // Initial check
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      setIsLoading(false);

      if (event === "SIGNED_OUT") {
        queryClient.clear();
        queryClient.resetQueries();
        toast.success("已退出登录");
        router.push("/chat");
      }
      
      if (event === "SIGNED_IN") {
          // Could redirect if needed, but usually handled by component logic
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, queryClient, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange SIGNED_OUT will handle the rest
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

