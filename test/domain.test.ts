import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bestPrice, distance, filterPlaces, initialFilters, preferenceScore } from '../src/domain/catalog';
import { csv } from '../src/domain/csv';
import type { Bootstrap } from '../src/types';

const data = JSON.parse(readFileSync(new URL('../backend/data/seed.json', import.meta.url), 'utf8')) as Bootstrap;

test('search matches accents, ingredients and products in the correct place', () => {
  const product = data.products.find(item => item.name.includes('Tofu'))!;
  assert.ok(product);
  const places = filterPlaces(data.places, data.products, [], { ...initialFilters, query: 'TOFU' });
  assert.ok(places.length);
  assert.ok(places.every(place => place.productIds.includes(product.id) || place.tags.some(tag => tag.toLowerCase().includes('tofu'))));
  assert.equal(filterPlaces(data.places, data.products, [], { ...initialFilters, query: 'producto inexistente' }).length, 0);
});
test('category and vegan filters compose without mutating the catalog', () => {
  const original = data.places.map(place => place.id);
  const places = filterPlaces(data.places, data.products, [], { ...initialFilters, category: 'cafe', veganOnly: true, sort: 'rating' });
  assert.ok(places.every(place => place.category === 'cafe' && place.veganMode === 'vegan'));
  assert.deepEqual(data.places.map(place => place.id), original);
});
test('available prices ignore unavailable offers and report missing stock', () => {
  const product = data.products[0];
  assert.equal(bestPrice({ ...product, prices: [{ placeId: 'a', price: 100, availability: 'unavailable' }, { placeId: 'b', price: 250, availability: 'limited' }] }), 250);
  assert.equal(bestPrice({ ...product, prices: [{ placeId: 'a', price: 100, availability: 'unavailable' }] }), null);
});
test('nearby sorting uses coordinates and preference ranking uses the catalog', () => {
  const target = data.places[3];
  assert.equal(distance(target, target), 0);
  const places = filterPlaces(data.places, data.products, [], { ...initialFilters, sort: 'distance', location: target });
  assert.equal(places[0].id, target.id);
  const gluten = data.places.find(place => place.tags.includes('Sin gluten'))!;
  assert.ok(preferenceScore(gluten, data.products, ['sin-gluten']) >= 2);
});
test('CSV preserves quotes, line breaks and neutralizes spreadsheet formulas', () => {
  const result = csv([['Producto', 'Cantidad'], ['Tofu; "natural"', 2], ['=HYPERLINK("test")', 1], ['texto\ncon salto', 3], [' @SUM(1)', 4]]);
  assert.ok(result.startsWith('\ufeff'));
  assert.ok(result.includes('"Tofu; ""natural""";"2"'));
  assert.ok(result.includes('"\'=HYPERLINK(""test"")"'));
  assert.ok(result.includes('"\' @SUM(1)"'));
  assert.ok(result.includes('"texto\ncon salto"'));
});
