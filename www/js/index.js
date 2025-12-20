 document.addEventListener('deviceready', onDeviceReady, false);


let hostArr = {
    "49007e6": {loc: [-33.8971504, 18.6008425], "offset": 0.00001, "color": "#4deeea", "marker": null, "short": "Huis (0)", "id": "11hYPWvYLmQQzdbZHew4pcHUnQuMGu6TrgHPxdNjwq8QV3X8ERY"}
    , "dfb59b2": {loc: [-33.8785989, 18.5331545], "offset": 0.00002, "color": "#74ee15", "marker": null, "short": "Gert (1)", "id": "112MHyaMawuKZ4zZ8B7roHfxh3Smf5Y6LWXp6QxRrwUg3mACrd5S"}
    , "378682a": {loc: [-33.8187829, 18.4765355], "offset": 0.00003, "color": "#f000ff", "marker": null, "short": "Werk (2)", "id": "11Xiec4DBxhXBxETQvbVF4nj3sjzUZuV6kv7hz8rhAcT9RHAhff"}
    , "5fada4e": {loc: [-33.8923489, 18.5968495], "offset": 0.00004, "color": "#ffe700", "marker": null, "short": "Dawie (3)", "id": "112jD7XZ2xqqTiFMiLqtu6avKkSG4uHXbv1T4TYCRYDCFnbHrCvy"}
    , "004352d": {loc: [-33.9714349, 18.4884365], "offset": 0.00005, "color": "#00a86b", "marker": null, "short": "Jimmy (4)", "id": "11Q9JpTzGyfFxt5UbBy8rLsdHxkkiS5GzAkbZnFi6LJ3a49CcRT"}
    , "1f0258d": {loc: [-33.8715777, 18.6624354], "offset": 0.00006, "color": "red", "marker": null, "short": "Ronald (5)", "id": "114C5gJtcqXdbLsupo8tQRF6JPeRD36pZB2dWp32dm4orQTM9v9"}
    , "3b8f843": {loc: [-33.8971604, 18.6008525], "offset": 0.00007, "color": "blue", "marker": null, "short": "sc (6)", "id": "11s2bcc9C2mmgZwHXLGxmUcWHsmmVmvTvNL8bgFT6JmxTDJLtVm"}
    , "f2207df": {loc: [-33.8971704, 18.6008625], "offset": 0.00008, "color": "black", "marker": null, "short": "sc (7)", "id": "112LA3X1H552jCukbHz4Bas1grwdn1XQju9TLFovPaKk7L49Ki3V"}
};

mapboxgl.accessToken = 'pk.eyJ1IjoiY2FydG9kYmluYyIsImEiOiJja202bHN2OXMwcGYzMnFrbmNkMzVwMG5rIn0.Zb3J4JTdJS-oYNXlR3nvnQ';

function onDeviceReady() {
    // Cordova is now initialized. Have fun!

    console.log('Running cordova-' + cordova.platformId + '@' + cordova.version);
    //   document.getElementById('deviceready').classList.add('ready');


    setTimeout(function () {
        window.plugins.insomnia.keepAwake();
        // map.setStyle('mapbox://styles/mapbox-map-design/ckhqrf2tz0dt119ny6azh975y');
         map.setStyle('mapbox://styles/mapbox/satellite-streets-v120');
        setInterval(function () {
            if (typeof map === "undefined" || map === null) {
              cordova.plugins.diagnostic.restart(null, true)
            }
        }, 1000);
    }, 1000);
}


setInterval(function () {

    let state = {};
    state.bearing = map.getBearing();
    state.zoom = map.getZoom();
//        state.center = map.getCenter();
    state.lng = map.getCenter().lng;
    state.lat = map.getCenter().lat;
    state.pitch = map.getPitch();
    //  console.log("state", state);
    localStorage.setItem('mapState', JSON.stringify(state));
}, 5000);


let mapStartState = {
    container: 'map',
    zoom: 16,
    center: [18.6058338, -33.8978024],
    pitch: 85,
    bearing: 80,
    // style: 'mapbox://styles/mapbox/satellite-streets-v120'
};

