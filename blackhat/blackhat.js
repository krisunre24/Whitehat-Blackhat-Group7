// -----------------------------
// Chart dimensions
// -----------------------------

const margin = {
    top: 40,
    right: 80,
    bottom: 60,
    left: 90
};

const width = 900 - margin.left - margin.right;
const height = 380 - margin.top - margin.bottom;


// -----------------------------
// Create SVG
// -----------------------------

const svg = d3.select("#chart")
    .append("svg")
    .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right}
        ${height + margin.top + margin.bottom}`
    )
    .append("g")
    .attr(
        "transform",
        `translate(${margin.left}, ${margin.top})`
    );


// -----------------------------
// Tooltip
// -----------------------------

const tooltip = d3.select("#tooltip");


// -----------------------------
// Scales
// -----------------------------

const xScale = d3.scaleLinear()
    .domain([1990, 2022])
    .range([0, width]);


// BLACK HAT CHOICE:
//
// The y-axis intentionally uses a much larger range
// than the selected data really needs.
//
// This visually compresses changes in emissions and
// makes the trend appear flatter.

const yScale = d3.scaleLinear()
    .domain([0, 25000000])
    .range([height, 0]);


// -----------------------------
// Axes
// -----------------------------

const xAxisGroup = svg.append("g")
    .attr("transform", `translate(0, ${height})`);

const yAxisGroup = svg.append("g");


// X axis
xAxisGroup.call(
    d3.axisBottom(xScale)
        .tickFormat(d3.format("d"))
        .ticks(8)
);


// Y axis
yAxisGroup.call(
    d3.axisLeft(yScale)
        .ticks(5)
        .tickFormat(d => `${d / 1000000} Gt`)
);


// -----------------------------
// Axis labels
// -----------------------------

svg.append("text")
    .attr("class", "axis-label")
    .attr("x", width / 2)
    .attr("y", height + 48)
    .attr("text-anchor", "middle")
    .text("Year");


svg.append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -65)
    .attr("text-anchor", "middle")
    .text("GHG Emissions (Gt CO₂e)");


// -----------------------------
// Line generator
// -----------------------------

const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));


// -----------------------------
// Load OECD data
// -----------------------------

d3.csv("../data/greenhouse_gas_emissions.csv")
    .then(data => {

        // Convert strings into numbers
        data.forEach(d => {

            d.year = +d.TIME_PERIOD;

            d.value = +d.OBS_VALUE;

            d.area = d["Reference area"];

        });


        // Only keep the years used for this visualization
        data = data.filter(d =>
            d.year >= 1990 &&
            d.year <= 2022 &&
            !isNaN(d.value)
        );


        // Initial visualization
        updateVis("OECD");


        // -----------------------------
        // Dropdown interaction
        // -----------------------------

        d3.select("#area-select")
            .on("change", function () {

                const selectedArea = this.value;

                updateVis(selectedArea);

            });


        // -----------------------------
        // Update visualization
        // -----------------------------

        function updateVis(selectedArea) {

            const currentData = data
                .filter(d => d.area === selectedArea)
                .sort((a, b) => a.year - b.year);


            // -----------------------------
            // Draw line
            // -----------------------------

            svg.selectAll(".emissions-line")
                .data([currentData])
                .join("path")
                .attr("class", "emissions-line")
                .transition()
                .duration(600)
                .attr("fill", "none")
                .attr("stroke", "steelblue")
                .attr("stroke-width", 3)
                .attr("opacity", 0.65)
                .attr("d", line);


            // -----------------------------
            // Invisible hover points
            // -----------------------------

            svg.selectAll(".hover-point")
                .data(
                    currentData,
                    d => d.year
                )
                .join("circle")
                .attr("class", "hover-point")
                .attr("cx", d => xScale(d.year))
                .attr("cy", d => yScale(d.value))
                .attr("r", 8)
                .attr("fill", "transparent")
                .style("cursor", "pointer")

                .on("mouseover", function (event, d) {

                    tooltip
                        .style("opacity", 1)
                        .html(`
                            <strong>${selectedArea}</strong><br>
                            Year: ${d.year}<br>
                            Emissions:
                            ${d3.format(",.0f")(d.value)}
                        `);

                })

                .on("mousemove", function (event) {

                    tooltip
                        .style("left", `${event.clientX + 15}px`)
                        .style("top", `${event.clientY - 30}px`);

                })

                .on("mouseout", function () {

                    tooltip
                        .style("opacity", 0);

                });


            // -----------------------------
            // Endpoint data
            // -----------------------------

            const start = currentData.find(
                d => d.year === 1990
            );

            const end = currentData.find(
                d => d.year === 2022
            );


            if (start && end) {

                const percentChange =
                    ((end.value - start.value) /
                    start.value) * 100;
                
                // 1990 reference line
                svg.selectAll(".reference-line")
                    .data([start])
                    .join("line")
                    .attr("class", "reference-line")
                    .attr("x1", xScale(1990))
                    .attr("x2", xScale(2022))
                    .attr("y1", yScale(start.value))
                    .attr("y2", yScale(start.value));

                // -----------------------------
                // Summary values
                // -----------------------------

                d3.select("#start-value")
                    .text(formatEmissions(start.value));

                d3.select("#end-value")
                    .text(formatEmissions(end.value));

                d3.select("#change-value")
                    .text(
                        `${percentChange >= 0 ? "+" : ""}
                        ${percentChange.toFixed(1)}%`
                    );


                // -----------------------------
                // Endpoint markers
                // -----------------------------

                const endpointData = [
                    {
                        ...start,
                        label: "1990"
                    },
                    {
                        ...end,
                        label: "2022"
                    }
                ];


                svg.selectAll(".endpoint")
                    .data(
                        endpointData,
                        d => d.label
                    )
                    .join("circle")
                    .attr("class", "endpoint")
                    .attr("r", 7)
                    .attr("cx", d => xScale(d.year))
                    .attr("cy", d => yScale(d.value));


                // -----------------------------
                // Endpoint labels
                // -----------------------------

                svg.selectAll(".endpoint-label")
                    .data(
                        endpointData,
                        d => d.label
                    )
                    .join("text")
                    .attr("class", "endpoint-label")
                    .attr("x", d => xScale(d.year))
                    .attr("y", d => yScale(d.value) - 15)
                    .attr(
                        "text-anchor",
                        d => d.year === 1990
                            ? "start"
                            : "end"
                    )
                    .text(
                        d =>
                            `${d.label}: ${formatEmissions(d.value)}`
                    );

            }

        }

    })
    .catch(error => {

        console.error(
            "Error loading greenhouse gas data:",
            error
        );

    });


// -----------------------------
// Helper function
// -----------------------------
function formatEmissions(value) {
    return `${(value / 1000000).toFixed(2)} Gt`;
}