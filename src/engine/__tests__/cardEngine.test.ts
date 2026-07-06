import {
  evaluateConditions,
  selectNextCard,
  applyChoice,
  checkPendingThroneResults,
} from '../cardEngine';
import type { GameState, StageResources, NpcMemory, PendingThroneResult } from '../../types/state';
import type { SwipeCard, Season, Stage, PlayerClass } from '../../types/card';

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY FONKSİYONLARI
// ─────────────────────────────────────────────────────────────────────────────

type MakeStateOpts = {
  stage?: Stage;
  playerClass?: PlayerClass | null;
  resources?: StageResources;
  memoryTags?: string[];
  npcMemories?: Record<string, NpcMemory>;
  season?: Season;
  generation?: number;
  seenUniqueCardIds?: string[];
  totalCardsPlayed?: number;
  pendingThroneResults?: PendingThroneResult[];
};

function makeState(opts: MakeStateOpts = {}): GameState {
  const {
    stage = 1,
    playerClass = null,
    resources = { stage: 1, saglik: 50, aclik: 50, borc: 50, itibar: 50 } as StageResources,
    memoryTags = [],
    npcMemories = {},
    season = 'ilkbahar',
    generation = 1,
    seenUniqueCardIds = [],
    totalCardsPlayed = 0,
    pendingThroneResults = [],
  } = opts;

  return {
    persisted: {
      character: {
        generation,
        name: 'Test',
        class: playerClass,
        stage,
        resources,
        totalCardsPlayed,
        cardsPlayedThisStage: 0,
        seenUniqueCardIds,
      },
      world: {
        activeMemoryTags: memoryTags,
        npcMemories,
        currentSeason: season,
        seasonCardCounter: 0,
        activeFateId: 'test_fate',
        fateProgress: {},
      },
      dynasty: [],
      pendingThroneResults,
      settings: {
        language: 'tr',
        isPremium: false,
        soundEnabled: true,
        hasSeenTutorial: true,
      },
    },
    session: {
      activeCardId: null,
      cardQueue: [],
      isAnimating: false,
      pendingSwipeDirection: null,
      adState: { lastInterstitialTimestamp: 0, stageTransitionsSinceLastAd: 0 },
    },
  };
}

function makeCard(overrides: Partial<SwipeCard> = {}): SwipeCard {
  return {
    type: 'swipe',
    id: 'kart_001',
    stage: 1,
    npcId: 'npc_bey',
    dialogue: 'Test diyalog.',
    leftChoice: { text: 'Hayır', effects: [] },
    rightChoice: { text: 'Evet', effects: [] },
    conditions: {},
    isUnique: false,
    weight: 1,
    ...overrides,
  } as SwipeCard;
}

// ─────────────────────────────────────────────────────────────────────────────
// evaluateConditions
// ─────────────────────────────────────────────────────────────────────────────

