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
            qOtherCounted: { qv: "15" }, // ✅ LIMIT to Top 10 competitors
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
let lastCalendarDate = "";
let isAnimating = false; // ⛔️ Eğer bu true ise yeni animasyon başlatma



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
	var hasEnded = false; 


    var controls = svg.append("g")
        .attr("class", "controls")
        .attr("transform", `translate(${innerWidth + 20}, 0)`);

    var playGroup = controls.append("g")
        .attr("class", "play-group")
        .style("cursor", "pointer")
.on("click", function () {
    if (hasEnded) {
        // ✅ If race is finished, restart everything
        currentDateIndex = 0;
        hasEnded = false;
        isPlaying = true;
        playText.text("Pause");
        playButton.attr("fill", "#F44336");
        animate();
    } else {
        // Toggle pause/play
        isPlaying = !isPlaying;
        playText.text(isPlaying ? "Pause" : "Play");
        playButton.attr("fill", isPlaying ? "#F44336" : "#4CAF50");
        if (isPlaying) animate();
        else clearTimeout(intervalId);
    }
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
        .attr("height", 350) 
        .attr("fill", "white")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("rx", 10);

 // ✅ Yeni takvim görünümü (spiralli sayfa)
// ✅ Updated: Bigger calendar view (1.5x larger)
var calendarGroup = svg.append("g")
    .attr("class", "calendar-group")
    .attr("transform", `translate(${innerWidth + 30}, ${innerHeight - 150})`);

// Spiral holes (updated position)
calendarGroup.append("path")
    .attr("d", "M19,-13 a6,6 0 1,0 0.1,0 M110,-13 a6,6 0 1,0 0.1,0")
    .attr("fill", "none")
    .attr("stroke", "#666")
    .attr("stroke-width", 3);

// Drop shadow
var defs = svg.append("defs");
var filter = defs.append("filter")
    .attr("id", "shadow")
    .attr("x", "-20%")
    .attr("y", "-20%")
    .attr("width", "140%")
    .attr("height", "140%");
filter.append("feDropShadow")
    .attr("dx", 3)
    .attr("dy", 3)
    .attr("stdDeviation", 3)
    .attr("flood-color", "rgba(0,0,0,0.3)");

// Bigger paper with shadow
calendarGroup.append("rect")
    .attr("class", "calendar-sheet")
    .attr("width", 140)       // ⬅️ Wider
    .attr("height", 90)       // ⬅️ Taller
    .attr("rx", 16)
    .attr("fill", "url(#paperGradient)")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 2)
    .style("filter", "url(#shadow)")
    .style("transform-origin", "center top")
    .style("transform-box", "fill-box");

// Gradient (no change)
defs.append("linearGradient")
    .attr("id", "paperGradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "0%").attr("y2", "100%")
    .selectAll("stop")
    .data([
        { offset: "0%", color: "#fffdf7" },
        { offset: "100%", color: "#f4f1e9" }
    ])
    .enter()
    .append("stop")
    .attr("offset", d => d.offset)
    .attr("stop-color", d => d.color);

// Hole shadows (updated position)
calendarGroup.append("circle")
    .attr("cx", 25)
    .attr("cy", 0)
    .attr("r", 6)
    .attr("fill", "#444");

calendarGroup.append("circle")
    .attr("cx", 115)
    .attr("cy", 0)
    .attr("r", 6)
    .attr("fill", "#444");

// Updated text (bigger & re-centered)
var calendarText = calendarGroup.append("text")
    .attr("class", "calendar-text")
    .attr("x", 70)              // ⬅️ Centered for 140 width
    .attr("y", 52)
    .attr("text-anchor", "middle")
    .style("font-size", "20px") // ⬅️ Bigger font
    .style("font-family", "Georgia, serif")
    .style("font-weight", "bold")
    .style("fill", "#2c2c2c");


function updateChart(date) {
   if (date === lastCalendarDate || isAnimating) return;
    isAnimating = true;

    var filteredData = data.filter(d => d.Date === date);
    filteredData.sort((a, b) => b.Metric1 - a.Metric1);
    filteredData = filteredData.slice(0, 15);

    var names = filteredData.map(d => d.Dim1);
    y.domain(names);

    var bars = svg.selectAll(".bar-group").data(filteredData, d => d.Dim1);

    var barsEnter = bars.enter().append("g")
        .attr("class", "bar-group")
        .attr("transform", d => `translate(0, ${y(d.Dim1)})`);

    barsEnter.append("rect")
        .attr("class", "bar")
        .attr("height", y.rangeBand())
        .attr("width", d => x(Math.min(d.Metric1, 1.5)))
        .attr("fill", (d, i) => colorScale(i % pastelColors.length))
        .attr("fill-opacity", 0.9);

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

    barsEnter.append("text")
        .attr("class", "bar-value-label")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) + 5)
        .attr("y", y.rangeBand() / 2)
        .attr("dy", "0.35em")
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-weight", "bold")
        .text(d => d.Metric1.toFixed(2));

    bars.transition()
        .duration(2500)
        .ease("linear")
        .attr("transform", d => `translate(0, ${y(d.Dim1)})`);

    bars.select("rect").transition()
        .duration(2500)
        .ease("linear")
        .attr("width", d => x(Math.min(d.Metric1, 1.5)));

    bars.select(".bar-label-left")
        .transition()
        .duration(2500)
        .ease("linear")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) - 10)
        .text(d => {
            let words = d.Dim1.split(" ");
            return words.length === 3 ? words[0] : words.length >= 4 ? words.slice(0, 2).join(" ") : d.Dim1;
        });

    bars.select(".bar-value-label")
        .transition()
        .duration(2500)
        .ease("linear")
        .attr("x", d => x(Math.min(d.Metric1, 1.5)) + 5)
        .text(d => d.Metric1.toFixed(2));

    bars.exit()
        .transition()
        .duration(1000)
        .style("opacity", 0)
        .remove();

    rankingBox.selectAll(".ranking-text").remove();


