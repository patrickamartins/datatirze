export interface ShuffleableOption {
  id: string;
  pinnedEnd?: boolean;
}

export type OptionOrderMap = Record<string, string[]>;

/** Gera uma semente de embaralhamento estável para a sessão. */
export function generateShuffleSeed(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function hashSeed(input: string): number {
  // xmur3 simplificado: transforma texto em um inteiro de 32 bits
  let hash = 1779033703 ^ input.length;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
  hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
  return (hash ^ (hash >>> 16)) >>> 0;
}

/** PRNG determinístico (mulberry32). */
export function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates sem mutar o array original. */
export function fisherYatesShuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/**
 * Embaralha os ids e mantém as opções `pinnedEnd` no fim,
 * na ordem original do catálogo.
 */
export function buildShuffledOrder(options: readonly ShuffleableOption[], seed: string): string[] {
  const random = createSeededRandom(seed);
  const shufflable = options.filter((option) => !option.pinnedEnd).map((option) => option.id);
  const pinned = options.filter((option) => option.pinnedEnd).map((option) => option.id);
  return [...fisherYatesShuffle(shufflable, random), ...pinned];
}

/**
 * Aplica uma ordem persistida ao catálogo atual.
 * Ids desconhecidos são ignorados e opções novas entram no fim (respeitando pinnedEnd).
 */
export function applyPersistedOrder<T extends ShuffleableOption>(
  options: readonly T[],
  order: readonly string[] | undefined
): T[] {
  if (!order?.length) return [...options];

  const byId = new Map(options.map((option) => [option.id, option]));
  const ordered: T[] = [];
  for (const id of order) {
    const option = byId.get(id);
    if (option) {
      ordered.push(option);
      byId.delete(id);
    }
  }

  const leftovers = [...byId.values()];
  const leftoverFree = leftovers.filter((option) => !option.pinnedEnd);
  const leftoverPinned = leftovers.filter((option) => option.pinnedEnd);
  const firstPinnedIndex = ordered.findIndex((option) => option.pinnedEnd);

  if (firstPinnedIndex === -1) return [...ordered, ...leftoverFree, ...leftoverPinned];
  return [
    ...ordered.slice(0, firstPinnedIndex),
    ...leftoverFree,
    ...ordered.slice(firstPinnedIndex),
    ...leftoverPinned,
  ];
}

/**
 * Garante que toda pergunta embaralhável tenha ordem persistida.
 * Retorna `null` quando nada precisa ser gravado em `respostas`.
 */
export function ensureOptionOrders(
  current: { shuffleSeed?: string; optionOrder?: OptionOrderMap },
  catalogs: Record<string, readonly ShuffleableOption[]>
): { shuffleSeed: string; optionOrder: OptionOrderMap } | null {
  const seed = current.shuffleSeed || generateShuffleSeed();
  const existing = current.optionOrder ?? {};
  const next: OptionOrderMap = { ...existing };
  let hasChanges = !current.shuffleSeed;

  for (const [questionKey, options] of Object.entries(catalogs)) {
    if (!options.length || existing[questionKey]?.length) continue;
    next[questionKey] = buildShuffledOrder(options, `${seed}:${questionKey}`);
    hasChanges = true;
  }

  return hasChanges ? { shuffleSeed: seed, optionOrder: next } : null;
}
