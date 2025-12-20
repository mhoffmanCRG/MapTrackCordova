cordova build --release android
#keytool -genkey -v -keystore Empact-mobileapps.keystore -alias Empact -keyalg RSA -keysize 2048 -validity 10000
#cp Empact-mobileapps.keystore /var/www/html/xdk/Empact/platforms/android/build/outputs/apk/
cp ../bundletool-all-1.10.0.jar ../Empact-mobileapps.keystore platforms/android/app/build/outputs/bundle/release/
cd platforms/android/app/build/outputs/bundle/release/

rm *.apk  toc.pb universal.apk app-release.apks

java -jar bundletool-all-1.10.0.jar  build-apks --mode=universal  --bundle=app-release.aab --output=app-release.apks --ks=Empact-mobileapps.keystore --ks-pass=pass:G3ck01 --ks-key-alias=Empact


unzip app-release.apks
cp universal.apk /var/www/html/tmp/a-mapbox-ble.apk


ls -la *
