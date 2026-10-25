/**
 * Forza Telemetry Out - Main Server Entrypoint
 * 
 * Hosts:
 * 1. UDP Listener on port 5500 (or FORZA_PORT)
 * 2. HTTP Server serving HUD dashboard
 * 3. WebSocket Server broadcasting live telemetry at 60Hz
 * 4. Session recorder
 */

require('dotenv').config();
const http = require('http');
const { isIP } = require('net');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { WebSocketServer, WebSocket } = require('ws');

const ForzaUdpListener = require('./udp-listener');
const TelemetryRecorder = require('./recorder');
const TelemetryHistory = require('./history');

// Environment Configuration
const FORZA_PORT = Number(process.env.FORZA_PORT || 5500);
const FORZA_HOST = process.env.FORZA_HOST || '0.0.0.0';
const DEFAULT_WEB_PORT = Number(process.env.WEB_PORT || 3050);
const WEB_HOST = process.env.WEB_HOST || '127.0.0.1';

// State & Services
let latestTelemetry = null;
let activeWebPort = DEFAULT_WEB_PORT;

const recorder = new TelemetryRecorder();
const history = new TelemetryHistory(path.join(process.env.FORZA_DATA_DIR || path.join(__dirname,'..','data'),'history.json'));
let historyTimer;

// Broadcast telemetry frame to all connected WebSockets
function broadcastTelemetry(telemetry) {
  history.record(telemetry);
  latestTelemetry = telemetry;
  recorder.recordFrame(telemetry);

  const payload = JSON.stringify({
    type: 'telemetry',
    data: telemetry
  });

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      if (client.bufferedAmount < 1024 * 1024) client.send(payload);
    }
  }
}

// 2. Initialize UDP Listener
const listenerOptions = {
  port: FORZA_PORT,
  host: FORZA_HOST,
  onTelemetry: (telemetry) => {
    broadcastTelemetry(telemetry);
  },
  onStatusChange: (status) => {
    console.log('[Server] UDP status:', status);
    broadcastServerState();
  }
};
let udpListener = new ForzaUdpListener(listenerOptions);
let reconfiguring = false;

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

