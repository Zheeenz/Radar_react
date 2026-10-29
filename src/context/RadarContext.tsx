import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { request } from '../services/api';
import type { Bootstrap, Evidence, EvidenceInput, ModalState, Notice, PlanId, Place, Product, Profile, ShoppingItem } from '../types';

type RadarValue = {
  data: Bootstrap | null; loading: boolean; error: string | null; message: string;
  modal: ModalState; setModal: (modal: ModalState) => void; refresh: () => Promise<void>;
  notify: (message: string) => void; run: (task: () => Promise<unknown>) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>; addProduct: (id: string, silent?: boolean) => Promise<void>;
  updateShopping: (id: string, patch: { quantity?: number; checked?: boolean }) => Promise<void>;
  removeShopping: (id: string) => Promise<void>; saveEvidence: (input: EvidenceInput) => Promise<void>;
  saveProfile: (profile: Pick<Profile, 'name' | 'preferences'>) => Promise<void>;
  changePlan: (plan: PlanId) => Promise<void>; markRead: () => Promise<void>; reset: () => Promise<void>;
  openPlace: (id: string) => void;
};
const RadarContext = createContext<RadarValue | null>(null);

export function RadarProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<ModalState>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = useRef(Promise.resolve());
  const notify = useCallback((text: string) => {
    clearTimeout(timer.current); setMessage(text);
    timer.current = setTimeout(() => setMessage(''), 4500);
  }, []);
  const run = useCallback(async (task: () => Promise<unknown>) => {
    try { await task(); } catch (cause) { notify(cause instanceof Error ? cause.message : 'No pudimos completar la operación.'); }
  }, [notify]);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await request<Bootstrap>('/bootstrap')); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar los datos.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); return () => clearTimeout(timer.current); }, [refresh]);
  function merge(patch: Partial<Bootstrap>) { setData(current => current ? { ...current, ...patch } : current); }
  function serialize(task: () => Promise<void>) {
    const operation = queue.current.then(task);
    queue.current = operation.catch(() => {});
    return operation;
  }
  async function toggleFavorite(placeId: string) {
    await serialize(async () => { merge(await request<{ favorites: string[] }>('/favorites', { placeId })); });
    notify('Favoritos actualizados');
  }
  async function addProduct(productId: string, silent = false) {
    await serialize(async () => { merge(await request<{ shopping: ShoppingItem[] }>('/shopping', { productId })); });
    if (!silent) notify('Producto añadido a tu lista');
  }
  async function updateShopping(id: string, patch: { quantity?: number; checked?: boolean }) {
    await serialize(async () => { merge(await request<{ shopping: ShoppingItem[] }>(`/shopping/${id}`, patch, 'PATCH')); });
  }
  async function removeShopping(id: string) {
    await serialize(async () => { merge(await request<{ shopping: ShoppingItem[] }>(`/shopping/${id}`, undefined, 'DELETE')); });
    notify('Producto eliminado de la lista');
  }
  async function saveEvidence(input: EvidenceInput) {
    await serialize(async () => {
      const result = await request<{ evidence: Evidence; places: Place[]; products: Product[]; notifications: Notice[] }>('/evidence', input);
      setData(current => current ? { ...current, places: result.places, products: result.products, notifications: result.notifications, evidence: [result.evidence, ...current.evidence] } : current);
    });
    setModal(null); notify('Evidencia guardada. Tu aporte está pendiente de corroborar.');
  }
  async function saveProfile(profile: Pick<Profile, 'name' | 'preferences'>) {
    merge(await request<{ profile: Profile }>('/profile', profile)); notify('Preferencias guardadas');
  }
  async function changePlan(plan: PlanId) {
    const result = await request<{ profile: Profile }>('/plan', { plan }); merge({ profile: result.profile });
    notify('Plan de prueba activado. No se realizó ningún cobro.');
  }
  async function markRead() { merge(await request<{ notifications: Notice[] }>('/notifications/read', {})); }
  async function reset() {
    await serialize(async () => { setData(await request<Bootstrap>('/reset', {})); });
    setModal(null); notify('Los datos originales se restauraron');
  }
  function openPlace(id: string) { setModal({ kind: 'place', id }); void run(() => request('/events', { type: 'view', placeId: id })); }
  return <RadarContext.Provider value={{ data, loading, error, message, modal, setModal, refresh, notify, run, toggleFavorite, addProduct, updateShopping, removeShopping, saveEvidence, saveProfile, changePlan, markRead, reset, openPlace }}>{children}</RadarContext.Provider>;
}
export function useRadar() {
  const context = useContext(RadarContext);
  if (!context) throw new Error('RadarProvider no está disponible');
  return context;
}
