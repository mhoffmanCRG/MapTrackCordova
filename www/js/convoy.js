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
  const { senderId, lat, lng, linkedDevice } = packet;
  console.log(packet)

  if (convoyMarkers[senderId]) {
    // Move existing marker
    convoyMarkers[senderId].marker.setLngLat([lng, lat]);

    // Reset timer
    resetMarkerTimer(senderId);
  } else {
    // Load saved attributes or defaults
    const attrs = loadAttributes(senderId);

    const popupContent = `
      <div>
        <label>Id:${senderId}, Local ${linkedDevice}</label><br/>
        <label>Name:</label><br/>
        <input id="name-${senderId}" type="text" value="${attrs.name}" /><br/><br/>
        <label>Color:</label><br/>
        <input id="color-${senderId}" type="color" value="${attrs.color}" /><br/><br/>
      </div>
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
    .setLngLat([lng, lat])
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
  
        console.log(senderId, newColor);
    
        saveAttributes(senderId, { name: currentName, color: newColor });
    
        // Update marker immediately (recreate for reliability)
        applyMarkerColor(senderId, newColor);
      });
    });
    convoyMarkers[senderId] = { marker, packet, timer: null };

    // Start timer
    resetMarkerTimer(senderId);
  }
}

// Reset watchdog timer for a marker
function resetMarkerTimer(senderId) {
  const entry = convoyMarkers[senderId];
  if (!entry) return;

  // Clear any existing timer
  if (entry.timer) {
    clearTimeout(entry.timer);
  }

  setCenterDotColor(senderId, 'white');

  // Start new 30s timer
  entry.timer = setTimeout(() => {
    // No packet received in 30s → dot goes red
    setCenterDotColor(senderId, 'red');
    console.log(`Marker ${senderId} timed out → dot set to red`);
  }, 120000);
}
