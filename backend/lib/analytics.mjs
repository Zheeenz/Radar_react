export function buildAnalytics(state, period = 7, now = new Date()) {
  const cutoff = new Date(now.getTime() - period * 86400000);
  const events = state.events.filter((event) => new Date(event.createdAt) >= cutoff);
  const userEvidence = state.evidence.filter((item) => item.source === 'user' && new Date(item.createdAt) >= cutoff);
  const recorded = {
    searches: events.filter((item) => item.type === 'search').length,
    views: events.filter((item) => item.type === 'view').length,
    contributions: userEvidence.length,
    noResults: events.filter((item) => item.type === 'search' && item.results === 0).length,
  };
  const illustrative = period === 30
    ? { searches: 542, views: 1430, contributions: 83, noResults: 47 }
    : { searches: 127, views: 386, contributions: 24, noResults: 12 };
  const queryCounts = new Map([['hamburguesas', 39], ['sin gluten', 28], ['leche vegetal', 22], ['almuerzo vegano', 18]]);
  const recordedQueries = new Map();
  const placeCounts = new Map();
  const unresolvedQueries = new Map();
  for (const event of events) {
    if (event.type === 'search' && event.query) recordedQueries.set(event.query, (recordedQueries.get(event.query) ?? 0) + 1);
    if (event.type === 'view' && event.placeId) placeCounts.set(event.placeId, (placeCounts.get(event.placeId) ?? 0) + 1);
    if (event.type === 'search' && event.results === 0 && event.query) unresolvedQueries.set(event.query, (unresolvedQueries.get(event.query) ?? 0) + 1);
  }
  const chartDays = Math.min(period, 7);
  const trend = Array.from({ length: chartDays }, (_, index) => {
    const date = new Date(now.getTime() - (chartDays - index - 1) * 86400000).toISOString().slice(0, 10);
    return {
      date,
      searches: [12, 19, 14, 24, 18, 23, 17][index],
      views: [37, 49, 43, 65, 61, 72, 59][index],
      recordedSearches: events.filter((item) => item.type === 'search' && item.createdAt.startsWith(date)).length,
      recordedViews: events.filter((item) => item.type === 'view' && item.createdAt.startsWith(date)).length,
      source: 'illustrative-with-recorded-overlay',
    };
  });
  return {
    period,
    generatedAt: now.toISOString(),
    disclaimer: 'Las métricas ilustrativas simulan un piloto. Las interacciones registradas corresponden únicamente a esta instalación local.',
    illustrative,
    recorded,
    totals: { ...recorded, places: state.places.length, products: state.products.length, favorites: state.favorites.length },
    trend,
    topSearches: [...queryCounts].map(([query, count]) => ({ query, count, source: 'illustrative' })),
    recordedSearches: [...recordedQueries].map(([query, count]) => ({ query, count, source: 'recorded' })).sort((a, b) => b.count - a.count).slice(0, 8),
    topUnresolvedQueries: [...unresolvedQueries].map(([query, count]) => ({ query, count, source: 'recorded' })).sort((a, b) => b.count - a.count).slice(0, 8),
    topPlaces: state.places.slice(0, 5).map((place, index) => ({ placeId: place.id, name: place.name, views: [94, 78, 67, 53, 39][index], recordedViews: placeCounts.get(place.id) ?? 0, source: 'illustrative-with-recorded-overlay' })),
    topProducts: state.products.slice(0, 5).map((product, index) => ({ productId: product.id, name: product.name, interest: [65, 54, 48, 36, 29][index], shoppingQuantity: state.shopping.filter((item) => item.productId === product.id).reduce((sum, item) => sum + item.quantity, 0), source: 'illustrative-with-local-shopping' })),
    averageRating: { value: Number((state.places.reduce((sum, place) => sum + place.rating, 0) / state.places.length).toFixed(1)), source: 'illustrative-catalog', reviewCount: state.places.reduce((sum, place) => sum + place.reviewCount, 0) },
    categoryBreakdown: ['restaurant', 'cafe', 'store'].map((category) => ({ category, count: state.places.filter((place) => place.category === category).length, source: 'catalog' })),
  };
}
