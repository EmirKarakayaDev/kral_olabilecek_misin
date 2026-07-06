import type {
  Stage,
  PlayerClass,
  Season,
  BarEffect,
  NpcSympathyEffect,
} from './card';

// ─────────────────────────────────────────────────────────────────────────────
// KAYNAK BARLARI — AŞAMAYA GÖRE DİSKRİMİNE UNION
// ─────────────────────────────────────────────────────────────────────────────

// Her aşamada yalnızca o aşamanın barları var olur; discriminant (stage alanı)
// compile-time'da tip güvenliği sağlar. Aşama geçişinde bu nesne tamamen
// yenilenir, bireysel alanlar asla mutate edilmez.
export type StageResources =
  | { stage: 1; saglik: number; aclik: number; borc: number; itibar: number }
  | { stage: 2; para: number; itibar: number; guvenlik: number; baglanti: number }
  | { stage: 3; sadakat: number; nufuz: number; tehdit: number; kralin_gozu: number }
  | { stage: 4; servet: number; ittifak: number; ordu: number; halk_destegi: number }
  | { stage: 5 } // Aşama 5'te standart bar yok; ThroneCard mekaniği kullanılır
  | { stage: 6; hazine: number; halk: number; ordu: number; din: number };

// ─────────────────────────────────────────────────────────────────────────────
// NPC BELLEĞİ
// ─────────────────────────────────────────────────────────────────────────────

// Karakter ölse de NPC belleği DÜNYA HAFIZASINDA yaşar. Nesil 3'te bir NPC,
// atanı hatırlayabilir — bu yüzden WorldState altında tutulur, CharacterState'te değil.
export type NpcMemory = {
  sympathyScore: number;            // -100 ile +100; başlangıç 0 (nötr)
  tags: string[];                   // bu NPC ile etkileşimden doğan etiketler
  firstSeenStage: Stage;
  appearedInGenerations: number[];  // hangi nesil indekslerinde bu NPC görüldü
};

// ─────────────────────────────────────────────────────────────────────────────
// GECİKMİŞ TAHT KRİZİ SONUÇLARI
// ─────────────────────────────────────────────────────────────────────────────

// ThroneOption seçildiğinde bu listeye eklenir; her kart sonrası
// totalCardsPlayed >= revealAtCardIndex kontrolüyle tetiklenir.
export type PendingThroneResult = {
  throneCardId: string;
  optionId: string;
  revealAtCardIndex: number;       // mutlak kart sayacı (toplam oyun boyunca)
  delayedEffects: BarEffect[];
  npcEffects: NpcSympathyEffect[];
  createsMemory?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// KARAKTER STATE — Ölümde sıfırlanır, miras ile devralınmaz
// ─────────────────────────────────────────────────────────────────────────────

export type CharacterState = {
  generation: number;              // 1 = kurucu ata; miras her seferinde artar
  name: string;
  class: PlayerClass | null;       // Aşama 2 sınıf seçimine kadar null
  stage: Stage;
  resources: StageResources;
  totalCardsPlayed: number;        // PendingThroneResult tetikleme sayacı için
  cardsPlayedThisStage: number;    // aşama çıkış koşullarını izlemek için

  // Oyun boyunca görülen isUnique kartların ID'leri.
  // MMKV'ye dizi olarak yazılır; motor çalışırken Set'e dönüştürülür (O(1) arama).
  seenUniqueCardIds: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// DÜNYA STATE — Karakter ölümlerinden bağımsız, birikimli olarak devam eder
// ─────────────────────────────────────────────────────────────────────────────

export type WorldState = {
  // Tüm oyun boyunca biriken bellek etiketleri.
  // MMKV'ye dizi olarak yazılır; motor çalışırken Set'e dönüştürülür.
  activeMemoryTags: string[];

  // npcId → NpcMemory; NPC'ler nesiller arası hatırlanır
  npcMemories: Record<string, NpcMemory>;

  currentSeason: Season;
  seasonCardCounter: number;        // son mevsim değişiminden bu yana oynanan kart sayısı

  // Oyun başında rastgele atanır, oyuna gösterilmez, ölümde/zaferle açıklanır.
  // CharacterState'te değil, WorldState'te: yazgı karaktere değil dünyaya aittir.
  activeFateId: string;
  fateProgress: Record<string, number>; // fatePathId → 0-100 arası ilerleme
};

// ─────────────────────────────────────────────────────────────────────────────
// HANEDan KAYDI — Append-only, hiçbir zaman güncellenmez
// ─────────────────────────────────────────────────────────────────────────────

export type DynastyEntry = {
  generation: number;
  name: string;
  class: PlayerClass;
  highestStageReached: Stage;
  fateId: string;
  fateRealized: boolean;           // yazgısını tamamlayabildi mi?
  legend: string;                  // soy ağacı ekranında gösterilen prosedürel metin
  endReason: 'death' | 'dethronement' | 'victory';
  playedAt: number;                // unix timestamp (ms)
};

// ─────────────────────────────────────────────────────────────────────────────
// PERSIST EDİLEN STATE — MMKV'ye tek bir belge olarak yazılır
// ─────────────────────────────────────────────────────────────────────────────

// Bu nesnenin tamamı atomik olarak yazılır; kısmi yazma yapılmaz.
// Uygulama kapanıp açıldığında bu veri tam bir oyun oturumunu geri yüklemeye yeter.
export type PersistedState = {
  character: CharacterState;
  world: WorldState;
  dynasty: DynastyEntry[];
  pendingThroneResults: PendingThroneResult[];
  settings: {
    language: 'tr' | 'en';
    isPremium: boolean;
    soundEnabled: boolean;
    hasSeenTutorial: boolean;
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// SESSION STATE — Yalnızca bellekte; MMKV'ye asla yazılmaz
// ─────────────────────────────────────────────────────────────────────────────

// Uygulama kapanınca kaybolur. PersistedState'ten yeniden türetilir.
// Buradaki hiçbir şeyin kaybolması bir oyun hatası oluşturmamalı.
export type SessionState = {
  activeCardId: string | null;
  cardQueue: string[];              // motorun önceden çözdüğü sıradaki kart ID'leri
  isAnimating: boolean;
  pendingSwipeDirection: 'left' | 'right' | null;
  adState: {
    lastInterstitialTimestamp: number;   // ms; interstitial cooldown hesabı için
    stageTransitionsSinceLastAd: number; // her 2-3 geçişte bir göster (PRD §7.1)
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// TAM OYUN STATE
// ─────────────────────────────────────────────────────────────────────────────

export type GameState = {
  persisted: PersistedState;
  session: SessionState;
};
