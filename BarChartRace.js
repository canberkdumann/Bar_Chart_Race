define(["jquery", "text!./BarChartRace.css", "./d3.min"], function ($, cssContent) {
    "use strict";
    $("<style>").html(cssContent).appendTo("head");
	
	
	    // ✅ Helper function to fetch all data from the hypercube (NEW)
    function fetchAllData(qHyperCube, backendApi, callback) {
    const pageHeight = 10000;
    const totalHeight = Math.min(qHyperCube.qSize.qcy, 30000); // ✅ Cap to 30k rows
    const pages = Math.ceil(totalHeight / pageHeight);
    let allData = [];

    let pending = pages;

    for (let i = 0; i < pages; i++) {
        backendApi.getData([{
            qTop: i * pageHeight,
            qLeft: 0,
            qWidth: qHyperCube.qSize.qcx,
            qHeight: pageHeight
        }]).then(dataPages => {
            if (dataPages[0] && dataPages[0].qMatrix) {
                allData = allData.concat(dataPages[0].qMatrix);
            }
            pending--;
            if (pending === 0) {
                callback(allData);
            }
        });
    }
    }
	

    return {
        initialProperties: {
            version: 1.3,
            qHyperCubeDef: {
             qDimensions: [
    {
        qDef: {
            qFieldDefs: ["YourFirstDimension"],
            qSortCriterias: [{ qSortByExpression: -1 }]
        },
        qOtherTotalSpec: {
            qOtherMode: "OTHER_COUNTED",
            qOtherCounted: { qv: "10" }, // ✅ LIMIT to Top 10 competitors
            qSuppressOther: true
        }
    },
    {
        qDef: { qFieldDefs: ["YourDateDimension"] }
    }
],
                qMeasures: [{ qDef: { qDef: "YourMeasureExpression" } }],
               qInitialDataFetch: [{ qWidth: 3, qHeight: 1 }]  // ✅ Force minimal initial fetch

            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: { uses: "dimensions", min: 2, max: 2 },
                measures: { uses: "measures", min: 1, max: 1 },
                sorting: { uses: "sorting" },
                settings: { uses: "settings" }
            }
        },
        snapshot: { canTakeSnapshot: true },
        paint: function ($element, layout) {
		
		
		           var backendApi = this.backendApi;
            var qHyperCube = layout.qHyperCube;
            var width = $element.width(), height = $element.height();
            var id = "container_" + layout.qInfo.qId;
            if (document.getElementById(id)) $("#" + id).empty();
            else $element.append($('<div />').attr("id", id).width(width).height(height));

            // ✅ Fetch ALL data using helper function
            fetchAllData(qHyperCube, backendApi, function (fullMatrix) {
                var data = fullMatrix.map(d => ({
                    "Dim1": d[0].qText,
                    "Date": d[1].qText,
                    "Metric1": d[2].qNum
                }));
                viz(data, width, height, id);  // ✅ Call main viz function
                 });
        }
    };
});
var viz = function (data, width, height, id) {
    var margin = { top: 20, right: 200, bottom: 50, left: 20 }, // Sağ tarafı geniş tuttuk
        innerWidth = width - margin.left - margin.right,
        innerHeight = height - margin.top - margin.bottom;

    var x = d3.scale.linear().range([0, innerWidth]).domain([0, 1.5]);
    var y = d3.scale.ordinal().rangeBands([0, innerHeight], 0.2);

    var pastelColors = [
        "#FFB3BA", "#FFDFBA", "#FFFFBA", "#BAFFC9",
        "#BAE1FF", "#E1BAFF", "#FFC3E3", "#D4A5A5",
        "#A5D4A5", "#A5A5D4"
    ];

    var colorScale = d3.scale.ordinal().range(pastelColors);

    var svg = d3.select("#" + id).append("svg")
        .attr("width", width)
        .attr("height", height + 50)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var tickValues = d3.range(0, 1.6, 0.1);
    svg.selectAll(".grid-line")
        .data(tickValues)
        .enter()
        .append("line")
        .attr("class", "grid-line")
        .attr("x1", d => x(d))
        .attr("x2", d => x(d))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .style("stroke", "black")  
        .style("opacity", 0.2)  
        .style("stroke-width", "1px")
        .style("stroke-dasharray", "3,3");

    var xAxis = d3.svg.axis().scale(x).orient("bottom").tickValues(tickValues);
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis);

    // 📌 **Qlik Sense'ten gelen tarih sırasını BOZMADAN kullanıyoruz!**
    var allDates = Array.from(new Set(data.map(d => d.Date)))
                    .sort((a, b) => new Date(a) - new Date(b));

     var currentDateIndex = 0;
    var interval = 3000;
    var isPlaying = true;
    var intervalId;

    var controls = svg.append("g")
        .attr("class", "controls")
        .attr("transform", `translate(${innerWidth + 20}, 0)`);

    var playGroup = controls.append("g")
        .attr("class", "play-group")
        .style("cursor", "pointer")
        .on("click", function () {
            isPlaying = !isPlaying;
            playText.text(isPlaying ? "Pause" : "Play");
            playButton.attr("fill", isPlaying ? "#F44336" : "#4CAF50");
            if (isPlaying) animate();
            else clearTimeout(intervalId);
        });

    var playButton = playGroup.append("rect")
        .attr("width", 75)
        .attr("height", 30)
        .attr("rx", 6)
        .attr("fill", "#F44336");

    var playText = playGroup.append("text")
        .attr("x", 37)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("pointer-events", "none")
        .style("fill", "white")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Pause");

    var speeds = [4000, 3000, 1500];
    var speedLabels = ["Slow", "Normal", "Fast"];
    var speedColors = ["#03A9F4", "#FFA500", "#F44336"];
    var speedIndex = 1;

    var speedGroup = controls.append("g")
        .attr("transform", "translate(85, 0)")
        .style("cursor", "pointer")
        .on("click", function () {
            speedIndex = (speedIndex + 1) % speeds.length;
            interval = speeds[speedIndex];
            speedText.text(speedLabels[speedIndex]);
            speedButton.attr("fill", speedColors[speedIndex]);
        });

    var speedButton = speedGroup.append("rect")
        .attr("width", 75)
        .attr("height", 30)
        .attr("rx", 6)
        .attr("fill", speedColors[speedIndex]);

    var speedText = speedGroup.append("text")
        .attr("x", 37)
        .attr("y", 20)
        .attr("text-anchor", "middle")
        .style("pointer-events", "none")
        .style("fill", "white")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text(speedLabels[speedIndex]);

    var rankingBoxY = 40;
    var rankingBox = svg.append("g")
        .attr("class", "ranking-box")
        .attr("transform", `translate(${innerWidth + 20}, ${rankingBoxY})`);

    rankingBox.append("rect")
        .attr("width", 160)
        .attr("height", innerHeight - rankingBoxY)
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("rx", 10);

    var dateText = svg.append("text")
        .attr("class", "date-text")
        .attr("x", innerWidth + 80)
        .attr("y", innerHeight + 45)
        .attr("text-anchor", "middle")
        .style("fill", "black")
        .style("font-size", "18px")
        .style("font-weight", "bold");

