import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { startServer } from '../backend/server.mjs';
import { analyzeIngredients } from '../backend/lib/analyzer.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'radar-backend-'));
  const publicDir = path.join(root, 'public');
  const dataDir = path.join(root, 'data');
  await mkdir(publicDir);
  await writeFile(path.join(publicDir, 'index.html'), '<!doctype html><title>Sample</title>');
  await writeFile(path.join(publicDir, 'sample.css'), 'body{color:green}');
  const options = { port: 0, publicDir, dataDir, now: () => new Date('2026-10-04T18:00:00.000Z') };
  let running = await startServer(options);
  t.after(async () => {
    await running.close();
    const resolved = path.resolve(root);
    if (!resolved.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(resolved).startsWith('radar-backend-')) throw new Error('Unsafe fixture cleanup path');
    await rm(resolved, { recursive: true, force: true });
  });
  return {
    root,
    dataDir,
    get running() { return running; },
    async restart() { await running.close(); running = await startServer(options); },
    async api(route, value, method = value === undefined ? 'GET' : 'POST', extra = {}) {
      const response = await fetch(`${running.baseUrl}${route}`, { method, ...(value !== undefined ? { headers: { 'Content-Type': 'application/json', ...extra.headers }, body: JSON.stringify(value) } : {}), ...extra });
      return { status: response.status, body: await response.json() };
    },
  };
}

test('ingredient rules distinguish plant terms, negation, animal ingredients and uncertainty', () => {
  for (const ingredients of ['Lentejas, arroz, aceite de oliva', 'Leche de coco, manteca de cacao, mantequilla de maní', 'Agua, avena. Sin leche ni huevo.', 'No contiene leche ni huevo', 'Queso vegano, miel de agave']) {
    assert.equal(analyzeIngredients(ingredients).status, 'vegan', ingredients);
  }
  for (const ingredients of ['Leche, azúcar', 'Sin azúcar con leche', 'Sin lactosa, leche', 'Suero de leche, cacao', 'Miel, avena', 'Carne de pollo, arroz', 'Carmín E120']) {
    const result = analyzeIngredients(ingredients);
    assert.equal(result.status, 'non-vegan', ingredients);
    assert.ok(result.reasons.length);
    assert.equal(result.method, 'rules');
    assert.equal(result.confidence, undefined);
  }
  for (const ingredients of ['Cacao. Puede contener trazas de leche.', 'Pan con emulsionante E471', 'Glicerina, agua', 'Vitamina D3, aceite', 'Arroz con aromas naturales']) {
    assert.equal(analyzeIngredients(ingredients).status, 'review', ingredients);
  }
  assert.equal(analyzeIngredients('Glicerina vegetal, agua').status, 'vegan');
});

