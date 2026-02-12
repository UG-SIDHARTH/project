const express = require('express');
const cors = require('cors');

const app = express();

/* ========= MIDDLEWARE ========= */
app.use(express.json());
app.use(cors());

/* ========= MEMORY STORAGE ========= */
let latestData = {
    deviceCount: 0,
    devices: []
};

/* ========= ESP32 DATA RECEIVER ========= */
app.post('/api/devices', (req, res) => {
    try {
        latestData = req.body;

        console.log("📡 Data received from ESP32:");
        console.log(JSON.stringify(req.body, null, 2));

        res.status(200).json({
            success: true,
            message: "Data received successfully"
        });
    } catch (error) {
        console.error("❌ Error receiving data:", error);
        res.status(500).json({ success: false });
    }
});

/* ========= API FOR FRONTEND ========= */
app.get('/api/dashboard', (req, res) => {
    res.json(latestData);
});

/* ========= ROOT ROUTE ========= */
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>ESP32 Network Dashboard</title>
<style>
body {
    font-family: Arial;
    background: #0f172a;
    color: white;
    text-align: center;
}
h1 {
    color: #00ffcc;
}
.card {
    background: #1e293b;
    padding: 20px;
    margin: 20px auto;
    width: 80%;
    border-radius: 12px;
}
table {
    width: 100%;
    border-collapse: collapse;
}
th, td {
    padding: 10px;
    border-bottom: 1px solid #444;
}
th {
    color: #00ffcc;
}
</style>
</head>
<body>

<h1>ESP32 Network Monitoring Dashboard</h1>

<div class="card">
<h2>Connected Devices: <span id="count">0</span></h2>
</div>

<div class="card">
<table>
<thead>
<tr>
<th>MAC Address</th>
<th>IP Address</th>
</tr>
</thead>
<tbody id="deviceTable">
</tbody>
</table>
</div>

<script>
function fetchData() {
    fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => {
        document.getElementById('count').innerText = data.deviceCount || 0;

        let table = "";
        if (data.devices && data.devices.length > 0) {
            data.devices.forEach(d => {
                table += "<tr><td>" + d.mac + "</td><td>" + d.ip + "</td></tr>";
            });
        }

        document.getElementById('deviceTable').innerHTML = table;
    })
    .catch(err => console.error("Fetch error:", err));
}

setInterval(fetchData, 2000);
fetchData();
</script>

</body>
</html>
    `);
});

/* ========= START SERVER ========= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log("🚀 Server running on port " + PORT);
});
