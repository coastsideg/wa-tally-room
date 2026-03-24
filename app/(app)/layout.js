"use client";
import { AuthProvider } from "../components/auth-provider";
import { AuthGuard } from "../components/auth-guard";
import { Sidebar } from "../components/sidebar";

export default function AppLayout({ children }) {
  return (
    <AuthProvider>
      <AuthGuard>
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
            {children}
          </main>
        </div>
      </AuthGuard>
    </AuthProvider>
  );
}
