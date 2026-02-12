#include <WiFi.h>
#include <esp_wifi.h>
#include <WebServer.h>
#include <HTTPClient.h>

/* ================== CONFIG ================== */

// Access Point (ESP32 Hotspot)
const char* ap_ssid = "ESP32_Hotspot";
const char* ap_password = "12345678";

// Router WiFi (Same WiFi as your laptop)
const char* router_ssid = "UG_SIDHARTH";
const char* router_password = "Sidharth@18";

// Backend Endpoint (YOUR LAPTOP IP)
const char* serverEndpoint = "http://192.168.31.183:5000/api/devices";

// Login Credentials
const char* www_username = "admin";
const char* www_password = "admin123";

/* ============================================ */

WebServer server(80);

struct Device {
  String mac;
  String ip;
};

Device devices[10];
int deviceCount = 0;

/* ===== GET CONNECTED DEVICES ===== */
void updateDeviceList() {
  wifi_sta_list_t stationList;
  esp_wifi_ap_get_sta_list(&stationList);

  deviceCount = stationList.num;

  for (int i = 0; i < deviceCount; i++) {
    wifi_sta_info_t station = stationList.sta[i];

    char macStr[18];
    sprintf(macStr, "%02X:%02X:%02X:%02X:%02X:%02X",
            station.mac[0], station.mac[1], station.mac[2],
            station.mac[3], station.mac[4], station.mac[5]);

    devices[i].mac = String(macStr);
    devices[i].ip = "192.168.4." + String(i + 2);
  }
}

/* ===== SEND DATA TO BACKEND ===== */
void sendToBackend() {

  if (WiFi.status() != WL_CONNECTED) return;

  updateDeviceList();

  HTTPClient http;
  http.begin(serverEndpoint);
  http.addHeader("Content-Type", "application/json");

  String json = "{";
  json += "\"deviceCount\":" + String(deviceCount) + ",";
  json += "\"devices\":[";

  for (int i = 0; i < deviceCount; i++) {
    json += "{";
    json += "\"mac\":\"" + devices[i].mac + "\",";
    json += "\"ip\":\"" + devices[i].ip + "\"";
    json += "}";
    if (i < deviceCount - 1) json += ",";
  }

  json += "]}";

  int response = http.POST(json);

  Serial.print("Backend Response: ");
  Serial.println(response);

  http.end();
}

/* ===== AJAX DATA API ===== */
void handleData() {
  if (!server.authenticate(www_username, www_password))
    return server.requestAuthentication();

  updateDeviceList();

  String json = "{";
  json += "\"count\":" + String(deviceCount) + ",";
  json += "\"devices\":[";

  for (int i = 0; i < deviceCount; i++) {
    json += "{";
    json += "\"mac\":\"" + devices[i].mac + "\",";
    json += "\"ip\":\"" + devices[i].ip + "\"";
    json += "}";
    if (i < deviceCount - 1) json += ",";
  }

  json += "]}";

  server.send(200, "application/json", json);
}

/* ===== HACKER DASHBOARD ===== */
void handleRoot() {
  if (!server.authenticate(www_username, www_password))
    return server.requestAuthentication();

  String page = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
<title>ESP32 CYBER MONITOR</title>
<style>
body{background:black;color:#00ff00;font-family:Courier New;padding:20px;}
.terminal{border:1px solid #00ff00;padding:20px;height:400px;overflow:auto;}
</style>
</head>
<body>
<h1>ESP32 NETWORK CYBER TERMINAL</h1>
<div class="terminal" id="terminal">Initializing...</div>

<script>
function fetchData(){
fetch('/data')
.then(res=>res.json())
.then(data=>{
let text="CONNECTED DEVICES: "+data.count+"\\n";
text+="-----------------------------------\\n";
data.devices.forEach((d,i)=>{
text+="DEVICE "+(i+1)+"\\n";
text+="MAC: "+d.mac+"\\n";
text+="IP : "+d.ip+"\\n";
text+="-----------------------------------\\n";
});
document.getElementById("terminal").innerText=text;
});
}
setInterval(fetchData,2000);
fetchData();
</script>
</body>
</html>
)rawliteral";

  server.send(200, "text/html", page);
}

/* ===== SETUP ===== */
void setup() {
  Serial.begin(115200);

  WiFi.mode(WIFI_AP_STA);

  // Start Hotspot
  WiFi.softAP(ap_ssid, ap_password);

  // Connect to Router
  WiFi.begin(router_ssid, router_password);

  Serial.println("Connecting to Router...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected to Router!");
  Serial.print("Router IP: ");
  Serial.println(WiFi.localIP());

  Serial.print("Hotspot IP: ");
  Serial.println(WiFi.softAPIP());

  server.on("/", handleRoot);
  server.on("/data", handleData);
  server.begin();
}

/* ===== LOOP ===== */
void loop() {

  server.handleClient();

  static unsigned long lastSend = 0;

  if (millis() - lastSend > 10000) {
    sendToBackend();
    lastSend = millis();
  }
}
