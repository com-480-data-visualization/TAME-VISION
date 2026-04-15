// Shared tooltip + bootstrap each viz module.
window.tooltip = d3.select("body").append("div").attr("class", "tooltip");

document.addEventListener("DOMContentLoaded", () => {
  initCircuitMap("data/circuits.json");
  initDriverChart("data/top_drivers.json");
  initConstructorChart("data/constructor_share.json");
  initSeasonReplay("data/season_standings.json");
  initPitStopChart("data/pit_strategy.json");
  initTabs();
});

function initTabs() {
  const links = document.querySelectorAll(".tab-link");
  const panels = document.querySelectorAll(".tab-panel");
  const activate = (id) => {
    links.forEach(l => l.classList.toggle("active", l.dataset.tab === id));
    panels.forEach(p => p.classList.toggle("active", p.id === id));
    // Leaflet needs a size recompute when shown
    if (id === "circuits" && window._circuitMap) {
      setTimeout(() => window._circuitMap.invalidateSize(), 50);
    }
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      activate(link.dataset.tab);
      history.replaceState(null, "", "#" + link.dataset.tab);
    });
  });
  const hash = location.hash.replace("#", "");
  if (hash && document.getElementById(hash)) activate(hash);
}

// Generic JSON loader with friendly error in the viz container.
window.loadJSON = async function (path, containerId) {
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = `<div style="padding:2rem;color:#888;text-align:center">
      Data not found: <code>${path}</code><br>
      Run <code>python scripts/prepare_data.py</code> first.
    </div>`;
    return null;
  }
};
