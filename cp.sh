adb shell
run-as za.co.qflo.amapboxble
#cp /sdcard/Android/data/za.co.qflo.amapboxble/files/* /data/data/za.co.qflo.amapboxble/files/
#

cd /1TB/www/Mapbox-Download

adb shell ls -l /data/local/tmp/

time adb push mapbox-terrain.db /data/local/tmp/
time adb shell "run-as za.co.qflo.amapboxble cp /data/local/tmp/mapbox-terrain.db files/"
adb shell rm /data/local/tmp/mapbox-terrain.db

time adb push mapbox-satellite.db /data/local/tmp/
time adb shell "run-as za.co.qflo.amapboxble cp /data/local/tmp/mapbox-satellite.db files/"
adb shell rm /data/local/tmp/mapbox-satellite.db
