// Viz 3 — Constructor Dominance (stacked area chart)
async function initConstructorChart(dataPath) {
  const data = await loadJSON(dataPath, "constructor-chart");
  if (!data) return;

  const container = document.getElementById("constructor-chart");
  container.innerHTML = "";

  const margin = { top: 30, right: 160, bottom: 40, left: 50 };
  const width = container.clientWidth - margin.left - margin.right;
  const height = 450 - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const keys = data.keys;       // constructor names (top 6 + Others)
  const years = data.years;     // e.g. [{year:1950, Ferrari:0.4, ...}, ...]

  const stack = d3.stack().keys(keys).offset(d3.stackOffsetExpand);
  const series = stack(years);

  const x = d3.scaleLinear()
    .domain(d3.extent(years, d => d.year))
    .range([0, width]);
  const y = d3.scaleLinear().domain([0, 1]).range([height, 0]);

  const palette = ["#E10600", "#15151E", "#00A19C", "#0090FF", "#F58020", "#9B59B6", "#888888"];
  const color = d3.scaleOrdinal().domain(keys).range(palette);

  const area = d3.area()
    .x(d => x(d.data.year))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]));

  svg.selectAll("path")
    .data(series)
    .join("path")
    .attr("fill", d => color(d.key))
    .attr("d", area)
    .on("mousemove", (e, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.key}</strong>`)
        .style("left", (e.pageX + 10) + "px")
        .style("top", (e.pageY - 10) + "px");
    })
    .on("mouseleave", () => tooltip.style("opacity", 0));

  svg.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  svg.append("g").attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

  // Legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width + 20}, 0)`);
  keys.forEach((k, i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
    row.append("rect").attr("width", 14).attr("height", 14).attr("fill", color(k));
    row.append("text").attr("x", 20).attr("y", 11).attr("font-size", 12).text(k);
  });
}
