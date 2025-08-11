//Contains the code inside one entire function.
(function () {

    //Creates an array of the titles states in the CSV.
    var attrArray = ["County", "X", "Y", "Pop_2024", "DWI_Num", "DWI_Crash", "DWI_Tot", "DWI_Rate", "DWI_Num_Rt", "DWI_Cr_Rt"];
    var expressed = attrArray[8]; //Selects the 9th column in the CSV to use as data.

    //Begins the script.
    window.onload = setMap;

    //Sets up the chloropleth map on the website.
    function setMap() {

        //Dimensions of the map.
        var width = window.innerWidth * 0.4,
            height = 460;

        //Creates the container for the map so it can be put on the webpage.
        var map = d3.select("#map")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //Creates the projection for the map.
        var projection = d3.geoAlbers()
            .center([0, 40.96])
            .rotate([93.73, -5.45, 0])
            .parallels([29.5, 25.00])
            .scale(4500)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        //Loads the data that will be represented.
        var promises = [
            d3.csv("data/Base_Data.csv"),
            d3.json("data/MN_Counties.json")
        ];

        Promise.all(promises).then(function (data) {
            var csvData = data[0];
            var county = data[1];

            //Adds a graticule to the map.
            setGraticule(map, path);

            //Converts the topojson to the map.
            var Minnesota = topojson.feature(county, county.objects.MN_Counties).features;

            //Joins the CSV and JSON so the data can be represented.
            Minnesota = joinData(Minnesota, csvData);

            //Creates the color scale based off the data.
            var colorScale = makeColorScale(csvData);

            //Draws out the map with the color scale.
            setEnumerationUnits(Minnesota, map, path, colorScale);

            //Draws out the chart on the website with the color scale.
            setChart(csvData, colorScale);
        });
    }

    //Draws out the counties onto the map.
    function setEnumerationUnits(Minnesota, map, path, colorScale) {
        var regions = map.selectAll(".regions")
            .data(Minnesota)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "regions " + d.properties.adm1_code;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                return value || value === 0 ? colorScale(value) : "#ccc";
            })
            .on("click", function(event, d) {
                event.stopPropagation(); 
                var props = d.properties;

                var popupContent = `
                    <b>County:</b> ${props.County || props.NAME}<br>
                    <b>DWI Rate:</b> ${props.DWI_Num_Rt}<br>
                    <b>DWI Total:</b> ${props.DWI_Tot}<br>
                    <b>Population 2024:</b> ${props.Pop_2024}
                `;

                d3.selectAll(".popup").remove(); //Removes the existing popups.

                d3.select("body")
                    .append("div")
                    .attr("class", "popup")
                    .style("position", "absolute")
                    .style("left", event.pageX + "px")
                    .style("top", event.pageY + "px")
                    .style("background", "white")
                    .style("border", "1px solid #999")
                    .style("padding", "10px")
                    .style("z-index", 9999)
                    .html(popupContent);
            });
    };

    //Closes the popup when the user clicks off screen.
    d3.select("body").on("click", function(event) {
        if (!event.target.closest(".popup")) {
            d3.selectAll(".popup").remove();
        }
    });
                
    //Creates the bar chart on the website.
    function setChart(csvData, colorScale) {
        var chartWidth = window.innerWidth * 0.4,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        var chart = d3.select("#chart")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, function (d) { return parseFloat(d[expressed]); })]);

        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + d.adm1_code;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function (d, i) {
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function (d) {
                return chartInnerHeight - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function (d) {
                return colorScale(d[expressed]);
            });

        chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of DWI Incidents per County per 100k");

        var yAxis = d3.axisLeft().scale(yScale);

        chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        var popup = d3.select("#bar-popup");

        bars.on("mouseover", function(event, d) {
            popup
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px")
                .style("display", "block")
                .html(`<b>County:</b> ${d.County}`);
        })
        .on("mouseout", function() {
            popup.style("display", "none");
    });
    }
    //Function that creates the color scale, coordinating colors with different values.
    function makeColorScale(data) {
        var colorClasses = [
            "#f3c0c0ff",
            "#f07f7fff",
            "#db3434ff",
            "#960f0fff",
            "#4e0505ff"
        ];

        var colorScale = d3.scaleThreshold().range(colorClasses);

        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        }

        var clusters = ss.ckmeans(domainArray, 5);
        domainArray = clusters.map(function (d) { return d3.min(d); });
        domainArray.shift();

        colorScale.domain(domainArray);
        return colorScale;
    }

    //Draws out the graticule for the map.
    function setGraticule(map, path) {
        var graticule = d3.geoGraticule().step([5, 5]);

        map.append("path")
            .datum(graticule.outline())
            .attr("class", "gratBackground")
            .attr("d", path);

        map.selectAll(".gratLines")
            .data(graticule.lines())
            .enter()
            .append("path")
            .attr("class", "gratLines")
            .attr("d", path);
    }

    //Joins the CSV to the JSON to match variables to be represented.
    function joinData(Minnesota, csvData) {
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i];
            var csvKey = csvRegion.County.trim().toLowerCase();

            for (var a = 0; a < Minnesota.length; a++) {
                var geojsonProps = Minnesota[a].properties;
                var geojsonKey = geojsonProps.NAME.trim().toLowerCase();

                if (geojsonKey === csvKey) {
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]);
                        geojsonProps[attr] = val;
                    });
                }
            }
        }
        return Minnesota;
    }

})();