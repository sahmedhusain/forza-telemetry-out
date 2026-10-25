/**
 * Forza Telemetry Out - Main Server Entrypoint
 * 
 * Hosts:
 * 1. UDP Listener on port 5300 (or FORZA_PORT)
 * 2. HTTP Server serving HUD dashboard
 * 3. WebSocket Server broadcasting live telemetry at 60Hz
 * 4. Realistic Physics Simulator & Session Recorder
 */

require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const ForzaUdpListener = require('./udp-listener');
const ForzaSimulator = require('./simulator');
const TelemetryRecorder = require('./recorder');

// Environment Configuration
const FORZA_PORT = parseInt(process.env.FORZA_PORT || 5300, 10);
const FORZA_HOST = process.env.FORZA_HOST || '0.0.0.0';
const DEFAULT_WEB_PORT = parseInt(process.env.WEB_PORT || 3050, 10);
const WEB_HOST = process.env.WEB_HOST || '0.0.0.0';
const AUTO_SIMULATE = process.env.SIMULATION_MODE === 'true';

// State & Services
let latestTelemetry = null;
let isSimulating = false;
let activeWebPort = DEFAULT_WEB_PORT;

const recorder = new TelemetryRecorder();

// Broadcast telemetry frame to all connected WebSockets
function broadcastTelemetry(telemetry) {
  latestTelemetry = telemetry;
  recorder.recordFrame(telemetry);

  const payload = JSON.stringify({
    type: 'telemetry',
    data: telemetry
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// 1. Initialize Telemetry Simulator
const simulator = new ForzaSimulator((simulatedTelemetry) => {
  if (isSimulating) {
    broadcastTelemetry(simulatedTelemetry);
  }
});

// 2. Initialize UDP Listener
const udpListener = new ForzaUdpListener({
  port: FORZA_PORT,
  host: FORZA_HOST,
  onTelemetry: (telemetry) => {
    // If real packets arrive, automatically pause simulation if it was running
    if (isSimulating && !AUTO_SIMULATE) {
      console.log('[Server] Live UDP packets detected! Pausing simulator.');
      isSimulating = false;
      simulator.stop();
      broadcastServerState();
    }
    broadcastTelemetry(telemetry);
  },
  onStatusChange: (status) => {
    console.log('[Server] UDP status:', status);
    broadcastServerState();
  }
});

// Broadcast server status info to clients
function broadcastServerState() {
  const statePayload = JSON.stringify({
    type: 'status',
    data: getServerStatus()
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(statePayload);
    }
  }
}

function getServerStatus() {
  return {
    udp: udpListener.getStatus(),
    simulator: {
      isActive: isSimulating
    },
    recorder: recorder.getStatus(),
    clientsCount: wss ? wss.clients.size : 0,
    serverTime: new Date().toISOString(),
    webPort: activeWebPort
  };
}

// 3. HTTP Server
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // REST API Routes
  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getServerStatus()));
    return;
  }

  if (pathname === '/api/simulator/toggle' && req.method === 'POST') {
    isSimulating = !isSimulating;
    if (isSimulating) {
      simulator.start();
      console.log('[Server] Simulator started');
    } else {
      simulator.stop();
      console.log('[Server] Simulator stopped');
    }
    broadcastServerState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isSimulating }));
    return;
  }

  if (pathname === '/api/recorder/start' && req.method === 'POST') {
    recorder.start();
    broadcastServerState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isRecording: true }));
    return;
  }

  if (pathname === '/api/recorder/stop' && req.method === 'POST') {
    const summary = recorder.stop();
    broadcastServerState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, summary }));
    return;
  }

  if (pathname === '/api/recorder/export/json') {
    const jsonStr = recorder.exportJson();
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${recorder.sessionName || 'forza_telemetry'}.json"`
    });
    res.end(jsonStr);
    return;
  }

  if (pathname === '/api/recorder/export/csv') {
    const csvStr = recorder.exportCsv();
    res.writeHead(200, {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${recorder.sessionName || 'forza_telemetry'}.csv"`
    });
    res.end(csvStr);
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// 4. WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  // Send immediate status & latest telemetry snapshot
  ws.send(JSON.stringify({
    type: 'status',
    data: getServerStatus()
  }));

  if (latestTelemetry) {
    ws.send(JSON.stringify({
      type: 'telemetry',
      data: latestTelemetry
    }));
  }

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.action === 'toggleSimulator') {
        isSimulating = !isSimulating;
        if (isSimulating) simulator.start();
        else simulator.stop();
        broadcastServerState();
      } else if (msg.action === 'startRecording') {
        recorder.start();
        broadcastServerState();
      } else if (msg.action === 'stopRecording') {
        recorder.stop();
        broadcastServerState();
      }
    } catch (e) {}
  });
});

// Start services with automatic port conflict handling
function start(port = DEFAULT_WEB_PORT) {
  return new Promise((resolve, reject) => {
    udpListener.start();

    if (AUTO_SIMULATE) {
      isSimulating = true;
      simulator.start();
      console.log('[Server] Auto simulation mode started');
    }

    activeWebPort = port;

    const errorHandler = (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[Server] Web port ${activeWebPort} in use, trying ${activeWebPort + 1}...`);
        activeWebPort += 1;
        server.listen(activeWebPort, WEB_HOST);
      } else {
        reject(err);
      }
    };

    server.once('error', errorHandler);

    server.listen(activeWebPort, WEB_HOST, () => {
      server.removeListener('error', errorHandler);
      console.log(`\n======================================================`);
      console.log(`  🏎️  FORZA TELEMETRY OUT - DASHBOARD READY`);
      console.log(`======================================================`);
      console.log(`  🌐 Web HUD Dashboard: http://${WEB_HOST === '0.0.0.0' ? 'localhost' : WEB_HOST}:${activeWebPort}`);
      console.log(`  📡 UDP Listener:      ${FORZA_HOST}:${FORZA_PORT}`);
      console.log(`  🕹️  Simulation Mode:   ${isSimulating ? 'ENABLED' : 'STANDBY'}`);
      console.log(`======================================================\n`);
      resolve({ port: activeWebPort, host: WEB_HOST });
    });
  });
}

// Clean shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down Forza Telemetry Out...');
  udpListener.stop();
  simulator.stop();
  server.close(() => {
    process.exit(0);
  });
});

if (require.main === module) {
  start().catch((err) => {
    console.error('[Server] Fatal startup error:', err);
  });
}

module.exports = {
  start,
  server,
  udpListener,
  simulator,
  recorder,
  getActivePort: () => activeWebPort
};
