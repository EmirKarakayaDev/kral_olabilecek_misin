import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardView } from '@/components/CardView';
import { ResourceBars } from '@/components/ResourceBars';
import { SAMPLE_DECK } from '@/data/sampleDeck';
import { useGameStore } from '@/store/useGameStore';
import type { SwipeCard } from '@/types/card';

function pickSwipeCard(deck: SwipeCard[], store: ReturnType<typeof useGameStore.getState>): SwipeCard | null {
  const result = store.selectNextCardAction(deck);
  return result?.type === 'swipe' ? result : null;
}

export default function GameScreen() {
  const store = useGameStore();
  const { persisted, applyChoiceAction, selectNextCardAction } = store;

  const [activeCard, setActiveCard] = useState<SwipeCard | null>(() => {
    const result = selectNextCardAction(SAMPLE_DECK);
    return result?.type === 'swipe' ? result : null;
  });

  function handleSwipe(direction: 'left' | 'right') {
    if (!activeCard) return;
    applyChoiceAction(activeCard, direction);
    const next = selectNextCardAction(SAMPLE_DECK);
    setActiveCard(next?.type === 'swipe' ? next : null);
  }

  const totalCardsPlayed = persisted.character.totalCardsPlayed;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ResourceBars resources={persisted.character.resources} />

      <View style={styles.cardArea}>
        {activeCard ? (
          <CardView
            key={totalCardsPlayed}
            card={activeCard}
            onSwipe={handleSwipe}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Deste Bitti</Text>
            <Text style={styles.emptySubtitle}>Tüm kartlar oynandı.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  cardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#e0b060',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666688',
  },
});
