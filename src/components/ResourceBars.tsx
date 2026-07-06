import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import type { StageResources } from '../types/state';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = SCREEN_WIDTH - 148;

type BarInfo = {
  key: string;
  label: string;
  icon: string;
  value: number;
  color: string;
};

function getBars(resources: StageResources): BarInfo[] {
  switch (resources.stage) {
    case 1:
      return [
        { key: 'saglik', label: 'Sağlık', icon: '❤️', value: resources.saglik, color: '#e74c3c' },
        { key: 'aclik', label: 'Açlık', icon: '🍞', value: resources.aclik, color: '#e67e22' },
        { key: 'borc', label: 'Borç', icon: '💰', value: resources.borc, color: '#9b59b6' },
        { key: 'itibar', label: 'İtibar', icon: '⭐', value: resources.itibar, color: '#f1c40f' },
      ];
    case 2:
      return [
        { key: 'para', label: 'Para', icon: '💰', value: resources.para, color: '#f1c40f' },
        { key: 'itibar', label: 'İtibar', icon: '⭐', value: resources.itibar, color: '#e67e22' },
        { key: 'guvenlik', label: 'Güvenlik', icon: '🛡️', value: resources.guvenlik, color: '#3498db' },
        { key: 'baglanti', label: 'Bağlantı', icon: '🤝', value: resources.baglanti, color: '#2ecc71' },
      ];
    case 3:
      return [
        { key: 'sadakat', label: 'Sadakat', icon: '⚔️', value: resources.sadakat, color: '#e74c3c' },
        { key: 'nufuz', label: 'Nüfuz', icon: '👑', value: resources.nufuz, color: '#9b59b6' },
        { key: 'tehdit', label: 'Tehdit', icon: '🗡️', value: resources.tehdit, color: '#e67e22' },
        { key: 'kralin_gozu', label: 'Kralın Gözü', icon: '👁️', value: resources.kralin_gozu, color: '#1abc9c' },
      ];
    case 4:
      return [
        { key: 'servet', label: 'Servet', icon: '💎', value: resources.servet, color: '#f1c40f' },
        { key: 'ittifak', label: 'İttifak', icon: '🤝', value: resources.ittifak, color: '#2ecc71' },
        { key: 'ordu', label: 'Ordu', icon: '⚔️', value: resources.ordu, color: '#e74c3c' },
        { key: 'halk_destegi', label: 'Halk', icon: '👥', value: resources.halk_destegi, color: '#3498db' },
      ];
    case 5:
      return [];
    case 6:
      return [
        { key: 'hazine', label: 'Hazine', icon: '💰', value: resources.hazine, color: '#f1c40f' },
        { key: 'halk', label: 'Halk', icon: '👥', value: resources.halk, color: '#3498db' },
        { key: 'ordu', label: 'Ordu', icon: '⚔️', value: resources.ordu, color: '#e74c3c' },
        { key: 'din', label: 'Din', icon: '✨', value: resources.din, color: '#9b59b6' },
      ];
  }
}

type BarItemProps = {
  bar: BarInfo;
};

function BarItem({ bar }: BarItemProps) {
  const fillWidth = useSharedValue((bar.value / 100) * TRACK_WIDTH);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    fillWidth.value = withTiming((bar.value / 100) * TRACK_WIDTH, { duration: 320 });
  }, [bar.value, fillWidth]);

  useEffect(() => {
    if (bar.value === 0) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 380 }),
          withTiming(1, { duration: 380 }),
        ),
        -1,
      );
    } else {
      cancelAnimation(pulseOpacity);
      pulseOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [bar.value, pulseOpacity]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  const rowStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const fillColor = bar.value === 0 ? '#e74c3c' : bar.color;

  return (
    <Animated.View style={[styles.barRow, rowStyle]}>
      <Text style={styles.icon}>{bar.icon}</Text>
      <Text style={styles.label}>{bar.label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
      </View>
    </Animated.View>
  );
}

type Props = {
  resources: StageResources;
};

export function ResourceBars({ resources }: Props) {
  const bars = getBars(resources);
  if (bars.length === 0) return null;

  return (
    <View style={styles.container}>
      {bars.map((bar) => (
        <BarItem key={bar.key} bar={bar} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 22,
  },
  icon: {
    fontSize: 14,
    width: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    color: '#8888aa',
    width: 80,
    marginLeft: 4,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1a1a3a',
    overflow: 'hidden',
  },
  fill: {
    height: 6,
    borderRadius: 3,
  },
});
