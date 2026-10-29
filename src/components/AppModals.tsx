import { useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useRadar } from '../context/RadarContext';
import { availabilityLabels, date, money, statusLabels } from '../domain/catalog';
import { colors, fonts, food } from '../theme';
import { choosePhoto } from '../services/photo';
import type { Availability, ModalState, Product } from '../types';
import { ProductCard } from './Cards';
import { CameraScanner } from './CameraScanner';
import { AnalysisResult, Badge, Button, Chip, Copy, Empty, Field, Heading, Icon, Note, Panel, Row, SurfaceModal } from './ui';

export function AppModals() {
  const { modal, setModal, data, run, reset } = useRadar();
  if (!modal || !data) return null;
  const close = () => setModal(null);
  if (modal.kind === 'camera') return <SurfaceModal title="Escanear código de barras" onClose={close}><CameraScanner onScan={code => { close(); modal.onScan(code); }} onClose={close} /></SurfaceModal>;
  if (modal.kind === 'confirm') return <SurfaceModal title={modal.title} onClose={close}><Copy>{modal.text}</Copy><Row style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}><Button secondary onPress={close}>Cancelar</Button><Button danger onPress={() => run(modal.onConfirm)}>Restaurar datos</Button></Row></SurfaceModal>;
  if (modal.kind === 'evidence') return <SurfaceModal title="Compartir evidencia" onClose={close} wide><EvidenceForm key={`${modal.placeId || ''}:${modal.productId || ''}`} input={modal} /></SurfaceModal>;
  if (modal.kind === 'place') return <PlaceDetails id={modal.id} />;
  if (modal.kind === 'product') { const product = data.products.find(item => item.id === modal.id); return <SurfaceModal title={product?.name || 'Producto'} onClose={close}>{product ? <ProductDetails product={product} /> : <Empty title="Producto no encontrado" text="Vuelve a explorar el catálogo." />}</SurfaceModal>; }
  if (modal.kind === 'recipe') return <RecipeDetails id={modal.id} />;
  return null;
}
function PlaceDetails({ id }: { id: string }) {
  const { data, setModal, toggleFavorite, run } = useRadar();
  if (!data) return null;
  const place = data.places.find(item => item.id === id);
  if (!place) return null;
  const evidence = data.evidence.filter(item => item.placeId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const favorite = data.favorites.includes(id);
  return <SurfaceModal title={place.name} onClose={() => setModal(null)} wide><Image source={food} style={{ width: '100%', height: 220, borderRadius: 13 }} /><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Badge>{place.veganMode === 'vegan' ? '100% vegetal' : 'Opciones vegetales'}</Badge><Row><Icon name="star" color="#bf8d34" size={16} /><Copy>{place.rating} · {place.reviewCount} valoraciones de ejemplo</Copy></Row></Row><Copy>{place.description}</Copy><Row><Icon name="map-pin" size={17} /><Copy style={{ flex: 1 }}>{place.address}</Copy></Row><Copy muted>{place.hours} · Rango de precio {place.priceRange}</Copy><Copy small muted>{place.reviewSummary}</Copy><Row style={{ flexWrap: 'wrap' }}><Button secondary icon="heart" onPress={() => run(() => toggleFavorite(id))}>{favorite ? 'Quitar de favoritos' : 'Guardar en favoritos'}</Button><Button icon="plus" onPress={() => setModal({ kind: 'evidence', placeId: id })}>Aportar evidencia</Button></Row><Heading level={3}>Productos de este lugar</Heading>{data.products.filter(product => place.productIds.includes(product.id)).map(product => <ProductCard key={product.id} product={product} />)}<Heading level={3}>Lo que comparte la comunidad</Heading>{evidence.length ? evidence.map(item => <Panel key={item.id} style={{ padding: 18 }}><Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}><Heading level={3}>{item.title}</Heading><Badge tone={item.source === 'user' ? 'amber' : 'neutral'}>{item.source === 'user' ? 'Pendiente de corroborar' : 'Información de ejemplo'}</Badge></Row><Copy small muted>{date(item.createdAt)} · {availabilityLabels[item.availability]}</Copy><Copy small>{item.ingredients}</Copy>{item.photo && <Image accessibilityLabel="Foto de etiqueta aportada" source={{ uri: item.photo }} style={{ width: '100%', height: 180, borderRadius: 10 }} resizeMode="contain" />}<AnalysisResult analysis={item.analysis} /></Panel>) : <Note>Todavía no hay aportes para este lugar.</Note>}<Note>Confirma horarios, precios e ingredientes directamente con el comercio. Las ubicaciones y fichas actuales son de ejemplo.</Note></SurfaceModal>;
}
function ProductDetails({ product }: { product: Product }) {
  const { data, setModal, run, addProduct } = useRadar();
  if (!data) return null;
  return <><Copy muted>{product.brand} · {product.category}</Copy><Badge tone={product.status === 'vegan' ? 'green' : product.status === 'review' ? 'amber' : 'red'}>{statusLabels[product.status]}</Badge><Copy>{product.ingredients}</Copy><Copy small muted>Código: {product.barcode}</Copy><Heading level={3}>Compara dónde comprarlo</Heading>{[...product.prices].sort((a, b) => a.price - b.price).map(offer => <Row key={offer.placeId} style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line, flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 140 }}><Copy style={{ fontFamily: fonts.bold }}>{data.places.find(place => place.id === offer.placeId)?.name}</Copy><Copy small muted>{availabilityLabels[offer.availability]}</Copy></View><Copy style={{ fontFamily: fonts.bold }}>{money(offer.price)}</Copy></Row>)}<Button icon="plus" onPress={() => run(() => addProduct(product.id))}>Añadir a mi lista</Button><Button secondary icon="edit-3" onPress={() => setModal({ kind: 'evidence', productId: product.id, ingredients: product.ingredients })}>Actualizar evidencia</Button><Note>Los precios y la disponibilidad son referencias del catálogo. La clasificación por ingredientes requiere revisar la etiqueta completa.</Note></>;
}
function RecipeDetails({ id }: { id: string }) {
  const { data, setModal, run, addProduct, notify } = useRadar();
  const router = useRouter();
  if (!data) return null;
  const recipe = data.recipes.find(item => item.id === id);
  if (!recipe) return null;
  const locked = recipe.premium && data.profile.plan === 'free';
  return <SurfaceModal title={recipe.name} onClose={() => setModal(null)}><Image source={food} style={{ width: '100%', height: 190, borderRadius: 13 }} /><Copy>{recipe.description}</Copy><Copy small muted>{recipe.minutes} min · {recipe.servings} porciones · {recipe.difficulty}</Copy>{locked ? <><Note>Esta receta está incluida en Raíz Premium y Comercio. Puedes probar los planes sin realizar pagos.</Note><Button icon="zap" onPress={() => { setModal(null); router.push('/plans'); }}>Conocer los planes</Button></> : <><Heading level={3}>Ingredientes</Heading>{recipe.ingredients.map(item => <Copy key={item}>• {item}</Copy>)}<Heading level={3}>Preparación</Heading>{recipe.steps.map((step, index) => <Row key={index} style={{ alignItems: 'flex-start' }}><Badge tone="neutral">{index + 1}</Badge><Copy style={{ flex: 1 }}>{step}</Copy></Row>)}<Button icon="shopping-bag" onPress={() => run(async () => { for (const productId of recipe.productIds) await addProduct(productId, true); notify('Productos del catálogo añadidos a tu lista. Revisa los demás ingredientes de la receta.'); })}>Añadir productos a mi lista</Button><Copy small muted>Se añaden los productos disponibles en el catálogo, una unidad por producto.</Copy></>}</SurfaceModal>;
}
function EvidenceForm({ input }: { input: Extract<NonNullable<ModalState>, { kind: 'evidence' }> }) {
  const { data, saveEvidence, run, notify } = useRadar();
  const initialPlace = input.placeId || data?.products.find(product => product.id === input.productId)?.prices[0]?.placeId || data?.places[0]?.id || '';
  const [placeId, setPlaceId] = useState(initialPlace);
  const [productId, setProductId] = useState(input.productId || '');
  const [title, setTitle] = useState('');
  const [ingredients, setIngredients] = useState(input.ingredients || data?.products.find(product => product.id === input.productId)?.ingredients || '');
  const [availability, setAvailability] = useState<Availability>('available');
  const [photo, setPhoto] = useState(input.photo || '');
  if (!data) return null;
  const products = data.products.filter(product => data.places.find(place => place.id === placeId)?.productIds.includes(product.id));
  function selectPlace(id: string) { setPlaceId(id); if (!data?.places.find(place => place.id === id)?.productIds.includes(productId)) { setProductId(''); setIngredients(''); } }
  function selectProduct(id: string) { setProductId(id); setIngredients(data?.products.find(product => product.id === id)?.ingredients || ''); }
  async function submit() {
    if (title.trim().length < 3 || ingredients.trim().length < 3) { notify('Escribe un título y los ingredientes o detalles de la etiqueta (mínimo 3 caracteres).'); return; }
    await saveEvidence({ placeId, ...(productId ? { productId } : {}), title, ingredients, availability, ...(photo ? { photo } : {}) });
  }
  return <><Copy muted>Comparte información útil y la etiqueta completa. El aporte queda pendiente de corroboración.</Copy><Heading level={3}>¿Dónde lo encontraste?</Heading><Row style={{ flexWrap: 'wrap', gap: 7 }}>{data.places.map(place => <Chip key={place.id} selected={placeId === place.id} onPress={() => selectPlace(place.id)}>{place.name}</Chip>)}</Row><Heading level={3}>Producto relacionado</Heading><Row style={{ flexWrap: 'wrap', gap: 7 }}><Chip selected={!productId} onPress={() => selectProduct('')}>Aporte general</Chip>{products.map(product => <Chip key={product.id} selected={productId === product.id} onPress={() => selectProduct(product.id)}>{product.name}</Chip>)}</Row><Field label="Título del aporte" value={title} onChange={setTitle} maxLength={120} placeholder="Ej. Etiqueta actualizada de la bebida de avena" /><Field label="Ingredientes o detalles de la etiqueta" value={ingredients} onChange={setIngredients} multiline maxLength={5000} placeholder="Transcribe la etiqueta y cualquier advertencia…" /><Heading level={3}>Disponibilidad observada</Heading><Row style={{ flexWrap: 'wrap' }}>{Object.entries(availabilityLabels).map(([key, label]) => <Chip key={key} selected={availability === key} onPress={() => setAvailability(key as Availability)}>{label}</Chip>)}</Row>{photo && <Image accessibilityLabel="Vista previa de la etiqueta" source={{ uri: photo }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="contain" />}<Row style={{ flexWrap: 'wrap' }}><Button secondary icon="image" onPress={() => run(async () => { const result = await choosePhoto(); if (result) setPhoto(result); })}>{photo ? 'Cambiar foto' : 'Adjuntar etiqueta'}</Button>{!!photo && <Button secondary compact onPress={() => setPhoto('')}>Quitar foto</Button>}</Row><Note>La foto se adjunta como evidencia. Los ingredientes deben transcribirse: no se extrae texto de la imagen.</Note><Button icon="send" onPress={() => run(submit)}>Guardar aporte</Button></>;
}
