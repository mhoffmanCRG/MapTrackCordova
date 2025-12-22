
// === BLE TARGET CONSTANTS ===
const deviceName = "ESP32C3_JSON";
const serviceUUID = "12345678-1234-1234-1234-1234567890ab";
const notifyCharacteristicUUID = "abcdefab-1234-5678-1234-abcdefabcdef";
const writeCharacteristicUUID = "fedcba98-7654-3210-7654-abcdefabcdef";

// === STATE ===
let connectedDeviceId = null;     // the single active connection
let connecting = false;           // prevents concurrent connect attempts
let rescanTimer = null;           // reconnection backoff timer
const SCAN_DURATION_MS = 5000;    // scan window to pick strongest

document.addEventListener("deviceready", function () {
  // Kick things off by connecting to the strongest ESP32C3_JSON
  connectStrongestESP();
});

// --- Utilities ---
function rssiValue(d) {
  // Treat undefined/null RSSI as very weak
  return (typeof d?.rssi === "number") ? d.rssi : -Infinity;
}

/**
 * Scan for duration and return the strongest device with the exact name.
 */
function scanForStrongestESP(durationMs, onDone) {
    $('#myInfoL').html("BLE:scanning");
  const found = new Map(); // id -> device

  ble.startScan([], function (device) {
    if (device?.name === deviceName) {
      // Keep the most recent info per id
      found.set(device.id, device);
    }
  }, function (error) {
    console.error("startScan error:", error);
    $('#myInfoL').html(error);
  });

  setTimeout(function () {
    ble.stopScan(function () {
      if (found.size === 0) {
        onDone(null);
        return;
      }
      let strongest = null;
      for (const d of found.values()) {
        if (!strongest || rssiValue(d) > rssiValue(strongest)) {
          strongest = d;
        }
      }
      onDone(strongest);
    }, function (err) {
      console.warn("stopScan error:", err);
      // Even if stopScan fails, try to pick strongest
      if (found.size === 0) {
        onDone(null);
      } else {
        let strongest = null;
        for (const d of found.values()) {
          if (!strongest || rssiValue(d) > rssiValue(strongest)) {
            strongest = d;
          }
        }
        onDone(strongest);
      }
    });
  }, durationMs);
}

/**
 * Ensure there's only one connection:
 * - If already connected, disconnect first.
 * - Scan for strongest ESP32C3_JSON and connect to it.
 * - After connection, request MTU (Android) and subscribe.
 * Accepts optional callback once connected.
 */
function connectStrongestESP(onConnected) {
  if (connecting) {
    console.log("Already connecting; skipping.");
    return;
  }
  connecting = true;

  // Helper to proceed to scanning after disconnect
  const afterDisconnect = function () {
    scanForStrongestESP(SCAN_DURATION_MS, function (strongest) {
      if (!strongest) {
        console.warn("No device named", deviceName, "found.");
        connecting = false;
        scheduleReconnect();
        return;
      }

      const targetId = strongest.id;
      console.log("Connecting to strongest:", strongest.name, strongest.id, "RSSI:", strongest.rssi);

      ble.connect(targetId, function (peripheral) {
        $('#myInfoL').html(`${targetId}`);
        console.log("Connected to", targetId);
        connectedDeviceId = targetId;
        connecting = false;

        // Request larger MTU (Android only)
        try {
          ble.requestMtu(targetId, 512, function () {
            console.log("MTU negotiated/set (Android).");
            // proceed to subscribe
            subscribeToNotifications(targetId);
            if (typeof onConnected === "function") onConnected(targetId);
          }, function (mtuErr) {
            console.warn("MTU request failed (likely non-Android or denied):", mtuErr);
            subscribeToNotifications(targetId);
            if (typeof onConnected === "function") onConnected(targetId);
          });
        } catch (e) {
          console.warn("MTU request not supported on this platform:", e);
          subscribeToNotifications(targetId);
          if (typeof onConnected === "function") onConnected(targetId);
        }
      }, function (error) {
        console.warn("Connect failed:", error);
        connectedDeviceId = null;
        connecting = false;
        scheduleReconnect();
      });
    });
  };

  // If connected to anything, ensure single connection by disconnecting first
  if (connectedDeviceId) {
    const toDisconnect = connectedDeviceId;
    ble.disconnect(toDisconnect, function () {
      console.log("Disconnected from", toDisconnect);
      connectedDeviceId = null;
      afterDisconnect();
    }, function (err) {
      console.warn("Disconnect error (continuing):", err);
      connectedDeviceId = null;
      afterDisconnect();
    });
  } else {
    afterDisconnect();
  }
}

/**
 * Subscribe to notifications from the connected device.
 */
function subscribeToNotifications(deviceId) {
  ble.startNotification(deviceId, serviceUUID, notifyCharacteristicUUID,
    function (data) {
      // Decode ArrayBuffer -> UTF-8 JSON string
      let decoder = new TextDecoder("utf-8");
      let jsonString = decoder.decode(data);
      jsonParser(jsonString);
      
    },
    function (error) {
      console.error("Notification error:", error);
      // If notifications fail, consider reconnecting to maintain the single valid connection
      scheduleReconnect();
    }
  );
}

/**
 * Backoff reconnect: rescan and connect strongest.
 */
function scheduleReconnect() {
  if (rescanTimer) return; // already scheduled
  rescanTimer = setTimeout(function () {
    rescanTimer = null;
    console.log("Rescanning to reconnect strongest...");
    connectStrongestESP();
  }, 1500);
}

// === Public write API ===
/**
 * Writes a JSON string to the write characteristic.
 * Guarantees single-connection behavior:
 * - If connected, write immediately.
 * - If not connected, connect to strongest first, then write.
 */
function bleWriteJSON(jsonString) {
  const buffer = new TextEncoder().encode(jsonString).buffer;

  const doWrite = function (deviceId) {
    ble.write(deviceId, serviceUUID, writeCharacteristicUUID, buffer,
      function () {
        console.log("Write success");
        $('#myInfoL').html(`BLE:${deviceId}`);
      },
      function (error) {
        console.error("Write error:", error);
        // If write fails due to connection issues, try reconnecting
        scheduleReconnect();
        $('#myInfoL').html("scheduleReconnect");
      }
    );
  };

  if (connectedDeviceId) {
    // Verify connection still alive before writing
    ble.isConnected(connectedDeviceId, function () {
      doWrite(connectedDeviceId);
    }, function () {
      console.warn("Device not connected anymore; reconnecting strongest...");
      connectedDeviceId = null;
      connectStrongestESP(function (newId) {
        if (newId) doWrite(newId);
      });
    });
  } else {
    console.log("No active connection; connecting to strongest first...");
     $('#myInfoL').html("connectStrongestESP");
    connectStrongestESP(function (newId) {
      if (newId) doWrite(newId);
    });
  }
}
