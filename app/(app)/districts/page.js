"use client";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "../../supabase";

const pc = (code) => ({
  ALP:"#B91C1C",LIB:"#1D4ED8",NAT:"#15803D",GRN:"#16A34A",
  PHON:"#EA580C",IND:"#6B7280",ACP:"#7C3AED",LCWA:"#65A30D",
}[code] || "#6B7280");

export default function DistrictsPage() {
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [boothData, setBoothData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boothLoading, setBoothLoading] = useState(false);
  const [search, setSearch] = useState("");

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
      .eq("election_year", 2025)
      .eq("district_name", districtName)
      .eq("vote_type", "FIRST_PREF")
      .order("booth_name")
      .order("votes", { ascending: false });

    setBoothData(data || []);
    setBoothLoading(false);
  };

  const filtered = useMemo(() => {
    if (!search) return districts;
    return districts.filter(d =>
      d.district_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [districts, search]);

  // Group booth data by booth name
  const boothGroups = useMemo(() => {
    const groups = {};
    boothData.forEach(row => {
      if (!groups[row.booth_name]) {
        groups[row.booth_name] = { type: row.booth_type, candidates: [] };
      }
      groups[row.booth_name].candidates.push(row);
    });
    return groups;
  }, [boothData]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
        Loading districts...
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
          fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0,
        }}>
          Districts & Booth Data
        </h1>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>
          2025 baseline booth-level results · {districts.length} districts · Click a district to explore booths
        </p>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* District list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <input
            type="text" placeholder="Search districts..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", marginBottom: 8, fontSize: 12, padding: "8px 10px" }}
          />
          <div style={{
            maxHeight: "calc(100vh - 180px)", overflowY: "auto",
            border: "1px solid var(--border)", borderRadius: 4,
          }}>
            {filtered.map(d => (
              <div key={d.district_id} onClick={() => loadBoothData(d.district_name)}
                style={{
                  padding: "10px 12px", cursor: "pointer",
                  borderBottom: "1px solid var(--border)",
                  background: selectedDistrict === d.district_name ? "var(--bg-elevated)" : "transparent",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (selectedDistrict !== d.district_name) e.currentTarget.style.background = "var(--bg-surface)"; }}
                onMouseLeave={e => { if (selectedDistrict !== d.district_name) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 4, height: 16, borderRadius: 2,
                    background: pc(d.incumbent_party), flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                      {d.district_name}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                      {d.incumbent_party} {d.margin_2025 != null ? `+${Number(d.margin_2025).toFixed(1)}%` : ""} · {d.total_booths} booths
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
              Loading booth data for {selectedDistrict}...
            </div>
          ) : (
            <div>
              <div style={{
                padding: "12px 16px", marginBottom: 16,
                background: "var(--bg-surface)", borderRadius: 6,
                border: "1px solid var(--border)",
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {selectedDistrict}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 2 }}>
                  {Object.keys(boothGroups).length} booths · 2025 first preference results
                </div>
              </div>

              {Object.entries(boothGroups).map(([boothName, booth]) => {
                const totalVotes = booth.candidates.reduce((s, c) => s + c.votes, 0);
                return (
                  <div key={boothName} style={{
                    marginBottom: 8, background: "var(--bg-surface)",
                    borderRadius: 4, border: "1px solid var(--border)",
                    overflow: "hidden",
                  }}>
                    <div style={{
                      padding: "8px 12px", display: "flex",
                      justifyContent: "space-between", alignItems: "center",
                      borderBottom: "1px solid var(--border)",
                    }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{boothName}</span>
                        <span style={{
                          fontSize: 9, color: "var(--text-dim)", marginLeft: 8,
                          fontFamily: "var(--font-mono)", textTransform: "uppercase",
                        }}>
                          {booth.type}
                        </span>
                      </div>
                      <span style={{ fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                        {totalVotes.toLocaleString()} votes
                      </span>
                    </div>

                    {/* Vote bar */}
                    <div style={{ display: "flex", height: 4 }}>
                      {booth.candidates.map((c, i) => (
                        <div key={i} style={{
                          width: `${totalVotes > 0 ? (c.votes / totalVotes) * 100 : 0}%`,
                          background: pc(c.party_code),
                          transition: "width 0.3s",
                        }} />
                      ))}
                    </div>

                    {/* Candidate rows */}
                    <div style={{ padding: "6px 12px" }}>
                      {booth.candidates.map((c, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "3px 0", fontSize: 11,
                        }}>
                          <span style={{
                            width: 6, height: 6, borderRadius: 1,
                            background: pc(c.party_code), flexShrink: 0,
                          }} />
                          <span style={{ color: "var(--text-secondary)", flex: 1 }}>{c.candidate_name}</span>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 10,
                            color: pc(c.party_code), fontWeight: 600, width: 36, textAlign: "right",
                          }}>
                            {c.party_code}
                          </span>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 10,
                            color: "var(--text-muted)", width: 50, textAlign: "right",
                          }}>
                            {c.votes.toLocaleString()}
                          </span>
                          <span style={{
                            fontFamily: "var(--font-mono)", fontSize: 10,
                            color: "var(--text-dim)", width: 44, textAlign: "right",
                          }}>
                            {totalVotes > 0 ? ((c.votes / totalVotes) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
