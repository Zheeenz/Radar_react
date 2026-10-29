import Constants from 'expo-constants';
import { Platform } from 'react-native';

function defaultBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (['8081', '8082', '19006'].includes(window.location.port)) return `${window.location.protocol}//${window.location.hostname}:4174`;
    return window.location.origin;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && !host.endsWith('.exp.direct') && !host.endsWith('.expo.dev')) return `http://${host}:4174`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:4174' : 'http://127.0.0.1:4174';
}
export const API_URL = defaultBaseUrl();
export async function request<T>(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST'): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || 'No pudimos completar la solicitud.');
    return result as T;
  } catch (error) {
    if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new Error(`No se pudo conectar con el servidor en ${API_URL}. Comprueba que esté iniciado y que el teléfono use la misma red.`);
    throw error;
  } finally { clearTimeout(timeout); }
}
