import type { Coordinates, Place, Product } from '../types';

export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
export const date = (value: string) => new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', timeZone: 'America/Santiago' }).format(new Date(value));
export const statusLabels = { vegan: 'Compatible', review: 'Por revisar', 'non-vegan': 'Origen animal' };
export const availabilityLabels = { available: 'Disponible', limited: 'Pocas unidades', unavailable: 'No disponible' };
export const categories = { all: 'Todo', restaurant: 'Restaurantes', cafe: 'Cafeterías', store: 'Tiendas' };
export const preferences = { 'sin-gluten': 'Sin gluten', 'sin-soya': 'Sin soya', 'sin-frutos-secos': 'Sin frutos secos', 'alto-proteina': 'Alto en proteína', economico: 'Económico', organico: 'Orgánico' };

export function bestPrice(product: Product) {
  const prices = product.prices.filter(offer => offer.availability !== 'unavailable').map(offer => offer.price);
  return prices.length ? Math.min(...prices) : null;
}
export function distance(a: Coordinates, b: Coordinates) {
  const r = Math.PI / 180;
  const n = Math.sin((b.lat - a.lat) * r / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin((b.lng - a.lng) * r / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(n), Math.sqrt(1 - n));
}
export function preferenceScore(place: Place, products: Product[], selected: string[]) {
  const available = products.filter(product => place.productIds.includes(product.id) && product.status === 'vegan');
  return selected.reduce((score, preference) => {
    if (preference === 'economico') return score + (place.priceRange === '$' ? 2 : 0);
    if (preference === 'sin-gluten') return score + (place.tags.some(tag => normalize(tag) === 'sin gluten') ? 2 : 0);
    if (preference === 'alto-proteina') return score + (available.some(product => /tofu|lentejas|garbanzos/.test(normalize(product.name))) ? 1 : 0);
    if (preference === 'sin-soya') return score + (available.some(product => !/soya|soja/.test(normalize(product.ingredients))) ? 1 : 0);
    if (preference === 'sin-frutos-secos') return score + (available.some(product => !/almendra|mani|nuez|nueces|avellana|anacardo|caju/.test(normalize(product.ingredients))) ? 1 : 0);
    if (preference === 'organico') return score + (place.tags.some(tag => normalize(tag).includes('organic')) ? 1 : 0);
    return score;
  }, 0);
}
export type Filters = { query: string; category: string; veganOnly: boolean; openOnly: boolean; recentOnly: boolean; sort: 'recommended' | 'rating' | 'price' | 'distance'; location: Coordinates | null };
export const initialFilters: Filters = { query: '', category: 'all', veganOnly: false, openOnly: false, recentOnly: false, sort: 'recommended', location: null };
export function filterPlaces(places: Place[], products: Product[], selected: string[], filters: Filters) {
  const query = normalize(filters.query.trim());
  return places.filter(place => {
    const catalog = products.filter(product => place.productIds.includes(product.id));
    const text = normalize([place.name, place.address, ...place.tags, ...catalog.flatMap(product => [product.name, product.ingredients])].join(' '));
    return (!query || text.includes(query)) && (filters.category === 'all' || place.category === filters.category) && (!filters.veganOnly || place.veganMode === 'vegan') && (!filters.openOnly || place.open) && (!filters.recentOnly || place.confidence === 'high');
  }).sort((a, b) => {
    if (filters.sort === 'rating') return b.rating - a.rating;
    if (filters.sort === 'price') return a.priceRange.length - b.priceRange.length;
    if (filters.sort === 'distance' && filters.location) return distance(filters.location, a) - distance(filters.location, b);
    return preferenceScore(b, products, selected) - preferenceScore(a, products, selected) || b.rating - a.rating;
  });
}
