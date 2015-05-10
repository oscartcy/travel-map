var width = 960,
    height = 500;

var places = ["Hong Kong", "Oslo, Norway", "Reykjavik, Iceland", "Amsterdam, Nederland", "Hong Kong"];

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

// var color = d3.interpolateLab("#008000", "#c83a22");
// var color = d3.interpolateLab("#8fc400", "#c9e800");
var color = d3.interpolateLab("#00b247", "#fff600");
// var color = d3.interpolateLab("#38afff", "#78d85b");
var pathWidth = 2;
var pathPrecision = 4;

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {
        return "<strong>" + d.properties.name + "</strong>";
    })

svg.call(
    d3.geo.zoom().projection(projection)
        .on("zoom", function() {
            svg.selectAll("path:not(.markerPath):not(.path)").attr("d", path);

            var paths = svg.select(".paths")
                .selectAll(".path")
                .data(quad(sample(path(pathsFeature), pathPrecision)));

            paths.enter()
                .append("path")
                .attr("class", "path");

            paths.style("fill", function(d) { return color(d.t); })
                .style("stroke", function(d) { return color(d.t); })
                .attr("d", function(d) { return lineJoin(d[0], d[1], d[2], d[3], pathWidth); });

            paths.exit().remove();

            position_labels();
        })
);

var countries;
var pathsFeature;

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
        console.log('compute paths: ', computePathsFeature(locations));

        pathsFeature = computePathsFeature(locations);

        var paths = svg
            .append("g")
            .attr("class", "paths")
            .selectAll(".path")
            .data(quad(sample(path(pathsFeature), pathPrecision)))
            .enter()
            .append("path")
            .attr("class", "path")
            .style("fill", function(d) { return color(d.t); })
            .style("stroke", function(d) { return color(d.t); })
            .attr("d", function(d) { return lineJoin(d[0], d[1], d[2], d[3], pathWidth); });

        svg.append("g")
            .attr("class", "labels")
            .selectAll(".label")
            .data(locations)
            .enter()
            .append("text")
            .attr("class", "label")
            .text(function(d) {
                return d.properties.name; 
            });
        position_labels();

        console.log("locations: ", locations);

        var points = svg
            .append("g")
            .attr("class", "points")
            .selectAll(".point")
            .data(locations)
            .enter()
            .append("path")
            .attr("class", "point")
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

    return {
        "type": "LineString",
        "coordinates": coors
    };
}

function position_labels() {
    var centerPos = projection.invert([width/2,height/2]);

    var arc = d3.geo.greatArc();

    svg.selectAll(".label")
    .attr("text-anchor",function(d) {
        var x = projection(d.coordinates)[0];
        return x < width/2-20 ? "end" :
        x < width/2+20 ? "middle" :
        "start"
    })
    .attr("transform", function(d) {
        var loc = projection(d.coordinates),
        x = loc[0],
        y = loc[1];
        var offset = x < width/2 ? -5 : 5;
        return "translate(" + (x+offset) + "," + (y-2) + ")"
    })
    .style("display",function(d) {
        var d = arc.distance({source: d.coordinates, target: centerPos});
        return (d > 1.57) ? 'none' : 'inline';
    })

}

// Sample the SVG path string "d" uniformly with the specified precision.
function sample(d, precision) {
  var path = document.createElementNS(d3.ns.prefix.svg, "path");
  path.setAttribute("d", d);

  var n = path.getTotalLength(), t = [0], i = 0, dt = precision;
  while ((i += dt) < n) t.push(i);
  t.push(n);

  return t.map(function(t) {
    var p = path.getPointAtLength(t), a = [p.x, p.y];
    a.t = t / n;
    return a;
  });
}

// Compute quads of adjacent points [p0, p1, p2, p3].
function quad(points) {
  return d3.range(points.length - 1).map(function(i) {
    var a = [points[i - 1], points[i], points[i + 1], points[i + 2]];
    a.t = (points[i].t + points[i + 1].t) / 2;
    return a;
  });
}

// Compute stroke outline for segment p12.
function lineJoin(p0, p1, p2, p3, width) {
  var u12 = perp(p1, p2),
      r = width / 2,
      a = [p1[0] + u12[0] * r, p1[1] + u12[1] * r],
      b = [p2[0] + u12[0] * r, p2[1] + u12[1] * r],
      c = [p2[0] - u12[0] * r, p2[1] - u12[1] * r],
      d = [p1[0] - u12[0] * r, p1[1] - u12[1] * r];

  if (p0) { // clip ad and dc using average of u01 and u12
    var u01 = perp(p0, p1), e = [p1[0] + u01[0] + u12[0], p1[1] + u01[1] + u12[1]];
    a = lineIntersect(p1, e, a, b);
    d = lineIntersect(p1, e, d, c);
  }

  if (p3) { // clip ab and dc using average of u12 and u23
    var u23 = perp(p2, p3), e = [p2[0] + u23[0] + u12[0], p2[1] + u23[1] + u12[1]];
    b = lineIntersect(p2, e, a, b);
    c = lineIntersect(p2, e, d, c);
  }

  return "M" + a + "L" + b + " " + c + " " + d + "Z";
}

// Compute intersection of two infinite lines ab and cd.
function lineIntersect(a, b, c, d) {
  var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3,
      y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3,
      ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
  return [x1 + ua * x21, y1 + ua * y21];
}

// Compute unit vector perpendicular to p01.
function perp(p0, p1) {
  var u01x = p0[1] - p1[1], u01y = p1[0] - p0[0],
      u01d = Math.sqrt(u01x * u01x + u01y * u01y);
  return [u01x / u01d, u01y / u01d];
}

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
                svg.selectAll("path:not(.markerPath):not(.path)").attr("d", path);

                var paths = svg.select(".paths")
                    .selectAll(".path")
                    .data(quad(sample(path(pathsFeature), pathPrecision)));

                paths.enter()
                    .append("path")
                    .attr("class", "path");

                paths.style("fill", function(d) { return color(d.t); })
                    .style("stroke", function(d) { return color(d.t); })
                    .attr("d", function(d) { return lineJoin(d[0], d[1], d[2], d[3], pathWidth); });

                paths.exit().remove();

                position_labels();
            };
        });

    // svg.call(
    //     d3.geo.zoom().projection(projection)
    //         .center(result)
    // );
});