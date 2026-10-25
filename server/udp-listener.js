/**
 * Forza UDP Telemetry Listener
 * 
 * Listens for incoming UDP datagram packets from Forza Motorsport / Horizon
 * on all network interfaces. Auto-decodes packets and tracks stream statistics.
 */

const dgram = require('dgram');
const { parseTelemetryPacket, identifyPacketType } = require('./parser');

class ForzaUdpListener {
  constructor(options = {}) {
    this.port = parseInt(options.port || process.env.FORZA_PORT || 5300, 10);
    this.host = options.host || process.env.FORZA_HOST || '0.0.0.0';
    this.onTelemetry = options.onTelemetry || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.socket = null;
    this.isListening = false;
    this.packetsReceived = 0;
    this.bytesReceived = 0;
    this.lastPacketTime = 0;
    this.currentPps = 0;
    this.detectedGame = 'None';
    this.lastPacketLength = 0;

    // Rolling PPS counter
    this.secondPackets = 0;
    this.ppsTimer = null;
  }

  start() {
    if (this.isListening) return;

    try {
      this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

      this.socket.on('error', (err) => {
        console.error(`[UDP Listener] Error on ${this.host}:${this.port}:`, err.message);
        this.isListening = false;
        this.onStatusChange({
          status: 'error',
          error: err.message,
          port: this.port
        });
      });

      this.socket.on('listening', () => {
        const address = this.socket.address();
        this.isListening = true;
        console.log(`[UDP Listener] Listening for Forza Telemetry on ${address.address}:${address.port}`);
        
        this.onStatusChange({
          status: 'listening',
          address: address.address,
          port: address.port
        });

        // Start PPS calculation interval
        this.ppsTimer = setInterval(() => {
          this.currentPps = this.secondPackets;
          this.secondPackets = 0;

          // If no packets in last 3 seconds, mark game as inactive
          if (Date.now() - this.lastPacketTime > 3000 && this.detectedGame !== 'None') {
            this.detectedGame = 'Idle / Waiting for packets';
          }
        }, 1000);
      });

      this.socket.on('message', (msg, rinfo) => {
        this.packetsReceived++;
        this.secondPackets++;
        this.bytesReceived += msg.length;
        this.lastPacketTime = Date.now();
        this.lastPacketLength = msg.length;

        const packetTitle = identifyPacketType(msg.length);
        this.detectedGame = packetTitle;

        const telemetry = parseTelemetryPacket(msg);
        if (telemetry) {
          telemetry.senderIp = rinfo.address;
          telemetry.senderPort = rinfo.port;
          this.onTelemetry(telemetry);
        }
      });

      this.socket.bind(this.port, this.host);
    } catch (err) {
      console.error('[UDP Listener] Failed to start UDP socket:', err);
      this.isListening = false;
    }
  }

  stop() {
    if (this.ppsTimer) {
      clearInterval(this.ppsTimer);
      this.ppsTimer = null;
    }

    if (this.socket) {
      try {
        this.socket.close();
      } catch (e) {}
      this.socket = null;
    }

    this.isListening = false;
    this.currentPps = 0;
  }

  getStatus() {
    return {
      isListening: this.isListening,
      port: this.port,
      host: this.host,
      packetsReceived: this.packetsReceived,
      bytesReceived: this.bytesReceived,
      currentPps: this.currentPps,
      detectedGame: this.detectedGame,
      lastPacketLength: this.lastPacketLength,
      lastPacketTime: this.lastPacketTime,
      hasActiveStream: (Date.now() - this.lastPacketTime) < 2000
    };
  }
}

module.exports = ForzaUdpListener;
