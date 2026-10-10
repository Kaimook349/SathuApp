import React, { useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useTheme } from '../../context/ThemeContext';
import AppText from './AppText'; // ปรับ path ตามโปรเจกต์ เช่น './AppText' หรือ '../../components/AppText'

const NAV_CONFIG = [
  { name: 'home', label: 'หน้าหลัก', icon: 'home', activeIcon: 'home' },
  { name: 'activities', label: 'กิจกรรม', icon: 'body', activeIcon: 'body' },
  { name: 'merit', label: 'ทำบุญ', icon: 'sparkles', activeIcon: 'sparkles' },
  { name: 'map', label: 'สำรวจ', icon: 'compass', activeIcon: 'compass' },
  { name: 'profile', label: 'โปรไฟล์', icon: 'person', activeIcon: 'person' },
] as const;

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { colors, isDark } = useTheme();

  const scaleAnims = useRef(
    NAV_CONFIG.map(() => new Animated.Value(1))
  ).current;

  const handlePress = (index: number, routeName: string) => {
    const anim = scaleAnims[index];

    Animated.sequence([
      Animated.timing(anim, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
      Animated.timing(anim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();

    router.replace(`/${routeName}` as any);
  };

  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors?.card ?? '#FFFFFF',
          borderTopColor: colors?.border ?? '#E2E8F0',
        },
      ]}
    >
      {NAV_CONFIG.map((item, index) => {
        const isActive =
          pathname === `/${item.name}` ||
          (item.name === 'home' && (pathname === '/' || pathname === '/home'));

        const inactiveColor = isDark ? '#94A3B8' : '#9CA3AF';

        return (
          <TouchableOpacity
            key={item.name}
            activeOpacity={1}
            onPress={() => handlePress(index, item.name)}
          >
            <Animated.View
              style={[
                styles.navItem,
                { transform: [{ scale: scaleAnims[index] }] },
              ]}
            >
              <Ionicons
                name={(isActive ? item.activeIcon : item.icon) as any}
                size={24}
                color={isActive ? '#7C3AED' : inactiveColor}
              />
              <AppText
                style={[
                  styles.navText,
                  {
                    color: isActive ? '#7C3AED' : inactiveColor,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
              >
                {item.label}
              </AppText>
            </Animated.View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 15,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    width: 64,
  },
  navText: {
    fontSize: 11,
    marginTop: 4,
  },
});