describe('evaluateConditions', () => {
  it('boş conditions her zaman true döner', () => {
    expect(evaluateConditions({}, makeState())).toBe(true);
  });

  describe('sınıf filtresi', () => {
    it('karakter doğru sınıftaysa true döner', () => {
      const state = makeState({ playerClass: 'katip' });
      expect(evaluateConditions({ classes: ['katip'] }, state)).toBe(true);
    });

    it('karakter farklı sınıftaysa false döner', () => {
      const state = makeState({ playerClass: 'asker' });
      expect(evaluateConditions({ classes: ['katip'] }, state)).toBe(false);
    });

    it('sınıf seçilmemişse (null) sınıf kısıtlı kart görünmez', () => {
      const state = makeState({ playerClass: null });
      expect(evaluateConditions({ classes: ['katip'] }, state)).toBe(false);
    });

    it('OR mantığı: birden fazla sınıf tanımlanabilir', () => {
      const state = makeState({ playerClass: 'tuccar' });
      expect(evaluateConditions({ classes: ['katip', 'tuccar'] }, state)).toBe(true);
    });
  });

  describe('mevsim filtresi', () => {
    it('aktif mevsim eşleşiyorsa true döner', () => {
      const state = makeState({ season: 'kis' });
      expect(evaluateConditions({ seasons: ['kis'] }, state)).toBe(true);
    });

    it('aktif mevsim eşleşmiyorsa false döner', () => {
      const state = makeState({ season: 'yaz' });
      expect(evaluateConditions({ seasons: ['kis'] }, state)).toBe(false);
    });
  });

  describe('hasMemories (AND mantığı)', () => {
    it('tüm etiketler varsa true döner', () => {
      const state = makeState({ memoryTags: ['dilenci_yardim', 'duk_gorusme'] });
      expect(
        evaluateConditions({ hasMemories: ['dilenci_yardim', 'duk_gorusme'] }, state),
      ).toBe(true);
    });

    it('bir etiket bile eksikse false döner', () => {
      const state = makeState({ memoryTags: ['dilenci_yardim'] });
      expect(
        evaluateConditions({ hasMemories: ['dilenci_yardim', 'duk_gorusme'] }, state),
      ).toBe(false);
    });
  });

  describe('lacksMemories', () => {
    it('yasaklı etiketlerin hiçbiri yoksa true döner', () => {
      const state = makeState({ memoryTags: [] });
      expect(evaluateConditions({ lacksMemories: ['ihanetkâr'] }, state)).toBe(true);
    });

    it('yasaklı etiketlerden biri varsa false döner', () => {
      const state = makeState({ memoryTags: ['ihanetkâr'] });
      expect(evaluateConditions({ lacksMemories: ['ihanetkâr'] }, state)).toBe(false);
    });
  });

  describe('npcSympathy', () => {
    const npcMemories: Record<string, NpcMemory> = {
      npc_duk: {
        sympathyScore: 40,
        tags: [],
        firstSeenStage: 3,
        appearedInGenerations: [1],
      },
    };

    it('sempati min koşulunu karşılıyorsa true döner', () => {
      const state = makeState({ npcMemories });
      expect(
        evaluateConditions({ npcSympathy: [{ npcId: 'npc_duk', min: 30 }] }, state),
      ).toBe(true);
    });

    it('sempati min koşulunun altındaysa false döner', () => {
      const state = makeState({ npcMemories });
      expect(
        evaluateConditions({ npcSympathy: [{ npcId: 'npc_duk', min: 50 }] }, state),
      ).toBe(false);
    });

    it('sempati max koşulunun üstündeyse false döner', () => {
      const state = makeState({ npcMemories });
      expect(
        evaluateConditions({ npcSympathy: [{ npcId: 'npc_duk', max: 30 }] }, state),
      ).toBe(false);
    });

    it('daha önce görülmemiş NPC sempati skoru 0 kabul edilir', () => {
      const state = makeState();
      // min: -10 → score 0 ≥ -10 → true
      expect(
        evaluateConditions({ npcSympathy: [{ npcId: 'npc_yabanci', min: -10 }] }, state),
      ).toBe(true);
    });
  });

  describe('minGeneration', () => {
    it('nesil yeterliyse true döner', () => {
      const state = makeState({ generation: 3 });
      expect(evaluateConditions({ minGeneration: 2 }, state)).toBe(true);
    });

    it('nesil yetersizse false döner', () => {
      const state = makeState({ generation: 1 });
      expect(evaluateConditions({ minGeneration: 2 }, state)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// selectNextCard
// ─────────────────────────────────────────────────────────────────────────────

describe('selectNextCard', () => {
  afterEach(() => jest.restoreAllMocks());

  it('deste boşsa null döner', () => {
    expect(selectNextCard([], makeState())).toBeNull();
  });

  it('hiç uygun kart yoksa null döner', () => {
    const stage2Card = makeCard({ stage: 2 });
    const state = makeState({ stage: 1 });
    expect(selectNextCard([stage2Card], state)).toBeNull();
  });

  it('yanlış aşamadaki kartları filtreler', () => {
    const s1 = makeCard({ id: 'aşama1', stage: 1 });
    const s2 = makeCard({ id: 'aşama2', stage: 2 });
    const state = makeState({ stage: 1 });
    const result = selectNextCard([s1, s2], state);
    expect(result?.id).toBe('aşama1');
  });

  it('daha önce görülen unique kartı tekrar seçmez', () => {
    const unique = makeCard({ id: 'tekil_kart', isUnique: true });
    const state = makeState({ seenUniqueCardIds: ['tekil_kart'] });
    expect(selectNextCard([unique], state)).toBeNull();
  });

  it('isUnique: false olan kart tekrar seçilebilir', () => {
    const repeatable = makeCard({ id: 'tekrarlanan', isUnique: false });
    const state = makeState({ seenUniqueCardIds: ['tekrarlanan'] });
    expect(selectNextCard([repeatable], state)).not.toBeNull();
  });

  it('conditions filtresi çalışır', () => {
    const restricted = makeCard({
      id: 'sadece_katip',
      conditions: { classes: ['katip'] },
    });
    const state = makeState({ playerClass: 'asker' });
    expect(selectNextCard([restricted], state)).toBeNull();
  });

  it('ağırlıklı seçim: Math.random mock ile deterministik test', () => {
    // weight: [1, 9] → toplam 10
    const low = makeCard({ id: 'dusuk', weight: 1 });
    const high = makeCard({ id: 'yuksek', weight: 9 });
    const state = makeState();

    // Tek spy alınır; aynı spy üzerinde mockReturnValue değiştirilir.
    // İki kez spyOn çağırmak Math.random'ı iç içe wrap eder ve restoreAllMocks'u bozar.
    const randomSpy = jest.spyOn(Math, 'random');

    // rnd = 0.05 * 10 = 0.5 → 0.5 - 1 = -0.5 ≤ 0 → düşük ağırlıklı kart seçilir
    randomSpy.mockReturnValue(0.05);
    expect(selectNextCard([low, high], state)?.id).toBe('dusuk');

    // rnd = 0.5 * 10 = 5 → 5 - 1 = 4 → 4 - 9 = -5 ≤ 0 → yüksek ağırlıklı kart seçilir
    randomSpy.mockReturnValue(0.5);
    expect(selectNextCard([low, high], state)?.id).toBe('yuksek');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// applyChoice
// ─────────────────────────────────────────────────────────────────────────────

describe('applyChoice', () => {
  it('bar delta doğru uygulanır', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: -20 }] },
    });
    const { state } = applyChoice(card, 'right', makeState());
    expect((state.persisted.character.resources as any).saglik).toBe(30);
  });

  it('bar 0\'ın altına düşmez', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: -999 }] },
    });
    const { state } = applyChoice(card, 'right', makeState());
    expect((state.persisted.character.resources as any).saglik).toBe(0);
  });

  it('bar 100\'ün üstüne çıkmaz', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: +999 }] },
    });
    const { state } = applyChoice(card, 'right', makeState());
    expect((state.persisted.character.resources as any).saglik).toBe(100);
  });

  it('bar 0\'a düştüğünde bar_zeroed event\'i ateşlenir', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: -50 }] },
    });
    const { events } = applyChoice(card, 'right', makeState());
    const zeroed = events.find((e) => e.type === 'bar_zeroed');
    expect(zeroed).toBeDefined();
    expect((zeroed as any)?.bar).toBe('saglik');
  });

  it('zaten 0 olan bar için bar_zeroed event\'i ateşlenmez (ikinci kez)', () => {
    const resources: StageResources = { stage: 1, saglik: 0, aclik: 50, borc: 50, itibar: 50 };
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: -10 }] },
    });
    const { events } = applyChoice(card, 'right', makeState({ resources }));
    expect(events.find((e) => e.type === 'bar_zeroed')).toBeUndefined();
  });

  it('sol seçim (leftChoice) doğru uygulanır', () => {
    const card = makeCard({
      leftChoice: { text: 'Hayır', effects: [{ bar: 'itibar', delta: +10 }] },
      rightChoice: { text: 'Evet', effects: [{ bar: 'itibar', delta: -10 }] },
    });
    const { state } = applyChoice(card, 'left', makeState());
    expect((state.persisted.character.resources as any).itibar).toBe(60);
  });

  it('NPC sempati efekti uygulanır', () => {
    const card = makeCard({
      rightChoice: {
        text: 'Evet',
        effects: [],
        npcEffects: [{ npcId: 'npc_bey', delta: +30 }],
      },
    });
    const { state } = applyChoice(card, 'right', makeState());
    expect(state.persisted.world.npcMemories['npc_bey']?.sympathyScore).toBe(30);
  });

  it('NPC sempati skoru -100 altına düşmez', () => {
    const npcMemories: Record<string, NpcMemory> = {
      npc_bey: { sympathyScore: -90, tags: [], firstSeenStage: 1, appearedInGenerations: [1] },
    };
    const card = makeCard({
      rightChoice: {
        text: 'Evet',
        effects: [],
        npcEffects: [{ npcId: 'npc_bey', delta: -50 }],
      },
    });
    const { state } = applyChoice(card, 'right', makeState({ npcMemories }));
    expect(state.persisted.world.npcMemories['npc_bey']?.sympathyScore).toBe(-100);
  });

  it('createsMemory etiketi aktif listeye eklenir', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [], createsMemory: 'bey_memnun' },
    });
    const { state } = applyChoice(card, 'right', makeState());
    expect(state.persisted.world.activeMemoryTags).toContain('bey_memnun');
  });

  it('aynı etiket iki kez eklenmez', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [], createsMemory: 'bey_memnun' },
    });
    const stateWith = makeState({ memoryTags: ['bey_memnun'] });
    const { state } = applyChoice(card, 'right', stateWith);
    const count = state.persisted.world.activeMemoryTags.filter((t) => t === 'bey_memnun').length;
    expect(count).toBe(1);
  });

  it('removesMemories etiketleri listeden çıkarır', () => {
    const card = makeCard({
      rightChoice: {
        text: 'Evet',
        effects: [],
        removesMemories: ['eski_dusman'],
      },
    });
    const state = makeState({ memoryTags: ['eski_dusman', 'diger_etiket'] });
    const { state: next } = applyChoice(card, 'right', state);
    expect(next.persisted.world.activeMemoryTags).not.toContain('eski_dusman');
    expect(next.persisted.world.activeMemoryTags).toContain('diger_etiket');
  });

  it('appearsMemory kart görüntülenince dünyaya eklenir', () => {
    const card = makeCard({ appearsMemory: 'npc_bey_karsilasma' });
    const { state } = applyChoice(card, 'right', makeState());
    expect(state.persisted.world.activeMemoryTags).toContain('npc_bey_karsilasma');
  });

  it('isUnique kart seenUniqueCardIds listesine eklenir', () => {
    const card = makeCard({ id: 'tekil_olay', isUnique: true });
    const { state } = applyChoice(card, 'right', makeState());
    expect(state.persisted.character.seenUniqueCardIds).toContain('tekil_olay');
  });

  it('isUnique: false kart seenUniqueCardIds listesine eklenmez', () => {
    const card = makeCard({ id: 'normal_kart', isUnique: false });
    const { state } = applyChoice(card, 'right', makeState());
    expect(state.persisted.character.seenUniqueCardIds).not.toContain('normal_kart');
  });

  it('totalCardsPlayed ve cardsPlayedThisStage artar', () => {
    const card = makeCard();
    const { state } = applyChoice(card, 'right', makeState({ totalCardsPlayed: 5 }));
    expect(state.persisted.character.totalCardsPlayed).toBe(6);
    expect(state.persisted.character.cardsPlayedThisStage).toBe(1);
  });

  it('triggersStageTransition event\'i ateşlenir', () => {
    const card = makeCard({
      rightChoice: {
        text: 'Şehre git',
        effects: [],
        triggersStageTransition: 2,
      },
    });
    const { events } = applyChoice(card, 'right', makeState());
    const transition = events.find((e) => e.type === 'stage_transition');
    expect((transition as any)?.to).toBe(2);
  });

  it('sınıf override effects temel efektlerin yerini alır', () => {
    const card = makeCard({
      rightChoice: {
        text: 'Evet',
        effects: [{ bar: 'saglik', delta: -10 }], // temel: -10 sağlık
        classOverrides: {
          katip: {
            effects: [{ bar: 'itibar', delta: +20 }], // katip: -10 sağlık YOK, +20 itibar VAR
          },
        },
      },
    });
    const state = makeState({ playerClass: 'katip' });
    const { state: next } = applyChoice(card, 'right', state);
    expect((next.persisted.character.resources as any).saglik).toBe(50); // değişmedi
    expect((next.persisted.character.resources as any).itibar).toBe(70); // +20
  });

  it('sınıf override additionalEffects temel efektlere eklenir', () => {
    const card = makeCard({
      rightChoice: {
        text: 'Evet',
        effects: [{ bar: 'saglik', delta: -10 }],
        classOverrides: {
          asker: {
            additionalEffects: [{ bar: 'itibar', delta: +15 }],
          },
        },
      },
    });
    const state = makeState({ playerClass: 'asker' });
    const { state: next } = applyChoice(card, 'right', state);
    expect((next.persisted.character.resources as any).saglik).toBe(40); // -10
    expect((next.persisted.character.resources as any).itibar).toBe(65); // +15
  });

  it('orijinal state mutate edilmez', () => {
    const original = makeState();
    const originalResources = original.persisted.character.resources;
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [{ bar: 'saglik', delta: -30 }] },
    });
    applyChoice(card, 'right', original);
    // Orijinal referans değişmemiş olmalı
    expect(original.persisted.character.resources).toBe(originalResources);
    expect((original.persisted.character.resources as any).saglik).toBe(50);
  });

  it('memory_created event\'i ateşlenir', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [], createsMemory: 'kahramanlik' },
    });
    const { events } = applyChoice(card, 'right', makeState());
    const ev = events.find((e) => e.type === 'memory_created');
    expect((ev as any)?.tag).toBe('kahramanlik');
  });

  it('fate_advanced event\'i ateşlenir ve progress artar', () => {
    const card = makeCard({
      rightChoice: { text: 'Evet', effects: [], advancesFate: ['yalniz_fatih'] },
    });
    const { events, state } = applyChoice(card, 'right', makeState());
    const ev = events.find((e) => e.type === 'fate_advanced');
    expect((ev as any)?.fatePathId).toBe('yalniz_fatih');
    expect(state.persisted.world.fateProgress['yalniz_fatih']).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// checkPendingThroneResults
// ─────────────────────────────────────────────────────────────────────────────

describe('checkPendingThroneResults', () => {
  it('bekleyen sonuç yoksa aynı state referansı döner', () => {
    const state = makeState();
    expect(checkPendingThroneResults(state)).toBe(state);
  });

  it('henüz vakti gelmemiş sonuç state\'i değiştirmez', () => {
    const future: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 20,
      delayedEffects: [{ bar: 'saglik', delta: -30 }],
      npcEffects: [],
    };
    const state = makeState({ totalCardsPlayed: 5, pendingThroneResults: [future] });
    const next = checkPendingThroneResults(state);
    expect(next.persisted.pendingThroneResults).toHaveLength(1);
    expect((next.persisted.character.resources as any).saglik).toBe(50);
  });

  it('vakti gelen sonuç delayed efektleri uygular', () => {
    const ready: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 10,
      delayedEffects: [{ bar: 'saglik', delta: -30 }],
      npcEffects: [],
    };
    const state = makeState({ totalCardsPlayed: 10, pendingThroneResults: [ready] });
    const next = checkPendingThroneResults(state);
    expect((next.persisted.character.resources as any).saglik).toBe(20);
  });

  it('tetiklenen sonuç listeden çıkarılır', () => {
    const ready: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 5,
      delayedEffects: [],
      npcEffects: [],
    };
    const state = makeState({ totalCardsPlayed: 10, pendingThroneResults: [ready] });
    const next = checkPendingThroneResults(state);
    expect(next.persisted.pendingThroneResults).toHaveLength(0);
  });

  it('NPC efektleri uygulanır', () => {
    const ready: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 5,
      delayedEffects: [],
      npcEffects: [{ npcId: 'npc_general', delta: +50 }],
    };
    const state = makeState({ totalCardsPlayed: 5, pendingThroneResults: [ready] });
    const next = checkPendingThroneResults(state);
    expect(next.persisted.world.npcMemories['npc_general']?.sympathyScore).toBe(50);
  });

  it('createsMemory bellek etiketi oluşturur', () => {
    const ready: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 3,
      delayedEffects: [],
      npcEffects: [],
      createsMemory: 'taht_krizi_sonuclandi',
    };
    const state = makeState({ totalCardsPlayed: 5, pendingThroneResults: [ready] });
    const next = checkPendingThroneResults(state);
    expect(next.persisted.world.activeMemoryTags).toContain('taht_krizi_sonuclandi');
  });

  it('karma senaryo: biri tetiklenir, diğeri bekler', () => {
    const ready: PendingThroneResult = {
      throneCardId: 'taht_001',
      optionId: 'secim_1',
      revealAtCardIndex: 5,
      delayedEffects: [{ bar: 'itibar', delta: +10 }],
      npcEffects: [],
    };
    const future: PendingThroneResult = {
      throneCardId: 'taht_002',
      optionId: 'secim_2',
      revealAtCardIndex: 20,
      delayedEffects: [{ bar: 'saglik', delta: -99 }],
      npcEffects: [],
    };
    const state = makeState({ totalCardsPlayed: 7, pendingThroneResults: [ready, future] });
    const next = checkPendingThroneResults(state);

    expect(next.persisted.pendingThroneResults).toHaveLength(1);
    expect(next.persisted.pendingThroneResults[0].throneCardId).toBe('taht_002');
    expect((next.persisted.character.resources as any).itibar).toBe(60); // +10 uygulandı
    expect((next.persisted.character.resources as any).saglik).toBe(50); // değişmedi
  });
});
