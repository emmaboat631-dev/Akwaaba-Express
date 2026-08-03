import { WebSocketServer } from 'ws';

// Dev-only LAN relay. Attaches a tiny broadcast WebSocket server to Vite's
// existing (https) dev server at the /relay path, so a laptop and a phone on
// the same Wi-Fi can sync driver presence, ride requests and bookings in real
// time — the piece a no-backend prototype otherwise can't do across devices.
//
// It only runs during `vite dev` (apply: 'serve'), never in the production
// build. It relays every message to the other connected clients and retains a
// snapshot of online drivers + recent bookings so a device that joins late
// immediately catches up.
export default function relayPlugin() {
  const drivers = new Map(); // driverId -> latest presence payload
  const bookings = new Map(); // bookingId -> booking
  let wss;

  const attach = (server) => {
    if (!server.httpServer || wss) return;
    wss = new WebSocketServer({ noServer: true });

    // Claim only /relay upgrades; leave Vite's own HMR socket untouched.
    server.httpServer.on('upgrade', (req, socket, head) => {
      if (!req.url || !req.url.startsWith('/relay')) return;
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
    });

    const broadcast = (data, except) => {
      const msg = JSON.stringify(data);
      for (const client of wss.clients) {
        if (client !== except && client.readyState === 1) client.send(msg);
      }
    };

    wss.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'snapshot', drivers: [...drivers.values()], bookings: [...bookings.values()] }));
      // Track which drivers this socket owns, so we can retire them if the
      // device disconnects (tab closed / left Wi-Fi) without going offline.
      ws.ownedDrivers = new Set();

      ws.on('message', (raw) => {
        let m;
        try { m = JSON.parse(raw.toString()); } catch { return; }

        switch (m.type) {
          case 'driver:online':
            if (m.driverId) { drivers.set(m.driverId, m); ws.ownedDrivers.add(m.driverId); }
            break;
          case 'driver:position': {
            const cur = m.driverId && drivers.get(m.driverId);
            if (cur?.bus && m.position) {
              drivers.set(m.driverId, { ...cur, bus: { ...cur.bus, position: m.position, origin: m.position, etaMin: m.etaMin ?? cur.bus.etaMin } });
            }
            break;
          }
          case 'driver:offline':
            drivers.delete(m.driverId);
            ws.ownedDrivers.delete(m.driverId);
            break;
          case 'booking:new':
            if (m.booking?.id) bookings.set(m.booking.id, m.booking);
            break;
          default:
            break;
        }
        broadcast(m, ws);
      });

      ws.on('close', () => {
        for (const id of ws.ownedDrivers) {
          drivers.delete(id);
          broadcast({ type: 'driver:offline', driverId: id }, ws);
        }
      });
    });

    server.config.logger.info('  ➤  LAN relay:  wss://<host>:<port>/relay');
  };

  return {
    name: 'akwaaba-lan-relay',
    apply: 'serve',
    configureServer: attach,
  };
}
