// Viz 1 — World Circuit Map (Leaflet)
async function initCircuitMap(dataPath) {
  const map = L.map("circuit-map", { scrollWheelZoom: false }).setView([20, 10], 2);
  window._circuitMap = map;
  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &copy; CARTO",
    maxZoom: 10
  }).addTo(map);

  const circuits = await loadJSON(dataPath, "circuit-map");
  if (!circuits) return;

  const markerIcon = L.divIcon({
    className: "circuit-marker",
    html: '<div style="width:12px;height:12px;background:#E10600;border:2px solid white;border-radius:50%;box-shadow:0 0 6px rgba(225,6,0,0.8)"></div>',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });

  circuits.forEach(c => {
    L.marker([c.lat, c.lng], { icon: markerIcon })
      .bindPopup(
        `<strong>${c.name}</strong><br>
         ${c.location || ""}${c.location ? ", " : ""}${c.country}<br>
         <em>${c.race_count} Grand Prix hosted</em>`
      )
      .addTo(map);
  });
}
