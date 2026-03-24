"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";

const PARTY_COLORS = {
  ALP:"#B91C1C",LIB:"#1D4ED8",NAT:"#15803D",GRN:"#16A34A",
  PHON:"#EA580C",IND:"#6B7280",ACP:"#7C3AED",LCWA:"#65A30D",
  SFF:"#92400E",LDP:"#CA8A04",WAP:"#0D9488",SA:"#DC2626",
  NMV:"#9CA3AF",WAXIT:"#9CA3AF",AJP:"#0891B2",LFC:"#0EA5E9",
  LBRT:"#CA8A04",IND2:"#6B7280",FFP:"#9CA3AF",FUS:"#9CA3AF",
  SBP:"#9CA3AF",MWA:"#9CA3AF",FTS:"#9CA3AF",SPPK:"#9CA3AF",
  SAP:"#0D9488",CHR:"#7C3AED",
};
const pc = (code) => PARTY_COLORS[code] || "#6B7280";

const YEARS = [2025, 2021, 2017];

export default function DistrictsPage() {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2025);
  const [compareYear, setCompareYear] = useState(null);
  const [boothData, setBoothData] = useState([]);
  const [compareData, setCompareData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boothLoading, setBoothLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [voteTypeFilter, setVoteTypeFilter] = useState("FIRST_PREF");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("districts_2029")
        .select("*")
        .order("district_name");
      setDistricts(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const loadBoothData = async (districtName) => {
    setBoothLoading(true);
    setSelectedDistrict(districtName);

    const { data } = await supabase
      .from("booth_results_baseline")
      .select("*")
      .eq("election_year", selectedYear)
      .eq("district_name", districtName)
      .order("booth_name")
      .order("votes", { ascending: false });

    setBoothData(data || []);

    if (compareYear) {
      const { data: cData } = await supabase
        .from("booth_results_baseline")
        .select("*")
        .eq("election_year", compareYear)
        .eq("district_name", districtName)
        .order("booth_name")
        .order("votes", { ascending: false });
      setCompareData(cData || []);
    } else {
      setCompareData([]);
    }

    setBoothLoading(false);
  };

  useEffect(() => {
    if (selectedDistrict) loadBoothData(selectedDistrict);
  }, [selectedYear, compareYear]);

  const filtered = useMemo(() => {
    if (!search) return districts;
    return districts.filter(d =>
      d.district_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [districts, search]);

  const boothGroups = useMemo(() => {
    const groups = {};
    boothData.filter(r => r.vote_type === voteTypeFilter).forEach(row => {
      if (!groups[row.booth_name]) groups[row.booth_name] = { type: row.booth_type, candidates: [] };
      groups[row.booth_name].candidates.push(row);
    });
    return groups;
  }, [boothData, voteTypeFilter]);

  const compareGroups = useMemo(() => {
    const groups = {};
    compareData.filter(r => r.vote_type === voteTypeFilter).forEach(row => {
      if (!groups[row.booth_name]) groups[row.booth_name] = { type: row.booth_type, candidates: [] };
      groups[row.booth_name].candidates.push(row);
    });
    return groups;
  }, [compareData, voteTypeFilter]);

  const districtSummary = useMemo(() => {
    const fpData = boothData.filter(r => r.vote_type === "FIRST_PREF");
    const tcpData = boothData.filter(r => r.vote_type === "TCP");
    const fpByParty = {};
    fpData.forEach(r => { fpByParty[r.party_code] = (fpByParty[r.party_code] || 0) + r.votes; });
    const tcpByParty = {};
    tcpData.forEach(r => { tcpByParty[r.party_code] = (tcpByParty[r.party_code] || 0) + r.votes; });
    const totalFP = Object.values(fpByParty).reduce((s, v) => s + v, 0);
    const totalTCP = Object.values(tcpByParty).reduce((s, v) => s + v, 0);
    const boothCount = new Set(fpData.map(r => r.booth_name)).size;
    return {
      fpByParty: Object.entries(fpByParty).map(([p, v]) => ({ party: p, votes: v, pct: totalFP > 0 ? (v / totalFP) * 100 : 0 })).sort((a, b) => b.votes - a.votes),
      tcpByParty: Object.entries(tcpByParty).map(([p, v]) => ({ party: p, votes: v, pct: totalTCP > 0 ? (v / totalTCP) * 100 : 0 })).sort((a, b) => b.votes - a.votes),
      totalFP, totalTCP, boothCount,
    };
  }, [boothData]);

  const getBoothSwing = (boothName) => {
    const current = boothGroups[boothName];
    const compare = compareGroups[boothName];
    if (!current || !compare) return null;
    const currentTotal = current.candidates.reduce((s, c) => s + c.votes, 0);
    const compareTotal = compare.candidates.reduce((s, c) => s + c.votes, 0);
    if (currentTotal === 0 || compareTotal === 0) return null;
    const currentALP = current.candidates.find(c => c.party_code === "ALP");
    const compareALP = compare.candidates.find(c => c.party_code === "ALP");
    if (!currentALP || !compareALP) return null;
    return ((currentALP.votes / currentTotal) * 100) - ((compareALP.votes / compareTotal) * 100);
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading districts...</div>;
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1400 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0 }}>
          Districts & Booth Data
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
          Booth-level results across 3 elections · {districts.length} districts
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {YEARS.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: selectedYear === y ? 700 : 500,
              background: selectedYear === y ? "var(--bg-elevated)" : "transparent",
              color: selectedYear === y ? "var(--text-primary)" : "var(--text-dim)",
              borderRight: "1px solid var(--border)", fontFamily: "var(--font-mono)",
            }}>{y}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "var(--text-dim)" }}>Compare:</span>
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
            <button onClick={() => setCompareYear(null)} style={{
              padding: "6px 10px", fontSize: 11,
              background: compareYear === null ? "var(--bg-elevated)" : "transparent",
              color: compareYear === null ? "var(--text-primary)" : "var(--text-dim)",
              borderRight: "1px solid var(--border)",
            }}>Off</button>
            {YEARS.filter(y => y !== selectedYear).map(y => (
              <button key={y} onClick={() => setCompareYear(y)} style={{
                padding: "6px 10px", fontSize: 11, fontFamily: "var(--font-mono)",
                background: compareYear === y ? "var(--bg-elevated)" : "transparent",
                color: compareYear === y ? "var(--accent-amber)" : "var(--text-dim)",
                borderRight: "1px solid var(--border)",
              }}>vs {y}</button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
          {[["FIRST_PREF", "First Pref"], ["TCP", "TCP"]].map(([v, label]) => (
            <button key={v} onClick={() => setVoteTypeFilter(v)} style={{
              padding: "6px 12px", fontSize: 11,
              background: voteTypeFilter === v ? "var(--bg-elevated)" : "transparent",
              color: voteTypeFilter === v ? "var(--text-primary)" : "var(--text-dim)",
              borderRight: "1px solid var(--border)",
            }}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* District list */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <input type="text" placeholder="Search districts..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 8, fontSize: 12, padding: "8px 10px" }} />
          <div style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto", border: "1px solid var(--border)", borderRadius: 4 }}>
            {filtered.map(d => (
              <div key={d.district_id} onClick={() => loadBoothData(d.district_name)}
                style={{
                  padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid var(--border)",
                  background: selectedDistrict === d.district_name ? "var(--bg-elevated)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (selectedDistrict !== d.district_name) e.currentTarget.style.background = "var(--bg-surface)"; }}
                onMouseLeave={e => { if (selectedDistrict !== d.district_name) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 16, borderRadius: 2, background: pc(d.incumbent_party), flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{d.district_name}</div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {d.incumbent_party} +{Number(d.margin_2025).toFixed(1)}% · {d.total_booths} booths
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Booth detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedDistrict ? (
            <div style={{
              padding: 60, textAlign: "center", color: "var(--text-dim)",
              fontFamily: "var(--font-mono)", fontSize: 12,
              border: "1px dashed var(--border)", borderRadius: 6,
            }}>
              Select a district to view booth-level results
            </div>
          ) : boothLoading ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
              Loading {selectedDistrict}...
            </div>
          ) : (
            <div>
              {/* Summary card */}
              <div style={{
                padding: "14px 18px", marginBottom: 16,
                background: "var(--bg-surface)", borderRadius: 6, border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {selectedDistrict}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                      {selectedYear} · {districtSummary.boothCount} booths · {districtSummary.totalFP.toLocaleString()} first pref votes
                      {compareYear && <span style={{ color: "var(--accent-amber)" }}> · comparing vs {compareYear}</span>}
                    </div>
                  </div>
                  {districtSummary.tcpByParty.length >= 2 && (
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      {districtSummary.tcpByParty.slice(0, 2).map(p => (
                        <div key={p.party} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "var(--font-mono)", color: pc(p.party) }}>
                            {p.pct.toFixed(1)}%
                          </div>
                          <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{p.party}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 12 }}>
                  {districtSummary.fpByParty.map((p, i) => (
                    <div key={i} style={{ width: `${p.pct}%`, background: pc(p.party) }} title={`${p.party}: ${p.pct.toFixed(1)}%`} />
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                  {districtSummary.fpByParty.filter(p => p.pct >= 2).map(p => (
                    <div key={p.party} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 1, background: pc(p.party) }} />
                      <span style={{ color: pc(p.party), fontWeight: 600, fontFamily: "var(--font-mono)" }}>{p.party}</span>
                      <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>{p.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Column headers when comparing */}
              {compareYear && Object.keys(boothGroups).length > 0 && (
                <div style={{
                  display: "flex", justifyContent: "flex-end", padding: "0 12px 4px",
                  fontSize: 9, color: "var(--text-faint)", fontFamily: "var(--font-mono)",
                  textTransform: "uppercase", letterSpacing: 0.5, gap: 6,
                }}>
                  <span style={{ width: 36, textAlign: "right" }}>Party</span>
                  <span style={{ width: 46, textAlign: "right" }}>Votes</span>
                  <span style={{ width: 44, textAlign: "right" }}>Pct</span>
                  <span style={{ width: 52, textAlign: "right" }}>Swing</span>
                </div>
              )}

              {/* Booth cards */}
              {Object.entries(boothGroups).map(([boothName, booth]) => {
                const totalVotes = booth.candidates.reduce((s, c) => s + c.votes, 0);
                const swing = compareYear ? getBoothSwing(boothName) : null;
                const compareBooth = compareGroups[boothName];
                const compareTotalVotes = compareBooth ? compareBooth.candidates.reduce((s, c) => s + c.votes, 0) : 0;

                return (
                  <div key={boothName} style={{
                    marginBottom: 6, background: "var(--bg-surface)",
                    borderRadius: 4, border: "1px solid var(--border)", overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "7px 12px", display: "flex", justifyContent: "space-between", alignItems: "center",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{boothName}</span>
                        <span style={{
                          fontSize: 9, color: "var(--text-faint)", fontFamily: "var(--font-mono)",
                          textTransform: "uppercase", padding: "1px 5px", background: "var(--bg-base)", borderRadius: 2,
                        }}>{booth.type}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {swing !== null && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, fontFamily: "var(--font-mono)",
                            color: swing > 0 ? "#B91C1C" : swing < 0 ? "#1D4ED8" : "var(--text-dim)",
                            padding: "1px 6px", borderRadius: 2,
                            background: swing > 0 ? "rgba(185,28,28,0.12)" : swing < 0 ? "rgba(29,78,216,0.12)" : "transparent",
                          }}>
                            {swing > 0 ? "+" : ""}{swing.toFixed(1)}% ALP
                          </span>
                        )}
                        {!compareBooth && compareYear && (
                          <span style={{ fontSize: 9, color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>new</span>
                        )}
                        <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                          {totalVotes.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", height: 4 }}>
                      {booth.candidates.map((c, i) => (
                        <div key={i} style={{ width: `${totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0}%`, background: pc(c.party_code) }} />
                      ))}
                    </div>

                    <div style={{ padding: "5px 12px" }}>
                      {booth.candidates.map((c, i) => {
                        const pct = totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0;
                        let swingVal = null;
                        if (compareBooth && compareTotalVotes > 0) {
                          const cc = compareBooth.candidates.find(x => x.party_code === c.party_code);
                          if (cc) swingVal = pct - ((cc.votes / compareTotalVotes) * 100);
                        }
                        return (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", fontSize: 11 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 1, background: pc(c.party_code), flexShrink: 0 }} />
                            <span style={{ color: "var(--text-secondary)", flex: 1 }}>{c.candidate_name}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: pc(c.party_code), fontWeight: 600, width: 36, textAlign: "right" }}>{c.party_code}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)", width: 46, textAlign: "right" }}>{c.votes.toLocaleString()}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-secondary)", width: 44, textAlign: "right", fontWeight: 600 }}>{pct.toFixed(1)}%</span>
                            {compareYear && (
                              <span style={{
                                fontFamily: "var(--font-mono)", fontSize: 10, width: 52, textAlign: "right",
                                color: swingVal === null ? "var(--text-faint)" : swingVal > 0.5 ? "#4ADE80" : swingVal < -0.5 ? "#F87171" : "var(--text-dim)",
                                fontWeight: swingVal !== null && Math.abs(swingVal) > 0.5 ? 600 : 400,
                              }}>
                                {swingVal === null ? "\u2014" : `${swingVal > 0 ? "+" : ""}${swingVal.toFixed(1)}`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {Object.keys(boothGroups).length === 0 && (
                <div style={{
                  padding: 40, textAlign: "center", color: "var(--text-dim)",
                  fontFamily: "var(--font-mono)", fontSize: 12,
                  border: "1px dashed var(--border)", borderRadius: 6,
                }}>
                  No {voteTypeFilter === "TCP" ? "TCP" : "first preference"} booth data for {selectedDistrict} in {selectedYear}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
