"use client";

export default function MapPage() {
  return (
    <div style={{ padding: "20px 24px" }}>
      <h1 style={{
        fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
        fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0,
      }}>
        Electorate Map
      </h1>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, marginBottom: 24 }}>
        Find your electorate · District boundaries · Booth locations
      </p>

      <div style={{
        padding: 60, textAlign: "center",
        border: "1px dashed var(--border)", borderRadius: 8,
        background: "var(--bg-surface)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
          Interactive Map Coming Soon
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", maxWidth: 300, margin: "0 auto" }}>
          Enter your address to find your electorate, view district boundaries, and see booth locations across WA.
        </div>
      </div>
    </div>
  );
}
