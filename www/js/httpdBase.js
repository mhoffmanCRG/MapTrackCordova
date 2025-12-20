var httpd = null;
var MapboxDir = '/';

document.addEventListener('deviceready', function() {
    var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});

    db.transaction(function(tx) {
        tx.executeSql('CREATE TABLE IF NOT EXISTS test_table (id integer primary key, name text)');
        tx.executeSql('INSERT INTO test_table (name) VALUES (?)', ['Alice']);
        tx.executeSql('SELECT * FROM test_table', [], function(tx, res) {
            console.log('Rows:', res.rows.length);
            for (let i = 0; i < res.rows.length; i++) {
                console.log(res.rows.item(i));
            }
        });
    });
});


$(document).on('click', '#mapFolderBtn', async function () {
    $('#mapFolders').empty();
    // getDirs('file://storage/');
    // getDirs(cordova.file.externalRootDirectory);
    await initMapboxFolder()
    getDirs(cordova.file.externalDataDirectory);
});

async function initMapboxFolder() {
    try {
        const folderPath = await ensureFolder('.Mapbox');
        localStorage.setItem('MapboxDir', folderPath);
        console.log('Mapbox folder path:', folderPath);
    } catch (err) {
        console.error('Error creating Mapbox folder:', err);
    }
}

$(document).on('click', 'li.mapFolderLi', function () {
    console.log($(this).html());
    let dir = $(this).html().slice(0, -1).replace('file://', '');
    console.log(dir);
    localStorage.setItem('MapboxDir', dir);
    $('#mapFolders').empty();
    location.reload();
});


// document.addEventListener("deviceready", onDeviceReadyHttpd, false);

function listFiles(myPath) {
    //// myPath = cordova.file.externalRootDirectory; // We can use the default externalRootDirectory or use a path : file://my/custom/folder
    window.resolveLocalFileSystemURL(myPath, function (dirEntry) {
        console.log(dirEntry);
        var directoryReader = dirEntry.createReader();
        directoryReader.readEntries(onSuccessCallback, onFailCallback);
    });
}


function onSuccessCallback(entries) {
    // The magic will happen here, check out entries with :
    console.log(entries);
    $('#MapboxDir').empty().append(new Option(MapboxDir, MapboxDir, 'selected disabled'));
    $('#MapboxDir').append(new Option('/', '/'));
    $('#MapboxDir').append(new Option('../', '../'));
    $.each(entries, function (i, e) {
        //console.log(e.fullPath);
        if (e.isDirectory) {
            $('#MapboxDir').append(new Option(e.fullPath, e.fullPath));
        }
    });
}

function onFailCallback(e) {
    // In case of error
    console.log(e);
}

function onDeviceReadyHttpd() {

    httpd = (cordova && cordova.plugins && cordova.plugins.CorHttpd) ? cordova.plugins.CorHttpd : null;
    console.log("onDeviceReadyHttpd", httpd);
    //startServer("htdocs");

	window.resolveLocalFileSystemURL('file://'+localStorage.getItem('MapboxDir'), function(dir) {
		console.log("got main dir",dir);
		dir.getFile("log1.txt", {create:true}, function(fileEntry) {
			console.log("got the file", fileEntry);
                        writeFile(fileEntry, null);
		},function (e) {
                    onsole.log("getFile Error:",e);
                });
	});


    // startServer(localStorage.getItem('MapboxDir'));
  

}

let DirArrCnt = 0;
let DirArr = {};
let DirArrTimeout = 0;

clearTimeout(DirArrTimeout);
DirArrTimeout = setTimeout(function () {
    console.log('DirArr', DirArr);
}, 10000);

