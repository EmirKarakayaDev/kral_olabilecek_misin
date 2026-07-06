import { create } from 'zustand';
import type { GameState, SessionState } from '../types/state';
import type { GameCard, SwipeCard } from '../types/card';
import type { ChoiceResult } from '../engine/cardEngine';
import {
  applyChoice,
  selectNextCard,
  checkPendingThroneResults,
} from '../engine/cardEngine';
import { loadState, saveState } from './persistenceService';
import { createInitialState } from './initialState';

type Actions = {
  applyChoiceAction: (card: SwipeCard, direction: 'left' | 'right') => ChoiceResult;
  selectNextCardAction: (deck: GameCard[]) => GameCard | null;
  checkPendingThroneResultsAction: () => void;
  resetGame: () => void;
};

export type GameStore = GameState & Actions;

const INITIAL_SESSION: SessionState = {
  activeCardId: null,
  cardQueue: [],
  isAnimating: false,
  pendingSwipeDirection: null,
  adState: {
    lastInterstitialTimestamp: 0,
    stageTransitionsSinceLastAd: 0,
  },
};

export const useGameStore = create<GameStore>((set, get) => {
  const persisted = loadState() ?? createInitialState();

  return {
    persisted,
    session: INITIAL_SESSION,

    applyChoiceAction(card, direction) {
      const { persisted, session } = get();
      const result = applyChoice(card, direction, { persisted, session });
      const finalState = checkPendingThroneResults(result.state);
      saveState(finalState.persisted);
      set(finalState);
      return { state: finalState, events: result.events };
    },

    selectNextCardAction(deck) {
      const { persisted, session } = get();
      return selectNextCard(deck, { persisted, session });
    },

    checkPendingThroneResultsAction() {
      const { persisted, session } = get();
      const current: GameState = { persisted, session };
      const nextState = checkPendingThroneResults(current);
      if (nextState !== current) {
        saveState(nextState.persisted);
        set(nextState);
      }
    },

    resetGame() {
      const persisted = createInitialState();
      saveState(persisted);
      set({ persisted, session: INITIAL_SESSION });
    },
  };
});
