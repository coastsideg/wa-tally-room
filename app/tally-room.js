"use client";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "./supabase";

// Party config
const P = {
  ALP:{name:"Labor",c:"#B91C1C",s:"ALP"},
  LIB:{name:"Liberal",c:"#1D4ED8",s:"LIB"},
  NAT:{name:"Nationals",c:"#15803D",s:"NAT"},
  GRN:{name:"Greens",c:"#16A34A",s:"GRN"},
  PHON:{name:"One Nation",c:"#EA580C",s:"ON"},
  ACP:{name:"Christians",c:"#7C3AED",s:"ACP"},
  IND:{name:"Independent",c:"#6B7280",s:"IND"},
  SFF:{name:"Shooters Fishers",c:"#92400E",s:"SFF"},
  LCWA:{name:"Legalise Cannabis",c:"#65A30D",s:"LCW"},
  LDP:{name:"Liberal Democrats",c:"#CA8A04",s:"LDP"},
  WAP:{name:"WA Party",c:"#0D9488",s:"WAP"},
  SAP:{name:"Sustainable Aust",c:"#0D9488",s:"SAP"},
  NMV:{name:"No Mandatory Vax",c:"#9CA3AF",s:"NMV"},
  WAXIT:{name:"WAxit",c:"#9CA3AF",s:"WAX"},
  SA:{name:"Socialist Alliance",c:"#DC2626",s:"SA"},
  LFC:{name:"Libs For Climate",c:"#0EA5E9",s:"LFC"},
  AJP:{name:"Animal Justice",c:"#0891B2",s:"AJP"},
  LBRT:{name:"Libertarian",c:"#CA8A04",s:"LBT"},
  SPPK:{name:"Stop Pedophiles",c:"#9CA3AF",s:"SPP"},
  FUS:{name:"Fusion",c:"#9CA3AF",s:"FUS"},
  FFP:{name:"Family First",c:"#9CA3AF",s:"FFP"},
  SBP:{name:"Micro Business",c:"#9CA3AF",s:"SBP"},
  MWA:{name:"Matheson for WA",c:"#9CA3AF",s:"MWA"},
  FTS:{name:"Flux",c:"#9CA3AF",s:"FLX"},
  IND2:{name:"Independent",c:"#6B7280",s:"IND"},
};
const pc = (code) => P[code]?.c || "#6B7280";
const pn = (code) => P[code]?.name || code;
const ps = (code) => P[code]?.s || code;
const fmt = (n) => n?.toLocaleString() ?? "\u2014";

// ============================================================
// DATA FETCHING
// ============================================================
function useElectionData(year) {
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch districts for this year
      const { data: distData, error: distErr } = await supabase
        .from("districts")
        .select("*")
        .eq("election_year", year)
        .order("name");
      
      if (distErr) {
        console.error("Error fetching districts:", distErr);
        setLoading(false);
        return;
      }

      // Fetch first preferences for this year
      const { data: fpData, error: fpErr } = await supabase
        .from("first_preferences")
        .select("*")
        .eq("election_year", year);
      
      if (fpErr) {
        console.error("Error fetching first preferences:", fpErr);
        setLoading(false);
        return;
      }

      // Group FP by district name
      const fpByDistrict = {};
      for (const fp of fpData) {
        if (!fpByDistrict[fp.district_name]) fpByDistrict[fp.district_name] = {};
        fpByDistrict[fp.district_name][fp.party_code] = fp.votes;
      }

      // Combine into the format our components expect
      const combined = distData.map(d => ({
        n: d.name,
        el: d.enrolment,
        fv: d.formal_votes,
        inf: d.informal,
        tv: d.total_votes,
        to: parseFloat(d.turnout_pct),
        fp: fpByDistrict[d.name] || {},
        wn: d.tcp_winner_name,
        wp: d.tcp_winner_party,
        wv: d.tcp_winner_votes,
        wpct: parseFloat(d.tcp_winner_pct),
        rn: d.tcp_runner_name,
        rp: d.tcp_runner_party,
        rv: d.tcp_runner_votes,
        rpct: parseFloat(d.tcp_runner_pct),
        m: parseFloat(d.margin_pct),
      }));

      setDistricts(combined);
      setLoading(false);
    }

    fetchData();
  }, [year]);

  return { districts, loading };
}

