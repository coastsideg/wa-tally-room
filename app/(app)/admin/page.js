"use client";
import { useAuth } from "../../components/auth-provider";

export default function AdminPage() {
  const { user } = useAuth();

  return (
    <div style={{ padding: "20px 24px" }}>
      <h1 style={{
        fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
        fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0,
      }}>
        Admin Panel
      </h1>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, marginBottom: 24 }}>
        System settings · User management · WAEC feed configuration
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {[
          { icon: "👥", title: "User Management", desc: "Create scrutineer accounts, assign booths, manage roles" },
          { icon: "📡", title: "WAEC Feed", desc: "Configure XML polling endpoint, interval, and monitoring" },
          { icon: "🗳", title: "Seat Calls", desc: "Make and update seat calls on election night" },
          { icon: "📊", title: "Data Import", desc: "Upload WAEC data, boundary files, candidate lists" },
          { icon: "🔄", title: "Redistribution", desc: "Upload new boundary shapefiles and remap booths" },
          { icon: "⚡", title: "System Status", desc: "WAEC poll log, active connections, data freshness" },
        ].map(card => (
          <div key={card.title} style={{
            padding: "16px 18px", background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 6,
            cursor: "pointer", transition: "border-color 0.15s",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--border-bright)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{card.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", lineHeight: 1.4 }}>{card.desc}</div>
          </div>
        ))}
      </div>

      {user && (
        <div style={{
          marginTop: 24, padding: "12px 16px", background: "var(--bg-surface)",
          borderRadius: 6, border: "1px solid var(--border)",
          fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)",
        }}>
          Logged in as: {user.email}
        </div>
      )}
    </div>
  );
}
