var width = 960,
    height = 500;

var places = ["Hong Kong", "Oslo, Norway", "Reykjavik, Iceland", "Amsterdam, Nederland"];

var locationPointSize = 3.0;

var projection = d3.geo.orthographic()
    .scale(250)
    .translate([width / 2, height / 2])
    .clipAngle(90);

var path = d3.geo.path()
    .projection(projection)
    .pointRadius(locationPointSize);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<strong>" + d.name + "</strong>";
    })

svg.call(
    d3.geo.zoom().projection(projection)
        .on("zoom", function() {
            svg.selectAll("path").attr("d", path);
        })
);

var countries;

d3.json("data/world-110m.json", function(error, world) {
    svg.append("path")
        .datum(topojson.feature(world, world.objects.land))
        .attr("class", "land")
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);

    countries = topojson.feature(world, world.objects.countries).features;

    batchGeocode(places).then(function(locations) {
        console.log("locations: ", locations);

        var points = svg.selectAll(".point")
            .data(locations)
            .enter()
            .insert("path")
            .attr("class", "point")
            .attr("d", function(d) {
                return path(d); 
            });



        console.log('compute paths: ', computePathsFeature(locations));

        var pathsFeature = computePathsFeature(locations);

        var paths = svg.selectAll(".path")
            .data(pathsFeature)
            .enter()
            .insert("path")
            .attr("class", "path")
            .attr("d", function(d) {
                return path(d); 
            });

        points.call(tip);

        points.on('mouseover', tip.show)
            .on('mouseout', tip.hide);
    });
});

var computePathsFeature = function(locations) {
    var coors = $.map(locations,
        function(ele, i) {
            return [ele.coordinates];
        }
    );

    return [{
        "type": "LineString",
        "coordinates": coors
    }];
}

// service for gecoding
var geocode = function (q) {
    return $.ajax("http://nominatim.openstreetmap.org/search/", {
        data: {
            q: q,
            format: "json"
        }
    }).then(function(data) {
        if (!data || !data[0]) {
            throw new Error("Geocoding '" + q + "' failed.");
        }
        // return {
        //     lat: parseFloat(data[0].lat, 10),
        //     lon: parseFloat(data[0].lon, 10)
        // };
        // return [parseFloat(data[0].lat, 10), parseFloat(data[0].lon, 10)];
        return { "type": "Point", "coordinates": [parseFloat(data[0].lon, 10), parseFloat(data[0].lat, 10)] ,"name": q};
    });
};

var batchGeocode = function(places) {
    return $.when.apply($.when, places.map(geocode)).then(function() {
        return Array.prototype.slice.apply(arguments);
    });
};

// POC on rotating the globe
geocode('hong kong').then(function(result) {
    console.log('geocoding: ', result);

    // var p = d3.geo.centroid(result);
    // // var r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);
    // projection.rotate(result);
    // svg.selectAll("path").attr("d", path);

    d3.transition()
        .duration(1250)
        .tween("rotate", function() {
            var p = d3.geo.centroid(result),
            r = d3.interpolate(projection.rotate(), [-p[0], -p[1]]);

            return function(t) {
                projection.rotate(r(t));
                svg.selectAll("path").attr("d", path);
            };
        });

    // svg.call(
    //     d3.geo.zoom().projection(projection)
    //         .center(result)
    // );
});