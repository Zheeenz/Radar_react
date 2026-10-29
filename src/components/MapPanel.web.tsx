import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates, Place } from '../types';
import { colors } from '../theme';
import { Copy } from './ui';

export function MapPanel({ places, location, onSelect }: { places: Place[]; location: Coordinates | null; onSelect: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { scrollWheelZoom: false }).setView([-33.437, -70.638], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxZoom: 19 }).addTo(instance);
    map.current = instance;
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    for (const place of places) {
      const label = document.createElement('span'); label.textContent = place.name;
      L.circleMarker([place.lat, place.lng], { radius: 12, weight: 3, color: 'white', fillColor: colors.green, fillOpacity: 1 }).bindTooltip(label, { direction: 'top' }).on('click', () => select.current(place.id)).addTo(layer);
    }
    if (location) L.circleMarker([location.lat, location.lng], { radius: 8, color: 'white', fillColor: '#4986ad', fillOpacity: 1, weight: 3 }).bindTooltip('Tu ubicación').addTo(layer);
    if (places.length) map.current.fitBounds(L.latLngBounds(places.map(place => [place.lat, place.lng])), { padding: [45, 45], maxZoom: 15 });
    return () => { layer.remove(); };
  }, [places, location]);
  return <View style={{ borderRadius: 17, overflow: 'hidden', borderWidth: 1, borderColor: colors.line }}><div ref={container} aria-label="Mapa de lugares de Santiago" style={{ height: 440, width: '100%', zIndex: 0 }} /><View style={{ padding: 12, backgroundColor: 'white' }}><Copy small muted>Selecciona un marcador para conocer el lugar. Ubicaciones aproximadas.</Copy></View></View>;
}