if (typeof localStorage.getItem('mapState') == 'string') {
    let state = JSON.parse(localStorage.getItem('mapState'));
    console.log(typeof state);
    if (state) {
        mapStartState.zoom = state.zoom;
        mapStartState.center = [state.lng, state.lat];
        mapStartState.pitch = state.pitch;
        mapStartState.bearing = state.bearing;
    }
}

var greenMarker;
var yellowMarker;
const map = new mapboxgl.Map(mapStartState);
const myMarker = new mapboxgl.Marker();

const fps = new mapboxgl.FrameRateControl({/* optional options */});
map.addControl(fps);

map.flying = false;

map.on('load', () => {
;


    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 10
    });

    // add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({'source': 'mapbox-dem', 'exaggeration': 1});

    // remove the fog completely.
    map.setFog(null);

    // // add a sky layer that will show when the map is highly pitched
    // map.addLayer({
    //     'id': 'sky',
    //     'type': 'sky',
    //     'paint': {
    //         'sky-type': 'atmosphere',
    //         'sky-atmosphere-sun': [0.0, 0.0],
    //         'sky-atmosphere-sun-intensity': 15
    //     }
    // });


    // map.addSource('route', {
    //     'type': 'geojson',
    //     'data': {
    //         'type': 'Feature',
    //         'properties': {},
    //         'geometry': {
    //             'type': 'LineString',
    //             'coordinates': [
    //                 // [18.6008425, -33.8971504],
    //                 // [18.5331545, -33.8785989],
    //                 // [18.4765355, -33.8187829]
    //             ]
    //         }
    //     }
    // });


    // map.addLayer({
    //     'id': 'route',
    //     'type': 'line',
    //     'source': 'route',
    //     'layout': {
    //         'line-join': 'round',
    //         'line-cap': 'round'
    //     },
    //     'paint': {
    //         'line-color': '#888',
    //         'line-width': 8
    //     }
    // });

    map.addControl(new mapboxgl.ScaleControl({position: 'bottom-right'} ));

    myMarker.setLngLat(map.getCenter()).addTo(map);

    let moveTimer = 0;


    $.each(hostArr, function (h) {
        h.point = {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Point",
                "coordinates": h.loc
            }
        };
    });


    map.on('move', function (e) {
        //  console.log("map on move");
        moveTimer++;
        if (mapTrack) {
            myMarker.setLngLat(map.getCenter());
        }
    });


    map.on('dragstart', function (e) {
        console.log("map on dragstart");
        if (mapTrack) {
            mapTrack = false;
            $('#TrackBtn').prop('checked', false);
            //$('#TrackBtn').click();
        }
    });


//    map.on('flystart', function () {
//        map.flying = true;
//        console.log('map on flystart');
//    });

//    map.on('flyend', function () {
//        map.flying = false;
//        console.log('map on flyend');
//    });

    map.on('moveend', function (e) {
        // console.log('map on moveend1');
        if (map.flying) {
            // tooltip or overlay here
            console.log('map on moveend2');
            //  map.fire(flyend);
            map.flying = false;
            mapTrack = $("#TrackBtn").is(':checked');
        }
    });

    map.on('easeend', function (e) {
        // console.log('map on easeend1');
        if (map.flying) {
            // tooltip or overlay here
            console.log('map on easeend2', $("#TrackBtn").is(':checked'));
            mapTrack = $("#TrackBtn").is(':checked');
        }
    });

});


//map.easeTo({
//    padding: {top: 600},
//    duration: 100
//});

var ext = document.querySelector('#map canvas');
ext.addEventListener("webglcontextlost", function (e) {
    // restore the context after this event has exited.
    console.log("webglcontextlost");
    map.remove();
    reload();
});

function reload() {
    setTimeout(function () {
        window.location.reload(true);
    }, 1000);
}


$('#TrackBtn').change(function () {
    if (this.checked) {
        flyToLocation(c);
        map.flying = true;
    } else {
        mapTrack = false;
    }
});

$('#NorthBtn').change(function () {
    if (this.checked) {
        northUp = true;
    } else {
        northUp = false;
    }
    flyToLocation(c);
});


