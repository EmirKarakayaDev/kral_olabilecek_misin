import type { PersistedState } from '../types/state';

export function createInitialState(): PersistedState {
  return {
    character: {
      generation: 1,
      name: '',
      class: null,
      stage: 1,
      resources: { stage: 1, saglik: 70, aclik: 60, borc: 30, itibar: 10 },
      totalCardsPlayed: 0,
      cardsPlayedThisStage: 0,
      seenUniqueCardIds: [],
    },
    world: {
      activeMemoryTags: [],
      npcMemories: {},
      currentSeason: 'ilkbahar',
      seasonCardCounter: 0,
      activeFateId: '',
      fateProgress: {},
    },
    dynasty: [],
    pendingThroneResults: [],
    settings: {
      language: 'tr',
      isPremium: false,
      soundEnabled: true,
      hasSeenTutorial: false,
    },
  };
}
