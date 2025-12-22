document.addEventListener('deviceready', function() {
    SerialUSB.requestPermission(
        () => {
            console.log('USB Permission granted')
            SerialUSB.open({baudRate:115200}, 
                () => {
                    console.log('USB open granted')
                    var serialBuffer = '';
                    SerialUSB.registerReadCallback(
                        (data) => {
                        const decoder = new TextDecoder('utf-8'); // or 'ascii', 'iso-8859-1', etc.
                        const dataString = decoder.decode(data);                        
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
                                }
                              });
                            }
                        },
                        (e) => {
                          new Error("Failed to register read callback",e);
                        });
                },
                (err) => console.error('USB open error:', err)
              );
        },
        (err) => console.error('USB Permission error:', err)
      );
  });


  function jsonParser(jsonString) {
    try {
        let obj = JSON.parse(jsonString);
        console.log("Received JSON:", jsonString);
        try {
          updateConvoy(obj); // your handler
        } catch (e) {
          console.debug("updateConvoy handler error:", e);
        }
      } catch (e) {
        console.error("Invalid JSON received:", jsonString, e);
      }
  }