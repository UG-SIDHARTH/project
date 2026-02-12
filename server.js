const express = require('express');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

let processedData = {
    wifiOnly: [],
    bleOnly: [],
    bothDevices: []
};

let deviceHistory = {};
const OFFLINE_TIMEOUT = 30000;

/* ===== RECEIVE DATA FROM ESP32 ===== */
app.post('/api/devices', (req, res) => {

    const { wifiDevices = [], bleDevices = [] } = req.body;

    const wifiSet = new Set(wifiDevices);
    const bleSet = new Set(bleDevices);

    let wifiOnly = [];
    let bleOnly = [];
    let bothDevices = [];

    wifiSet.forEach(mac => {
        if (bleSet.has(mac)) {
            bothDevices.push(mac);
        } else {
            wifiOnly.push(mac);
        }
    });

    bleSet.forEach(mac => {
        if (!wifiSet.has(mac)) {
            bleOnly.push(mac);
        }
    });

    processedData = { wifiOnly, bleOnly, bothDevices };

    const now = Date.now();
    const currentDevices = [...wifiOnly, ...bleOnly, ...bothDevices];

    currentDevices.forEach(mac => {

        let type = "UNKNOWN";
        if (wifiOnly.includes(mac)) type = "WiFi";
        if (bleOnly.includes(mac)) type = "Bluetooth";
        if (bothDevices.includes(mac)) type = "BOTH";

        if (!deviceHistory[mac]) {
            deviceHistory[mac] = {
                firstSeen: now,
                lastSeen: now,
                connectionType: type,
                totalActiveTime: 0,
                status: "Online"
            };
        } else {
            let previousLastSeen = deviceHistory[mac].lastSeen;

            deviceHistory[mac].lastSeen = now;
            deviceHistory[mac].connectionType = type;
            deviceHistory[mac].status = "Online";

            deviceHistory[mac].totalActiveTime += (now - previousLastSeen);
        }
    });

    res.status(200).json({ message: "Processed successfully" });
});

/* ===== OFFLINE CHECK ===== */
setInterval(() => {
    const now = Date.now();

    for (let mac in deviceHistory) {
        if (now - deviceHistory[mac].lastSeen > OFFLINE_TIMEOUT) {
            deviceHistory[mac].status = "Offline";
        }
    }
}, 5000);

/* ===== DASHBOARD API ===== */
app.get('/api/dashboard', (req, res) => {
    res.json({
        ...processedData,
        history: deviceHistory
    });
});

/* ===== FRONTEND DASHBOARD ===== */
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ESP32 Monitor</title>
<style>
body { background:black; color:#00ff00; font-family:Courier New; text-align:center; }
table { width:95%; margin:auto; border-collapse:collapse; margin-bottom:20px; }
th, td { padding:8px; border-bottom:1px solid #003300; }
.online { color:#00ff00; }
.offline { color:red; }
</style>
</head>
<body>

<h1>ESP32 DEVICE MONITOR</h1>

<h2>WiFi Only</h2>
<table><tbody id="wifiOnly"></tbody></table>

<h2>Bluetooth Only</h2>
<table><tbody id="bleOnly"></tbody></table>

<h2>Connected on BOTH</h2>
<table><tbody id="bothDevices"></tbody></table>

<h2>Device History</h2>
<table>
<thead>
<tr>
<th>MAC</th>
<th>First Seen</th>
<th>Last Seen</th>
<th>Type</th>
<th>Status</th>
<th>Total Active Time (sec)</th>
</tr>
</thead>
<tbody id="historyTable"></tbody>
</table>

<script>
function fetchData(){
fetch('/api/dashboard')
.then(res=>res.json())
.then(data=>{

function fillSimple(id,list){
let html="";
list.forEach(mac=>{
html+="<tr><td>"+mac+"</td></tr>";
});
document.getElementById(id).innerHTML = html;
}

fillSimple("wifiOnly", data.wifiOnly || []);
fillSimple("bleOnly", data.bleOnly || []);
fillSimple("bothDevices", data.bothDevices || []);

let historyHTML="";
for (let mac in data.history){
let d = data.history[mac];

let first = new Date(d.firstSeen).toLocaleString();
let last = new Date(d.lastSeen).toLocaleString();
let seconds = Math.floor(d.totalActiveTime / 1000);

historyHTML += "<tr>";
historyHTML += "<td>"+mac+"</td>";
historyHTML += "<td>"+first+"</td>";
historyHTML += "<td>"+last+"</td>";
historyHTML += "<td>"+d.connectionType+"</td>";
historyHTML += "<td class='"+(d.status=="Online"?"online":"offline")+"'>"+d.status+"</td>";
historyHTML += "<td>"+seconds+"</td>";
historyHTML += "</tr>";
}

document.getElementById("historyTable").innerHTML = historyHTML;

});
}

setInterval(fetchData,2000);
fetchData();
</script>

</body>
</html>
    `);
});

/* ===== START SERVER ===== */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
