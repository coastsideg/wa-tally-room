"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-provider";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "◉", desc: "Election results" },
  { href: "/districts", label: "Districts", icon: "▦", desc: "Booth-level data" },
  { href: "/map", label: "Map", icon: "◎", desc: "Find your electorate" },
  { href: "/entry", label: "Data Entry", icon: "✎", desc: "Scrutineer input" },
  { href: "/admin", label: "Admin", icon: "⚙", desc: "System settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

  const navContent = (
    <>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "16px 8px" : "16px 16px",
        borderBottom: "1px solid var(--border)",
        marginBottom: 8,
      }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontWeight: 700,
            fontSize: collapsed ? 11 : 14, color: "var(--text-primary)",
            letterSpacing: -0.5, lineHeight: 1.2,
            textAlign: collapsed ? "center" : "left",
          }}>
            {collapsed ? "WA" : "WA TALLY"}
          </div>
          {!collapsed && (
            <div style={{
              fontFamily: "var(--font-mono)", fontWeight: 700,
              fontSize: 14, color: "var(--accent-red)",
              letterSpacing: -0.5, lineHeight: 1.2,
            }}>
              ROOM
            </div>
          )}
        </Link>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, padding: "0 8px" }}>
        {NAV_ITEMS.map(item => (
          <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: collapsed ? "10px 8px" : "10px 12px",
              borderRadius: 6, marginBottom: 2,
              background: isActive(item.href) ? "var(--bg-elevated)" : "transparent",
              color: isActive(item.href) ? "var(--text-primary)" : "var(--text-dim)",
              transition: "all 0.15s",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
              onMouseEnter={e => { if (!isActive(item.href)) e.currentTarget.style.background = "var(--bg-surface)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              onMouseLeave={e => { if (!isActive(item.href)) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{item.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", lineHeight: 1.2 }}>{item.desc}</div>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>

      {/* User + collapse */}
      <div style={{ padding: "12px", borderTop: "1px solid var(--border)" }}>
        {!collapsed && user && (
          <div style={{
            fontSize: 10, color: "var(--text-dim)",
            fontFamily: "var(--font-mono)",
            marginBottom: 8, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user.email}
          </div>
        )}
        <div style={{ display: "flex", gap: 4 }}>
          {!collapsed && (
            <button onClick={signOut} style={{
              flex: 1, padding: "6px 10px", fontSize: 11, fontWeight: 500,
              background: "var(--bg-surface)", color: "var(--text-dim)",
              borderRadius: 4, border: "1px solid var(--border)",
              transition: "all 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent-red)"; e.currentTarget.style.color = "var(--accent-red)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
            >
              Sign out
            </button>
          )}
          <button onClick={() => setCollapsed(!collapsed)} style={{
            padding: "6px 8px", fontSize: 12,
            background: "var(--bg-surface)", color: "var(--text-dim)",
            borderRadius: 4, border: "1px solid var(--border)",
          }}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? "▸" : "◂"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(!mobileOpen)} style={{
        display: "none", position: "fixed", top: 10, left: 10, zIndex: 1001,
        background: "var(--bg-elevated)", color: "var(--text-primary)",
        borderRadius: 4, padding: "8px 10px", fontSize: 16, border: "1px solid var(--border)",
      }}
        className="mobile-nav-toggle"
      >
        {mobileOpen ? "✕" : "☰"}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          zIndex: 999, display: "none",
        }} className="mobile-nav-overlay" />
      )}

      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 56 : 200,
        minHeight: "100vh",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        transition: "width 0.2s",
        position: "relative", zIndex: 1000,
        flexShrink: 0,
      }}
        className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}
      >
        {navContent}
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-nav-toggle { display: block !important; }
          .mobile-nav-overlay { display: block !important; }
          .sidebar {
            position: fixed !important;
            left: -260px;
            width: 240px !important;
            transition: left 0.25s !important;
          }
          .sidebar.mobile-open {
            left: 0 !important;
          }
        }
      `}</style>
    </>
  );
}
