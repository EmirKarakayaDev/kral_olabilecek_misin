import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { SwipeCard } from '../types/card';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.35;
const LABEL_THRESHOLD = 28;

type Props = {
  card: SwipeCard;
  onSwipe: (direction: 'left' | 'right') => void;
};

export function CardView({ card, onSwipe }: Props) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const canSwipe = useSharedValue(true);

  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (!canSwipe.value) return;
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.15;
    })
    .onEnd((e) => {
      if (!canSwipe.value) return;
      if (Math.abs(e.translationX) >= SWIPE_THRESHOLD) {
        const dir: 'left' | 'right' = e.translationX > 0 ? 'right' : 'left';
        const targetX = dir === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
        canSwipe.value = false;
        translateX.value = withTiming(targetX, { duration: 260 }, (finished) => {
          if (finished) runOnJS(onSwipe)(dir);
        });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
      [-12, 0, 12],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const leftOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, -SWIPE_THRESHOLD],
      [0, 0.35],
      Extrapolation.CLAMP,
    ),
  }));

  const rightOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, SWIPE_THRESHOLD],
      [0, 0.35],
      Extrapolation.CLAMP,
    ),
  }));

  const leftLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-LABEL_THRESHOLD, -SWIPE_THRESHOLD * 0.65],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const rightLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [LABEL_THRESHOLD, SWIPE_THRESHOLD * 0.65],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, cardStyle]}>
        {/* Tint overlays */}
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.overlayLeft, leftOverlayStyle]}
          pointerEvents="none"
        />
        <Animated.View
          style={[StyleSheet.absoluteFillObject, styles.overlayRight, rightOverlayStyle]}
          pointerEvents="none"
        />

        {/* Choice labels — appear during drag */}
        <Animated.View style={[styles.choiceLabel, styles.leftLabel, leftLabelStyle]}>
          <Text style={[styles.choiceText, styles.leftChoiceText]}>{card.leftChoice.text}</Text>
        </Animated.View>
        <Animated.View style={[styles.choiceLabel, styles.rightLabel, rightLabelStyle]}>
          <Text style={[styles.choiceText, styles.rightChoiceText]}>{card.rightChoice.text}</Text>
        </Animated.View>

        {/* Card content */}
        <View style={styles.content}>
          <Text style={styles.npcName}>{card.npcId}</Text>
          <Text style={styles.dialogue}>{card.dialogue}</Text>
        </View>

        {/* Drag hint */}
        <View style={styles.hintRow}>
          <Text style={styles.hintText}>← {card.leftChoice.text}</Text>
          <Text style={styles.hintText}>{card.rightChoice.text} →</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH * 0.86,
    backgroundColor: '#22224a',
    borderRadius: 18,
    padding: 24,
    paddingTop: 70,
    minHeight: 300,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  overlayLeft: {
    backgroundColor: '#c0392b',
    borderRadius: 18,
  },
  overlayRight: {
    backgroundColor: '#27ae60',
    borderRadius: 18,
  },
  choiceLabel: {
    position: 'absolute',
    top: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 2,
  },
  leftLabel: {
    left: 18,
    borderColor: '#e74c3c',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  rightLabel: {
    right: 18,
    borderColor: '#2ecc71',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  choiceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  leftChoiceText: {
    color: '#e74c3c',
  },
  rightChoiceText: {
    color: '#2ecc71',
  },
  content: {
    flex: 1,
  },
  npcName: {
    fontSize: 12,
    color: '#9999bb',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 18,
  },
  dialogue: {
    fontSize: 17,
    color: '#e8e8f0',
    lineHeight: 26,
  },
  hintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333366',
  },
  hintText: {
    fontSize: 12,
    color: '#555577',
  },
});
