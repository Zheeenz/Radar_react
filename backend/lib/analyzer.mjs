const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const animalRules = [
  { expression: /\bsuero\s+de\s+leche\b/g, name: 'suero de leche' },
  { expression: /\bcasein(?:a|ato(?:s)?)\b/g, name: 'caseína' },
  { expression: /\blactosa\b/g, name: 'lactosa' },
  { expression: /\bleche\b/g, name: 'leche', plant: /^(?:\s+(?:en\s+polvo\s+)?(?:de\s+)?(?:coco|almendras?|avena|soja|soya|arroz|vegetal|anacardos?))/ },
  { expression: /\bhuevos?\b/g, name: 'huevo' },
  { expression: /\bmiel\b/g, name: 'miel', plant: /^\s+de\s+(?:agave|can(?:a|ya))/ },
  { expression: /\bqueso\b/g, name: 'queso', plant: /^\s+(?:vegano|vegetal|de\s+(?:anacardos?|caju|almendras?))/ },
  { expression: /\bmantequilla\b/g, name: 'mantequilla', plant: /^\s+(?:vegetal|vegana|de\s+(?:mani|almendras?|cacahuete))/ },
  { expression: /\bmanteca\b/g, name: 'manteca animal', plant: /^\s+(?:vegetal|de\s+cacao)/ },
  { expression: /\b(?:carne|cerdo|vacuno|res|pollo|pavo|pescado|atun|salmon|anchoas?|mariscos?|camarones?|tocino|jamon)\b/g, name: 'carne o pescado' },
  { expression: /\bgelatina\b/g, name: 'gelatina', plant: /^\s+(?:vegetal|de\s+agar)/ },
  { expression: /\b(?:carmin|cochinilla|e\s*120)\b/g, name: 'carmín / cochinilla' },
  { expression: /\b(?:colageno|grasa\s+animal|sebo|albumina|lanolina|cera\s+de\s+abejas)\b/g, name: 'derivado animal' },
];

const uncertainRules = [
  { expression: /\b(?:e\s*471|mono\s*y\s*digliceridos|monogliceridos|digliceridos)\b/g, name: 'emulsionantes de origen no especificado' },
  { expression: /\bglicerina\b/g, name: 'glicerina de origen no especificado' },
  { expression: /\b(?:vitamina\s+d3|colecalciferol)\b/g, name: 'vitamina D3 de origen no especificado' },
  { expression: /\b(?:aromas?\s+naturales?|saborizantes?\s+naturales?)\b/g, name: 'aromas de origen no especificado' },
];

function clauseAround(text, index) {
  const before = text.slice(0, index).split(/[,;.\n()]/).at(-1) ?? '';
  const after = text.slice(index).split(/[,;.\n()]/)[0] ?? '';
  return { before, after, text: `${before}${after}` };
}

function isNegated(before) {
  const match = before.match(/(?:\bsin\b|\blibre\s+de\b|\bno\s+(?:contiene|incluye|lleva)\b)\s+([^,;.\n]*)$/);
  if (!match) return false;
  const remainder = match[1].replace(/\b(?:leche|huevos?|miel|queso|mantequilla|lactosa|gelatina|carne|pescado|caseina|ni|y|o|de|derivados|sus)\b/g, '').replace(/\s/g, '');
  return remainder.length === 0;
}

export function analyzeIngredients(ingredients) {
  const text = normalize(ingredients.trim());
  const found = new Map();
  const uncertain = new Map();
  const ignored = new Set();

  for (const rule of animalRules) {
    for (const match of text.matchAll(rule.expression)) {
      const location = clauseAround(text, match.index);
      const following = text.slice(match.index + match[0].length);
      if ((rule.plant && rule.plant.test(following)) || isNegated(location.before)) {
        ignored.add(match[0]);
        continue;
      }
      const trace = /\b(?:puede\s+contener|trazas?|procesad[oa]\s+en|instalaciones|equipo\s+compartido|posible\s+presencia)\b/.test(location.before);
      (trace ? uncertain : found).set(rule.name, trace ? `La etiqueta menciona posible presencia o trazas de ${match[0]}.` : `Se encontró «${match[0]}», ingrediente de origen animal.`);
    }
  }

  for (const rule of uncertainRules) {
    for (const match of text.matchAll(rule.expression)) {
      const following = text.slice(match.index + match[0].length);
      const location = clauseAround(text, match.index);
      if (/^\s+(?:vegetal|vegan[oa]|de\s+origen\s+vegetal)/.test(following) || isNegated(location.before)) continue;
      uncertain.set(rule.name, `Conviene confirmar con el fabricante: ${rule.name}.`);
    }
  }

  const status = found.size ? 'non-vegan' : uncertain.size ? 'review' : 'vegan';
  const labels = { 'non-vegan': 'Contiene ingredientes animales', review: 'Requiere revisión', vegan: 'Compatible según ingredientes' };
  const reasons = [...found.values(), ...uncertain.values()];
  if (!reasons.length) reasons.push('No se encontraron ingredientes animales ni términos ambiguos en el texto proporcionado.');
  if (ignored.size) reasons.push(`Se respetaron menciones vegetales o negadas: ${[...ignored].join(', ')}.`);
  return {
    status,
    label: labels[status],
    reasons,
    matched: [...found.keys(), ...uncertain.keys()],
    method: 'rules',
    disclaimer: 'Orientación por reglas de texto. No certifica el producto ni reemplaza la etiqueta completa o la confirmación del fabricante.',
  };
}
