import type {
  GameCard,
  SwipeCard,
  CardConditions,
  BarEffect,
  NpcSympathyEffect,
  ResourceBarKey,
  Stage,
} from '../types/card';
import type {
  GameState,
  StageResources,
  NpcMemory,
} from '../types/state';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TİPLER
// ─────────────────────────────────────────────────────────────────────────────

// GameState yerine ChoiceResult döndürülür; UI katmanının bar_zeroed veya
// stage_transition gibi olayları state diff'i yapmadan yakalaması için.
export type EngineEvent =
  | { type: 'bar_zeroed'; bar: ResourceBarKey; stage: Stage }
  | { type: 'stage_transition'; to: Stage }
  | { type: 'fate_advanced'; fatePathId: string; progress: number }
  | { type: 'memory_created'; tag: string };

export type ChoiceResult = {
  state: GameState;
  events: EngineEvent[];
};

// ─────────────────────────────────────────────────────────────────────────────
// İÇ YARDIMCILAR
// ─────────────────────────────────────────────────────────────────────────────

function getCardWeight(card: GameCard): number {
  // ThroneCard'ların weight alanı yok; tekil ağırlık atar.
  return card.type === 'swipe' ? card.weight : 1;
}

// resources içinde 'bar' adlı alanın sayısal değerini döner.
// Bar bu aşamada yoksa (Stage 5 dahil) null döner; caller'a sessiz geçmesini söyler.
function getBarValue(resources: StageResources, bar: string): number | null {
  if (resources.stage === 5) return null;
  const val = (resources as Record<string, unknown>)[bar];
  return typeof val === 'number' ? val : null;
}

// Mevcut bar değerini delta kadar değiştirir; 0-100 sınırına kırpar.
// Bar bu aşamada yoksa resources değişmeden döner — içerik hatası engine'i kırmaz.
function applyBarDelta(
  resources: StageResources,
  bar: string,
  delta: number,
): StageResources {
  const current = getBarValue(resources, bar);
  if (current === null) return resources;
  return {
    ...resources,
    [bar]: Math.max(0, Math.min(100, current + delta)),
  } as StageResources;
}

function applyNpcEffects(
  npcMemories: Record<string, NpcMemory>,
  effects: NpcSympathyEffect[],
  currentStage: Stage,
): Record<string, NpcMemory> {
  if (effects.length === 0) return npcMemories;
  const next = { ...npcMemories };
  for (const effect of effects) {
    const existing: NpcMemory = next[effect.npcId] ?? {
      sympathyScore: 0,
      tags: [],
      firstSeenStage: currentStage,
      appearedInGenerations: [],
    };
    next[effect.npcId] = {
      ...existing,
      sympathyScore: Math.max(-100, Math.min(100, existing.sympathyScore + effect.delta)),
    };
  }
  return next;
}

function addTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags : [...tags, tag];
}

