import { useEffect, useMemo, useState } from 'react';
import { ImageBackground, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useRadar } from '../context/RadarContext';
import { categories, filterPlaces, initialFilters, type Filters } from '../domain/catalog';
import { request } from '../services/api';
import { colors, fonts, food } from '../theme';
import { PlaceCard, ProductCard } from '../components/Cards';
import { MapPanel } from '../components/MapPanel';
import { Badge, Button, Check, Chip, Copy, Empty, Field, Heading, Icon, Intro, Note, Panel, Row } from '../components/ui';

export function ExploreScreen({ favoritesOnly = false }: { favoritesOnly?: boolean }) {
  const { data, openPlace, setModal, run, notify } = useRadar();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string }>();
  const [filters, setFilters] = useState<Filters>({ ...initialFilters, query: params.query || '' });
  const [map, setMap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);
  useEffect(() => { if (params.query !== undefined) setFilters(current => ({ ...current, query: String(params.query) })); }, [params.query]);
  const places = useMemo(() => data ? filterPlaces(favoritesOnly ? data.places.filter(place => data.favorites.includes(place.id)) : data.places, data.products, data.profile.preferences, filters) : [], [data, filters, favoritesOnly]);
  useEffect(() => {
    if (!filters.query.trim() || favoritesOnly || !data) return;
    const timer = setTimeout(() => { void request('/events', { type: 'search', query: filters.query.slice(0, 150), results: places.length }).catch(() => {}); }, 800);
    return () => clearTimeout(timer);
  }, [filters.query, places.length, favoritesOnly, !!data]);
  if (!data) return null;
  const columns = width >= 1380 ? 3 : width >= 720 ? 2 : 1;
  function patch(value: Partial<Filters>) { setFilters(current => ({ ...current, ...value })); }
  async function locate() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { notify('Puedes seguir explorando Santiago sin compartir tu ubicación.'); return; }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      patch({ location: { lat: result.coords.latitude, lng: result.coords.longitude }, sort: 'distance' });
      notify('Lugares ordenados por cercanía');
    } finally { setLocating(false); }
  }
  return <View style={{ gap: 22 }}>
    {favoritesOnly ? <Intro kicker="TU COLECCIÓN VERDE" title="Lugares que quieres volver a visitar." description="Tus favoritos, siempre a mano. Encuentra esa tienda, café o restaurante que guardaste para después." /> : <>
      <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Copy small muted>Tu siguiente elección empieza aquí</Copy><Badge tone="neutral">{data.places.length} lugares por descubrir</Badge></Row>
      <View style={[s.hero, { flexDirection: width >= 820 ? 'row' : 'column' }]}><View style={[s.heroCopy, { flex: width >= 820 ? 1.25 : undefined }]}><Text style={s.eyebrow}>MÁS CERCA. MÁS CONSCIENTE.</Text><Heading level={1} style={{ fontSize: width >= 700 ? 39 : 31, lineHeight: width >= 700 ? 49 : 40 }}>Tu próximo paradero,{`\n`}un poco más verde.</Heading><Copy muted style={{ maxWidth: 450 }}>Descubre sabores, encuentra productos y elige con información compartida por la comunidad.</Copy><Row style={{ flexWrap: 'wrap', marginTop: 6 }}><Button icon="map" onPress={() => setMap(current => !current)}>{map ? 'Ver lugares' : 'Explorar el mapa'}</Button><Button secondary icon="maximize" onPress={() => router.push('/verify')}>¿Es vegano?</Button></Row><Row style={{ marginTop: 9, flexWrap: 'wrap' }}><Icon name="check-circle" size={14} color={colors.green} /><Copy small muted>Evidencia clara. Decisiones más simples.</Copy></Row></View><ImageBackground source={food} style={[s.heroImage, { flex: width >= 820 ? 1 : undefined, minHeight: width >= 820 ? 300 : 190 }]} resizeMode="cover"><View style={s.heroImageLabel}><Icon name="feather" color={colors.forest} size={15} /><Text style={{ fontFamily: fonts.bold, fontSize: 12, color: colors.forest }}>Buenos sabores, mejores elecciones</Text></View></ImageBackground></View>
    </>}
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><View style={{ gap: 4 }}><Heading>{favoritesOnly ? 'Tus favoritos' : 'Encuentra tu lugar'}</Heading><Copy small muted>{favoritesOnly ? `${data.favorites.length} lugares guardados para ti` : 'Del café de la esquina a tu próxima compra semanal.'}</Copy></View><Row><Chip selected={!map} onPress={() => setMap(false)} icon="grid">Lista</Chip><Chip selected={map} onPress={() => setMap(true)} icon="map">Mapa</Chip></Row></Row>
    <Field value={filters.query} onChange={query => patch({ query })} placeholder="Busca lugares, productos o ingredientes" maxLength={150} />
    <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}><Row style={{ flexWrap: 'wrap', gap: 8 }}>{Object.entries(categories).map(([key, label]) => <Chip key={key} selected={filters.category === key} onPress={() => patch({ category: key })}>{label}</Chip>)}</Row><Button secondary compact icon="sliders" onPress={() => setShowFilters(current => !current)}>Filtros{[filters.veganOnly, filters.openOnly, filters.recentOnly].some(Boolean) ? ' •' : ''}</Button></Row>
    {showFilters && <Panel><Row style={{ flexWrap: 'wrap', gap: 22 }}><Check label="Solo 100% vegetal" checked={filters.veganOnly} onPress={() => patch({ veganOnly: !filters.veganOnly })} /><Check label="Horario abierto" checked={filters.openOnly} onPress={() => patch({ openOnly: !filters.openOnly })} /><Check label="Evidencia reciente" checked={filters.recentOnly} onPress={() => patch({ recentOnly: !filters.recentOnly })} /></Row><Copy small muted>Ordenar por</Copy><Row style={{ flexWrap: 'wrap' }}>{([['recommended', 'Para ti'], ['rating', 'Valoración'], ['price', 'Precio']] as const).map(([sort, label]) => <Chip key={sort} selected={filters.sort === sort} onPress={() => patch({ sort })}>{label}</Chip>)}<Button secondary compact icon="navigation" disabled={locating} onPress={() => run(locate)}>{locating ? 'Buscando ubicación…' : 'Más cercanos'}</Button><Button secondary compact onPress={() => { setFilters(initialFilters); router.setParams({ query: '' }); }}>Limpiar filtros</Button></Row><Copy small muted>Las preferencias orientan el orden. No certifican ausencia de alérgenos. Los horarios y precios son datos de ejemplo.</Copy></Panel>}
    <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Copy small muted>{places.length} {places.length === 1 ? 'lugar encontrado' : 'lugares encontrados'}</Copy><Copy small muted>{filters.sort === 'distance' ? 'Ordenados por cercanía' : filters.sort === 'rating' ? 'Mejor valoración primero' : filters.sort === 'price' ? 'Menor rango de precio primero' : 'Recomendados según tus preferencias'}</Copy></Row>
    {!places.length ? <Empty title={favoritesOnly ? 'Aquí caben tus próximos favoritos' : 'No encontramos lugares con estos filtros'} text={favoritesOnly ? 'Guarda un lugar con el corazón para tenerlo siempre cerca.' : 'Prueba con otro ingrediente, producto o categoría.'}><Button secondary onPress={() => favoritesOnly ? router.push('/explore') : setFilters(initialFilters)}>{favoritesOnly ? 'Explorar lugares' : 'Limpiar búsqueda'}</Button></Empty> : map ? <MapPanel places={places} location={filters.location} onSelect={openPlace} /> : <View style={s.grid}>{places.map(place => <View key={place.id} style={{ width: columns === 1 ? '100%' : columns === 2 ? '48.8%' : '32%', flexGrow: 1, maxWidth: columns === 1 ? undefined : columns === 2 ? '50%' : '34%' }}><PlaceCard place={place} /></View>)}</View>}
    {!favoritesOnly && <><Row style={{ justifyContent: 'space-between', marginTop: 9 }}><View style={{ gap: 3 }}><Heading>Para tu próxima compra</Heading><Copy small muted>Productos del catálogo con precios para comparar.</Copy></View><Icon name="shopping-bag" color={colors.green} /></Row><View style={s.grid}>{data.products.slice(0, 3).map(product => <View key={product.id} style={{ flexGrow: 1, flexBasis: width > 700 ? 240 : '100%' }}><ProductCard product={product} /></View>)}</View><Note>Los aportes de la comunidad requieren corroboración. Revisa la fecha y confirma los ingredientes directamente con el comercio.</Note><View style={s.contribute}><View style={{ flex: 1, gap: 4 }}><Heading level={3}>¿Encontraste algo que vale la pena compartir?</Heading><Copy small muted>Aporta una etiqueta, disponibilidad o información de un lugar.</Copy></View><Button icon="plus" onPress={() => setModal({ kind: 'evidence' })}>Compartir evidencia</Button></View></>}
  </View>;
}
const s = StyleSheet.create({
  hero: { borderRadius: 23, backgroundColor: '#edf2e4', overflow: 'hidden', borderWidth: 1, borderColor: '#e2e9d8' }, heroCopy: { padding: 29, gap: 16 }, eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 1.7, color: colors.green }, heroImage: { justifyContent: 'flex-end' }, heroImageLabel: { alignSelf: 'flex-start', backgroundColor: '#f6f9e6ee', borderRadius: 9, margin: 20, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'center' }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 17 }, contribute: { backgroundColor: '#edf3e4', borderRadius: 16, padding: 24, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 20 },
});