// ✅ Dynamically adjust height of ranking box
rankingBox.select("rect")
    .transition()
    .duration(500)
    .attr("height", filteredData.length * 20 + 20); // 20px per item + padding

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

        let medal = "";
        if (i === 0) medal = " 🥇";
        else if (i === 1) medal = " 🥈";
        else if (i === 2) medal = " 🥉";

        return `<tspan style="fill:red">${i + 1}.</tspan> ${shortName}${medal}`;
    });



    // ✅ Clear text before spiral
    calendarText.text("");

    // ✅ Animate spiral effect
    calendarGroup.select(".calendar-sheet")
        .transition()
        .duration(300)
        .style("transform", "rotateX(90deg)")
        .transition()
        .delay(300)
        .duration(300)
        .style("transform", "rotateX(0deg)")
        .each("end", function () {
            // ✅ Update text *after* animation ends
            calendarText
                .style("opacity", 0)
                .transition()
                .duration(400)
                .style("opacity", 1)
                .tween("text", function () {
                    var that = d3.select(this);
                    var i = d3.interpolateString(that.text(), date);
                    return function (t) {
                        that.text(i(t));
                    };
                });

            // ✅ Finalize
            lastCalendarDate = date;
            isAnimating = false;
        });

}



function animate() {
    if (isPlaying && currentDateIndex < allDates.length && !isAnimating) {
        updateChart(allDates[currentDateIndex]);
        currentDateIndex++;
        intervalId = setTimeout(animate, interval);
    } else if (currentDateIndex >= allDates.length) {
        // ✅ Race has ended — update button to "Restart"
        hasEnded = true;
        isPlaying = false;
        playText.text("Restart");
        playButton.attr("fill", "#607D8B");
    } else {
        intervalId = setTimeout(animate, 100); // retry if paused or animating
    }
}



    animate();
};
