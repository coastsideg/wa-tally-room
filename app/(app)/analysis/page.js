"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";

const PARTY_COLORS = {
  ALP:"#B91C1C",LIB:"#1D4ED8",NAT:"#15803D",GRN:"#16A34A",
  PHON:"#EA580C",IND:"#6B7280",ACP:"#7C3AED",LCWA:"#65A30D",
  SFF:"#92400E",LDP:"#CA8A04",
};
const pc = (code) => PARTY_COLORS[code] || "#6B7280";

export default function AnalysisPage() {
  const [districts, setDistricts] = useState([]);
  const [boothData, setBoothData] = useState({ current: [], compare: [] });
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(2025);
  const [compareYear, setCompareYear] = useState(2021);
  const [swingSlider, setSwingSlider] = useState(0);
  const [tab, setTab] = useState("swings"); // swings, calculator, booths

  // Load districts
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("districts_2029")
        .select("*")
        .order("district_name");
      setDistricts(data || []);
    }
    load();
  }, []);

  // Load booth-level TCP data for both years
  useEffect(() => {
    async function loadBooth() {
      setLoading(true);
      const [{ data: current }, { data: compare }] = await Promise.all([
        supabase.from("booth_results_baseline").select("*")
          .eq("election_year", currentYear).eq("vote_type", "TCP"),
        supabase.from("booth_results_baseline").select("*")
          .eq("election_year", compareYear).eq("vote_type", "TCP"),
      ]);
      setBoothData({ current: current || [], compare: compare || [] });
      setLoading(false);
    }
    loadBooth();
  }, [currentYear, compareYear]);

  // Calculate district-level TCP swings
  const districtSwings = useMemo(() => {
    if (!boothData.current.length || !boothData.compare.length) return [];

    // Aggregate TCP by district and party for current year
    const aggregate = (data) => {
      const byDistrict = {};
      data.forEach(r => {
        if (!byDistrict[r.district_name]) byDistrict[r.district_name] = {};
        byDistrict[r.district_name][r.party_code] = (byDistrict[r.district_name][r.party_code] || 0) + r.votes;
      });
      return byDistrict;
    };

    const currentAgg = aggregate(boothData.current);
    const compareAgg = aggregate(boothData.compare);

    const swings = [];
    for (const district of districts) {
      const name = district.district_name;
      const curr = currentAgg[name];
      const comp = compareAgg[name];
      if (!curr || !comp) continue;

      const currTotal = Object.values(curr).reduce((s, v) => s + v, 0);
      const compTotal = Object.values(comp).reduce((s, v) => s + v, 0);
      if (currTotal === 0 || compTotal === 0) continue;

      // Find ALP percentage in both
      const currALP = (curr["ALP"] || 0) / currTotal * 100;
      const compALP = (comp["ALP"] || 0) / compTotal * 100;
      const swing = currALP - compALP;

      // Find winner info
      const currWinner = Object.entries(curr).sort((a, b) => b[1] - a[1])[0];
      const compWinner = Object.entries(comp).sort((a, b) => b[1] - a[1])[0];

      swings.push({
        name,
        swing,
        currALP,
        compALP,
        currWinner: currWinner[0],
        compWinner: compWinner[0],
        margin: district.margin_2025,
        incumbent: district.incumbent_party,
        changed: currWinner[0] !== compWinner[0],
      });
    }

    return swings.sort((a, b) => a.swing - b.swing);
  }, [districts, boothData]);

  // Booth-level swing outliers
  const boothSwings = useMemo(() => {
    if (!boothData.current.length || !boothData.compare.length) return [];

    // Group by district+booth
    const group = (data) => {
      const g = {};
      data.forEach(r => {
        const key = `${r.district_name}||${r.booth_name}`;
        if (!g[key]) g[key] = { district: r.district_name, booth: r.booth_name, type: r.booth_type, parties: {} };
        g[key].parties[r.party_code] = (g[key].parties[r.party_code] || 0) + r.votes;
      });
      return g;
    };

    const currGroup = group(boothData.current);
    const compGroup = group(boothData.compare);

    const results = [];
    for (const [key, curr] of Object.entries(currGroup)) {
      const comp = compGroup[key];
      if (!comp) continue;

      const currTotal = Object.values(curr.parties).reduce((s, v) => s + v, 0);
      const compTotal = Object.values(comp.parties).reduce((s, v) => s + v, 0);
      if (currTotal < 50 || compTotal < 50) continue; // skip tiny booths

      const currALP = ((curr.parties["ALP"] || 0) / currTotal) * 100;
      const compALP = ((comp.parties["ALP"] || 0) / compTotal) * 100;

      results.push({
        district: curr.district,
        booth: curr.booth,
        type: curr.type,
        swing: currALP - compALP,
        currALP,
        compALP,
        currVotes: currTotal,
      });
    }

    return results.sort((a, b) => a.swing - b.swing);
  }, [boothData]);

  // Stats
  const stats = useMemo(() => {
    if (!districtSwings.length) return null;
    const swings = districtSwings.map(d => d.swing);
    const avg = swings.reduce((s, v) => s + v, 0) / swings.length;
    const median = swings.sort((a, b) => a - b)[Math.floor(swings.length / 2)];
    const toALP = swings.filter(s => s > 0).length;
    const fromALP = swings.filter(s => s < 0).length;
    const biggest_to = districtSwings[districtSwings.length - 1];
    const biggest_from = districtSwings[0];
    const changed = districtSwings.filter(d => d.changed).length;
    return { avg, median, toALP, fromALP, biggest_to, biggest_from, changed };
  }, [districtSwings]);

  // Uniform swing calculator
  const swingResults = useMemo(() => {
    if (!districts.length) return { alp: 0, lib: 0, nat: 0, other: 0, gains: [], losses: [] };
    
    const results = { alp: 0, lib: 0, nat: 0, other: 0, gains: [], losses: [] };
    
    for (const d of districts) {
      const margin = Number(d.margin_2025);
      const party = d.incumbent_party;
      
      // TCP margin from ALP perspective
      const alpMargin = party === "ALP" ? margin : -margin;
      const newAlpMargin = alpMargin + swingSlider;
      
      const winner = newAlpMargin > 0 ? "ALP" : party === "ALP" ? (d.tcp_runner_party_2025 || "LIB") : party;
      
      if (winner === "ALP") results.alp++;
      else if (winner === "LIB") results.lib++;
      else if (winner === "NAT") results.nat++;
      else results.other++;
      
      // Track changes
      if (winner !== party) {
        if (winner === "ALP") {
          results.gains.push({ name: d.district_name, from: party, margin: Math.abs(newAlpMargin).toFixed(1) });
        } else {
          results.losses.push({ name: d.district_name, to: winner, margin: Math.abs(newAlpMargin).toFixed(1) });
        }
      }
    }
    
    results.gains.sort((a, b) => parseFloat(a.margin) - parseFloat(b.margin));
    results.losses.sort((a, b) => parseFloat(a.margin) - parseFloat(b.margin));
    return results;
  }, [districts, swingSlider]);

  if (loading && !districts.length) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading analysis data...</div>;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0 }}>
          Swing Analysis
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
          TCP swing trends · Uniform swing calculator · Booth-level outliers
        </p>
      </div>

      {/* Year selector */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Comparing</span>
          <select value={currentYear} onChange={e => setCurrentYear(parseInt(e.target.value))}
            style={{ fontSize: 12, padding: "5px 8px", fontFamily: "var(--font-mono)" }}>
            <option value={2025}>2025</option>
            <option value={2021}>2021</option>
          </select>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>vs</span>
          <select value={compareYear} onChange={e => setCompareYear(parseInt(e.target.value))}
            style={{ fontSize: 12, padding: "5px 8px", fontFamily: "var(--font-mono)" }}>
            <option value={2021}>2021</option>
            <option value={2017}>2017</option>
          </select>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", marginLeft: "auto" }}>
          {[["swings", "District Swings"], ["calculator", "Swing Calculator"], ["booths", "Booth Outliers"]].map(([v, label]) => (
            <button key={v} onClick={() => setTab(v)} style={{
              padding: "6px 14px", fontSize: 11,
              background: tab === v ? "var(--bg-elevated)" : "transparent",
              color: tab === v ? "var(--text-primary)" : "var(--text-dim)",
              borderRight: "1px solid var(--border)", fontWeight: tab === v ? 600 : 400,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: 20, textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
          Loading TCP data...
        </div>
      )}

      {/* ===== DISTRICT SWINGS TAB ===== */}
      {tab === "swings" && !loading && stats && (
        <div>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, marginBottom: 20 }}>
            {[
              { label: "Average Swing", value: `${stats.avg > 0 ? "+" : ""}${stats.avg.toFixed(1)}%`, sub: "to ALP", color: stats.avg > 0 ? "#B91C1C" : "#1D4ED8" },
              { label: "Median Swing", value: `${stats.median > 0 ? "+" : ""}${stats.median.toFixed(1)}%`, sub: "to ALP", color: stats.median > 0 ? "#B91C1C" : "#1D4ED8" },
              { label: "Swing to ALP", value: stats.toALP, sub: "districts", color: "#B91C1C" },
              { label: "Swing from ALP", value: stats.fromALP, sub: "districts", color: "#1D4ED8" },
              { label: "Seats Changed", value: stats.changed, sub: "hands", color: "#F59E0B" },
            ].map(card => (
              <div key={card.label} style={{
                padding: "12px 14px", background: "var(--bg-surface)",
                border: "1px solid var(--border)", borderRadius: 6,
              }}>
                <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>{card.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "var(--font-mono)", color: card.color, marginTop: 4 }}>{card.value}</div>
                <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{card.sub}</div>
              </div>
            ))}
          </div>

          {/* Swing chart - horizontal bars */}
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "14px 18px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
              TCP Swing by District ({currentYear} vs {compareYear})
            </div>
            <div style={{ display: "flex", fontSize: 9, color: "var(--text-faint)", marginBottom: 6, justifyContent: "space-between" }}>
              <span>← Swing to LIB/NAT</span>
              <span>Swing to ALP →</span>
            </div>
            {districtSwings.map(d => {
              const maxSwing = 25;
              const barWidth = Math.min(Math.abs(d.swing), maxSwing) / maxSwing * 50;
              const isPositive = d.swing > 0;
              return (
                <div key={d.name} style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 50px",
                  alignItems: "center", gap: 8, padding: "2px 0",
                  borderBottom: "1px solid var(--bg-base)",
                }}>
                  <div style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                    color: d.changed ? "var(--accent-amber)" : "var(--text-muted)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {d.name}
                  </div>
                  <div style={{ position: "relative", height: 14 }}>
                    <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "var(--border-bright)" }} />
                    <div style={{
                      position: "absolute",
                      height: 10, top: 2, borderRadius: 2,
                      background: isPositive ? "#B91C1C" : "#1D4ED8",
                      ...(isPositive
                        ? { left: "50%", width: `${barWidth}%` }
                        : { right: "50%", width: `${barWidth}%` }
                      ),
                      transition: "width 0.3s",
                    }} />
                  </div>
                  <div style={{
                    fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 600,
                    textAlign: "right",
                    color: isPositive ? "#B91C1C" : "#1D4ED8",
                  }}>
                    {d.swing > 0 ? "+" : ""}{d.swing.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== SWING CALCULATOR TAB ===== */}
      {tab === "calculator" && (
        <div>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "20px 24px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
              Uniform Swing Calculator
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 16 }}>
              Apply a uniform TCP swing across all seats to see projected seat counts. Based on 2025 margins.
            </div>

            {/* Slider */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 10, color: "#1D4ED8" }}>← To LIB/NAT</span>
                <span style={{
                  fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)",
                  color: swingSlider > 0 ? "#B91C1C" : swingSlider < 0 ? "#1D4ED8" : "var(--text-muted)",
                }}>
                  {swingSlider > 0 ? "+" : ""}{swingSlider.toFixed(1)}%
                </span>
                <span style={{ fontSize: 10, color: "#B91C1C" }}>To ALP →</span>
              </div>
              <input type="range" min="-15" max="15" step="0.5" value={swingSlider}
                onChange={e => setSwingSlider(parseFloat(e.target.value))}
                style={{ width: "100%", accentColor: "var(--accent-amber)" }}
              />
              <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}>
                <button onClick={() => setSwingSlider(0)} style={{
                  padding: "4px 12px", fontSize: 10, background: "var(--bg-elevated)",
                  color: "var(--text-dim)", borderRadius: 3, border: "1px solid var(--border)",
                }}>Reset to 0</button>
              </div>
            </div>

            {/* Results bar */}
            <div style={{ display: "flex", gap: 16, justifyContent: "center", marginBottom: 12, flexWrap: "wrap" }}>
              {[
                { party: "ALP", count: swingResults.alp, color: "#B91C1C" },
                { party: "LIB", count: swingResults.lib, color: "#1D4ED8" },
                { party: "NAT", count: swingResults.nat, color: "#15803D" },
              ].filter(p => p.count > 0).map(p => (
                <div key={p.party} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-mono)", color: p.color }}>
                    {p.count}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{p.party}</div>
                </div>
              ))}
            </div>

            {/* Seat bar */}
            <div style={{ display: "flex", height: 20, borderRadius: 4, overflow: "hidden", position: "relative" }}>
              {swingResults.alp > 0 && <div style={{ width: `${(swingResults.alp / 59) * 100}%`, background: "#B91C1C", transition: "width 0.3s" }} />}
              {swingResults.lib > 0 && <div style={{ width: `${(swingResults.lib / 59) * 100}%`, background: "#1D4ED8", transition: "width 0.3s" }} />}
              {swingResults.nat > 0 && <div style={{ width: `${(swingResults.nat / 59) * 100}%`, background: "#15803D", transition: "width 0.3s" }} />}
              {swingResults.other > 0 && <div style={{ width: `${(swingResults.other / 59) * 100}%`, background: "#6B7280", transition: "width 0.3s" }} />}
              <div style={{ position: "absolute", left: `${(30 / 59) * 100}%`, top: 0, width: 2, height: "100%", background: "#F59E0B", zIndex: 2 }} />
            </div>
            <div style={{ fontSize: 9, color: "var(--text-faint)", textAlign: "center", marginTop: 4 }}>
              Majority: 30
            </div>
          </div>

          {/* Gains and losses */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* ALP Gains */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#B91C1C", marginBottom: 8 }}>
                ALP Gains ({swingResults.gains.length})
              </div>
              {swingResults.gains.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No gains at this swing</div>
              ) : swingResults.gains.map(g => (
                <div key={g.name} style={{
                  display: "flex", justifyContent: "space-between", padding: "4px 0",
                  borderBottom: "1px solid var(--bg-base)", fontSize: 11,
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>{g.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>
                    from {g.from} · {g.margin}%
                  </span>
                </div>
              ))}
            </div>

            {/* ALP Losses */}
            <div style={{
              background: "var(--bg-surface)", border: "1px solid var(--border)",
              borderRadius: 6, padding: "14px 16px",
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#1D4ED8", marginBottom: 8 }}>
                ALP Losses ({swingResults.losses.length})
              </div>
              {swingResults.losses.length === 0 ? (
                <div style={{ fontSize: 11, color: "var(--text-dim)" }}>No losses at this swing</div>
              ) : swingResults.losses.map(l => (
                <div key={l.name} style={{
                  display: "flex", justifyContent: "space-between", padding: "4px 0",
                  borderBottom: "1px solid var(--bg-base)", fontSize: 11,
                }}>
                  <span style={{ color: "var(--text-secondary)" }}>{l.name}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>
                    to {l.to} · {l.margin}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== BOOTH OUTLIERS TAB ===== */}
      {tab === "booths" && !loading && (
        <div>
          <div style={{
            background: "var(--bg-surface)", border: "1px solid var(--border)",
            borderRadius: 6, padding: "14px 18px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              Booth-Level Swing Outliers ({currentYear} vs {compareYear})
            </div>
            <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>
              Booths with the biggest swings — these buck the district-level trend and reveal local patterns.
              Only booths with 50+ TCP votes in both elections are shown.
            </div>

            {/* Biggest swings to ALP */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#B91C1C", marginBottom: 6 }}>
                Top 20 Swings to ALP
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {["Booth", "District", "Type", `${compareYear}`, `${currentYear}`, "Swing"].map(h => (
                        <th key={h} style={{
                          padding: "5px 6px", fontSize: 9, color: "var(--text-faint)",
                          textAlign: h === "Booth" || h === "District" ? "left" : "right",
                          borderBottom: "1px solid var(--border)", textTransform: "uppercase",
                          letterSpacing: 0.5, fontWeight: 600,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boothSwings.slice(-20).reverse().map((b, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--bg-base)" }}>
                        <td style={{ padding: "4px 6px", color: "var(--text-secondary)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.booth}</td>
                        <td style={{ padding: "4px 6px", color: "var(--text-dim)", fontSize: 10 }}>{b.district}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 9 }}>{b.type}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>{b.compALP.toFixed(1)}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{b.currALP.toFixed(1)}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#B91C1C" }}>+{b.swing.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Biggest swings from ALP */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#1D4ED8", marginBottom: 6 }}>
                Top 20 Swings from ALP
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr>
                      {["Booth", "District", "Type", `${compareYear}`, `${currentYear}`, "Swing"].map(h => (
                        <th key={h} style={{
                          padding: "5px 6px", fontSize: 9, color: "var(--text-faint)",
                          textAlign: h === "Booth" || h === "District" ? "left" : "right",
                          borderBottom: "1px solid var(--border)", textTransform: "uppercase",
                          letterSpacing: 0.5, fontWeight: 600,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boothSwings.slice(0, 20).map((b, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--bg-base)" }}>
                        <td style={{ padding: "4px 6px", color: "var(--text-secondary)", fontWeight: 500, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.booth}</td>
                        <td style={{ padding: "4px 6px", color: "var(--text-dim)", fontSize: 10 }}>{b.district}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", color: "var(--text-faint)", fontFamily: "var(--font-mono)", fontSize: 9 }}>{b.type}</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }}>{b.compALP.toFixed(1)}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }}>{b.currALP.toFixed(1)}%</td>
                        <td style={{ padding: "4px 6px", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "#1D4ED8" }}>{b.swing.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