function updateChart(date) {
    var filteredData = data.filter(d => d.Date === date);

    // 🔥 Sort by measure value (descending)
    filteredData.sort((a, b) => b.Metric1 - a.Metric1);

    // 📌 Show only top 10
    filteredData = filteredData.slice(0, 10);

    var names = filteredData.map(d => d.Dim1);
    y.domain(names);

    // ✅ Bind data to bar groups (keyed by Dim1)
    var bars = svg.selectAll(".bar-group").data(filteredData, d => d.Dim1);

    // ✅ ENTER new bar groups
    var barsEnter = bars.enter().append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(0, ${y(d.Dim1)})`);

    barsEnter.append("rect")
        .attr("class", "bar")
        .attr("height", y.rangeBand())
        .attr("width", d => x(Math.min(d.Metric1, 1.5))) // ✅ Initial width set immediately
        .attr("fill", (d, i) => colorScale(i % pastelColors.length))
        .attr("fill-opacity", 0.9);

    // ✅ Dimension label inside bar (moves with bar)
    barsEnter.append("text")
        .attr("class", "bar-label-left")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) - 10)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => {
            let words = d.Dim1.split(" ");
            return words.length === 3 ? words[0] : words.length >= 4 ? words.slice(0, 2).join(" ") : d.Dim1;
        });

    // ✅ Measure value label
    barsEnter.append("text")
        .attr("class", "bar-value-label")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) + 5)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", "0.35em")
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => d.Metric1.toFixed(2));

    // ✅ UPDATE existing bars (position & size)
    bars.transition()
        .duration(2500)
        .ease("linear")
        .attr("transform", d => `translate(0, ${y(d.Dim1)})`);

    bars.select("rect").transition()
        .duration(2500)
        .ease("linear")
        .attr("width", d => x(Math.min(d.Metric1, 1.5)));

    // ✅ UPDATE labels (dimension name)
    bars.select(".bar-label-left")
        .transition()
        .duration(2500)
        .ease("linear")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) - 10)
        .text(d => {
            let words = d.Dim1.split(" ");
            return words.length === 3 ? words[0] : words.length >= 4 ? words.slice(0, 2).join(" ") : d.Dim1;
        });

    // ✅ UPDATE measure value label
    bars.select(".bar-value-label")
        .transition()
        .duration(2500)
        .ease("linear")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) + 5)
        .text(d => d.Metric1.toFixed(2));

    // ✅ EXIT old bars
    bars.exit()
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .remove();

    // ✅ Update right-side ranking box
    rankingBox.selectAll(".ranking-text").remove();

    rankingBox.selectAll(".ranking-text")
        .data(filteredData)
        .enter()
        .append("text")
        .attr("class", "ranking-text")
        .attr("x", 10)
        .attr("y", (d, i) => (i + 1) * 20)
        .style("fill", "black")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .html((d, i) => {
            let words = d.Dim1.split(" ");
            let shortName = words.length === 3 ? words[0] :
                words.length >= 4 ? words.slice(0, 2).join(" ") :
                d.Dim1;
            return `<tspan style="fill:red">${i + 1}.</tspan> ${shortName}`;
        });

    // ✅ Update current date text (bottom-right)
    dateText.text(date);
}






    function animate() {
        if (isPlaying && currentDateIndex < allDates.length) {
            updateChart(allDates[currentDateIndex]);
            currentDateIndex++;
            intervalId = setTimeout(animate, interval);
        }
    }

    animate();
};