// ============================================================
// COMPONENTS
// ============================================================

function SeatBar({ districts }) {
  const counts = {};
  districts.forEach(d => { counts[d.wp] = (counts[d.wp] || 0) + 1; });
  const total = districts.length;
  const majority = Math.floor(total / 2) + 1;
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  return (
    <div style={{marginBottom:20}}>
      <div style={{display:"flex",alignItems:"baseline",gap:14,marginBottom:6,flexWrap:"wrap"}}>
        {sorted.map(([p,c]) => (
          <div key={p} style={{display:"flex",alignItems:"baseline",gap:5}}>
            <span style={{display:"inline-block",width:10,height:10,borderRadius:2,background:pc(p)}} />
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:26,fontWeight:700,color:pc(p),lineHeight:1}}>{c}</span>
            <span style={{fontSize:12,color:"#94A3B8"}}>{pn(p)}</span>
          </div>
        ))}
        <span style={{fontSize:12,color:"#64748B",marginLeft:"auto"}}>Majority: {majority}</span>
      </div>
      <div style={{display:"flex",height:18,borderRadius:3,overflow:"hidden",background:"#1E293B",position:"relative"}}>
        {sorted.map(([p,c]) => (
          <div key={p} style={{width:`${(c/total)*100}%`,background:pc(p),position:"relative",transition:"width 0.4s"}}>
            {c>=3 && <span style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>{c}</span>}
          </div>
        ))}
        <div style={{position:"absolute",left:`${(majority/total)*100}%`,top:0,width:2,height:"100%",background:"#F59E0B",zIndex:2}} />
      </div>
    </div>
  );
}

