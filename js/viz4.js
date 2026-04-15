// Viz 4 — Season Race Replay (scrub through a season)
async function initSeasonReplay(dataPath) {
  const data = await loadJSON(dataPath, "season-chart");
  if (!data) return;

  // data shape: { "2024": { races: [{round, name, standings:[{driver, points}...]}...] }, ... }
  const seasonSelect = document.getElementById("season-select");
  const slider = document.getElementById("race-slider");
  const label = document.getElementById("race-label");
  const container = document.getElementById("season-chart");

  const seasons = Object.keys(data).sort((a, b) => +b - +a);
  seasonSelect.innerHTML = seasons.map(s => `<option value="${s}">${s}</option>`).join("");

  let currentSeason = seasons[0];

  const render = (seasonKey, roundIdx) => {
    const races = data[seasonKey].races;
    const race = races[roundIdx];
    if (!race) return;
    label.textContent = `Round ${race.round} · ${race.name}`;

    const standings = race.standings.slice(0, 15);
    container.innerHTML = "";

    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand().domain(standings.map(d => d.driver)).range([0, width]).padding(0.15);
    const y = d3.scaleLinear().domain([0, d3.max(standings, d => d.points) || 1]).range([height, 0]);

    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "rotate(-40)")
      .style("text-anchor", "end");
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    svg.selectAll(".bar")
      .data(standings)
      .join("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.driver))
      .attr("y", d => y(d.points))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d.points));
  };

  const onSeasonChange = () => {
    currentSeason = seasonSelect.value;
    const n = data[currentSeason].races.length;
    slider.min = 1;
    slider.max = n;
    slider.value = n;
    render(currentSeason, n - 1);
  };

  seasonSelect.addEventListener("change", onSeasonChange);
  slider.addEventListener("input", () => render(currentSeason, +slider.value - 1));

  onSeasonChange();
}
