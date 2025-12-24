// Dictionary of markers keyed by senderId
const convoyMarkers = {};

// Assign each vehicle a random color initially
function getRandomColor() {
  const colors = ['blue', 'green', 'orange', 'purple', 'red'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Load saved attributes from localStorage
function loadAttributes(senderId) {
  const data = localStorage.getItem(`vehicle-${senderId}`);
  return data ? JSON.parse(data) : { name: `Vehicle ${senderId}`, color: 'blue' };
}

// Save attributes to localStorage
function saveAttributes(senderId, attrs) {
  localStorage.setItem(`vehicle-${senderId}`, JSON.stringify(attrs));
}

function applyMarkerColor(senderId, newColor) {
  const entry = convoyMarkers[senderId];
  if (!entry || !entry.marker) return;

  // Ensure valid hex color with leading #
  const color = /^#/.test(newColor) ? newColor : `#${newColor}`;

  const oldMarker = entry.marker;
  const lngLat = oldMarker.getLngLat();
  const popup = oldMarker.getPopup();

  // Remove the old marker
  oldMarker.remove();

  // Create a new marker with the new color
  const newMarker = new mapboxgl.Marker({
    color,
    scale: 0.75,
    draggable: false,
    pitchAlignment: 'auto',
    rotationAlignment: 'auto'
  })
  .setLngLat(lngLat)
  .setPopup(popup)
  .addTo(map);

  // Store back
  convoyMarkers[senderId].marker = newMarker;
}


// Helper: change the inner dot color
function setCenterDotColor(senderId, color) {
  const entry = convoyMarkers[senderId];
  if (!entry || !entry.marker) return;

  const el = entry.marker.getElement();
  const innerCircle = el.querySelector('svg circle');
  if (innerCircle) {
    innerCircle.setAttribute('fill', color);
  }
}

function updateConvoy(packet) {
  const { senderId, latitude, longitude, linkedDevice } = packet;
  packet.receivedAt = new Date();

  if (convoyMarkers[senderId]) {
    // Move existing marker
    convoyMarkers[senderId].marker.setLngLat([longitude, latitude]);
    convoyMarkers[senderId].packet = packet;
    

    // Reset timer
    resetMarkerTimer(senderId);
  } else {
    // Load saved attributes or defaults
    const attrs = loadAttributes(senderId);

    const popupContent = `
    <div style="font-size: 4px;" class="text-muted row">
      <div class="col-6">${linkedDevice ? "("+senderId+")" : senderId }</div>
      <div class="col-6" id='seen-${senderId}'></div>
      </div>
          <div class="row">
            <div class="col-2 px-1">
              <input id="color-${senderId}" type="color" value="${attrs.color}" />
            </div>
            <div class="col-8">
              <input id="name-${senderId}" type="text" value="${attrs.name}" />
            </div>
          </div>
            <table style="font-size: 5px;" class="table table-sm table-striped">
            <tbody>
              <tr><td>Speed</td><td id='speed-${senderId}'></td></tr>
              <tr><td>Heading</td><td id='head-${senderId}'></td></tr>
              <tr><td>Lat</td><td id='lat-${senderId}'></td></tr>
              <tr><td>Long</td><td id='lng-${senderId}'></td></tr>
              <tr><td>Distance</td><td id='dist-${senderId}'></td></tr>
            </tbody>
          </table>
          
    `;

    let popup = new mapboxgl.Popup({ offset: 25 })
      .setHTML(popupContent);

    const marker = new mapboxgl.Marker({
      color: attrs.color,
      scale: 0.75,
      draggable: false,
      pitchAlignment: 'auto',
      rotationAlignment: 'auto'
    })
    .setLngLat([longitude, latitude])
    .setPopup(popup)
    .addTo(map);

    popup.on('open', function() {
      
      // Auto-save name on type
      $(`#name-${senderId}`).off('input').on('input', function() {
        const newName = $(this).val();
        const currentColor = $(`#color-${senderId}`).val();
        saveAttributes(senderId, { name: newName, color: currentColor });
      });
    
      // Live color update and auto-save
      $(`#color-${senderId}`).off('input').on('input', function() {
        const newColor = $(this).val();
        const currentName = $(`#name-${senderId}`).val();    
        saveAttributes(senderId, { name: currentName, color: newColor });
    
        // Update marker immediately (recreate for reliability)
        applyMarkerColor(senderId, newColor);
      });

      convoyMarkers[senderId].intervalInfo = setInterval(() => {
        const now = new Date();
        updateConvoyInfo(senderId);
      }, 1000);

      updateConvoyInfo(senderId);
    });

    popup.on('close', function() {
      // Clear info update interval
      const entry = convoyMarkers[senderId];
      if (entry && entry.intervalInfo) {
        clearInterval(entry.intervalInfo);
        entry.intervalInfo = null;
      }
    });

    convoyMarkers[senderId] = { marker, packet, timerOrange: null, timerRed: null,  intervalInfo: null };

    // Start timer
    resetMarkerTimer(senderId);
  }
  updateConvoyInfo(senderId);
}

function updateConvoyInfo(senderId) {
  const entry = convoyMarkers[senderId];
  if (!entry) return;

   packet = entry.packet;

  // Update popup info if open
  const popup = entry.marker.getPopup();
  if (popup.isOpen()) {
    $(`#speed-${senderId}`).text(`${packet.speed} km/h`);
    $(`#head-${senderId}`).text(`${packet.heading}°`);
    $(`#lat-${senderId}`).text(packet.latitude.toFixed(6));
    $(`#lng-${senderId}`).text(packet.longitude.toFixed(6));
    $(`#seen-${senderId}`).text(((new Date()) - packet.receivedAt) / 1000 );
    $(`#dist-${senderId}`).text(getDistance(c, packet).toFixed(2) + ' km');
  }
}

// Reset watchdog timer for a marker
function resetMarkerTimer(senderId) {
  const entry = convoyMarkers[senderId];
  if (!entry) return;

  // Clear any existing timer
  if (entry.timerRed) {
    clearTimeout(entry.timerRed);
  }

  setCenterDotColor(senderId, 'white');

  // Start new 30s timer
  entry.timerRed = setTimeout(() => {
    // No packet received in 30s → dot goes red
    setCenterDotColor(senderId, 'red');
    console.log(`Marker ${senderId} timed out → dot set to red`);
  }, 30000);
}


function jsonParser(jsonString) {
  try {
      let obj = JSON.parse(jsonString);
    //  console.log("Received JSON:", jsonString);
      try {
        updateConvoy(obj); // your handler
      } catch (e) {
        console.debug("updateConvoy handler error:", e);
      }
    } catch (e) {
      console.error("Invalid JSON received:", jsonString, e);
    }
}


function whiteToRed(pct) {
  const p = Math.max(0, Math.min(100, pct)) / 100; // clamp 0–100, normalize 0–1
  const r = 255;                     // red channel stays max
  const g = Math.round(255 * (1 - p)); // green decreases
  const b = Math.round(255 * (1 - p)); // blue decreases
  const hex = (x) => x.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
