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
        return { "type": "Point", "coordinates": [parseFloat(data[0].lon, 10), parseFloat(data[0].lat, 10)] , "properties": {"name": q}};
    });
};

var batchGeocode = function(places) {
    return $.when.apply($.when, places.map(geocode)).then(function() {
        return Array.prototype.slice.apply(arguments);
    });
};