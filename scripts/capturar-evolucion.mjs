import { chromium } from '@playwright/test';
import { mkdtemp, mkdir, rm, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startServer as startCurrent } from '../backend/server.mjs';
import { startServer as startPrevious } from '../../server.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const commerce = process.argv.includes('--commerce');
const output = commerce ? path.join(root, 'docs', 'evolucion', 'comercio') : path.join(root, 'docs', 'evolucion');
await access(path.join(root, 'dist', 'index.html'));
await mkdir(output, { recursive: true });
const temporary = await mkdtemp(path.join(os.tmpdir(), 'paradero-evolution-'));
const servers = [];
let browser;
try {
  const previous = await startPrevious({ port: 0, host: '127.0.0.1', dataDir: path.join(temporary, 'previous') });
  servers.push(previous);
  const current = await startCurrent({ port: 0, host: '127.0.0.1', dataDir: path.join(temporary, 'current') });
  servers.push(current);
  if (commerce) {
    for (const server of servers) {
      const response = await fetch(`${server.baseUrl}/api/plan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: 'commerce' }) });
      if (!response.ok) throw new Error('No se pudo activar Comercio en la instancia temporal');
    }
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(pathToFileURL(path.join(output, '01-boceto-reconstruido.html')).href);
  await page.screenshot({ path: path.join(output, '01-boceto-reconstruido.png') });
  await page.goto(commerce ? `${previous.baseUrl}/#dashboard` : previous.baseUrl);
  await page.locator(commerce ? '#analytics-output .stat-card' : '.hero h1').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, '02-web-anterior-real.png') });
  await page.goto(`${current.baseUrl}/${commerce ? 'commerce' : 'explore'}`);
  await page.getByText(commerce ? 'Actividad de los últimos 7 días' : 'Tu próximo paradero,', { exact: commerce }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, '03-web-react-actual.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).waitFor();
  await page.screenshot({ path: path.join(output, '04-vista-movil-actual.png') });
  if (commerce) {
    const chart = page.getByText('Actividad de los últimos 7 días', { exact: true });
    const box = await chart.boundingBox();
    if (!box) throw new Error('No se encontró la posición del gráfico móvil');
    await page.mouse.move(195, 600);
    await page.mouse.wheel(0, Math.max(0, box.y - 130));
    await page.waitForFunction(() => {
      const heading = Array.from(document.querySelectorAll('[role="heading"]')).find(element => element.textContent === 'Actividad de los últimos 7 días');
      const top = heading?.getBoundingClientRect().top;
      return top !== undefined && top >= 0 && top < 300;
    });
    await page.screenshot({ path: path.join(output, '05-grafico-movil-actual.png') });
  }
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Se generaron ${commerce ? 'cinco' : 'cuatro'} imágenes en ${output}. La primera es una reconstrucción; las demás son capturas de las versiones conservadas.`);
} finally {
  if (browser) await browser.close();
  for (const server of servers) { server.server.closeAllConnections(); await server.close(); }
  const target = path.resolve(temporary);
  if (!target.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(target).startsWith('paradero-evolution-')) throw new Error('Ruta temporal no válida');
  await rm(target, { recursive: true, force: true });
}
