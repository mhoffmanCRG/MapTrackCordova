var watchID = 0;
var CompassHead = 0;
let info = '';
let mapTrack = true;
let northUp = false;
let longitude = 0;
let latitude = 0;
let heading = 0;
let c = { longitude:0 ,latitude:0, heading:0};
var posMarker;

document.addEventListener('deviceready', function() {
    var permissions = cordova.plugins.permissions;
    var list = [
      permissions.ACCESS_FINE_LOCATION,
      permissions.ACCESS_COARSE_LOCATION
    ];
  
    permissions.checkPermission(permissions.ACCESS_FINE_LOCATION, function(status) {
      if (!status.hasPermission) {
        permissions.requestPermissions(list, function(status) {
          if (status.hasPermission) {
            console.log("✅ Location permission granted");
          } else {
            console.log("❌ Location permission denied");
          }
        }, function(error) {
          console.error("Permission request failed", error);
        });
      } else {
        console.log("✅ Already has location permission");
      }
    });
  });



$(document).ready(function () {
    console.log("ready!");

    setTimeout(function () {
        if (typeof navigator.geolocation === 'object' && typeof navigator.geolocation.watchPosition === 'function') {
            // $('#myInfoL').html("Gps watchPosition..." + cnt)
            watchID = navigator.geolocation.watchPosition(onSuccessLocation, onErrorLocation, {enableHighAccuracy: true});
            // setInterval(function () {
            //     // console.log("get location...");
            //     navigator.geolocation.getCurrentPosition(onSuccessLocation, onErrorLocation, {enableHighAccuracy: true});
            // }, 5000);

        } else {
            $('#myInfoL').html("Gps watchPosition failed!!!!");
        }
    }, 5000);

}, false);

function getProjectedPoint(c, t = 1000) {
    const KmPerSec = 0.00277778 * .85;
    var point = turf.point([c.latitude, c.longitude]);
    var distance = c.speed * KmPerSec * t / 1000;
    var bearing = isNaN(c.heading) ? 0 : (180 - c.heading - 90);
    var options = {units: 'kilometers'};
    var destination = turf.destination(point, distance, bearing, options);
    c.center = destination.geometry.coordinates.reverse();
    return c;
}


function onSuccessCompass(heading) {
    console.log('Compass : ' + heading);
    CompassHead = heading;
    info = heading;
}
;

function onErrorCompass(compassError) {
    console.log('Compass error: ' + compassError.code);
    myInfo = 'Compass error: ' + compassError.code;
}
;

var optionsCompass = {
    frequency: 3000
}; // Update every 3 seconds




var cnt = 0;

function onErrorLocation(e) {
    console.log("onErrorLocation", e);
    $('#myInfoL').html("Gps onErrorLocation");
}


function onSuccessLocation(position) {
    // console.log("onSuccessLocation", position, JSON.stringify(position));

    var distance = getDistance(c,position.coords);
    console.log("Distance: ",distance);
    
    c = position.coords;
    c.ms = (new Date()).getTime();

    $('#speed').html((c.speed * 3.6).toFixed(0));
    $('#lat').html(c.latitude.toFixed(3));
    $('#lng').html(c.longitude.toFixed(3));

    //Estimate based on speed and direction
    c = getProjectedPoint(c);

    c.longitude = c.longitude.toFixed(9);
    c.latitude = c.latitude.toFixed(9);

    if (c.longitude != longitude && c.latitude != latitude ) {
        longitude = c.longitude;
        latitude = c.latitude;
        heading = c.heading;
                
        if (mapTrack ) {
            if( distance > 0.05) {
                console.log(c);
                c.heading = undefined+1;
            }
            
             flyToLocation(c);
        } else {
//            console.log('myMarker.setLngLat',[c.longitude, c.latitude]);
            myMarker.setLngLat([c.longitude, c.latitude]);
        }
    }
}

function getDistance(c1, c2) {
 //   console.log(c1,c2);
    var from = turf.point([c1.latitude, c1.longitude]);
    var to = turf.point([c2.latitude, c2.longitude]);
    var options = {};
    
    var distance = turf.distance(from, to, options);
    return distance;
}



function getTopOfset(){
      if (northUp) {
        topOfset = $(map.getCanvas()).height() * .8;
        topOfset = 0;
    } else {
        topOfset = 0;
    }  
    return topOfset;
}

function flyToLocation(c) {
    // console.log(c);
    let bearing = northUp?c.heading:null;
    
    if (isNaN(c.heading) || c.speed < 3.6 ) {
        // console.log("isNaN(c.heading)");
        map.flyTo({
            center: c.center,
            padding: {top: getTopOfset()},
            speed: 100,
            curve: 0,
            duration: 5000,
        });
    } else {
        
        map.flyTo({
            center: c.center,
            padding: {top: getTopOfset()},
            speed: 1000,
            curve: 0,
            duration: 4000,
            bearing: bearing,
            essential: true
        });
    }
}


//https://www.movable-type.co.uk/scripts/latlong.html
