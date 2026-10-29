import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createStore } from './lib/store.mjs';
import { analyzeIngredients } from './lib/analyzer.mjs';
import { buildAnalytics } from './lib/analytics.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const BODY_LIMIT = 4 * 1024 * 1024;
const AVAILABILITY = ['available', 'limited', 'unavailable'];
const PREFERENCES = ['sin-gluten', 'sin-soya', 'sin-frutos-secos', 'alto-proteina', 'economico', 'organico'];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    Object.assign(this, { status, code, details });
  }
}

function json(response, status, value) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(value));
}

function cleanText(value, name, { min = 1, max = 500, optional = false } = {}) {
  if ((value === undefined || value === null || value === '') && optional) return undefined;
  if (typeof value !== 'string') throw new ApiError(400, 'VALIDATION_ERROR', `${name} debe ser texto.`);
  const clean = value.replace(/<[^>]*>/g, '').replace(/[<>\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim();
  if (clean.length < min || clean.length > max) throw new ApiError(400, 'VALIDATION_ERROR', `${name} debe tener entre ${min} y ${max} caracteres.`);
  return clean;
}

function quantity(value = 1) {
  if (!Number.isInteger(value) || value < 1 || value > 99) throw new ApiError(400, 'VALIDATION_ERROR', 'La cantidad debe ser un entero entre 1 y 99.');
  return value;
}

function entity(collection, id, name) {
  const value = collection.find((item) => item.id === id);
  if (!value) throw new ApiError(404, 'NOT_FOUND', `${name} no existe en el catálogo.`);
  return value;
}

function validatePhoto(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || value.length > 3 * 1024 * 1024) throw new ApiError(400, 'VALIDATION_ERROR', 'La foto debe ser una imagen JPEG, PNG o WebP de hasta 2 MB.');
  const match = value.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || match[2].length % 4 !== 0) throw new ApiError(400, 'VALIDATION_ERROR', 'Formato de imagen no permitido. Usa JPEG, PNG o WebP.');
  const bytes = Buffer.from(match[2], 'base64');
  const signature = match[1] === 'jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!signature || bytes.length > 2 * 1024 * 1024) throw new ApiError(400, 'VALIDATION_ERROR', 'La imagen no coincide con el formato o supera 2 MB.');
  return value;
}

async function body(request) {
  if (request.headers['content-length'] && Number(request.headers['content-length']) > BODY_LIMIT) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'La solicitud supera el límite de 4 MB.');
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > BODY_LIMIT) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'La solicitud supera el límite de 4 MB.');
    chunks.push(chunk);
  }
  if (!size) return {};
  if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Envía los datos como application/json.');
  let parsed;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'El cuerpo no contiene JSON válido.'); }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new ApiError(400, 'VALIDATION_ERROR', 'La solicitud debe contener un objeto JSON.');
  return parsed;
}

function bootstrap(state, now) {
  const { catalog, places, products, recipes, evidence, favorites, shopping, notifications, profile, plans } = state;
  return { catalog, places, products, recipes, evidence, favorites, shopping, notifications, profile, plans, analytics: buildAnalytics(state, 7, now) };
}