const server = http.createServer(async (req, res) => {
  let parsedUrl;
  try { parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`); }
  catch { res.writeHead(400); res.end('Invalid URL'); return; }
  if (parsedUrl.hostname !== 'localhost' && !isIP(parsedUrl.hostname)) { res.writeHead(403); res.end('Use localhost or the host IP'); return; }
  const pathname = parsedUrl.pathname;

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
  if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
    res.writeHead(403); res.end('Origin not allowed'); return;
  }
  // REST API Routes
  if (pathname === '/api/history') {
    const raw=parsedUrl.searchParams.get('car');
    const ordinal=raw===null?undefined:Number(raw);
    if (ordinal!==undefined&&!Number.isInteger(ordinal)) {res.writeHead(400);res.end('Invalid car ID');return;}
    res.setHeader('Content-Type','application/json');
    if(parsedUrl.searchParams.get('download')==='1')res.setHeader('Content-Disposition','attachment; filename="forza-history.json"');
    res.end(JSON.stringify(parsedUrl.searchParams.get('all')==='1'?{version:1,profiles:[...history.profiles.values()]}:history.snapshot(ordinal)));return;
  }
  if (pathname === '/api/network') {
    const interfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addresses]) =>
      addresses.filter(a => a.family === 'IPv4' && !a.internal).map(a => ({ name, address: a.address })));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ interfaces, udpHost: udpListener.host, udpPort: udpListener.port,
      webHost: WEB_HOST, webPort: activeWebPort, lanEnabled: WEB_HOST === '0.0.0.0',
      localUrl: `http://127.0.0.1:${activeWebPort}`, sender: latestTelemetry?.senderIp ?? null })); return;
  }
  if (pathname === '/api/config/download') {
    res.setHeader('Content-Type', 'text/plain'); res.setHeader('Content-Disposition', 'attachment; filename=".env"');
    res.end(`FORZA_PORT=${udpListener.port}\nFORZA_HOST=${udpListener.host}\nWEB_PORT=${activeWebPort}\nWEB_HOST=${WEB_HOST}\n`); return;
  }
  if (pathname === '/api/connection' && req.method === 'POST') {
    if (reconfiguring || recorder.isRecording) { res.writeHead(409); res.end('Stop recording and wait for any connection change to finish.'); return; }
    reconfiguring = true;
    let candidate;
    try {
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 1024) throw Error('Configuration request too large'); }
      const { port } = JSON.parse(body);
      if (!Number.isInteger(port) || port < 1024 || port > 65535 || (port >= 5200 && port <= 5300)) throw Error('Use an integer port from 1024–65535, excluding 5200–5300.');
      if (port !== udpListener.port) {
        candidate = new ForzaUdpListener({ ...listenerOptions, port, host: udpListener.host, onStatusChange: () => {} });
        await new Promise((resolve, reject) => {
          candidate.start();
          const timer = setTimeout(() => reject(Error('UDP bind timed out')), 3000);
          candidate.socket.once('listening', () => { clearTimeout(timer); resolve(); });
          candidate.socket.once('error', error => { clearTimeout(timer); reject(error); });
        });
        udpListener.stop(); udpListener = candidate;
        udpListener.onStatusChange = listenerOptions.onStatusChange;
        latestTelemetry = null;
      }
      broadcastServerState(); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ port: udpListener.port }));
    } catch (error) { if (candidate && candidate !== udpListener) candidate.stop(); res.writeHead(400); res.end(error.message); }
    finally { reconfiguring = false; }
    return;
  }

  if (pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getServerStatus()));
    return;
  }

  if (pathname === '/api/recorder/start' && req.method === 'POST') {
    if (recorder.frames.length && !recorder.isRecording) {
      res.writeHead(409); res.end("Export your session, then clear it before recording again."); return;
    }
    recorder.start();
    broadcastServerState();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, isRecording: true }));
    return;
  }

  if (pathname === '/api/recorder/clear' && req.method === 'POST') {
    if (recorder.isRecording) { res.writeHead(409); res.end('Stop recording first'); return; }
    recorder.frames = []; recorder.sessionName = ''; recorder.startTime = null;
    broadcastServerState(); res.end('{}'); return;
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
const wss = new WebSocketServer({ server, maxPayload: 1024, verifyClient: ({ origin, req }) => !origin || origin === `http://${req.headers.host}` });
let statusTimer;
wss.on('error', error => console.error('[WebSocket]', error.message));

wss.on('connection', (ws) => {
  // Send immediate status & latest telemetry snapshot
  ws.send(JSON.stringify({
    type: 'status',
    data: getServerStatus()
  }));

  if (latestTelemetry && Date.now() - latestTelemetry.timestamp < 2000) {
    ws.send(JSON.stringify({
      type: 'telemetry',
      data: latestTelemetry
    }));
  }


});

// Start services with automatic port conflict handling
function start(port = DEFAULT_WEB_PORT) {
  return new Promise((resolve, reject) => {
    for (const value of [FORZA_PORT, port]) {
      if (!Number.isInteger(value) || value < 1 || value > 65535) return reject(new Error('Ports must be integers from 1 to 65535'));
    }
    if (FORZA_PORT >= 5200 && FORZA_PORT <= 5300) return reject(new Error('FH6 reserves UDP ports 5200–5300; use 5500'));
    udpListener.start();
    statusTimer = setInterval(broadcastServerState, 1000);
    historyTimer = setInterval(()=>history.save(),5000);

    activeWebPort = port;

    const errorHandler = (err) => { stop(); reject(err); };
    server.once('error', errorHandler);

    server.listen(activeWebPort, WEB_HOST, () => {
      server.removeListener('error', errorHandler);
      console.log(`\n======================================================`);
      console.log(`  🏎️  FORZA TELEMETRY OUT - DASHBOARD READY`);
      console.log(`======================================================`);
      console.log(`  🌐 Web HUD Dashboard: http://${WEB_HOST === '0.0.0.0' ? 'localhost' : WEB_HOST}:${activeWebPort}`);
      console.log(`  📡 UDP Listener:      ${FORZA_HOST}:${FORZA_PORT}`);
      console.log(`======================================================\n`);
      resolve({ port: activeWebPort, host: WEB_HOST });
    });
  });
}

function stop() {
  clearInterval(statusTimer); clearInterval(historyTimer); history.save();
  udpListener.stop();
  for (const client of wss.clients) client.terminate();
  wss.close(); server.close();
}
process.on('SIGINT', () => { stop(); process.exit(0); });
process.on('SIGTERM', () => { stop(); process.exit(0); });

if (require.main === module) {
  start().catch((err) => {
    console.error('[Server] Fatal startup error:', err.message); process.exitCode = 1;
  });
}

module.exports = {
  stop,
  start,
  server,
  udpListener,
  recorder,
  getActivePort: () => activeWebPort
};
