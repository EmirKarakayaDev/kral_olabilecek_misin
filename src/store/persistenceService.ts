import { createMMKV } from 'react-native-mmkv';
import type { MMKV } from 'react-native-mmkv';
import type { PersistedState } from '../types/state';

const storage: MMKV = createMMKV({ id: 'game-store' });
const STORAGE_KEY = 'game_state';

export function loadState(): PersistedState | null {
  const raw = storage.getString(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): void {
  storage.set(STORAGE_KEY, JSON.stringify(state));
}

export function clearState(): void {
  storage.remove(STORAGE_KEY);
}
