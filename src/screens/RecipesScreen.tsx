import { useState } from 'react';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useRadar } from '../context/RadarContext';
import { normalize } from '../domain/catalog';
import { colors, food } from '../theme';
import { Badge, Button, Copy, Empty, Field, Heading, Icon, Intro, Note, Panel, Row } from '../components/ui';

export function RecipesScreen() {
  const { data, setModal } = useRadar();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const { width } = useWindowDimensions();
  if (!data) return null;
  const recipes = data.recipes.filter(recipe => normalize(`${recipe.name} ${recipe.description} ${recipe.tags.join(' ')} ${recipe.ingredients.join(' ')}`).includes(normalize(query)));
  return <View style={{ gap: 23 }}><Intro kicker="DE TU LISTA A LA MESA" title="Ideas que dan ganas de cocinar." description="Recetas vegetales para todos los días, con ingredientes que puedes llevar directo a tu lista de compras." /><Field value={query} onChange={setQuery} placeholder="Busca una receta o ingrediente" />{recipes.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 19 }}>{recipes.map(recipe => { const locked = recipe.premium && data.profile.plan === 'free'; return <Panel key={recipe.id} style={{ flexBasis: width >= 740 ? 270 : '100%', flexGrow: 1, padding: 0, overflow: 'hidden' }}><Pressable accessibilityRole="button" accessibilityLabel={`Ver receta ${recipe.name}`} onPress={() => setModal({ kind: 'recipe', id: recipe.id })}><Image source={food} style={{ height: 190, width: '100%', transform: [{ scaleX: recipe.id.endsWith('2') ? -1 : 1 }] }} /><View style={{ position: 'absolute', left: 15, top: 15 }}><Badge tone={recipe.premium ? 'amber' : 'green'}>{recipe.premium ? 'Raíz Premium' : 'Para todos'}</Badge></View></Pressable><View style={{ padding: 22, paddingTop: 4, gap: 13 }}><Heading level={3}>{recipe.name}</Heading><Copy small muted>{recipe.description}</Copy><Row style={{ flexWrap: 'wrap' }}><Icon name="clock" size={14} /><Copy small>{recipe.minutes} min</Copy><Icon name="users" size={14} /><Copy small>{recipe.servings} porciones</Copy><Copy small muted>· {recipe.difficulty}</Copy></Row><Button secondary icon={locked ? 'lock' : 'book-open'} onPress={() => setModal({ kind: 'recipe', id: recipe.id })}>{locked ? 'Conocer esta receta' : 'Vamos a cocinar'}</Button></View></Panel>; })}</View> : <Empty title="Todavía no hay una receta con esa búsqueda" text="Prueba con otro ingrediente." />}{data.profile.plan === 'free' && <Panel style={{ backgroundColor: colors.light }}><Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}><View style={{ flex: 1, minWidth: 200, gap: 6 }}><Heading level={3}>Un poco más de inspiración con Raíz Premium</Heading><Copy small muted>Abre el recetario completo y prueba sus funciones.</Copy></View><Button icon="zap" onPress={() => router.push('/plans')}>Ver planes</Button></Row><Note>Activación de prueba, sin pagos ni suscripciones reales.</Note></Panel>}</View>;
}