function getDirs(myPath, folder = '.Mapbox') {
    function scanPath(path) {
        window.resolveLocalFileSystemURL(path, function (dirEntry) {
            var directoryReader = dirEntry.createReader();
            directoryReader.readEntries(function (entries) {
                entries.forEach(function (e) {
                    if (e.isDirectory) {
                        if (e.name === folder) {
                            console.log("Found folder:", e.nativeURL);
                            DirArr[e.nativeURL] = e.nativeURL;
                            $('#mapFolders').append(`<li class="mapFolderLi">${e.nativeURL}</li>`);
                        } else if (isSearchPath(e.nativeURL)) {
                            scanPath(e.nativeURL);
                        }
                    }
                });
            }, function (err) {
                console.log("readEntries error:", err);
            });
        }, function (err) {
            console.log("resolveLocalFileSystemURL Error:", err);
        });
    }

    // ✅ Request Android 13 permissions when needed
    if (cordova.platformId === 'android') {
        var permissions = cordova.plugins.permissions;
        var needed = [
            permissions.READ_MEDIA_IMAGES,
            permissions.READ_MEDIA_VIDEO,
            permissions.READ_MEDIA_AUDIO
        ];

        permissions.checkPermission(needed[0], function(status) {
            if (!status.hasPermission) {
                permissions.requestPermissions(needed, function() {
                    scanPath(myPath);
                }, function() {
                    console.warn("Permission denied");
                });
            } else {
                scanPath(myPath);
            }
        });
    } else {
        scanPath(myPath); // iOS or desktop
    }
}

function isSearchPath(path) {
    let badPath = ["file:///sys/"
                , "file:///system/"
                , "file:///proc/"
                , "file:///d/"];
    let ret = true;
    $.each(badPath, function (i, b) {
        //console.log('badPath',b);
        if (path.startsWith(b)) {
            ret = false;
        }
    });
    return ret;
}


function updateStatus() {
    //document.getElementById('location').innerHTML = "document.location.href: " + document.location.href;
    if (httpd) {
        httpd.getURL(function (url) {
            if (url.length > 0) {
                console.log(url);
                //			document.getElementById('url').innerHTML = "server is up: <a href='" + url + "' target='_blank'>" + url + "</a>";
            } else {
                //				document.getElementById('url').innerHTML = "server is down.";
            }
        });
        httpd.getLocalPath(function (path) {
            //			document.getElementById('localpath').innerHTML = "<br/>localPath: " + path;
        });
    } else {
        alert('CorHttpd plugin not available/ready.');
    }
}
function startServer(wwwroot) {
    console.log("startServer");
    if (httpd) {
        httpd.getURL(function (url) {
            if (url.length > 0) {
                console.log("HTTPD already running:", url);
            } else {
                httpd.startServer({
                    www_root: '', //wwwroot || cordova.file.externalDataDirectory, // fallback
                    port: 64046,
                    localhost_only: false
                }, function (url) {
                    console.log("Server started at:", url);
                    updateStatus();
                }, function (error) {
                    console.error("Failed to start server:", error);
                });
            }
        });
    } else {
        alert('CorHttpd plugin not available/ready.');
    }
}

function handleRequest(req, res) {
    console.log(req)
    var db = window.sqlitePlugin.openDatabase({name: 'my.db', location: 'default'});
    db.transaction(function(tx) {
        tx.executeSql('SELECT * FROM test_table', [], function(tx, result) {
            let data = [];
            for (let i = 0; i < result.rows.length; i++) {
                data.push(result.rows.item(i));
            }
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(data));
        });
    });
}

function stopServer() {
    if (httpd) {
        httpd.stopServer(function () {
            //document.getElementById('url').innerHTML = 'server is stopped.';
            updateStatus();
        }, function (error) {
            document.getElementById('url').innerHTML = 'failed to stop server' + error;
        });
    } else {
        alert('CorHttpd plugin not available/ready.');
    }
}





async function ensureFolder(folderName) {
    if (!window.cordova || !cordova.file) {
        throw new Error("Cordova File plugin not available.");
    }

    const storageLocation = cordova.file.externalDataDirectory;

    return new Promise((resolve, reject) => {
        // Resolve the app sandbox directory
        window.resolveLocalFileSystemURL(storageLocation, (dirEntry) => {
            // Create folder if it doesn't exist
            dirEntry.getDirectory(
                folderName,
                { create: true, exclusive: false }, // create if missing
                (folderEntry) => {
                    console.log(`Folder ready: ${folderEntry.nativeURL}`);
                    resolve(folderEntry.nativeURL);
                },
                (err) => {
                    console.error("Failed to create folder:", err);
                    reject(err);
                }
            );
        }, (err) => {
            console.error("Failed to access storage:", err);
            reject(err);
        });
    });
}