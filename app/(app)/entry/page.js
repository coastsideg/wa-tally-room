"use client";

export default function EntryPage() {
  return (
    <div style={{ padding: "20px 24px" }}>
      <h1 style={{
        fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
        fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0,
      }}>
        Scrutineer Data Entry
      </h1>
      <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4, marginBottom: 24 }}>
        Election night booth result entry · Mobile-optimised
      </p>

      <div style={{
        padding: 60, textAlign: "center",
        border: "1px dashed var(--border)", borderRadius: 8,
        background: "var(--bg-surface)",
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✎</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>
          Data Entry — Election Night 2029
        </div>
        <div style={{ fontSize: 11, color: "var(--text-dim)", maxWidth: 340, margin: "0 auto" }}>
          Scrutineers will use this form to enter booth-level results on election night. Select your assigned district and booth, then enter candidate vote counts. Available closer to election night.
        </div>
      </div>
    </div>
  );
}
