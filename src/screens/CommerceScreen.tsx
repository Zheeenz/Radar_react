import { useEffect, useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useRadar } from '../context/RadarContext';
import { request } from '../services/api';
import { exportCsv } from '../services/export';
import { csv } from '../domain/csv';
import { date } from '../domain/catalog';
import type { Analytics } from '../types';
import { colors, fonts } from '../theme';
import { Badge, Button, Chip, Copy, Heading, Icon, Intro, Note, Panel, Row } from '../components/ui';

export function CommerceScreen() {
  const { data, run } = useRadar();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [period, setPeriod] = useState<7 | 30>(7);
  const [revision, setRevision] = useState(0);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const enabled = data?.profile.plan === 'commerce';
  useEffect(() => {
    if (!enabled) return;
    let active = true; setLoading(true); setError('');
    request<Analytics>(`/analytics?period=${period}`).then(result => { if (active) setAnalytics(result); }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No pudimos cargar las estadísticas.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [enabled, period, revision]);
  if (!data) return null;
  async function download() {
    if (!analytics) return;
    await exportCsv('paradero-estadisticas.csv', csv([['Métrica', 'Ejemplo del piloto', 'Registrado en esta instalación', 'Periodo (días)'], ['Búsquedas', analytics.illustrative.searches, analytics.recorded.searches, period], ['Vistas', analytics.illustrative.views, analytics.recorded.views, period], ['Aportes', analytics.illustrative.contributions, analytics.recorded.contributions, period], ['Sin resultados', analytics.illustrative.noResults, analytics.recorded.noResults, period]]));
  }
  return <View style={{ gap: 23 }}><Intro kicker="INFORMACIÓN PARA CRECER" title="Conoce lo que mueve a tu comunidad." description="Explora búsquedas, visitas e interés por productos para entender cómo podría crecer tu comercio." />{!enabled ? <Panel style={{ alignItems: 'center', paddingVertical: 40 }}><Icon name="bar-chart-2" color={colors.green} size={42} /><Heading>Una mirada más amplia a tu comercio</Heading><Copy muted style={{ textAlign: 'center', maxWidth: 570 }}>Activa el plan Comercio para revisar el panel, comparar periodos y exportar estadísticas. Puedes probarlo sin realizar pagos.</Copy><Button icon="zap" onPress={() => router.push('/plans')}>Conocer el plan Comercio</Button></Panel> : <><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Row><Chip selected={period === 7} onPress={() => setPeriod(7)}>7 días</Chip><Chip selected={period === 30} onPress={() => setPeriod(30)}>30 días</Chip></Row><Row style={{ flexWrap: 'wrap' }}><Button secondary compact icon="refresh-cw" disabled={loading} onPress={() => setRevision(value => value + 1)}>Actualizar</Button><Button secondary compact icon="download" disabled={!analytics || loading || !!error} onPress={() => run(download)}>Exportar</Button></Row></Row>{loading ? <Panel><ActivityIndicator color={colors.green} /><Copy muted>Cargando estadísticas…</Copy></Panel> : error ? <Note warning>{error}</Note> : analytics && <>
      <Note>{analytics.disclaimer}</Note><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>{([['Búsquedas', 'searches', 'search'], ['Visitas a lugares', 'views', 'eye'], ['Aportes', 'contributions', 'file-text'], ['Sin resultados', 'noResults', 'help-circle']] as const).map(([title, key, icon]) => <Panel key={key} style={{ flex: 1, minWidth: width >= 700 ? 175 : 135, padding: 20 }}><Icon name={icon} color={colors.green} /><Copy small muted>{title}</Copy><Heading level={1}>{analytics.illustrative[key]}</Heading><Badge tone="neutral">Ejemplo del piloto</Badge><Copy small style={{ fontFamily: fonts.bold }}>{analytics.recorded[key]} registrados aquí</Copy></Panel>)}</View>
      <Panel><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><View style={{ gap: 5 }}><Heading level={3}>Actividad de los últimos 7 días</Heading><Copy small muted>La gráfica muestra la serie ilustrativa. El periodo seleccionado se aplica a los contadores registrados.</Copy></View><Badge tone="neutral">Serie de ejemplo</Badge></Row><View style={{ height: 205, flexDirection: 'row', gap: 10, alignItems: 'flex-end', paddingTop: 25 }}>{analytics.trend.map(day => <View key={day.date} style={{ flex: 1, gap: 8, alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}><Copy small muted>{day.views}</Copy><View accessibilityLabel={`${date(day.date + 'T12:00:00Z')}: ${day.views} visitas y ${day.searches} búsquedas de ejemplo`} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 140, width: '72%', maxWidth: 60 }}><View style={{ flex: 1, height: `${day.views / 80 * 100}%`, backgroundColor: colors.green, borderRadius: 5 }} /><View style={{ flex: 1, height: `${day.searches / 80 * 100}%`, backgroundColor: colors.lime, borderRadius: 5 }} /></View><Copy small muted>{date(day.date + 'T12:00:00Z')}</Copy></View>)}</View><Row style={{ justifyContent: 'center' }}><View style={{ width: 9, height: 9, backgroundColor: colors.green, borderRadius: 3 }} /><Copy small muted>Visitas</Copy><View style={{ width: 9, height: 9, backgroundColor: colors.lime, borderRadius: 3 }} /><Copy small muted>Búsquedas</Copy></Row></Panel>
      <View style={{ flexDirection: width >= 1050 ? 'row' : 'column', gap: 20 }}><Panel style={{ flex: 1 }}><Heading level={3}>Lo que se busca</Heading><Copy small muted>Ejemplo de consultas frecuentes de un piloto.</Copy>{analytics.topSearches.map((item, index) => <Row key={item.query} style={{ paddingVertical: 8 }}><Badge tone="neutral">{index + 1}</Badge><Copy style={{ flex: 1 }}>{item.query}</Copy><Copy style={{ fontFamily: fonts.bold }}>{item.count}</Copy></Row>)}<Heading level={3}>Oportunidades detectadas aquí</Heading><Copy small muted>Búsquedas sin resultados registradas en esta instalación.</Copy>{analytics.topUnresolvedQueries.length ? analytics.topUnresolvedQueries.map(item => <Row key={item.query}><Copy style={{ flex: 1 }}>{item.query}</Copy><Badge tone="amber">{item.count}</Badge></Row>) : <Copy small muted>Aún no hay búsquedas sin resultados.</Copy>}</Panel><Panel style={{ flex: 1 }}><Heading level={3}>Interés por lugares</Heading><Copy small muted>Visitas de ejemplo / visitas registradas aquí.</Copy>{analytics.topPlaces.map(item => <Row key={item.placeId} style={{ paddingVertical: 9, flexWrap: 'wrap' }}><Copy style={{ flex: 1 }}>{item.name}</Copy><Copy small muted>{item.views} ejemplo</Copy><Badge tone="neutral">{item.recordedViews} aquí</Badge></Row>)}<Row style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 17, flexWrap: 'wrap' }}><Icon name="star" color={colors.amber} /><Heading>{analytics.averageRating.value}</Heading><Copy small muted>promedio simple del catálogo · {analytics.averageRating.reviewCount} valoraciones de ejemplo</Copy></Row></Panel></View>
      <Panel><Heading level={3}>Productos que despiertan interés</Heading><Copy small muted>Índice ilustrativo del piloto y unidades de la lista actual.</Copy>{analytics.topProducts.map(item => <Row key={item.productId} style={{ paddingVertical: 10, flexWrap: 'wrap' }}><Copy style={{ flex: 1, minWidth: 140 }}>{item.name}</Copy><Copy small muted>{item.interest} interés de ejemplo</Copy><Badge tone="neutral">{item.shoppingQuantity} en mi lista</Badge></Row>)}</Panel><Note>Panel de prueba compartido. No existen cuentas de comercios, ventas reales ni cobros. La API deberá incorporar autenticación y permisos para una publicación.</Note>
    </>}</>}</View>;
}
