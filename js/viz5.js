// Viz 5 — Pit Stop Strategy (Gantt-style stints per driver)
async function initPitStopChart(dataPath) {
  const data = await loadJSON(dataPath, "pitstop-chart");
  if (!data) return;

  // data shape: { races: [{raceId, name, year, maxLap, drivers:[{code, stints:[{startLap,endLap,compound}], stops:[lap]}]}] }
  const yearSelect = document.getElementById("pit-year-select");
  const select = document.getElementById("race-select");
  const container = document.getElementById("pitstop-chart");

  const years = [...new Set(data.races.map(r => r.year))].sort((a, b) => b - a);
  yearSelect.innerHTML = years.map(y => `<option value="${y}">${y}</option>`).join("");

  const refreshRaces = () => {
    const y = +yearSelect.value;
    const races = data.races.filter(r => r.year === y);
    select.innerHTML = races.map(r =>
      `<option value="${r.raceId}">${r.name}</option>`
    ).join("");
  };
  refreshRaces();
  yearSelect.addEventListener("change", () => {
    refreshRaces();
    render(select.value);
  });

  const compoundColor = {
    SOFT: "#E10600", MEDIUM: "#F0C419", HARD: "#BBBBBB",
    INTERMEDIATE: "#2ECC71", WET: "#3498DB", UNKNOWN: "#888"
  };

  const render = (raceId) => {
    const race = data.races.find(r => String(r.raceId) === String(raceId));
    if (!race) return;
    container.innerHTML = "";

    const drivers = race.drivers;
    const margin = { top: 20, right: 20, bottom: 40, left: 80 };
    const width = container.clientWidth - margin.left - margin.right;
    const rowH = 22;
    const height = drivers.length * rowH;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([1, race.maxLap]).range([0, width]);
    const y = d3.scaleBand().domain(drivers.map(d => d.code)).range([0, height]).padding(0.2);

    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    // Stints
    drivers.forEach(drv => {
      const g = svg.append("g").attr("transform", `translate(0, ${y(drv.code)})`);
      g.selectAll("rect")
        .data(drv.stints)
        .join("rect")
        .attr("x", d => x(d.startLap))
        .attr("width", d => Math.max(1, x(d.endLap) - x(d.startLap)))
        .attr("height", y.bandwidth())
        .attr("fill", d => compoundColor[(d.compound || "UNKNOWN").toUpperCase()] || compoundColor.UNKNOWN)
        .on("mousemove", (e, d) => {
          tooltip.style("opacity", 1)
            .html(`<strong>${drv.code}</strong><br>${d.compound || "Unknown"} · laps ${d.startLap}–${d.endLap}`)
            .style("left", (e.pageX + 10) + "px")
            .style("top", (e.pageY - 10) + "px");
        })
        .on("mouseleave", () => tooltip.style("opacity", 0));

      // Pit stop dots
      g.selectAll("circle")
        .data(drv.stops)
        .join("circle")
        .attr("cx", d => x(d))
        .attr("cy", y.bandwidth() / 2)
        .attr("r", 3.5)
        .attr("fill", "#15151E")
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    });

    // Legend
    const legendData = [["SOFT","Soft"],["MEDIUM","Medium"],["HARD","Hard"],["INTERMEDIATE","Inter"],["WET","Wet"]];
    const legend = svg.append("g").attr("transform", `translate(0, ${height + 28})`);
    legendData.forEach(([k, lbl], i) => {
      const row = legend.append("g").attr("transform", `translate(${i * 80}, 0)`);
      row.append("rect").attr("width", 12).attr("height", 12).attr("fill", compoundColor[k]);
      row.append("text").attr("x", 16).attr("y", 10).attr("font-size", 11).text(lbl);
    });
  };

  select.addEventListener("change", () => render(select.value));
  render(select.value);
}
