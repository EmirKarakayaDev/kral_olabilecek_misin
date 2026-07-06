// ─────────────────────────────────────────────────────────────────────────────
// TEMEL PRİMİTİFLER
// ─────────────────────────────────────────────────────────────────────────────

export type Stage = 1 | 2 | 3 | 4 | 5 | 6;
export type PlayerClass = 'asker' | 'katip' | 'tuccar';
export type Season = 'kis' | 'ilkbahar' | 'yaz' | 'sonbahar';

// ─────────────────────────────────────────────────────────────────────────────
// KAYNAK BARLARI
// ─────────────────────────────────────────────────────────────────────────────

// Her aşamanın barları ayrı tip olarak tanımlandı; bu sayede içerik yazarı
// hangi bar hangi aşamaya ait bilir. 'itibar' ve 'ordu' birden fazla aşamada
// geçer — union'da string literal'lar otomatik tekilleştiğinden sorun olmaz.
export type Stage1Bar = 'saglik' | 'aclik' | 'borc' | 'itibar';
export type Stage2Bar = 'para' | 'itibar' | 'guvenlik' | 'baglanti';
export type Stage3Bar = 'sadakat' | 'nufuz' | 'tehdit' | 'kralin_gozu';
export type Stage4Bar = 'servet' | 'ittifak' | 'ordu' | 'halk_destegi';
export type Stage6Bar = 'hazine' | 'halk' | 'ordu' | 'din';

// Kart efektleri bu geniş union'ı kullanır. Kart motorunun, çekildiği anda
// efektin doğru aşama barını hedeflediğini doğrulaması gerekir; bu tip bunu
// statik olarak sağlamak yerine kart sayısının makul kalmasını tercih eder.
export type ResourceBarKey =
  | Stage1Bar
  | Stage2Bar
  | Stage3Bar
  | Stage4Bar
  | Stage6Bar;

// ─────────────────────────────────────────────────────────────────────────────
// ETKİ TİPLERİ
// ─────────────────────────────────────────────────────────────────────────────

export type BarEffect = {
  bar: ResourceBarKey;
  delta: number; // -100 ile +100 arası; engine sınırları clamp eder
};

export type NpcSympathyEffect = {
  npcId: string;
  delta: number; // -100 ile +100 arası
};

// ─────────────────────────────────────────────────────────────────────────────
// KART KOŞULLARI
// ─────────────────────────────────────────────────────────────────────────────

// Kart havuzuna eklenmeden önce kart motorunun çekilme anında değerlendirdiği
// filtreler. Tüm alanlar AND ile birleşir; aynı alan içindeki dizi öğeleri OR.
// Örnek: classes: ['katip'] AND hasMemories: ['dilenci_yardim', 'duk_guveni']
export type CardConditions = {
  classes?: PlayerClass[];     // yalnızca bu sınıflar bu kartı görebilir
  seasons?: Season[];          // yalnızca bu mevsimlerde havuza girer
  hasMemories?: string[];      // tüm bu etiketler mevcut olmalı (AND)
  lacksMemories?: string[];    // bu etiketlerin hiçbiri mevcut olmamalı
  npcSympathy?: {
    npcId: string;
    min?: number;              // sempatisi >= min ise koşul sağlanır
    max?: number;              // sempatisi <= max ise koşul sağlanır
  }[];
  minGeneration?: number;      // yalnızca belirtilen nesil ve sonrasında aktif
};

// ─────────────────────────────────────────────────────────────────────────────
// SEÇİM TİPLERİ (SWIPE KARTLAR)
// ─────────────────────────────────────────────────────────────────────────────

// Aynı kaydırma hareketi, farklı sınıf için farklı sonuç verebilir.
// 'effects' tanımlıysa temel efektlerin TAMAMI değiştirilir.
// Yalnızca metin farkı istiyorsan effects alanını bırak, text yaz.
// Yalnızca ekstra efekt istiyorsan additionalEffects kullan.
export type ClassChoiceOverride = {
  text?: string;
  effects?: BarEffect[];
  additionalEffects?: BarEffect[];
  npcEffects?: NpcSympathyEffect[];
  createsMemory?: string;
  removesMemories?: string[];
};

export type CardChoice = {
  text: string;
  effects: BarEffect[];
  npcEffects?: NpcSympathyEffect[];

  // Bellek sistemi: seçim yapıldığında oluşturulur/silinir
  createsMemory?: string;
  removesMemories?: string[];

  // Bu seçim doğrudan aşama geçişini tetiklerse
  triggersStageTransition?: Stage;

  // Bu seçimin katkıda bulunduğu yazgı yolları
  advancesFate?: string[];

  // Katip/Asker/Tüccar'a özgü sonuç farklılaşmaları
  classOverrides?: Partial<Record<PlayerClass, ClassChoiceOverride>>;
};

// ─────────────────────────────────────────────────────────────────────────────
// SWIPE KARTI (Aşama 1-4 ve 6)
// ─────────────────────────────────────────────────────────────────────────────

export interface SwipeCard {
  type: 'swipe';
  id: string;
  stage: Stage;
  npcId: string;
  dialogue: string;
  leftChoice: CardChoice;
  rightChoice: CardChoice;
  conditions: CardConditions;

  // Kart ekrana GELDIĞINDE (seçimden bağımsız) oluşturulan bellek etiketi.
  // Kullanım: "Bu NPC hayatına girdi" kaydı. Seçim bağımlı etiketler CardChoice'ta.
  appearsMemory?: string;

  // true ise kart havuzdan bir kez çekildikten sonra kalıcı olarak çıkar
  isUnique: boolean;

  // Ağırlıklı rastgele seçim için; varsayılan 1. Yüksek = daha sık
  weight: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAHT KRİZİ KARTI (Aşama 5 — Farklı Mekanik)
// ─────────────────────────────────────────────────────────────────────────────

// Gecikmiş sonuç: revealDelay kadar kart geçtikten sonra delayedEffects uygulanır.
// Bu, "Kim kazandı?" belirsizliğini simüle eder — vaatler hemen karşılığını bulmaz.
export type ThroneOption = {
  id: string;
  targetNpcId: string;   // bu opsiyonun hitap ettiği NPC (görsel + diyalog için)
  promise: string;       // oyuncunun NPC'ye yaptığı vaadin metni
  immediateEffects: BarEffect[];  // seçim anında uygulanan kısa vadeli maliyet/kazanım
  delayedEffects: BarEffect[];    // revealDelay sonra uygulanan asıl sonuç
  npcEffects: NpcSympathyEffect[];
  revealDelay: number;   // kaç kart sonra sonuç açıklanır (önerilen: 3-7)
  createsMemory?: string;
};

export interface ThroneCard {
  type: 'throne';
  id: string;
  stage: 5;
  dialogue: string;
  options: ThroneOption[];  // 2-4 arasında; hepsi aynı anda gösterilir
  conditions: CardConditions;
  isUnique: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANA UNION
// ─────────────────────────────────────────────────────────────────────────────

export type GameCard = SwipeCard | ThroneCard;
