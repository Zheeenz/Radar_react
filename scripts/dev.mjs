import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from '../backend/server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const web = process.argv.includes('--web');
const running = await startServer({ host: web ? '127.0.0.1' : '0.0.0.0' });
console.log(`Paradero Vegano · API lista en el puerto ${running.port}`);
const expo = spawn(process.execPath, [path.join(root, 'node_modules/expo/bin/cli'), 'start', web ? '--web' : '--lan', ...(process.argv.includes('--clear') ? ['--clear'] : [])], { cwd: root, stdio: 'inherit', env: process.env });
let closing = false;
async function close(code = 0) {
  if (closing) return;
  closing = true;
  expo.kill();
  running.server.closeAllConnections();
  await running.close();
  process.exitCode = code;
}
expo.once('error', error => { console.error(error.message); void close(1); });
expo.once('exit', code => { void close(code || 0); });
process.once('SIGINT', () => { void close(); });
process.once('SIGTERM', () => { void close(); });