export async function createApp(options = {}) {
  const publicDir = path.resolve(options.publicDir ?? path.join(ROOT, '..', 'dist'));
  const store = await createStore({ dataDir: options.dataDir ?? path.join(ROOT, '..', '.data'), seedPath: options.seedPath ?? path.join(ROOT, 'data', 'seed.json') });
  const time = () => options.now ? new Date(options.now()) : new Date();

  const handler = async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('X-Frame-Options', 'DENY');
    try {
      const rawPath = (request.url ?? '/').split('?')[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); }
      catch { throw new ApiError(400, 'INVALID_PATH', 'La ruta no es válida.'); }
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) throw new ApiError(403, 'FORBIDDEN_PATH', 'Ruta no permitida.');
      const url = new URL(request.url, 'http://localhost');
      if (pathname.startsWith('/api/')) {
        if (request.headers.origin) {
          let origin;
          try { origin = new URL(request.headers.origin); }
          catch { throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'Esta aplicación acepta cambios solo desde su propia página.'); }
          const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
          const requestHost = new URL(`http://${request.headers.host}`).hostname;
          const localHost = ['localhost', '127.0.0.1', requestHost].includes(origin.hostname);
          const developmentOrigin = localHost && ['8081', '8082', '19006'].includes(origin.port);
          if (!['http:', 'https:'].includes(origin.protocol) || !(origin.host === request.headers.host || developmentOrigin || configuredOrigins.includes(origin.origin))) throw new ApiError(403, 'FORBIDDEN_ORIGIN', 'El origen de esta solicitud no está autorizado.');
          response.setHeader('Access-Control-Allow-Origin', origin.origin);
          response.setHeader('Vary', 'Origin');
          response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
          response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        }
        if (request.method === 'OPTIONS') {
          response.writeHead(204);
          return response.end();
        }
        if (request.method === 'GET' && pathname === '/api/health') return json(response, 200, { ok: true, app: 'Paradero Vegano', version: '1.0.0', mode: 'development', now: time().toISOString() });
        if (request.method === 'GET' && pathname === '/api/bootstrap') return json(response, 200, bootstrap(store.snapshot(), time()));
        if (request.method === 'GET' && pathname === '/api/analytics') {
          const period = Number(url.searchParams.get('period') ?? '7');
          if (![7, 30].includes(period)) throw new ApiError(400, 'VALIDATION_ERROR', 'El periodo debe ser 7 o 30 días.');
          return json(response, 200, buildAnalytics(store.snapshot(), period, time()));
        }

        const input = await body(request);
        if (request.method === 'POST' && pathname === '/api/favorites') {
          const placeId = cleanText(input.placeId, 'El comercio', { max: 100 });
          return json(response, 200, await store.mutate((state) => {
            entity(state.places, placeId, 'El comercio');
            state.favorites = state.favorites.includes(placeId) ? state.favorites.filter((id) => id !== placeId) : [...state.favorites, placeId];
            return { favorites: state.favorites };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/shopping') {
          const productId = cleanText(input.productId, 'El producto', { max: 100 });
          const amount = quantity(input.quantity);
          return json(response, 200, await store.mutate((state) => {
            entity(state.products, productId, 'El producto');
            const existing = state.shopping.find((item) => item.productId === productId);
            if (existing) { existing.quantity = quantity(existing.quantity + amount); existing.checked = false; }
            else state.shopping.push({ id: `shopping-${randomUUID()}`, productId, quantity: amount, checked: false, createdAt: time().toISOString() });
            return { shopping: state.shopping };
          }));
        }
        const shoppingMatch = pathname.match(/^\/api\/shopping\/([^/]+)$/);
        if (shoppingMatch && ['PATCH', 'DELETE'].includes(request.method)) {
          if (request.method === 'PATCH') {
            if (input.checked === undefined && input.quantity === undefined) throw new ApiError(400, 'VALIDATION_ERROR', 'Indica checked o quantity para actualizar.');
            if (input.checked !== undefined && typeof input.checked !== 'boolean') throw new ApiError(400, 'VALIDATION_ERROR', 'checked debe ser verdadero o falso.');
            if (input.quantity !== undefined) quantity(input.quantity);
          }
          return json(response, 200, await store.mutate((state) => {
            const item = entity(state.shopping, shoppingMatch[1], 'El elemento de compras');
            if (request.method === 'DELETE') state.shopping = state.shopping.filter((entry) => entry.id !== item.id);
            else {
              if (input.quantity !== undefined) item.quantity = input.quantity;
              if (input.checked !== undefined) item.checked = input.checked;
            }
            return { shopping: state.shopping };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/analyze') {
          const ingredients = cleanText(input.ingredients, 'Los ingredientes', { min: 2, max: 5000 });
          return json(response, 200, { analysis: analyzeIngredients(ingredients) });
        }
        if (request.method === 'POST' && pathname === '/api/scan') {
          const barcode = cleanText(input.barcode, 'El código', { max: 14 });
          if (!/^\d{8,14}$/.test(barcode)) throw new ApiError(400, 'VALIDATION_ERROR', 'El código debe contener entre 8 y 14 dígitos.');
          const product = store.snapshot().products.find((item) => item.barcode === barcode);
          if (!product) throw new ApiError(404, 'BARCODE_NOT_FOUND', 'Este código no está en el catálogo ficticio. Puedes revisar sus ingredientes manualmente.');
          return json(response, 200, { product, analysis: analyzeIngredients(product.ingredients), source: 'catalog' });
        }
        if (request.method === 'POST' && pathname === '/api/evidence') {
          const placeId = cleanText(input.placeId, 'El comercio', { max: 100 });
          const productId = cleanText(input.productId, 'El producto', { max: 100, optional: true });
          const title = cleanText(input.title, 'El título', { min: 3, max: 120 });
          const ingredients = cleanText(input.ingredients, 'Los ingredientes', { min: 2, max: 5000 });
          if (!AVAILABILITY.includes(input.availability)) throw new ApiError(400, 'VALIDATION_ERROR', 'La disponibilidad debe ser available, limited o unavailable.');
          const photo = validatePhoto(input.photo);
          const createdAt = time().toISOString();
          return json(response, 201, await store.mutate((state) => {
            const place = entity(state.places, placeId, 'El comercio');
            const product = productId ? entity(state.products, productId, 'El producto') : undefined;
            if (product && !place.productIds.includes(productId)) throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona un producto del catálogo del comercio.');
            const evidence = { id: `evidence-${randomUUID()}`, placeId, ...(productId ? { productId } : {}), title, ingredients, availability: input.availability, ...(photo ? { photo } : {}), analysis: analyzeIngredients(ingredients), createdAt, source: 'user', author: state.profile.name, note: 'Aporte local pendiente de corroboración. El análisis usa reglas de texto.' };
            if (state.evidence.length >= 150) throw new ApiError(409, 'SAMPLE_LIMIT', 'La aplicación admite hasta 150 aportes. Reinicia los datos para comenzar de nuevo.');
            state.evidence.unshift(evidence);
            place.lastEvidenceAt = createdAt;
            place.latestAvailability = input.availability;
            if (product) {
              const offer = product.prices.find((item) => item.placeId === placeId);
              if (offer) offer.availability = input.availability;
            }
            const availabilityLabel = { available: 'disponible', limited: 'con pocas unidades', unavailable: 'sin disponibilidad' }[input.availability];
            state.notifications.unshift({ id: `notification-${randomUUID()}`, type: 'availability', title: `${product?.name ?? 'Aporte'} en ${place.name}`, message: `${state.profile.name} registró ${product?.name ?? 'un aporte'} ${availabilityLabel}. Evidencia local pendiente de corroborar.`, placeId, ...(productId ? { productId } : {}), createdAt, read: false });
            state.notifications = state.notifications.slice(0, 100);
            return { evidence, places: state.places, products: state.products, notifications: state.notifications };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/profile') {
          const name = cleanText(input.name, 'El nombre', { min: 2, max: 60 });
          if (!Array.isArray(input.preferences) || input.preferences.some((value) => !PREFERENCES.includes(value))) throw new ApiError(400, 'VALIDATION_ERROR', 'Selecciona preferencias válidas.');
          return json(response, 200, await store.mutate((state) => {
            if (input.plan !== undefined && !state.plans.some((plan) => plan.id === input.plan)) throw new ApiError(400, 'VALIDATION_ERROR', 'El plan seleccionado no existe.');
            state.profile = { ...state.profile, name, preferences: [...new Set(input.preferences)], ...(input.plan !== undefined ? { plan: input.plan } : {}) };
            return { profile: state.profile };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/plan') {
          const plan = cleanText(input.plan, 'El plan', { max: 30 });
          return json(response, 200, await store.mutate((state) => {
            entity(state.plans, plan, 'El plan');
            state.profile.plan = plan;
            return { profile: state.profile, simulation: true, message: 'Plan de prueba activado. No se realizaron cobros.' };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/events') {
          if (!['search', 'view'].includes(input.type)) throw new ApiError(400, 'VALIDATION_ERROR', 'El evento debe ser search o view.');
          const query = input.type === 'search' ? cleanText(input.query ?? '', 'La búsqueda', { min: 0, max: 150 }) : undefined;
          if (input.type === 'search' && (!Number.isInteger(input.results) || input.results < 0 || input.results > 10000)) throw new ApiError(400, 'VALIDATION_ERROR', 'results debe ser un entero entre 0 y 10000.');
          const placeId = input.type === 'view' ? cleanText(input.placeId, 'El comercio', { max: 100 }) : undefined;
          return json(response, 201, await store.mutate((state) => {
            if (placeId) entity(state.places, placeId, 'El comercio');
            state.events.push({ id: randomUUID(), type: input.type, ...(query !== undefined ? { query, results: input.results } : {}), ...(placeId ? { placeId } : {}), createdAt: time().toISOString() });
            state.events = state.events.slice(-5000);
            return { ok: true };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/notifications/read') {
          return json(response, 200, await store.mutate((state) => {
            state.notifications.forEach((item) => { item.read = true; });
            return { notifications: state.notifications };
          }));
        }
        if (request.method === 'POST' && pathname === '/api/reset') return json(response, 200, bootstrap(await store.reset(), time()));
        throw new ApiError(404, 'NOT_FOUND', 'No existe esta ruta de API.');
      }

      if (!['GET', 'HEAD'].includes(request.method)) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
      const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
      const resolved = path.resolve(publicDir, relative);
      if (resolved !== publicDir && !resolved.startsWith(publicDir + path.sep)) throw new ApiError(403, 'FORBIDDEN_PATH', 'Ruta no permitida.');
      let filename;
      try {
        try { filename = await realpath(resolved); }
        catch (error) {
          if (error.code === 'ENOENT' && !path.extname(relative)) filename = await realpath(path.join(publicDir, 'index.html'));
          else throw error;
        }
        const actualRoot = await realpath(publicDir);
        if (!filename.startsWith(actualRoot + path.sep)) throw new ApiError(403, 'FORBIDDEN_PATH', 'Ruta no permitida.');
        const info = await stat(filename);
        if (!info.isFile()) throw new ApiError(404, 'NOT_FOUND', 'Archivo no encontrado.');
        response.writeHead(200, { 'Content-Type': MIME[path.extname(filename).toLowerCase()] ?? 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
        if (request.method === 'HEAD') return response.end();
        response.end(await readFile(filename));
      } catch (error) {
        if (error.code === 'ENOENT' || error.code === 'ENOTDIR') throw new ApiError(404, 'NOT_FOUND', 'Archivo no encontrado.');
        throw error;
      }
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      if (!(error instanceof ApiError)) console.error('Error de la aplicación:', error.message);
      json(response, error.status ?? 500, { error: { code: error.code && error instanceof ApiError ? error.code : 'INTERNAL_ERROR', message: error instanceof ApiError ? error.message : 'No se pudo completar la operación. Intenta nuevamente.', ...(error.details ? { details: error.details } : {}) } });
    }
  };
  handler.store = store;
  return handler;
}

export async function startServer(options = {}) {
  const app = await createApp(options);
  const server = http.createServer(app);
  server.requestTimeout = 30000;
  server.headersTimeout = 15000;
  const host = options.host ?? process.env.HOST ?? '127.0.0.1';
  const port = options.port ?? Number(process.env.PORT ?? 4174);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
  const address = server.address();
  return { server, app, host, port: address.port, baseUrl: `http://${host.includes(':') ? `[${host}]` : host}:${address.port}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  startServer().then((running) => {
    console.log(`Paradero Vegano · servidor local en ${running.baseUrl}`);
    console.log('Datos ficticios. Sin cobros, cuentas externas ni certificación de productos.');
    let closing = false;
    const shutdown = () => {
      if (closing) return;
      closing = true;
      running.close().then(() => { process.exitCode = 0; }).catch(() => { process.exitCode = 1; });
      running.server.closeIdleConnections();
      setTimeout(() => { running.server.closeAllConnections(); }, 3000).unref();
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  }).catch((error) => { console.error(`No se pudo iniciar Paradero Vegano: ${error.message}`); process.exitCode = 1; });
}