function Pendulum({ districts, onSelect }) {
  const sorted = [...districts].sort((a, b) => {
    const aSign = a.wp === "ALP" ? 1 : -1;
    const bSign = b.wp === "ALP" ? 1 : -1;
    return (aSign * a.m) - (bSign * b.m);
  });
  return (
    <div style={{overflowX:"auto"}}>
      <div style={{display:"flex",flexDirection:"column",gap:1,minWidth:550}}>
        {sorted.map(d => {
          const isLeft = d.wp !== "ALP";
          const barW = Math.min(d.m * 2.2, 100);
          return (
            <div key={d.n} onClick={() => onSelect(d)} style={{display:"grid",gridTemplateColumns:"130px 1fr 44px",alignItems:"center",gap:6,cursor:"pointer",padding:"2px 0",borderRadius:2}}
              onMouseEnter={e => e.currentTarget.style.background="#1E293B"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <div style={{fontSize:10,fontFamily:"'JetBrains Mono',monospace",color:pc(d.wp),textAlign:"right",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:600}}>{d.n}</div>
              <div style={{position:"relative",height:12}}>
                <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"#334155"}} />
                <div style={{position:"absolute",height:"100%",borderRadius:2,background:pc(d.wp),opacity:0.85,...(isLeft ? {right:"50%",width:`${barW}%`} : {left:"50%",width:`${barW}%`}),transition:"width 0.3s"}} />
              </div>
              <div style={{fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#94A3B8",textAlign:"right"}}>{d.m.toFixed(1)}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Detail({ d, onClose }) {
  if (!d) return null;
  const fpSorted = Object.entries(d.fp).sort((a,b) => b[1]-a[1]);
  const fpTotal = fpSorted.reduce((s,[,v]) => s+v, 0);
  return (
    <div style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:8,padding:16,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <h2 style={{fontSize:18,fontWeight:700,color:"#F8FAFC",margin:0,fontFamily:"'JetBrains Mono',monospace"}}>{d.n}</h2>
        <button onClick={onClose} style={{background:"none",border:"1px solid #334155",borderRadius:4,color:"#94A3B8",cursor:"pointer",padding:"3px 8px",fontSize:11}}>\u00d7</button>
      </div>
      <div style={{fontSize:10,color:"#64748B",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Two-Candidate Preferred</div>
      <div style={{display:"flex",height:24,borderRadius:3,overflow:"hidden",marginBottom:6}}>
        <div style={{width:`${d.wpct}%`,background:pc(d.wp),display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>{d.wpct}%</span>
        </div>
        <div style={{width:`${d.rpct}%`,background:pc(d.rp),display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#fff",fontFamily:"'JetBrains Mono',monospace"}}>{d.rpct}%</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
        <div>
          <div style={{fontSize:12,fontWeight:600,color:pc(d.wp)}}>{d.wn.split(",")[0]} <span style={{fontWeight:400,fontSize:10}}>({ps(d.wp)})</span></div>
          <div style={{fontSize:11,color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.wv)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,fontWeight:600,color:pc(d.rp)}}>{d.rn.split(",")[0]} <span style={{fontWeight:400,fontSize:10}}>({ps(d.rp)})</span></div>
          <div style={{fontSize:11,color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.rv)}</div>
        </div>
      </div>
      <div style={{fontSize:12,color:"#F59E0B",fontWeight:600,fontFamily:"'JetBrains Mono',monospace",marginBottom:12}}>Margin: {d.m.toFixed(2)}%</div>
      <div style={{fontSize:10,color:"#64748B",marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>First Preferences</div>
      {fpSorted.map(([party,votes]) => {
        const pct = fpTotal > 0 ? (votes/fpTotal)*100 : 0;
        return (
          <div key={party} style={{display:"grid",gridTemplateColumns:"42px 1fr 52px 42px",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:9,color:pc(party),fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{ps(party)}</span>
            <div style={{height:8,borderRadius:2,background:"#1E293B",overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:pc(party),borderRadius:2}} />
            </div>
            <span style={{fontSize:9,color:"#94A3B8",fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>{fmt(votes)}</span>
            <span style={{fontSize:9,color:"#64748B",fontFamily:"'JetBrains Mono',monospace",textAlign:"right"}}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:10,color:"#64748B",marginTop:10}}>
        <div>Electors: <span style={{color:"#CBD5E1",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.el)}</span></div>
        <div>Turnout: <span style={{color:"#CBD5E1",fontFamily:"'JetBrains Mono',monospace"}}>{d.to.toFixed(1)}%</span></div>
        <div>Informal: <span style={{color:"#CBD5E1",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.inf)} ({d.tv > 0 ? ((d.inf/d.tv)*100).toFixed(1) : 0}%)</span></div>
      </div>
    </div>
  );
}

function Table({ districts, onSelect, sortKey, setSortKey, sortDir, setSortDir }) {
  const toggle = (k) => { if (sortKey===k) setSortDir(sortDir==="asc"?"desc":"asc"); else { setSortKey(k); setSortDir(k==="n"?"asc":"desc"); } };
  const sorted = [...districts].sort((a,b) => {
    if (sortKey==="n") return sortDir==="asc" ? a.n.localeCompare(b.n) : b.n.localeCompare(a.n);
    const av = sortKey==="m" ? a.m : sortKey==="wpct" ? a.wpct : sortKey==="to" ? a.to : a.m;
    const bv = sortKey==="m" ? b.m : sortKey==="wpct" ? b.wpct : sortKey==="to" ? b.to : b.m;
    return sortDir==="asc" ? av-bv : bv-av;
  });
  const Th = ({k,children,align}) => (
    <th onClick={() => toggle(k)} style={{padding:"6px 4px",fontSize:9,color:sortKey===k?"#F59E0B":"#64748B",cursor:"pointer",textAlign:align||"left",userSelect:"none",textTransform:"uppercase",letterSpacing:0.5,fontWeight:600,borderBottom:"1px solid #1E293B",whiteSpace:"nowrap"}}>
      {children} {sortKey===k && (sortDir==="asc"?"\u25b2":"\u25bc")}
    </th>
  );
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>
          <Th k="n">District</Th>
          <th style={{padding:"6px 4px",fontSize:9,color:"#64748B",textAlign:"left",borderBottom:"1px solid #1E293B",textTransform:"uppercase",letterSpacing:0.5,fontWeight:600}}>Won</th>
          <Th k="wpct" align="right">TCP%</Th>
          <Th k="m" align="right">Margin</Th>
          <th style={{padding:"6px 4px",fontSize:9,color:"#64748B",textAlign:"right",borderBottom:"1px solid #1E293B",textTransform:"uppercase",letterSpacing:0.5,fontWeight:600}}>Votes</th>
          <Th k="to" align="right">T/O</Th>
        </tr></thead>
        <tbody>
          {sorted.map(d => (
            <tr key={d.n} onClick={() => onSelect(d)} style={{cursor:"pointer",borderBottom:"1px solid #0F172A"}}
              onMouseEnter={e => e.currentTarget.style.background="#1E293B"}
              onMouseLeave={e => e.currentTarget.style.background="transparent"}>
              <td style={{padding:"5px 4px",fontWeight:600,color:"#E2E8F0",whiteSpace:"nowrap"}}>
                <span style={{display:"inline-block",width:3,height:12,borderRadius:1,background:pc(d.wp),marginRight:6,verticalAlign:"middle"}} />
                {d.n}
              </td>
              <td style={{padding:"5px 4px",color:pc(d.wp),fontWeight:600,fontFamily:"'JetBrains Mono',monospace",fontSize:10}}>{ps(d.wp)}</td>
              <td style={{padding:"5px 4px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#CBD5E1",fontSize:10}}>{d.wpct.toFixed(1)}</td>
              <td style={{padding:"5px 4px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:d.m<5?"#F59E0B":"#94A3B8",fontWeight:d.m<5?700:400,fontSize:10}}>{d.m.toFixed(1)}</td>
              <td style={{padding:"5px 4px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#64748B",fontSize:10}}>{fmt(d.tv)}</td>
              <td style={{padding:"5px 4px",textAlign:"right",fontFamily:"'JetBrains Mono',monospace",color:"#64748B",fontSize:10}}>{d.to.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
export default function TallyRoom() {
  const [year, setYear] = useState("2025");
  const [view, setView] = useState("table");
  const [search, setSearch] = useState("");
  const [partyFilter, setPartyFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [sortKey, setSortKey] = useState("m");
  const [sortDir, setSortDir] = useState("asc");

  const { districts, loading } = useElectionData(parseInt(year));

  const holdingParties = useMemo(() => {
    const parties = [...new Set(districts.map(d => d.wp))].sort();
    return ["all", ...parties];
  }, [districts]);

  const filtered = useMemo(() => {
    return districts.filter(d => {
      if (search && !d.n.toLowerCase().includes(search.toLowerCase()) && !d.wn.toLowerCase().includes(search.toLowerCase())) return false;
      if (partyFilter !== "all" && d.wp !== partyFilter) return false;
      return true;
    });
  }, [districts, search, partyFilter]);

  const fpStrip = useMemo(() => {
    const totals = {};
    districts.forEach(d => Object.entries(d.fp).forEach(([p,v]) => { totals[p] = (totals[p]||0)+v; }));
    const grand = Object.values(totals).reduce((s,v) => s+v, 0);
    return Object.entries(totals).map(([p,v]) => ({party:p,votes:v,pct:grand > 0 ? (v/grand)*100 : 0})).sort((a,b) => b.votes-a.votes);
  }, [districts]);

  const totalFormal = useMemo(() => districts.reduce((s,d) => s+d.fv, 0), [districts]);

  return (
    <div style={{minHeight:"100vh",background:"#020617",color:"#E2E8F0",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{maxWidth:920,margin:"0 auto",padding:"12px 12px 40px"}}>

        {/* Header */}
        <div style={{marginBottom:16,borderBottom:"1px solid #1E293B",paddingBottom:12}}>
          <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
            <h1 style={{fontSize:20,fontWeight:700,color:"#F8FAFC",margin:0,fontFamily:"'JetBrains Mono',monospace",letterSpacing:-0.5}}>WA TALLY ROOM</h1>
            <span style={{fontSize:11,color:"#334155",marginLeft:"auto"}}>{districts.length} districts {totalFormal > 0 && <>\u00b7 {fmt(totalFormal)} formal votes</>}</span>
          </div>
        </div>

        {/* Year tabs */}
        <div style={{display:"flex",gap:0,marginBottom:16,border:"1px solid #1E293B",borderRadius:4,overflow:"hidden",width:"fit-content"}}>
          {["2029","2025","2021","2017"].map(y => (
            <button key={y} onClick={() => { if(y!=="2029"){setYear(y);setSelected(null);setPartyFilter("all");setSearch("");} }}
              style={{
                background: y===year ? "#1E293B" : y==="2029" ? "#0F172A" : "transparent",
                border:"none",borderRight:"1px solid #1E293B",
                color: y===year ? "#F8FAFC" : y==="2029" ? "#334155" : "#64748B",
                padding:"7px 16px",fontSize:12,cursor:y==="2029"?"not-allowed":"pointer",fontWeight:y===year?700:500,
                fontFamily:"'JetBrains Mono',monospace",
              }}>
              {y}{y==="2029" && <span style={{fontSize:9,color:"#F59E0B",marginLeft:4}}>SOON</span>}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div style={{textAlign:"center",padding:40,color:"#64748B",fontFamily:"'JetBrains Mono',monospace",fontSize:13}}>
            Loading {year} results...
          </div>
        ) : (
          <>
            {/* Seat tally */}
            <SeatBar districts={districts} />

            {/* FP strip */}
            <div style={{display:"flex",gap:10,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
              {fpStrip.filter(s => s.pct >= 1.0).map(s => (
                <div key={s.party} style={{display:"flex",alignItems:"baseline",gap:3,fontSize:10,color:"#94A3B8",whiteSpace:"nowrap"}}>
                  <span style={{color:pc(s.party),fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{ps(s.party)}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace"}}>{s.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
              <input type="text" placeholder="Search district or member..." value={search} onChange={e => setSearch(e.target.value)}
                style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:4,padding:"5px 10px",color:"#E2E8F0",fontSize:12,flex:"1 1 180px",minWidth:140,outline:"none"}} />
              <select value={partyFilter} onChange={e => setPartyFilter(e.target.value)}
                style={{background:"#0F172A",border:"1px solid #1E293B",borderRadius:4,padding:"5px 6px",color:"#E2E8F0",fontSize:11}}>
                {holdingParties.map(p => <option key={p} value={p}>{p==="all"?"All Parties":pn(p)}</option>)}
              </select>
              <div style={{display:"flex",border:"1px solid #1E293B",borderRadius:4,overflow:"hidden"}}>
                {[["table","Table"],["pendulum","Pendulum"]].map(([v,label]) => (
                  <button key={v} onClick={() => setView(v)}
                    style={{background:view===v?"#1E293B":"transparent",border:"none",color:view===v?"#F8FAFC":"#64748B",padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:500}}>
                    {label}
                  </button>
                ))}
              </div>
              <span style={{fontSize:10,color:"#475569",fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} seats</span>
            </div>

            {/* Detail */}
            {selected && <Detail d={selected} onClose={() => setSelected(null)} />}

            {/* Main view */}
            {view === "table" ? (
              <Table districts={filtered} onSelect={setSelected} sortKey={sortKey} setSortKey={setSortKey} sortDir={sortDir} setSortDir={setSortDir} />
            ) : (
              <Pendulum districts={filtered} onSelect={setSelected} />
            )}
          </>
        )}

        {/* Footer */}
        <div style={{marginTop:24,paddingTop:12,borderTop:"1px solid #1E293B",fontSize:10,color:"#334155"}}>
          Data: Western Australian Electoral Commission \u00b7 Powered by Supabase
        </div>
      </div>
    </div>
  );
}
