import type { SwipeCard } from '../types/card';

export const SAMPLE_DECK: SwipeCard[] = [
  {
    type: 'swipe',
    id: 'sample_001',
    stage: 1,
    npcId: 'Köy Muhtarı',
    dialogue:
      'Bu kış çok zordu. Köylüler aç. Ambarındaki tahılın bir kısmını bağışlar mısın?',
    leftChoice: {
      text: 'Hayır',
      effects: [{ bar: 'itibar', delta: -15 }],
    },
    rightChoice: {
      text: 'Tabii ki',
      effects: [
        { bar: 'aclik', delta: 10 },
        { bar: 'itibar', delta: 10 },
        { bar: 'borc', delta: -5 },
      ],
    },
    conditions: {},
    isUnique: false,
    weight: 2,
  },
  {
    type: 'swipe',
    id: 'sample_002',
    stage: 1,
    npcId: 'Seyyar Tüccar',
    dialogue:
      'Şehirden geldim. Tahılını iki katı fiyata satın alırım — ama sözünü şimdi ver.',
    leftChoice: {
      text: 'Sonra görüşürüz',
      effects: [{ bar: 'borc', delta: 5 }],
    },
    rightChoice: {
      text: 'Anlaştık',
      effects: [
        { bar: 'borc', delta: -20 },
        { bar: 'aclik', delta: -10 },
      ],
    },
    conditions: {},
    isUnique: false,
    weight: 1,
  },
  {
    type: 'swipe',
    id: 'sample_003',
    stage: 1,
    npcId: 'Komşu Kadın',
    dialogue:
      'Oğlum hasta. Şehirdeki hekime götürmek için biraz para lazım. Yardım eder misin?',
    leftChoice: {
      text: 'Üzgünüm, veremem',
      effects: [{ bar: 'itibar', delta: -10 }],
    },
    rightChoice: {
      text: 'Al, ihtiyacın var',
      effects: [
        { bar: 'itibar', delta: 15 },
        { bar: 'borc', delta: 10 },
      ],
    },
    conditions: {},
    isUnique: false,
    weight: 1,
  },
  {
    type: 'swipe',
    id: 'sample_004',
    stage: 1,
    npcId: 'Yaşlı Bilge',
    dialogue:
      'Gençliğimde yaptığım bir hatayı sana anlatacağım — ama önce söyle, gururun mu yoksa aklın mı önemli?',
    leftChoice: {
      text: 'Gurur',
      effects: [
        { bar: 'itibar', delta: 8 },
        { bar: 'saglik', delta: -5 },
      ],
    },
    rightChoice: {
      text: 'Akıl',
      effects: [
        { bar: 'saglik', delta: 10 },
        { bar: 'itibar', delta: -5 },
      ],
    },
    conditions: {},
    isUnique: true,
    weight: 1,
  },
  {
    type: 'swipe',
    id: 'sample_005',
    stage: 1,
    npcId: 'Vergi Toplayıcı',
    dialogue:
      'Bu yıl vergi biraz arttı. Ödeyemezsen malına el koyabilirim — ya da aralarında bir yol bulabiliriz.',
    leftChoice: {
      text: 'El koyun',
      effects: [
        { bar: 'borc', delta: -15 },
        { bar: 'itibar', delta: -20 },
        { bar: 'saglik', delta: -10 },
      ],
    },
    rightChoice: {
      text: '"Yol" bulalım',
      effects: [
        { bar: 'borc', delta: 15 },
        { bar: 'itibar', delta: 5 },
      ],
    },
    conditions: {},
    isUnique: false,
    weight: 2,
  },
  {
    type: 'swipe',
    id: 'sample_006',
    stage: 1,
    npcId: 'Genç Asker',
    dialogue:
      'Sınırda savaş var. Lordumuz asker topluyor. Gitmezsem kaçak sayılırım.',
    leftChoice: {
      text: 'Git, savaş senin için değil',
      effects: [
        { bar: 'itibar', delta: -20 },
        { bar: 'saglik', delta: 10 },
      ],
    },
    rightChoice: {
      text: 'Vatanın seni çağırıyor',
      effects: [
        { bar: 'itibar', delta: 20 },
        { bar: 'saglik', delta: -15 },
        { bar: 'aclik', delta: -10 },
      ],
    },
    conditions: {},
    isUnique: false,
    weight: 1,
  },
];
