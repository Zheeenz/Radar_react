import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRadar } from '../context/RadarContext';
import { colors, fonts } from '../theme';
import { API_URL } from '../services/api';
import { Button, Copy, Heading, Icon, IconButton, Row, SurfaceModal, type IconName } from './ui';
import { AppModals } from './AppModals';

const navigation: { path: string; title: string; icon: IconName }[] = [
  { path: '/explore', title: 'Explorar', icon: 'compass' }, { path: '/verify', title: 'Verificador', icon: 'maximize' },
  { path: '/favorites', title: 'Mis favoritos', icon: 'heart' }, { path: '/shopping', title: 'Lista de compras', icon: 'shopping-bag' },
  { path: '/recipes', title: 'Recetario', icon: 'book-open' }, { path: '/commerce', title: 'Mi comercio', icon: 'bar-chart-2' },
];
export function Brand({ light = false }: { light?: boolean }) {
  return <Row style={{ gap: 11 }}><View style={[s.brandIcon, light && { backgroundColor: colors.lime }]}><Icon name="feather" color={light ? colors.forest : colors.lime} size={23} /></View><View><Text style={[s.brandName, light && { color: 'white' }]}>paradero</Text><Text style={[s.brandSub, light && { color: '#aec4ad' }]}>VEGANO</Text></View></Row>;
}
export function AppShell({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const desktop = width >= 1040;
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { data, loading, error, refresh, setModal, message } = useRadar();
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState('');
  const go = (path: string) => { setMenu(false); router.push(path as '/explore'); };
  function links(light: boolean) {
    return <View style={{ gap: 7 }}>{navigation.map(item => <Pressable key={item.path} accessibilityRole="button" accessibilityState={{ selected: pathname === item.path }} onPress={() => go(item.path)} style={[s.nav, pathname === item.path && (light ? s.navActive : { backgroundColor: colors.light })]}><Icon name={item.icon} size={19} color={light ? pathname === item.path ? colors.lime : '#adc5b8' : colors.ink} /><Text style={[s.navText, { color: light ? pathname === item.path ? 'white' : '#bed0c3' : colors.ink }]}>{item.title}</Text>{item.path === '/shopping' && !!data?.shopping.length && <Text style={s.count}>{data.shopping.length}</Text>}</Pressable>)}</View>;
  }
  return <View style={[s.root, { paddingTop: desktop ? 0 : insets.top }]}>
    {desktop && <View style={s.sidebar}><Brand light /><Text style={s.navLabel}>DESCUBRE TU LADO VERDE</Text>{links(true)}<View style={{ flex: 1 }} /><View style={s.community}><Icon name="users" color={colors.lime} /><Heading level={3} style={{ color: 'white' }}>Tu aporte importa.</Heading><Copy small style={{ color: '#b7cbbb' }}>Una etiqueta puede ayudar a toda la comunidad.</Copy><Button secondary icon="plus" onPress={() => setModal({ kind: 'evidence' })}>Compartir evidencia</Button></View><Pressable accessibilityRole="button" onPress={() => go('/plans')} style={s.planLink}><Icon name="zap" color={colors.lime} size={17} /><Copy small style={{ color: 'white' }}>Conoce Raíz Premium</Copy><Icon name="arrow-up-right" color={colors.lime} size={17} /></Pressable><Copy small style={{ color: '#8fab99', marginTop: 22 }}>Hecho para elegir mejor 🌱</Copy></View>}
    <View style={s.main}>
      <View style={[s.header, { paddingHorizontal: desktop ? 36 : 17 }]}>
        {desktop ? <Row style={s.search}><Icon name="search" color={colors.muted} size={18} /><TextInput accessibilityLabel="Búsqueda global" placeholder="Busca un lugar, producto o ingrediente…" placeholderTextColor={colors.muted} value={search} onChangeText={setSearch} onSubmitEditing={() => router.push({ pathname: '/explore', params: { query: search } })} returnKeyType="search" style={s.searchInput} /></Row> : <Row><IconButton icon="menu" label="Abrir menú" onPress={() => setMenu(true)} /><Brand /></Row>}
        <Row style={{ gap: desktop ? 18 : 7 }}>{desktop && <Row><Icon name="map-pin" color={colors.green} size={15} /><Copy small>Santiago, Chile</Copy></Row>}<View><IconButton icon="bell" label="Notificaciones" onPress={() => go('/notifications')} />{data?.notifications.some(item => !item.read) && <View style={s.unread} />}</View><Pressable accessibilityLabel="Mi perfil" accessibilityRole="button" onPress={() => go('/profile')} style={s.avatar}><Text style={{ fontFamily: fonts.bold, color: colors.forest }}>{data?.profile.name.charAt(0).toUpperCase() || 'P'}</Text></Pressable></Row>
      </View>
      {loading ? <View style={s.center}><ActivityIndicator color={colors.green} /><Copy muted>Cargando tu paradero…</Copy></View> : error || !data ? <View style={s.center}><Icon name="wifi-off" size={34} color={colors.muted} /><Heading>Conectemos con el servidor</Heading><Copy style={{ textAlign: 'center', maxWidth: 600 }}>{error}</Copy><Copy small muted>{API_URL}</Copy><Button icon="refresh-cw" onPress={refresh}>Volver a intentar</Button></View> : <ScrollView key={pathname} keyboardShouldPersistTaps="handled" contentContainerStyle={[s.content, { padding: desktop ? 36 : 18, paddingBottom: 40 }]}><View style={{ width: '100%', maxWidth: 1420, alignSelf: 'center' }}>{children}<View style={s.footer}><Copy small muted>Paradero Vegano · Santiago, Chile</Copy><Copy small muted>Catálogo de ejemplo · Comunidad consciente</Copy></View></View></ScrollView>}
      {!desktop && <View style={[s.bottom, { paddingBottom: Math.max(insets.bottom, 9) }]}>{navigation.filter(item => ['/explore', '/verify', '/favorites', '/shopping', '/recipes'].includes(item.path)).map(item => <Pressable key={item.path} accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ selected: item.path === pathname }} onPress={() => go(item.path)} style={s.bottomLink}><Icon name={item.icon} size={21} color={item.path === pathname ? colors.green : colors.muted} /><Text style={{ fontFamily: item.path === pathname ? fonts.bold : fonts.regular, fontSize: 10, color: item.path === pathname ? colors.green : colors.muted }}>{item.path === '/favorites' ? 'Favoritos' : item.path === '/shopping' ? 'Mi lista' : item.path === '/recipes' ? 'Recetas' : item.title}</Text></Pressable>)}</View>}
    </View>
    {menu && <SurfaceModal title="Tu paradero" onClose={() => setMenu(false)}>{links(false)}<Button secondary icon="user" onPress={() => go('/profile')}>Mi perfil y preferencias</Button><Button icon="zap" onPress={() => go('/plans')}>Conocer los planes</Button><Button secondary icon="plus" onPress={() => { setMenu(false); setModal({ kind: 'evidence' }); }}>Compartir evidencia</Button></SurfaceModal>}
    <AppModals />
    {!!message && <View pointerEvents="none" accessibilityRole="alert" accessibilityLiveRegion="polite" style={[s.toast, { bottom: desktop ? 26 : 85 + insets.bottom, maxWidth: width - 32 }]}><Icon name="info" color={colors.lime} size={18} /><Copy style={{ color: 'white', flexShrink: 1 }}>{message}</Copy></View>}
  </View>;
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, flexDirection: 'row' }, main: { flex: 1, minWidth: 0 }, sidebar: { width: 244, padding: 25, backgroundColor: colors.forest },
  brandIcon: { width: 41, height: 43, borderRadius: 13, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }, brandName: { fontFamily: fonts.display, fontSize: 23, lineHeight: 26, letterSpacing: -1, color: colors.forest }, brandSub: { fontFamily: fonts.bold, color: colors.green, fontSize: 10, letterSpacing: 3.2 },
  navLabel: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.6, color: '#8fab99', marginTop: 44, marginBottom: 17 }, nav: { paddingHorizontal: 12, paddingVertical: 13, borderRadius: 10, flexDirection: 'row', gap: 12, alignItems: 'center' }, navActive: { backgroundColor: '#28533c' }, navText: { fontFamily: fonts.medium, fontSize: 14, flex: 1 }, count: { fontFamily: fonts.bold, fontSize: 11, color: colors.forest, backgroundColor: colors.lime, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  community: { padding: 17, borderWidth: 1, borderColor: '#3a6046', borderRadius: 15, gap: 12, marginTop: 25, backgroundColor: '#1b4733' }, planLink: { flexDirection: 'row', gap: 7, alignItems: 'center', paddingTop: 22 },
  header: { minHeight: 84, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, search: { flex: 1, maxWidth: 460, gap: 12 }, searchInput: { flex: 1, minWidth: 0, fontFamily: fonts.regular, color: colors.ink, fontSize: 14, paddingVertical: 13 },
  avatar: { width: 37, height: 37, borderRadius: 20, backgroundColor: '#edf3e3', alignItems: 'center', justifyContent: 'center' }, unread: { width: 7, height: 7, backgroundColor: colors.green, borderRadius: 5, position: 'absolute', right: 9, top: 7 },
  content: { flexGrow: 1 }, center: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 16 }, footer: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 40, paddingTop: 22, flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  bottom: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 11, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: colors.line }, bottomLink: { flex: 1, alignItems: 'center', gap: 5, minHeight: 44 },
  toast: { position: 'absolute', right: 16, backgroundColor: colors.forest, borderRadius: 12, padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', boxShadow: '0 8px 28px #103c2f33' },
});
