import os from 'node:os';
import { startServer } from '../backend/server.mjs';

const running = await startServer({ host: '0.0.0.0' });
console.log(`Paradero Vegano · API en el puerto ${running.port}`);
for (const network of Object.values(os.networkInterfaces()).flat()) {
  if (network && network.family === 'IPv4' && !network.internal) console.log(`Red local: http://${network.address}:${running.port}`);
}
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  running.server.closeAllConnections();
  await running.close();
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
