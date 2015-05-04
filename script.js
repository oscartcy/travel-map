var width = 960,
    height = 500;

var dragFactor = 1;

var projection = d3.geo.orthographic()
    .scale(250)
    .translate([width / 2, height / 2])
    .clipAngle(90);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.call(
    d3.geo.zoom().projection(projection)
        .on("zoom", function() {
            svg.selectAll("path").attr("d", path);
        })
);

d3.json("/data/world-110m.json", function(error, world) {
    svg.append("path")
        .datum(topojson.feature(world, world.objects.land))
        .attr("class", "land")
        .attr("d", path);

    svg.append("path")
        .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        .attr("class", "boundary")
        .attr("d", path);
});