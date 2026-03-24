"use client";
import { useAuth } from "./auth-provider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "var(--bg-base)",
        fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-dim)"
      }}>
        Loading...
      </div>
    );
  }

  if (!user) return null;
  return children;
}
