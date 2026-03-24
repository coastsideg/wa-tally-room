"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push("/dashboard");
      else setCheckingSession(false);
    });
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email, password,
      });
      if (authError) throw authError;
      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: "#020617",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#64748B"
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#020617",
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{
        width: "100%", maxWidth: 380, padding: 32,
        background: "#0F172A", borderRadius: 8,
        border: "1px solid #1E293B",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
            fontSize: 22, color: "#F8FAFC", letterSpacing: -0.5,
          }}>
            WA TALLY <span style={{ color: "#B91C1C" }}>ROOM</span>
          </div>
          <div style={{
            fontSize: 12, color: "#64748B", marginTop: 6,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            Election Results Dashboard
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              color: "#94A3B8", marginBottom: 6, textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" required autoFocus
              style={{
                width: "100%", padding: "10px 12px", fontSize: 13,
                background: "#020617", border: "1px solid #1E293B",
                borderRadius: 4, color: "#E2E8F0", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#334155"}
              onBlur={e => e.target.style.borderColor = "#1E293B"}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{
              display: "block", fontSize: 11, fontWeight: 600,
              color: "#94A3B8", marginBottom: 6, textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: "100%", padding: "10px 12px", fontSize: 13,
                background: "#020617", border: "1px solid #1E293B",
                borderRadius: 4, color: "#E2E8F0", outline: "none",
              }}
              onFocus={e => e.target.style.borderColor = "#334155"}
              onBlur={e => e.target.style.borderColor = "#1E293B"}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 12px", marginBottom: 16, borderRadius: 4,
              background: "rgba(185, 28, 28, 0.1)", border: "1px solid rgba(185, 28, 28, 0.3)",
              fontSize: 12, color: "#FCA5A5",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "10px 16px", fontSize: 13, fontWeight: 600,
            background: loading ? "#1E293B" : "#B91C1C",
            color: loading ? "#64748B" : "#FFFFFF",
            borderRadius: 4, border: "none", cursor: loading ? "wait" : "pointer",
            fontFamily: "'Inter', sans-serif",
            transition: "all 0.15s",
          }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = "#991B1B"; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = "#B91C1C"; }}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div style={{
          textAlign: "center", marginTop: 24, fontSize: 10,
          color: "#334155", fontFamily: "'JetBrains Mono', monospace",
        }}>
          WA Labor · Internal Use Only
        </div>
      </div>
    </div>
  );
}