test('bootstrap provides coherent sample catalog and safely serves public files', async (t) => {
  const app = await fixture(t);
  const health = await app.api('/api/health');
  assert.equal(health.body.ok, true);
  const { body } = await app.api('/api/bootstrap');
  assert.equal(body.places.length, 8);
  assert.equal(body.products.length, 8);
  assert.equal(body.recipes.length, 3);
  assert.equal(body.catalog.fictitious, true);
  for (const place of body.places) for (const productId of place.productIds) assert.ok(body.products.some((product) => product.id === productId));
  for (const product of body.products) assert.equal(analyzeIngredients(product.ingredients).status, product.status);
  const page = await fetch(`${app.running.baseUrl}/`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.equal(page.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
  assert.match(await page.text(), /Sample/);
  const css = await fetch(`${app.running.baseUrl}/sample.css`, { method: 'HEAD' });
  assert.equal(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  assert.equal(await css.text(), '');
  assert.equal((await app.api('/server.mjs')).status, 404);
});

test('Expo web preflight is accepted and foreign browser origins are rejected', async (t) => {
  const app = await fixture(t);
  const preflight = await fetch(`${app.running.baseUrl}/api/favorites`, { method: 'OPTIONS', headers: { Origin: 'http://localhost:8081', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'http://localhost:8081');
  assert.match(preflight.headers.get('access-control-allow-headers'), /Content-Type/);
  const allowed = await app.api('/api/bootstrap', undefined, 'GET', { headers: { Origin: 'http://localhost:8081' } });
  assert.equal(allowed.status, 200);
  const denied = await app.api('/api/bootstrap', undefined, 'GET', { headers: { Origin: 'https://unrelated.example' } });
  assert.equal(denied.status, 403);
});

test('web deep links serve the exported app while missing assets and API routes remain errors', async (t) => {
  const app = await fixture(t);
  const page = await fetch(`${app.running.baseUrl}/shopping`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Sample/);
  assert.equal((await fetch(`${app.running.baseUrl}/missing.js`)).status, 404);
  assert.equal((await app.api('/api/missing')).status, 404);
});

test('favorite, shopping and profile changes survive server restart', async (t) => {
  const app = await fixture(t);
  const toggle = await app.api('/api/favorites', { placeId: 'place-2' });
  assert.ok(toggle.body.favorites.includes('place-2'));
  const added = await app.api('/api/shopping', { productId: 'product-1', quantity: 2 });
  const row = added.body.shopping.find((item) => item.productId === 'product-1');
  const incremented = await app.api('/api/shopping', { productId: 'product-1', quantity: 1 });
  assert.equal(incremented.body.shopping.find((item) => item.id === row.id).quantity, 3);
  await app.api(`/api/shopping/${row.id}`, { checked: true, quantity: 4 }, 'PATCH');
  await app.api('/api/profile', { name: '<b>Ana</b>', preferences: ['sin-soya', 'sin-soya'], plan: 'premium' });
  await app.restart();
  const { body } = await app.api('/api/bootstrap');
  assert.ok(body.favorites.includes('place-2'));
  assert.deepEqual(body.profile, { name: 'Ana', preferences: ['sin-soya'], plan: 'premium' });
  assert.equal(body.shopping.find((item) => item.id === row.id).quantity, 4);
  assert.equal(body.shopping.find((item) => item.id === row.id).checked, true);
  const deleted = await app.api(`/api/shopping/${row.id}`, undefined, 'DELETE');
  assert.ok(!deleted.body.shopping.some((item) => item.id === row.id));
  const file = JSON.parse(await readFile(path.join(app.dataDir, 'store.json'), 'utf8'));
  assert.equal(file.profile.name, 'Ana');
});

test('concurrent shopping mutations retain all increments', async (t) => {
  const app = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => app.api('/api/shopping', { productId: 'product-1' })));
  assert.ok(results.every((result) => result.status === 200));
  const { body } = await app.api('/api/bootstrap');
  assert.equal(body.shopping.find((item) => item.productId === 'product-1').quantity, 8);
});

test('evidence updates availability and notifies without changing catalog ingredients', async (t) => {
  const app = await fixture(t);
  const result = await app.api('/api/evidence', { placeId: 'place-3', productId: 'product-3', title: 'Tofu agotado hoy', ingredients: 'Agua, soya, cloruro de magnesio.', availability: 'unavailable' });
  assert.equal(result.status, 201);
  assert.equal(result.body.evidence.source, 'user');
  assert.equal(result.body.evidence.analysis.status, 'vegan');
  assert.equal(result.body.products.find((item) => item.id === 'product-3').prices.find((item) => item.placeId === 'place-3').availability, 'unavailable');
  assert.equal(result.body.places.find((item) => item.id === 'place-3').lastEvidenceAt, '2026-10-04T18:00:00.000Z');
  assert.equal(result.body.notifications[0].read, false);
  const read = await app.api('/api/notifications/read', {});
  assert.ok(read.body.notifications.every((item) => item.read));
  const { body } = await app.api('/api/bootstrap');
  assert.equal(body.analytics.recorded.contributions, 1);
  assert.equal(body.products.find((item) => item.id === 'product-3').ingredients, 'Agua, soya, cloruro de magnesio.');
  assert.equal((await app.api('/api/evidence', { placeId: 'place-2', productId: 'product-1', title: 'Aporte inválido', ingredients: 'Agua, soya.', availability: 'available' })).status, 400);
});

test('photo accepts raster data URLs and rejects SVG, oversized and invalid content', async (t) => {
  const app = await fixture(t);
  const evidence = { placeId: 'place-3', title: 'Etiqueta de ejemplo', ingredients: 'Agua, soya.', availability: 'available' };
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j8m8AAAAASUVORK5CYII=';
  assert.equal((await app.api('/api/evidence', { ...evidence, photo: png })).status, 201);
  for (const photo of ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'data:image/png;base64,bm90IGFuIGltYWdl', `data:image/png;base64,${'A'.repeat(3 * 1024 * 1024)}`]) {
    assert.equal((await app.api('/api/evidence', { ...evidence, photo })).status, 400);
  }
});

test('barcode lookup is limited to sample catalog and analysis matches', async (t) => {
  const app = await fixture(t);
  const known = await app.api('/api/scan', { barcode: '7800000000073' });
  assert.equal(known.status, 200);
  assert.equal(known.body.product.id, 'product-7');
  assert.equal(known.body.analysis.status, 'non-vegan');
  assert.equal((await app.api('/api/scan', { barcode: '1234567890123' })).body.error.code, 'BARCODE_NOT_FOUND');
  assert.equal((await app.api('/api/scan', { barcode: 'abc' })).status, 400);
});

test('analytics separates illustrative metrics from recorded activity and zero-result demand', async (t) => {
  const app = await fixture(t);
  await app.api('/api/events', { type: 'search', query: 'pizza vegana', results: 0 });
  await app.api('/api/events', { type: 'search', query: 'tofu', results: 3 });
  await app.api('/api/events', { type: 'view', placeId: 'place-3' });
  const { body } = await app.api('/api/analytics?period=30');
  assert.equal(body.period, 30);
  assert.equal(body.recorded.searches, 2);
  assert.equal(body.recorded.views, 1);
  assert.equal(body.recorded.noResults, 1);
  assert.equal(body.totals.searches, 2);
  assert.equal(body.illustrative.searches, 542);
  assert.deepEqual(body.topUnresolvedQueries, [{ query: 'pizza vegana', count: 1, source: 'recorded' }]);
  assert.equal(body.topPlaces.find((item) => item.placeId === 'place-3').recordedViews, 1);
  assert.equal(body.averageRating.source, 'illustrative-catalog');
  assert.equal((await app.api('/api/analytics?period=9')).status, 400);
});

test('validation failures preserve store and return structured errors', async (t) => {
  const app = await fixture(t);
  const before = await readFile(path.join(app.dataDir, 'store.json'), 'utf8');
  const cases = [
    ['/api/favorites', { placeId: 'missing' }, 404],
    ['/api/shopping', { productId: 'product-1', quantity: -1 }, 400],
    ['/api/shopping', { productId: 'product-1', quantity: 1.5 }, 400],
    ['/api/analyze', { ingredients: '' }, 400],
    ['/api/analyze', { ingredients: 'a'.repeat(5001) }, 400],
    ['/api/profile', { name: 'Ana', preferences: ['inventada'] }, 400],
    ['/api/plan', { plan: 'invalid' }, 404],
    ['/api/events', { type: 'search', query: 'tofu', results: -1 }, 400],
    ['/api/events', { type: 'view', placeId: 'missing' }, 404],
    ['/api/evidence', { placeId: 'place-3', title: 'Prueba', ingredients: 'Agua, soya.', availability: 'wrong' }, 400],
  ];
  for (const [route, input, status] of cases) {
    const result = await app.api(route, input);
    assert.equal(result.status, status, route);
    assert.equal(typeof result.body.error.code, 'string');
    assert.equal(typeof result.body.error.message, 'string');
  }
  assert.equal(await readFile(path.join(app.dataDir, 'store.json'), 'utf8'), before);
  const malformed = await fetch(`${app.running.baseUrl}/api/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' });
  assert.equal(malformed.status, 400);
  assert.equal((await malformed.json()).error.code, 'INVALID_JSON');
  const wrongContentType = await fetch(`${app.running.baseUrl}/api/analyze`, { method: 'POST', body: '{"ingredients":"agua"}' });
  assert.equal(wrongContentType.status, 415);
});

test('static traversal and cross-origin mutations are blocked', async (t) => {
  const app = await fixture(t);
  const rawRequest = (requestPath) => new Promise((resolve, reject) => {
    http.get({ hostname: '127.0.0.1', port: app.running.port, path: requestPath }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode));
    }).on('error', reject);
  });
  for (const requestPath of ['/../server.mjs', '/%2e%2e/server.mjs', '/%2e%2e%5cserver.mjs', '/sample%00.css']) assert.equal(await rawRequest(requestPath), 403, requestPath);
  const foreign = await fetch(`${app.running.baseUrl}/api/reset`, { method: 'POST', headers: { Origin: 'https://malicious.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(foreign.status, 403);
  const invalidOrigin = await fetch(`${app.running.baseUrl}/api/reset`, { method: 'POST', headers: { Origin: 'null', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(invalidOrigin.status, 403);
  const sameOrigin = await fetch(`${app.running.baseUrl}/api/notifications/read`, { method: 'POST', headers: { Origin: app.running.baseUrl, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(sameOrigin.status, 200);
});

test('reset restores local sample state including profile, events and notifications', async (t) => {
  const app = await fixture(t);
  await app.api('/api/plan', { plan: 'commerce' });
  await app.api('/api/events', { type: 'search', query: 'tofu', results: 2 });
  await app.api('/api/favorites', { placeId: 'place-2' });
  const { body } = await app.api('/api/reset', {});
  assert.equal(body.profile.plan, 'free');
  assert.equal(body.analytics.recorded.searches, 0);
  assert.deepEqual(body.favorites, ['place-1', 'place-3']);
  assert.equal(body.notifications.length, 2);
});
