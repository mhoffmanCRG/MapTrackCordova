const deviceName = "ESP32C3_JSON";
const serviceUUID = "12345678-1234-1234-1234-1234567890ab";
const characteristicUUID = "abcdefab-1234-5678-1234-abcdefabcdef";
const writeCharacteristicUUID = "fedcba98-7654-3210-7654-abcdefabcdef"; 

document.addEventListener('deviceready', function() {
    var serviceUUID = "12345678-1234-1234-1234-1234567890ab";
    var characteristicUUID = "abcdefab-1234-5678-1234-abcdefabcdef";

    function connectAndSubscribe(deviceId) {
        ble.
        ble.connect(deviceId,
            function(peripheral) {
                console.log("Connected to", deviceId);

                // Request a larger MTU size (e.g., 512 bytes)
                ble.requestMtu(
                    deviceId,
                    512,
                    function() {
                        console.log('MTU Size set successfully to negotiated value.');

                        // Subscribe to notifications
                        ble.startNotification(deviceId, serviceUUID, characteristicUUID,
                            function(data) {
                                // data is an ArrayBuffer
                                let decoder = new TextDecoder("utf-8");
                                let jsonString = decoder.decode(data);

                                try {
                                    let obj = JSON.parse(jsonString);
                                    console.log("Received JSON:", obj);
                                } catch (e) {
                                    console.error("Invalid JSON:", jsonString);
                                }
                            },
                            function(error) {
                                console.error("Notification error:", error);
                            }
                        );
                    },
                    function(error) {
                        console.error('Failed to set MTU Size:', error);
                    }
                );
            },
            function(error) {
                console.warn("Disconnected or failed:", error);
                // Re-scan and reconnect
                rescanAndReconnect();
            }
        );
    }

    function rescanAndReconnect() {
        console.log("Rescanning for device...");
        ble.scan([], 5, function(device) {
            if (device.name === deviceName) {
                connectAndSubscribe(device.id);
            }
        }, function(error) {
            console.error("Scan error:", error);
        });
    }

    // Initial scan
    ble.scan([], 5, function(device) {
        if (device.name === deviceName) {
            connectAndSubscribe(device.id);
        }
    }, function(error) {
        console.error("Initial scan error:", error);
    });

   
});

function bleWriteJSON(jsonString) {
    var buffer = new TextEncoder().encode(jsonString).buffer;

    ble.list(function(devices) {
        console.log("Devices:", devices);

        // Find your ESP32 device in the list
        devices.forEach(function(device) {
            if (device.name === deviceName) {
                ble.connect(device.id,
                    function(peripheral) {
                        console.log("Connect success:", peripheral);

                        ble.write(device.id, serviceUUID, writeCharacteristicUUID, buffer,
                            function() {
                                console.log("Write success");
                            },
                            function(error) {
                                console.error("Write error:", error);
                            }
                        );
                    },
                    function(error) {
                        console.error("Connect error:", error);
                    }
                );
            }
        });
    }, function(error) {
        console.error("List error:", error);
    });
}