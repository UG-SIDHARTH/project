# SmartMonitor — Backend API Server

A lightweight Express.js server that acts as the bridge between an ESP32 microcontroller and the SmartMonitor frontend dashboard. It receives device data from the ESP32 over HTTP, stores it in memory, and exposes it via a REST API.

---

## How It Works

```
ESP32 (WiFi scanner)
      │
      │  POST /api/devices  (sends detected devices)
      ▼
Express Server (this app)
      │
      │  GET /api/dashboard  (serves data to frontend)
      ▼
SmartMonitor Frontend Dashboard
```

The ESP32 periodically scans the local WiFi network, collects MAC/IP addresses of connected devices, and POSTs the data to this server. The frontend polls `/api/dashboard` every few seconds to display live crowd counts.

---

## Endpoints

### `POST /api/devices`
Receives device data from the ESP32.

**Request body:**
```json
{
  "deviceCount": 5,
  "devices": [
    { "mac": "AA:BB:CC:DD:EE:FF", "ip": "192.168.1.10" },
    { "mac": "11:22:33:44:55:66", "ip": "192.168.1.11" }
  ]
}
```

**Response:**
```json
{ "success": true, "message": "Data received successfully" }
```

---

### `GET /api/dashboard`
Returns the latest device data for the frontend to consume.

**Response:**
```json
{
  "deviceCount": 5,
  "devices": [
    { "mac": "AA:BB:CC:DD:EE:FF", "ip": "192.168.1.10" }
  ]
}
```

---

### `GET /`
Serves a simple built-in HTML dashboard showing connected device count and a MAC/IP table. Updates automatically every 2 seconds. Useful for quick verification without the full frontend.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v14+
- npm

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

### Running the Server

```bash
node server.js
```

The server starts on port `5000` by default (or the `PORT` environment variable if set).

```
🚀 Server running on port 5000
```

---

## Configuration

| Variable | Default | Description                          |
|----------|---------|--------------------------------------|
| `PORT`   | `5000`  | Port the server listens on           |

Set environment variables in a `.env` file or export them before running:

```bash
PORT=8080 node server.js
```

---

## Dependencies

| Package   | Purpose                              |
|-----------|--------------------------------------|
| `express` | HTTP server and routing              |
| `cors`    | Allows cross-origin requests from the frontend |

Install with:

```bash
npm install express cors
```

---

## Data Storage

Data is stored **in memory only**. There is no database — restarting the server resets `deviceCount` to `0` and clears the device list. The last received ESP32 payload is always what gets served to the frontend.

If persistence is needed, consider adding a database (e.g. SQLite, MongoDB) or writing to a JSON file.

---

## Deployment

This server is designed to be deployed on any Node-compatible platform (e.g. [Render](https://render.com), Railway, Fly.io).

For Render specifically:
- Set the **Start Command** to `node server.js`
- Set the **Port** environment variable if needed
- Make sure your ESP32 is configured to POST to your deployed URL (e.g. `https://your-app.onrender.com/api/devices`)

---

## ESP32 Integration

On the ESP32 side, configure your sketch to send a POST request like:

```
POST https://your-server-url/api/devices
Content-Type: application/json

{
  "deviceCount": 3,
  "devices": [
    { "mac": "...", "ip": "..." }
  ]
}
```

The server will log each received payload to the console for debugging.

---

## Project Structure

```
server.js         # Main server file — all routes and logic
package.json      # Node project manifest
README.md         # This file
```

---

## License

MIT — free to use and modify.
