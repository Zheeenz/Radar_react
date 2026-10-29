import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';

export async function createStore({ dataDir, seedPath }) {
  const file = path.join(dataDir, 'store.json');
  const seed = JSON.parse(await readFile(seedPath, 'utf8'));
  let state;
  let queue = Promise.resolve();
  try {
    state = JSON.parse(await readFile(file, 'utf8'));
    if (state.schemaVersion !== seed.schemaVersion) throw new Error('Esquema de almacenamiento incompatible');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    state = structuredClone(seed);
    await persist(state);
  }

  async function persist(value) {
    await mkdir(dataDir, { recursive: true });
    const temporary = `${file}.tmp`;
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await rename(temporary, file);
  }

  return {
    snapshot() { return structuredClone(state); },
    async mutate(callback) {
      const operation = queue.then(async () => {
        const draft = structuredClone(state);
        const result = callback(draft);
        await persist(draft);
        state = draft;
        return structuredClone(result);
      });
      queue = operation.catch(() => {});
      return operation;
    },
    async reset() {
      return this.mutate((draft) => {
        for (const key of Object.keys(draft)) delete draft[key];
        Object.assign(draft, structuredClone(seed));
        return draft;
      });
    },
  };
}
