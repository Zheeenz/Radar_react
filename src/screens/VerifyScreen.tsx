import { useState } from 'react';
import { Image, View, useWindowDimensions } from 'react-native';
import { useRadar } from '../context/RadarContext';
import { request } from '../services/api';
import { choosePhoto } from '../services/photo';
import type { Analysis, Product } from '../types';
import { colors } from '../theme';
import { AnalysisResult, Button, Chip, Copy, Field, Heading, Icon, Intro, Note, Panel, Row } from '../components/ui';
import { ProductCard } from '../components/Cards';

export function VerifyScreen() {
  const { run, notify, setModal, data } = useRadar();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'ingredients' | 'barcode'>('ingredients');
  const [ingredients, setIngredients] = useState('');
  const [photo, setPhoto] = useState('');
  const [code, setCode] = useState('');
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [scanMessage, setScanMessage] = useState('');
  async function analyze() {
    if (ingredients.trim().length < 3) { notify('Escribe al menos 3 caracteres de la etiqueta para revisarla.'); return; }
    const result = await request<{ analysis: Analysis }>('/analyze', { ingredients });
    setAnalysis(result.analysis);
  }
  async function scan(barcode = code) {
    setCode(barcode); setProduct(null); setScanMessage('');
    if (!/^\d{8,14}$/.test(barcode.trim())) { notify('Escribe un código de barras de 8 a 14 dígitos.'); return; }
    try {
      const result = await request<{ product: Product; analysis: Analysis }>('/scan', { barcode: barcode.trim() });
      setProduct(result.product); setScanMessage('Producto encontrado en el catálogo.');
    } catch (cause) { setScanMessage(cause instanceof Error ? cause.message : 'No pudimos consultar este código.'); }
  }
  return <View style={{ gap: 22 }}><Intro kicker="LEE. REVISA. ELIGE." title="¿Qué hay en tu etiqueta?" description="Revisa ingredientes, consulta un código de barras y comparte lo que encuentres con la comunidad." /><Row><Chip selected={tab === 'ingredients'} icon="file-text" onPress={() => setTab('ingredients')}>Ingredientes</Chip><Chip selected={tab === 'barcode'} icon="maximize" onPress={() => setTab('barcode')}>Código de barras</Chip></Row><View style={{ flexDirection: width >= 900 ? 'row' : 'column', gap: 22 }}><Panel style={{ flex: 1.25 }}>
    {tab === 'ingredients' ? <><Row><Icon name="feather" color={colors.green} /><Heading>Revisa antes de elegir</Heading></Row><Copy muted>Copia los ingredientes tal como aparecen en el envase, incluyendo las advertencias.</Copy><Field label="Ingredientes de la etiqueta" value={ingredients} onChange={value => { setIngredients(value); setAnalysis(null); }} multiline maxLength={5000} placeholder="Ej. Agua, avena, aceite de girasol, sal…" />{photo && <Image accessibilityLabel="Foto de etiqueta seleccionada" source={{ uri: photo }} style={{ height: 180, width: '100%', borderRadius: 12 }} resizeMode="contain" />}<Row style={{ flexWrap: 'wrap' }}><Button icon="check-circle" onPress={() => run(analyze)}>Revisar ingredientes</Button><Button secondary icon="image" onPress={() => run(async () => { const result = await choosePhoto(); if (result) setPhoto(result); })}>{photo ? 'Cambiar etiqueta' : 'Adjuntar etiqueta'}</Button></Row><Copy small muted>La foto sirve como evidencia; escribe los ingredientes para analizarlos. No hay lectura automática de imágenes.</Copy>{analysis && <><AnalysisResult analysis={analysis} /><Button secondary icon="plus" onPress={() => setModal({ kind: 'evidence', ingredients, photo: photo || undefined })}>Compartir este resultado</Button></>}</> : <><Heading>Encuentra el producto</Heading><Copy muted>Escribe el código o usa la cámara. La búsqueda consulta el catálogo de Paradero Vegano.</Copy><Field label="Código de barras" value={code} onChange={value => { setCode(value); setProduct(null); setScanMessage(''); }} placeholder="7800000000011" keyboardType="numeric" maxLength={14} /><Row style={{ flexWrap: 'wrap' }}><Button icon="search" onPress={() => run(() => scan())}>Buscar producto</Button><Button secondary icon="camera" onPress={() => setModal({ kind: 'camera', onScan: barcode => { void run(() => scan(barcode)); } })}>Abrir cámara</Button></Row>{!!scanMessage && <Note warning={!product}>{scanMessage}</Note>}{product && <ProductCard product={product} />}<Copy small muted>Prueba con un código del catálogo:</Copy><Row style={{ flexWrap: 'wrap' }}>{data?.products.slice(0, 3).map(item => <Chip key={item.id} onPress={() => { void run(() => scan(item.barcode)); }}>{item.barcode}</Chip>)}</Row></>}
    </Panel><Panel style={{ flex: 0.75, backgroundColor: '#f0f5e9' }}><Icon name="shield" size={32} color={colors.green} /><Heading level={3}>Información con contexto</Heading><Copy>El verificador identifica ingredientes animales y términos de origen incierto mediante reglas de texto.</Copy><Copy small muted>Compatible: no se encontraron términos de origen animal en el texto.</Copy><Copy small muted>Por revisar: hay trazas o ingredientes cuyo origen conviene confirmar.</Copy><Copy small muted>Origen animal: se encontró al menos un ingrediente de origen animal.</Copy><Note warning>Un resultado orienta tu revisión. No certifica el producto ni garantiza ausencia de alérgenos.</Note></Panel></View></View>;
}
