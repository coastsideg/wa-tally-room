"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { supabase } from "../../supabase";

const PARTY_COLORS = {
  ALP:"#B91C1C",LIB:"#1D4ED8",NAT:"#15803D",GRN:"#16A34A",
  PHON:"#EA580C",IND:"#6B7280",ACP:"#7C3AED",LCWA:"#65A30D",
};
const pc = (code) => PARTY_COLORS[code] || "#6B7280";

export default function MapPage() {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const stateLayerRef = useRef(null);
  const fedLayerRef = useRef(null);
  const markersRef = useRef(null);
  const [districts, setDistricts] = useState([]);
  const [stateGeo, setStateGeo] = useState(null);
  const [fedGeo, setFedGeo] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedFed, setSelectedFed] = useState(null);
  const [searchAddr, setSearchAddr] = useState("");
  const [userMarker, setUserMarker] = useState(null);
  const [showBooths, setShowBooths] = useState(false);
  const [booths, setBooths] = useState([]);
  const [mapReady, setMapReady] = useState(false);
  const [colorBy, setColorBy] = useState("party");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [mapLayer, setMapLayer] = useState("state"); // state, federal, both

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("districts_2029").select("*").order("district_name");
      setDistricts(data || []);
    }
    load();
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/wa-districts-2023.geojson").then(r => r.json()),
      fetch("/wa-federal-electorates.geojson").then(r => r.json()),
    ]).then(([state, fed]) => {
      setStateGeo(state);
      setFedGeo(fed);
    }).catch(console.error);
  }, []);

  const districtMap = useMemo(() => {
    const m = {};
    districts.forEach(d => { m[d.district_name] = d; });
    return m;
  }, [districts]);

  // Initialize Leaflet
  useEffect(() => {
    if (mapInstance.current || !mapRef.current) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.onload = () => {
      const L = window.L;
      const map = L.map(mapRef.current, {
        center: [-31.95, 115.86], zoom: 10,
        zoomControl: true, attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19 }).addTo(map);
      mapInstance.current = map;
      markersRef.current = L.layerGroup().addTo(map);
      setMapReady(true);
    };
    document.head.appendChild(script);
    return () => { if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; } };
  }, []);

  // Render state boundaries
  useEffect(() => {
    if (!mapReady || !stateGeo || !mapInstance.current || !districts.length) return;
    const L = window.L;
    if (stateLayerRef.current) mapInstance.current.removeLayer(stateLayerRef.current);

    if (mapLayer === "federal") { stateLayerRef.current = null; return; }

    const getColor = (name) => {
      const d = districtMap[name];
      if (!d) return "#334155";
      if (colorBy === "margin") {
        const m = Number(d.margin_2025);
        if (m < 3) return "#F59E0B"; if (m < 6) return "#FB923C";
        if (m < 10) return "#94A3B8"; return "#64748B";
      }
      return pc(d.incumbent_party);
    };

    const layer = L.geoJSON(stateGeo, {
      style: (f) => ({
        fillColor: getColor(f.properties.Name),
        fillOpacity: mapLayer === "both" ? 0.3 : 0.45,
        color: "#475569", weight: 1.5, opacity: 0.8,
      }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.Name;
        const d = districtMap[name];
        layer.on({
          mouseover: (e) => { e.target.setStyle({ weight: 3, color: "#F8FAFC", fillOpacity: 0.65 }); e.target.bringToFront(); },
          mouseout: (e) => { if (selectedState !== name) stateLayerRef.current?.resetStyle(e.target); },
          click: () => { setSelectedState(name); if (showBooths) loadBooths(name); },
        });
        const tip = d ? `<strong>State: ${name}</strong><br/>${d.incumbent_party} +${Number(d.margin_2025).toFixed(1)}%` : `State: ${name}`;
        layer.bindTooltip(tip, { sticky: true, className: "map-tooltip" });
      },
    }).addTo(mapInstance.current);
    stateLayerRef.current = layer;
  }, [mapReady, stateGeo, districts, colorBy, selectedState, mapLayer]);

  // Render federal boundaries
  useEffect(() => {
    if (!mapReady || !fedGeo || !mapInstance.current) return;
    const L = window.L;
    if (fedLayerRef.current) mapInstance.current.removeLayer(fedLayerRef.current);

    if (mapLayer === "state") { fedLayerRef.current = null; return; }

    const layer = L.geoJSON(fedGeo, {
      style: () => ({
        fillColor: "transparent",
        fillOpacity: 0,
        color: "#F59E0B",
        weight: mapLayer === "both" ? 3 : 2,
        opacity: 0.8,
        dashArray: mapLayer === "both" ? "8, 4" : null,
      }),
      onEachFeature: (feature, layer) => {
        const name = feature.properties.Name;
        layer.on({
          mouseover: (e) => { e.target.setStyle({ weight: 4, color: "#FBBF24" }); e.target.bringToFront(); },
          mouseout: (e) => { if (fedLayerRef.current) fedLayerRef.current.resetStyle(e.target); },
          click: () => { setSelectedFed(name); },
        });
        layer.bindTooltip(`<strong>Federal: ${name}</strong>`, { sticky: true, className: "map-tooltip" });
      },
    }).addTo(mapInstance.current);
    fedLayerRef.current = layer;
  }, [mapReady, fedGeo, selectedFed, mapLayer]);

  // Highlight selected state district
  useEffect(() => {
    if (!stateLayerRef.current || !mapReady) return;
    stateLayerRef.current.eachLayer((layer) => {
      const name = layer.feature.properties.Name;
      if (name === selectedState) {
        layer.setStyle({ weight: 3, color: "#F59E0B", fillOpacity: 0.7 });
        layer.bringToFront();
        if (mapLayer !== "federal") mapInstance.current.fitBounds(layer.getBounds(), { padding: [40, 40] });
      } else {
        stateLayerRef.current.resetStyle(layer);
      }
    });
  }, [selectedState, mapReady]);

  // Point in polygon
  const pointInPolygon = (lat, lng, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][1], yi = polygon[i][0];
      const xj = polygon[j][1], yj = polygon[j][0];
      const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const findDistrictForPoint = (lat, lng, geojson) => {
    if (!geojson) return null;
    for (const feature of geojson.features) {
      const geom = feature.geometry;
      const coords = geom.coordinates;
      if (geom.type === "Polygon") {
        if (pointInPolygon(lat, lng, coords[0])) return feature.properties.Name;
      } else if (geom.type === "MultiPolygon") {
        for (const poly of coords) {
          if (pointInPolygon(lat, lng, poly[0])) return feature.properties.Name;
        }
      }
    }
    return null;
  };

  const placeMarkerAndFind = (lat, lng) => {
    if (!mapInstance.current) return;
    const L = window.L;
    mapInstance.current.setView([lat, lng], 14);
    if (userMarker) userMarker.remove();
    const marker = L.marker([lat, lng], {
      icon: L.divIcon({
        html: '<div style="width:14px;height:14px;background:#F59E0B;border:3px solid #020617;border-radius:50%;box-shadow:0 0 8px rgba(245,158,11,0.5);"></div>',
        iconSize: [14, 14], iconAnchor: [7, 7],
      }),
    }).addTo(mapInstance.current);
    setUserMarker(marker);

    const stateName = findDistrictForPoint(lat, lng, stateGeo);
    const fedName = findDistrictForPoint(lat, lng, fedGeo);
    if (stateName) { setSelectedState(stateName); if (showBooths) loadBooths(stateName); }
    if (fedName) setSelectedFed(fedName);
    if (!stateName && !fedName) setSearchError("Location is outside WA electoral boundaries");
  };

  const findMyElectorate = () => {
    if (!navigator.geolocation) { setSearchError("Geolocation not available"); return; }
    setSearchError(""); setSearching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { placeMarkerAndFind(pos.coords.latitude, pos.coords.longitude); setSearching(false); },
      () => { setSearchError("Could not get location. Try an address."); setSearching(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const searchAddress = async (e) => {
    e.preventDefault();
    if (!searchAddr.trim()) return;
    setSearchError(""); setSearching(true);
    try {
      const query = searchAddr.includes("WA") || searchAddr.includes("Western Australia")
        ? searchAddr : `${searchAddr}, Western Australia, Australia`;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=au`,
        { headers: { "User-Agent": "WATallyRoom/1.0" } }
      );
      const results = await res.json();
      if (results.length === 0) { setSearchError("Address not found. Try adding suburb or postcode."); setSearching(false); return; }
      placeMarkerAndFind(parseFloat(results[0].lat), parseFloat(results[0].lon));
    } catch { setSearchError("Search failed. Check connection."); }
    setSearching(false);
  };

  const loadBooths = async (districtName) => {
    const { data } = await supabase.from("booths_2029").select("*")
      .eq("district_id", districts.find(d => d.district_name === districtName)?.district_id);
    setBooths(data || []);
  };

  useEffect(() => {
    if (!mapReady || !markersRef.current) return;
    const L = window.L;
    markersRef.current.clearLayers();
    if (!showBooths || !booths.length) return;
    booths.forEach(b => {
      if (b.latitude && b.longitude) {
        const typeColors = { ORDINARY: "#F8FAFC", PRE_POLL: "#F59E0B", DECLARATION: "#94A3B8" };
        const marker = L.circleMarker([b.latitude, b.longitude], {
          radius: 5, fillColor: typeColors[b.booth_type] || "#F8FAFC", fillOpacity: 0.9, color: "#020617", weight: 1.5,
        });
        marker.bindTooltip(`<strong>${b.booth_name}</strong><br/>${b.booth_type}`, { className: "map-tooltip" });
        markersRef.current.addLayer(marker);
      }
    });
  }, [booths, showBooths, mapReady]);

  const selectedDistrict = districtMap[selectedState];

  return (
    <div style={{ display: "flex", height: "calc(100vh - 0px)", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{
        width: 300, flexShrink: 0, background: "var(--bg-surface)",
        borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: -0.5, margin: 0 }}>
            Electorate Finder
          </h1>
          <p style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            State & Federal boundaries
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <form onSubmit={searchAddress} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 4 }}>
              <input type="text" value={searchAddr}
                onChange={e => { setSearchAddr(e.target.value); setSearchError(""); }}
                placeholder="Enter address, suburb or postcode..."
                style={{
                  flex: 1, padding: "8px 10px", fontSize: 12,
                  background: "var(--bg-base)", border: "1px solid var(--border)",
                  borderRadius: 4, color: "var(--text-secondary)", outline: "none",
                }}
                onFocus={e => e.target.style.borderColor = "var(--border-bright)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
              <button type="submit" disabled={searching} style={{
                padding: "8px 12px", fontSize: 12, fontWeight: 600,
                background: "var(--accent-amber)", color: "#020617",
                borderRadius: 4, border: "none", cursor: searching ? "wait" : "pointer",
                opacity: searching ? 0.6 : 1,
              }}>{searching ? "..." : "Go"}</button>
            </div>
          </form>

          {searchError && (
            <div style={{ fontSize: 10, color: "#FCA5A5", marginBottom: 8, padding: "6px 8px", background: "rgba(185,28,28,0.1)", borderRadius: 3 }}>
              {searchError}
            </div>
          )}

          <button onClick={findMyElectorate} disabled={searching} style={{
            width: "100%", padding: "8px 12px", fontSize: 12, fontWeight: 600,
            background: "var(--bg-elevated)", color: "var(--accent-amber)",
            borderRadius: 4, border: "1px solid var(--border)", marginBottom: 10,
            cursor: searching ? "wait" : "pointer",
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--bg-elevated)"}
          >
            {searching ? "Locating..." : "📍 Use My Location"}
          </button>

          {/* Layer toggle */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
            {[["state", "State"], ["federal", "Federal"], ["both", "Both"]].map(([v, label]) => (
              <button key={v} onClick={() => setMapLayer(v)} style={{
                flex: 1, padding: "5px 8px", fontSize: 10,
                background: mapLayer === v ? "var(--bg-elevated)" : "transparent",
                color: mapLayer === v ? "var(--text-primary)" : "var(--text-dim)",
                borderRight: "1px solid var(--border)",
              }}>{label}</button>
            ))}
          </div>

          {mapLayer !== "federal" && (
            <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "var(--text-dim)", lineHeight: "28px" }}>Colour:</span>
              {[["party", "Party"], ["margin", "Margin"]].map(([v, label]) => (
                <button key={v} onClick={() => setColorBy(v)} style={{
                  padding: "4px 10px", fontSize: 10,
                  background: colorBy === v ? "var(--bg-elevated)" : "transparent",
                  color: colorBy === v ? "var(--text-primary)" : "var(--text-dim)",
                  borderRadius: 3, border: "1px solid var(--border)",
                }}>{label}</button>
              ))}
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
            <input type="checkbox" checked={showBooths} onChange={e => {
              setShowBooths(e.target.checked);
              if (e.target.checked && selectedState) loadBooths(selectedState);
              if (!e.target.checked && markersRef.current) markersRef.current.clearLayers();
            }} style={{ accentColor: "var(--accent-amber)" }} />
            Show booth locations
          </label>
        </div>

        {/* Legend */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
          {mapLayer !== "federal" && colorBy === "party" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: mapLayer === "both" ? 8 : 0 }}>
              {[["ALP","Labor"],["LIB","Liberal"],["NAT","Nationals"],["GRN","Greens"],["IND","Other"]].map(([code, name]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-dim)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: pc(code) }} />{name}
                </div>
              ))}
            </div>
          )}
          {mapLayer !== "federal" && colorBy === "margin" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: mapLayer === "both" ? 8 : 0 }}>
              {[["#F59E0B","< 3%"],["#FB923C","3-6%"],["#94A3B8","6-10%"],["#64748B","> 10%"]].map(([color, label]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-dim)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}
                </div>
              ))}
            </div>
          )}
          {mapLayer !== "state" && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "var(--text-dim)" }}>
              <span style={{ width: 16, height: 2, background: "#F59E0B", borderRadius: 1, display: "inline-block" }} />
              Federal boundaries{mapLayer === "both" && " (dashed amber)"}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {(selectedState || selectedFed) ? (
            <div>
              {/* State electorate */}
              {selectedState && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>State Electorate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    {selectedState}
                  </div>
                  {selectedDistrict && (
                    <>
                      <div style={{
                        display: "inline-block", marginTop: 6, padding: "3px 8px",
                        borderRadius: 3, fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)",
                        background: pc(selectedDistrict.incumbent_party) + "22",
                        color: pc(selectedDistrict.incumbent_party),
                      }}>
                        {selectedDistrict.incumbent_party} +{Number(selectedDistrict.margin_2025).toFixed(1)}%
                      </div>
                      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {[
                          ["TCP Winner", selectedDistrict.tcp_winner_2025],
                          ["Runner Up", selectedDistrict.tcp_runner_2025],
                          ["Enrolled", Number(selectedDistrict.enrolled_voters).toLocaleString()],
                          ["Booths", selectedDistrict.total_booths],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, marginTop: 2 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Federal electorate */}
              {selectedFed && (
                <div style={{
                  paddingTop: selectedState ? 12 : 0,
                  borderTop: selectedState ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ fontSize: 9, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Federal Electorate</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-amber)", fontFamily: "var(--font-mono)" }}>
                    {selectedFed}
                  </div>
                </div>
              )}

              {/* Booth list */}
              {showBooths && booths.length > 0 && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 10, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    Booths ({booths.length})
                  </div>
                  {booths.map(b => (
                    <div key={b.booth_id} style={{
                      padding: "4px 0", fontSize: 11, color: "var(--text-muted)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex", justifyContent: "space-between",
                    }}>
                      <span>{b.booth_name}</span>
                      <span style={{ fontSize: 9, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>{b.booth_type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-dim)", fontSize: 11 }}>
              Search an address or click the map to find your state and federal electorates
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
        <style>{`
          .map-tooltip {
            background: #0F172A !important; color: #E2E8F0 !important;
            border: 1px solid #334155 !important; border-radius: 4px !important;
            padding: 6px 10px !important; font-family: 'JetBrains Mono', monospace !important;
            font-size: 11px !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          }
          .leaflet-control-zoom a {
            background: #0F172A !important; color: #E2E8F0 !important; border-color: #1E293B !important;
          }
          .leaflet-control-zoom a:hover { background: #1E293B !important; }
        `}</style>
      </div>
    </div>
  );
}
