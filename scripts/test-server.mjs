import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startServer } from '../backend/server.mjs';

const root = await mkdtemp(path.join(os.tmpdir(), 'paradero-web-'));
const running = await startServer({ port: 4190, dataDir: root });
let closing = false;
async function close() {
  if (closing) return;
  closing = true;
  running.server.closeAllConnections();
  await running.close();
  const target = path.resolve(root);
  if (!target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith('paradero-web-')) throw new Error('Ruta de pruebas no válida');
  await rm(target, { recursive: true, force: true });
}
process.once('SIGINT', close);
process.once('SIGTERM', close);
