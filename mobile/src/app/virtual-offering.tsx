import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

export default function VirtualOfferingScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [isLit, setIsLit] = useState(false);
  const [blessingText, setBlessingText] = useState(
    'ตั้งจิตอธิษฐาน แล้วกดปุ่ม "จุดธูปเทียน" เพื่อบูชาพระรัตนตรัย'
  );

  const smokeAnim = useRef(new Animated.Value(0)).current;
  const flameAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLit) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(smokeAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(smokeAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(flameAnim, {
            toValue: 1.15,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(flameAnim, {
            toValue: 0.9,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isLit]);

  const handleLightUp = async () => {
    setIsLit(true);
    setBlessingText(
      '🌟 สาธุ... ขอให้ท่านและครอบครัวประสบแต่ความสุข ความเจริญ มีสติและโชคลาภตลอดไป'
    );

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('donations').insert([
          {
            user_id: user.id,
            donor_name: 'ผู้มีจิตศรัทธา (จุดธูปออนไลน์)',
            amount: 0,
            payment_method: 'virtual_offering',
            status: 'success',
          },
        ]);
      }
    } catch (error) {
      console.log('Error saving offering:', error);
    }
  };

  const smokeTranslateY = smokeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -45],
  });

  const smokeOpacity = smokeAnim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0.8, 0.4, 0],
  });

  const headerBg = isDark ? '#0F172A' : '#1E1B4B';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: headerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor={headerBg} />

      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>สักการะบูชาออนไลน์</Text>
      </View>

      <View
        style={[
          styles.content,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.altarContainer}>
          <View style={styles.glowCircle} />
          <MaterialCommunityIcons
            name="image-filter-hdr"
            size={90}
            color="#FDE047"
            style={{ marginBottom: 10 }}
          />
          <Text style={styles.altarTitle}>พระพุทธรูปปางมงคล</Text>

          <View style={styles.offeringsRow}>
            <View style={styles.itemWrapper}>
              {isLit && (
                <Animated.View
                  style={[styles.flame, { transform: [{ scale: flameAnim }] }]}
                />
              )}
              <View style={styles.candleBody} />
            </View>

            <View style={styles.incensePotWrapper}>
              {isLit && (
                <View style={styles.smokeContainer}>
                  <Animated.View
                    style={[
                      styles.smokeParticle,
                      {
                        transform: [{ translateY: smokeTranslateY }],
                        opacity: smokeOpacity,
                      },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.smokeParticle2,
                      {
                        transform: [{ translateY: smokeTranslateY }],
                        opacity: smokeOpacity,
                      },
                    ]}
                  />
                </View>
              )}
              <View style={styles.sticksRow}>
                <View style={[styles.stick, isLit && styles.stickLit]} />
                <View style={[styles.stick, isLit && styles.stickLit]} />
                <View style={[styles.stick, isLit && styles.stickLit]} />
              </View>
              <View style={styles.potBody} />
            </View>

            <View style={styles.itemWrapper}>
              {isLit && (
                <Animated.View
                  style={[styles.flame, { transform: [{ scale: flameAnim }] }]}
                />
              )}
              <View style={styles.candleBody} />
            </View>
          </View>
        </View>

        <View
          style={[
            styles.messageCard,
            {
              backgroundColor: colors.card,
              borderColor: isDark ? colors.border : '#E9D5FF',
            },
          ]}
        >
          <MaterialCommunityIcons
            name="flower-tulip"
            size={24}
            color={isDark ? '#C4B5FD' : '#7C3AED'}
            style={{ marginBottom: 8 }}
          />
          <Text style={[styles.messageText, { color: colors.text }]}>
            {blessingText}
          </Text>
        </View>

        <View style={styles.footerContainer}>
          {!isLit ? (
            <TouchableOpacity
              style={styles.lightButton}
              onPress={handleLightUp}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons name="fire" size={22} color="#fff" />
              <Text style={styles.lightButtonText}>จุดธูปเทียนบูชา</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.resetButton,
                {
                  backgroundColor: isDark ? '#1E293B' : '#FAF5FF',
                  borderColor: isDark ? '#4C1D95' : '#D8B4FE',
                },
              ]}
              onPress={() => {
                setIsLit(false);
                setBlessingText(
                  'ตั้งจิตอธิษฐาน แล้วกดปุ่ม "จุดธูปเทียน" เพื่อบูชาพระรัตนตรัย'
                );
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="refresh"
                size={20}
                color={isDark ? '#C4B5FD' : '#7C3AED'}
              />
              <Text
                style={[
                  styles.resetButtonText,
                  { color: isDark ? '#C4B5FD' : '#7C3AED' },
                ]}
              >
                ลาพระ / เริ่มใหม่
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },

  content: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  altarContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#2E1065',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    marginTop: 10,
  },
  glowCircle: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(253, 224, 71, 0.15)',
    top: 30,
  },
  altarTitle: {
    color: '#FDE047',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },

  offeringsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    width: '80%',
    position: 'absolute',
    bottom: 25,
  },
  itemWrapper: { alignItems: 'center' },
  candleBody: {
    width: 14,
    height: 50,
    backgroundColor: '#F43F5E',
    borderRadius: 4,
  },
  flame: {
    width: 10,
    height: 16,
    backgroundColor: '#FBBF24',
    borderRadius: 8,
    marginBottom: 4,
  },

  incensePotWrapper: { alignItems: 'center', position: 'relative' },
  sticksRow: { flexDirection: 'row', gap: 6, marginBottom: -2 },
  stick: { width: 2, height: 45, backgroundColor: '#78716C' },
  stickLit: { backgroundColor: '#EF4444' },
  potBody: {
    width: 55,
    height: 35,
    backgroundColor: '#B45309',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderTopWidth: 2,
    borderTopColor: '#D97706',
  },

  smokeContainer: {
    position: 'absolute',
    top: -35,
    alignItems: 'center',
    width: 40,
    height: 40,
  },
  smokeParticle: {
    position: 'absolute',
    width: 6,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  smokeParticle2: {
    position: 'absolute',
    width: 8,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    left: 10,
  },

  messageCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },

  footerContainer: { width: '100%', marginBottom: 20 },
  lightButton: {
    backgroundColor: '#7C3AED',
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 6,
  },
  lightButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  resetButton: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  resetButtonText: { fontSize: 16, fontWeight: '700' },
});