function removeTags(tags: string[], toRemove: string[]): string[] {
  if (toRemove.length === 0) return tags;
  const removeSet = new Set(toRemove);
  return tags.filter((t) => !removeSet.has(t));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. evaluateConditions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verilen conditions ve mevcut game state'e göre kartın çekilip
 * çekilemeyeceğine karar verir. Tüm alanlar AND, alan içi diziler OR ile birleşir.
 */
export function evaluateConditions(
  conditions: CardConditions,
  state: GameState,
): boolean {
  const { character, world } = state.persisted;

  // Sınıf filtresi: conditions.classes tanımlıysa karakter bu sınıflardan birinde olmalı.
  // Sınıf seçimi henüz yapılmamışsa (null) sınıf kısıtlı kartlar gösterilmez.
  if (conditions.classes !== undefined) {
    if (character.class === null) return false;
    if (!conditions.classes.includes(character.class)) return false;
  }

  if (conditions.seasons !== undefined) {
    if (!conditions.seasons.includes(world.currentSeason)) return false;
  }

  if (conditions.hasMemories !== undefined) {
    const memSet = new Set(world.activeMemoryTags);
    if (!conditions.hasMemories.every((tag) => memSet.has(tag))) return false;
  }

  if (conditions.lacksMemories !== undefined) {
    const memSet = new Set(world.activeMemoryTags);
    if (conditions.lacksMemories.some((tag) => memSet.has(tag))) return false;
  }

  if (conditions.npcSympathy !== undefined) {
    for (const cond of conditions.npcSympathy) {
      // NPC daha önce görülmemişse sempatisi 0 kabul edilir.
      const score = world.npcMemories[cond.npcId]?.sympathyScore ?? 0;
      if (cond.min !== undefined && score < cond.min) return false;
      if (cond.max !== undefined && score > cond.max) return false;
    }
  }

  if (
    conditions.minGeneration !== undefined &&
    character.generation < conditions.minGeneration
  ) {
    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. selectNextCard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deste içinden mevcut aşama ve koşullara uygun kartları filtreler,
 * ağırlıklı rastgele seçim ile bir kart döndürür.
 * Uygun kart yoksa null döner.
 */
export function selectNextCard(
  deck: GameCard[],
  state: GameState,
): GameCard | null {
  const { character } = state.persisted;
  const seenSet = new Set(character.seenUniqueCardIds);

  const eligible = deck.filter((card) => {
    if (card.stage !== character.stage) return false;
    if (card.isUnique && seenSet.has(card.id)) return false;
    return evaluateConditions(card.conditions, state);
  });

  if (eligible.length === 0) return null;

  // Ağırlıklı rastgele seçim (Walker's alias değil; kart sayısı MVP'de ≤600)
  const totalWeight = eligible.reduce((sum, c) => sum + getCardWeight(c), 0);
  let rnd = Math.random() * totalWeight;

  for (const card of eligible) {
    rnd -= getCardWeight(card);
    if (rnd <= 0) return card;
  }

  // Kayan nokta kenar durumu: son kartı döndür
  return eligible[eligible.length - 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. applyChoice
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Oyuncunun kaydırma kararını uygular; değişmez (immutable) yeni state ve
 * UI'ın tepki vermesi gereken olayları döndürür.
 *
 * NOT: Aşama geçişinin resource sıfırlama/aşama değiştirme adımları bu
 * fonksiyonun dışında, üst katmanda stage_transition event'i alındığında yapılır.
 */
export function applyChoice(
  card: SwipeCard,
  direction: 'left' | 'right',
  state: GameState,
): ChoiceResult {
  const baseChoice = direction === 'left' ? card.leftChoice : card.rightChoice;
  const playerClass = state.persisted.character.class;
  const override = playerClass ? baseChoice.classOverrides?.[playerClass] : undefined;

  // Sınıf override'ı varsa: effects tamamen değişir, additionalEffects üstüne eklenir.
  const effects = override?.effects ?? baseChoice.effects;
  const additionalEffects = override?.additionalEffects ?? [];
  const npcEffects = override?.npcEffects ?? baseChoice.npcEffects ?? [];
  const createsMemory = override?.createsMemory ?? baseChoice.createsMemory;
  const removesMemories = override?.removesMemories ?? baseChoice.removesMemories ?? [];

  const events: EngineEvent[] = [];

  // Bar efektleri
  let resources = state.persisted.character.resources;
  for (const effect of [...effects, ...additionalEffects]) {
    const before = getBarValue(resources, effect.bar);
    resources = applyBarDelta(resources, effect.bar, effect.delta);
    const after = getBarValue(resources, effect.bar);
    // Sıfırlanma: önceki tur pozitifti, şimdi 0 → game layer sonucu işler
    if (before !== null && before > 0 && after === 0) {
      events.push({
        type: 'bar_zeroed',
        bar: effect.bar,
        stage: state.persisted.character.stage,
      });
    }
  }

  // NPC sempati efektleri
  const npcMemories = applyNpcEffects(
    state.persisted.world.npcMemories,
    npcEffects,
    state.persisted.character.stage,
  );

  // Bellek etiketleri
  // appearsMemory normalde kart ekrana geldiğinde ateşlenir; applyChoice içinde
  // ele alınır çünkü seçim yapılmadan önce kart zaten görülmüş sayılır.
  // Prodüksiyonda bir recordCardSeen() fonksiyonu bu sorumluluğu almalı.
  let activeMemoryTags = state.persisted.world.activeMemoryTags;
  if (card.appearsMemory) {
    activeMemoryTags = addTag(activeMemoryTags, card.appearsMemory);
  }
  if (createsMemory) {
    activeMemoryTags = addTag(activeMemoryTags, createsMemory);
    events.push({ type: 'memory_created', tag: createsMemory });
  }
  if (removesMemories.length > 0) {
    activeMemoryTags = removeTags(activeMemoryTags, removesMemories);
  }

  // Yazgı ilerlemesi (baseChoice üzerinden; override etkilemez)
  let fateProgress = { ...state.persisted.world.fateProgress };
  for (const fatePathId of baseChoice.advancesFate ?? []) {
    const next = Math.min(100, (fateProgress[fatePathId] ?? 0) + 1);
    fateProgress[fatePathId] = next;
    events.push({ type: 'fate_advanced', fatePathId, progress: next });
  }

  // Aşama geçişi sinyali — gerçek geçiş üst katmanda yapılır
  if (baseChoice.triggersStageTransition !== undefined) {
    events.push({ type: 'stage_transition', to: baseChoice.triggersStageTransition });
  }

  // Tekil kart takibi
  const seenUniqueCardIds = card.isUnique
    ? [...state.persisted.character.seenUniqueCardIds, card.id]
    : state.persisted.character.seenUniqueCardIds;

  const newState: GameState = {
    ...state,
    persisted: {
      ...state.persisted,
      character: {
        ...state.persisted.character,
        resources,
        seenUniqueCardIds,
        totalCardsPlayed: state.persisted.character.totalCardsPlayed + 1,
        cardsPlayedThisStage: state.persisted.character.cardsPlayedThisStage + 1,
      },
      world: {
        ...state.persisted.world,
        activeMemoryTags,
        npcMemories,
        fateProgress,
      },
    },
  };

  return { state: newState, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. checkPendingThroneResults
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gecikmiş taht krizi sonuçlarını kontrol eder; revealAtCardIndex'i geçmiş
 * olanları uygular ve listeden çıkarır. Tetiklenen sonuç yoksa aynı state referansı döner.
 */
export function checkPendingThroneResults(state: GameState): GameState {
  const { totalCardsPlayed } = state.persisted.character;
  const pending = state.persisted.pendingThroneResults;

  const triggered = pending.filter((r) => totalCardsPlayed >= r.revealAtCardIndex);
  const remaining = pending.filter((r) => totalCardsPlayed < r.revealAtCardIndex);

  if (triggered.length === 0) return state;

  const stage = state.persisted.character.stage;
  let resources = state.persisted.character.resources;
  let npcMemories = state.persisted.world.npcMemories;
  let activeMemoryTags = state.persisted.world.activeMemoryTags;

  for (const result of triggered) {
    for (const effect of result.delayedEffects) {
      resources = applyBarDelta(resources, effect.bar, effect.delta);
    }
    npcMemories = applyNpcEffects(npcMemories, result.npcEffects, stage);
    if (result.createsMemory) {
      activeMemoryTags = addTag(activeMemoryTags, result.createsMemory);
    }
  }

  return {
    ...state,
    persisted: {
      ...state.persisted,
      character: {
        ...state.persisted.character,
        resources,
      },
      world: {
        ...state.persisted.world,
        npcMemories,
        activeMemoryTags,
      },
      pendingThroneResults: remaining,
    },
  };
}
