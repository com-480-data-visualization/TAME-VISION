// Viz 2 — Driver Hall of Fame (horizontal bar chart)
async function initDriverChart(dataPath) {
  const all = await loadJSON(dataPath, "driver-chart");
  if (!all) return;

  const container = document.getElementById("driver-chart");
  const input = document.getElementById("driver-search");

  const render = (data) => {
    container.innerHTML = "";
    const margin = { top: 20, right: 40, bottom: 30, left: 160 };
    const width = container.clientWidth - margin.left - margin.right;
    const rowH = 22;
    const height = data.length * rowH;

    const svg = d3.select(container).append("svg")
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, d3.max(data, d => d.wins)]).range([0, width]);
    const y = d3.scaleBand().domain(data.map(d => d.name)).range([0, height]).padding(0.2);

    svg.append("g").attr("class", "axis")
      .call(d3.axisLeft(y));
    svg.append("g").attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(6));

    svg.selectAll(".bar")
      .data(data)
      .join("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", d => y(d.name))
      .attr("width", d => x(d.wins))
      .attr("height", y.bandwidth())
      .on("mousemove", (e, d) => {
        tooltip.style("opacity", 1)
          .html(`<strong>${d.name}</strong><br>${d.wins} wins · ${d.nationality || ""}`)
          .style("left", (e.pageX + 10) + "px")
          .style("top", (e.pageY - 10) + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));

    svg.selectAll(".bar-label")
      .data(data)
      .join("text")
      .attr("x", d => x(d.wins) + 4)
      .attr("y", d => y(d.name) + y.bandwidth() / 2 + 4)
      .attr("font-size", 11)
      .attr("fill", "#15151E")
      .text(d => d.wins);
  };

  render(all.slice(0, 20));

  input.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = q ? all.filter(d => d.name.toLowerCase().includes(q)).slice(0, 20)
                       : all.slice(0, 20);
    render(filtered);
  });
}
