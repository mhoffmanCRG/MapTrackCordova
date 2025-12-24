host = 'tcp://mh.crgsa.co.za';	// hostname or IP address
port = 1884;
topic = '/lora/#';		// topic to subscribe to
useTLS = false;
username = null;
password = null;
cleansession = true;
reconnectTimeout = 30000;




$(document).ready(function () {
    MQTTconnect();
});

function onMessageArrived(message) {

    // console.log(message);

    var topic = message.destinationName;
    var payload = message.payloadString;
    let sourceId = basename(topic);

    let p = JSON.parse(payload);
    let o = packetDecode(p.rxpk[0].data);

    console.log(hostArr[sourceId]);
    let s = hostA
    rr[sourceId];



    let popup = new mapboxgl.Popup({offset: 25})
            .setText(s.short + '' );

    s.marker = new mapboxgl.Marker({
        color: s.color,
        scale: 0.75,
        draggable: false,
        pitchAlignment: 'auto',
        rotationAlignment: 'auto'
    }).setLngLat([o.lng + s.offset, o.lat + s.offset]).setPopup(popup).addTo(map);

    // console.log(hostArr[sourceId]);
}
;

function _base64ToArrayBuffer(base64) {
    var binary_string = window.atob(base64);
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}


function packetDecode(packet) {
    let ab = _base64ToArrayBuffer(packet);
    if (packet.startsWith("AA") && ab.byteLength == 20) {

        let Uint8 = new Uint8Array(ab);
        let int16 = new Int16Array(ab);
        let int32 = new Int32Array(ab);
        let Uint32 = new Uint32Array(ab);

        let o = {
//           type:    int16[0],
            id: Uint8[2],
            lat: int32[1] / 10000000,
            lng: int32[2] / 10000000,
            speed: int32[3],
            head: Uint32[4] / 100000
        };

        // console.log(packet, o);
        return o;
    }
}



function MQTTconnect() {
    if (typeof path == "undefined") {
        path = '/ws_mqtt';
    }
    mqtt = new Paho.MQTT.Client(
            'mh.crgsa.co.za',
            80,
            path,
            "web_" + parseInt(Math.random() * 100, 10)
            );
    var options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            $('#status').val("Connection failed: " + message.errorMessage + "Retrying");
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;

    if (username != null) {
        options.userName = username;
        options.password = password;
    }
 //   console.log("Host=" + host + ", port=" + port + ", path=" + path + " TLS = " + useTLS + " username=" + username + " password=" + password);
    mqtt.connect(options);
}


function onConnect() {
    $('#status').val('Connected to ' + host + ':' + port + path);
    // Connection succeeded; subscribe to our topic
    mqtt.subscribe(topic, {qos: 0});
    $('#topic').val(topic);
}


function onConnectionLost(response) {
    setTimeout(MQTTconnect, reconnectTimeout);
    $('#status').val("connection lost: " + response.errorMessage + ". Reconnecting");

}
;



function basename(path) {
    return path.split('/').reverse()[0];
}
