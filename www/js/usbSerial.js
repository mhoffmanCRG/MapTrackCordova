document.addEventListener('deviceready', function() {
    SerialUSB.requestPermission(
        () => {
            console.log('USB Permission granted')
            $('#myInfoUSB').html("USB:Permission granted<br>");
            SerialUSB.open({baudRate:115200}, 
                () => {
                    console.log('USB open granted')
                    $('#myInfoUSB').html("USB:Open granted<br>");
                    var serialBuffer = '';
                    SerialUSB.registerReadCallback(
                        (data) => {
                        const decoder = new TextDecoder('utf-8'); // or 'ascii', 'iso-8859-1', etc.
                        const dataString = decoder.decode(data);
                        $('#myInfoUSB').html(dataString + "<br>");                      
                        serialBuffer = serialBuffer + dataString;
                        if(serialBuffer.includes('\n') ||  serialBuffer.includes('\r')) {
                            const lines = serialBuffer.split(/\r?\n|\r/);
                            serialBuffer = lines.pop();
                            lines.forEach(line => {
                                if (line.length === 0) return;     // skip empty lines; remove if you want to see them
                                
                                //Check for possible JSON
                                if (line.charAt(0) === '{' && line.charAt(line.length - 1) === '}') {
                                    console.log('USB Line:', line);
                                    jsonParser(line);
                                    $('#myInfoUSB').html(line);
                                }
                              });
                            }
                        },
                        (e) => {
                          new Error("Failed to register read callback",e);
                          $('#myInfoUSB').html("USB:Failed to register read callback<br>");
                        });
                },
                (err) => {
                  console.error('USB open error:', err)
                  $('#myInfoUSB').html("USB:Open error<br>");                 
                }
              );
        },
        (err) => {
          console.error('USB Permission error:', err)
          $('#myInfoUSB').html("USB:Permission denied<br>");
          }
      );
  });


