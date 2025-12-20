var httpd = null;
var MapboxDir = '/';
var fileNotFoundArr = [];

document.addEventListener("deviceready", onDeviceReadyHttpd, false);


async function onDeviceReadyHttpd() {
  webserver.stop();

  webserver.onRequest(async (request) => {
    // console.log("📥 Incoming request:", request);

    try {

      // Handle tile requests (MBTiles)
      const tileParams = parseTileRequest(request.path);
      if (!tileParams) {
        const data = await readFile(request);
        if (data) {
          // return sendResponse(request, 200, data, 'text/plain');
          webserver.sendResponse(request.requestId, {
            status: 200,
            bodyBase64: hexToBase64(data),
            headers: {
              'Content-Type': 'image/webp',
              'Access-Control-Allow-Origin': '*',
            },
          });
          return;
        }
        return sendResponse(request, 404, 'Not Found', 'text/plain');
      }
      const mbtile = getDatabaseName(request.path);
      await handleTileRequest(request, mbtile, tileParams);

    } catch (error) {
      console.error("❌ Request error:", error);
      sendResponse(request, 500, error.message || 'Internal Server Error', 'text/plain');
    }
  });

  webserver.start(
    (data) => console.log("✅ Server running at:", data),
    (err) => console.error("❌ Server error:", err),
    64046
  );
}

//
// ────────────────────────────────
// 🧩 Helper Functions
// ────────────────────────────────
//

/**
 * Sends a webserver response with standard headers
 */
function sendResponse(request, status, body, contentType = 'text/plain') {
  webserver.sendResponse(request.requestId, {
    status,
    body,
    headers: {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Parses tile request path into { z, x, y }
 */
function parseTileRequest(path) { 
  // const match = path && path.match(/\/(\d+)\/(\d+)\/(\d+)\.webp$/);
  const match = path && path.match(/\/(\d+)\/(\d+)\/(\d+)(?:\.[a-z0-9._-]+)+$/i);
  if (!match) return null;

  return {
    z: +match[1],
    x: +match[2],
    y: +match[3],
  };
}

/**
 * Determines which MBTiles database to use based on the request path
 */
function getDatabaseName(path = '') {
  if (path.includes("mapbox.satellite")) return 'mapbox-satellite.db';
  if (path.includes("mapbox.mapbox-terrain-dem-v1")) return 'mapbox-terrain.db';
  if (path.includes("mapbox.mapbox-streets-v8")) return 'mapbox.mapbox-streets-v8.db';
  return 'mapbox-satellite.db'; // default
}

/**
 * Handles a tile request from SQLite MBTiles
 */
async function handleTileRequest(request, dbName, { z, x, y }) {
  const db = window.sqlitePlugin.openDatabase({ name: dbName, location: 'default' });

  db.transaction((tx) => {
    tx.executeSql(
      `SELECT hex(tile_data) AS tile_data, length(tile_data) AS len
       FROM tiles
       WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?`,
      [z, x, y],
      (tx, result) => {
        if (result.rows.length > 0) {
          const row = result.rows.item(0);
          // console.log(`📦 Tile found (${z}/${x}/${y}) length: ${row.len}`);
          webserver.sendResponse(request.requestId, {
            status: 200,
            bodyBase64: hexToBase64(row.tile_data),
            headers: {
              'Content-Type': 'image/webp',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } else {
          // console.warn(`⚠️ Tile not found (${z}/${x}/${y})`);
          sendResponse(request, 404, '', 'image/webp');
        }
      },
      (tx, error) => {
        console.error("SQL Error:", error.message);
        sendResponse(request, 500, error.message, 'text/plain');
      }
    );
  });
}


function getFilename(path) {
  // Split by backslash (for Windows paths) and get the last part
  let parts = path.split('\\');
  let filenameWithExtension = parts.pop();

  // Split by forward slash (for Unix/URL paths) and get the last part
  parts = filenameWithExtension.split('/');
  filenameWithExtension = parts.pop();

  return filenameWithExtension;
}

function getDir(filePath) {
  console.log("getDir:", filePath);
  const lastSlashIndex = filePath.lastIndexOf('/');
  if (lastSlashIndex === -1) {
    // No slash found, meaning it's just a file name or a relative path in the current directory
    console.log("No slash found in path:", filePath); 
    return ''; 
  }
  return filePath.substring(0, lastSlashIndex);
}


function safeJoinPath(dir, subpath) {
  return dir + subpath
    .split('/')
    .map(part => part.replace(/[ ,]+/g, '_')) // replace spaces and commas with underscore
    .join('/');
}


async function readFile(request, dir = cordova.file.applicationDirectory + 'www/httpd') {
  const path = safeJoinPath(dir, getDir(request.path));
  const filename = getFilename(request.path);

  console.log("🔍 Reading file from path:", path);
  console.log("📄 Filename:", filename);

  const arrayBufferToHex = (buffer) => {
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const readFileEntry = (fileEntry) => {
    return new Promise((resolve, reject) => {
      fileEntry.file((file) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(arrayBufferToHex(reader.result));
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
      }, reject);
    });
  };

  try {
    const entry = await new Promise((resolve, reject) => {
      window.resolveLocalFileSystemURL(path, resolve, reject);
    });

    if (entry.isFile) {
      return await readFileEntry(entry);
    } else {
      const fileEntry = await new Promise((resolve, reject) => {
        entry.getFile(filename, { create: false }, resolve, reject);
      });
      return await readFileEntry(fileEntry);
    }
  } catch (err) {
    if (err.code === 1) { // NOT_FOUND_ERR
      fileNotFoundArr.push(request.path);
    } else {
      console.error("⚠️ File read error:", err, request.path);
    }
    return false;
  }
}


// function safeJoinPath(dir, subpath) {
//   // Split the path and encode only file or folder names that may contain unsafe characters
//   return dir + subpath
//       .split('/')
//       .map(encodeURIComponent)
//       .join('/');
// }
 
//   async function readFile(request, dir = cordova.file.applicationDirectory + 'www/httpd/') {
//     return new Promise((resolve, reject) => {
//       const path = safeJoinPath(dir, getDir(request.path));
//       console.log("Reading file from path:", path, request.path);
//       window.resolveLocalFileSystemURL(path, (directoryEntry) => {
//         console.log("Directory entry:", directoryEntry, request.path);
//         directoryEntry.getFile(getFilename(request.path), { create: false }, (fileEntry) => {
//           console.log("File entry:", fileEntry);
//           fileEntry.file((file) => {
//             const reader = new FileReader();
  
//             reader.onloadend = function () {
//               resolve(this.result); // ✅ Return the content
//             };
  
//             reader.onerror = reject;
//             reader.readAsText(file);
//           }, reject);
//         }, reject);
//       }, reject);
//     }).catch((err) => {
      
//       if( err.code === 1 ) {
//         fileNotFoundArr.push(request.path);
//       } else {
//         console.error("File read error:", err, request.path);
//       }
//       return false; // or throw err if you prefer
//     });
//   }


  function hexToBase64(hexstring) {
    return btoa(hexstring.match(/\w{2}/g).map(function(a) {
        return String.fromCharCode(parseInt(a, 16));
    }).join(""));
}
