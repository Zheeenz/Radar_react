import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import type { Coordinates, Place } from '../types';
import { colors } from '../theme';
import { Copy } from './ui';

export function MapPanel({ places, location, onSelect }: { places: Place[]; location: Coordinates | null; onSelect: (id: string) => void }) {
  const map = useRef<MapView>(null);
  useEffect(() => {
    if (places.length) map.current?.fitToCoordinates(places.map(place => ({ latitude: place.lat, longitude: place.lng })), { edgePadding: { top: 50, right: 45, bottom: 50, left: 45 }, animated: true });
  }, [places]);
  return <View style={{ borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}><MapView ref={map} style={{ height: 440, width: '100%' }} initialRegion={{ latitude: -33.437, longitude: -70.638, latitudeDelta: 0.08, longitudeDelta: 0.08 }} onMapReady={() => { if (places.length) map.current?.fitToCoordinates(places.map(place => ({ latitude: place.lat, longitude: place.lng })), { edgePadding: { top: 50, right: 45, bottom: 50, left: 45 }, animated: false }); }}>{places.map(place => <Marker key={place.id} coordinate={{ latitude: place.lat, longitude: place.lng }} title={place.name} description={place.address} pinColor={colors.green} onCalloutPress={() => onSelect(place.id)} />)}{location && <Marker coordinate={{ latitude: location.lat, longitude: location.lng }} title="Tu ubicación" pinColor="#4986ad" />}</MapView><View style={s.footer}><Copy small muted>Toca un marcador y su ficha para ver el lugar. Ubicaciones aproximadas.</Copy></View></View>;
}
const s = StyleSheet.create({ footer: { padding: 12, backgroundColor: 'white' } });
