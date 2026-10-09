import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import AppText from './components/AppText';

const PRESETS = [3, 5, 10];

const QUOTES = [
  'หายใจเข้าช้า ๆ',
  'หายใจออกยาว ๆ',
  'วางใจไว้ที่ลมหายใจ',
  'คิดผ่านไปได้ ปล่อยวาง',
  'ใจสงบ กายเบา',
];

export default function FocusScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const initialMinutes = Number(params.minutes) || 5;

  const [minutes, setMinutes] = useState(initialMinutes);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const quoteRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (quoteRef.current) clearInterval(quoteRef.current);
    };
  }, []);

  useEffect(() => {
    if (!running) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (quoteRef.current) clearInterval(quoteRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (quoteRef.current) clearInterval(quoteRef.current);
          setRunning(false);
          setDone(true);
          saveMerit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    quoteRef.current = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % QUOTES.length);
    }, 8000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (quoteRef.current) clearInterval(quoteRef.current);
    };
  }, [running]);

  const formatTime = (total: number) => {
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const startFocus = () => {
    setDone(false);
    setSecondsLeft(minutes * 60);
    setQuoteIndex(0);
    setRunning(true);
  };

  const stopFocus = () => {
    setRunning(false);
    setSecondsLeft(0);
    setDone(false);
  };

  const saveMerit = async () => {
    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];

      await supabase.from('daily_merits').insert({
        user_id: user.id,
        merit_type: 'prayer',
        points: 1,
        merit_date: today,
      });
    } catch (e) {
      console.log('save merit error', e);
    } finally {
      setSaving(false);
    }
  };

  const progress =
    running || done
      ? 1 - secondsLeft / Math.max(minutes * 60, 1)
      : 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1E1B4B', '#312E81', '#4C1D95']} style={styles.gradient}>
        <SafeAreaView style={styles.safe}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="close" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>โหมดสงบ</AppText>
            <View style={{ width: 40 }} />
          </View>

          {/* Content */}
          <View style={styles.center}>
            {!running && !done ? (
              <>
                <Text style={styles.emoji}>🧘</Text>
                <AppText style={styles.title}>ตั้งใจสงบสักครู่</AppText>
                <AppText style={styles.subtitle}>เลือกเวลา แล้วเริ่มหายใจช้า ๆ</AppText>

                <View style={styles.presetRow}>
                  {PRESETS.map((m) => {
                    const active = minutes === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[styles.presetBtn, active && styles.presetActive]}
                        onPress={() => setMinutes(m)}
                      >
                        <AppText style={[styles.presetText, active && styles.presetTextActive]}>
                          {m} นาที
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TouchableOpacity style={styles.startBtn} onPress={startFocus} activeOpacity={0.9}>
                  <Ionicons name="play" size={20} color="#4C1D95" />
                  <AppText style={styles.startText}>เริ่มโหมดสงบ</AppText>
                </TouchableOpacity>
              </>
            ) : null}

            {running ? (
              <>
                <View style={styles.timerRing}>
                  <View style={[styles.timerProgress, { opacity: 0.25 + progress * 0.5 }]} />
                  <Text style={styles.timerText}>{formatTime(secondsLeft)}</Text>
                </View>
                <AppText style={styles.quote}>{QUOTES[quoteIndex]}</AppText>
                <TouchableOpacity style={styles.stopBtn} onPress={stopFocus}>
                  <Ionicons name="stop" size={18} color="#fff" />
                  <AppText style={styles.stopText}>หยุด</AppText>
                </TouchableOpacity>
              </>
            ) : null}

            {done ? (
              <>
                <Text style={styles.emoji}>🙏</Text>
                <AppText style={styles.title}>อนุโมทนา</AppText>
                <AppText style={styles.subtitle}>
                  คุณใช้เวลาสงบ {minutes} นาที{'\n'}บันทึกเป็นบุญประจำวันแล้ว
                </AppText>
                {saving ? (
                  <ActivityIndicator color="#E9D5FF" style={{ marginTop: 16 }} />
                ) : (
                  <View style={styles.doneActions}>
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={() => router.push('/journal' as any)}
                    >
                      <AppText style={styles.secondaryText}>เขียนบันทึกสั้น</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.startBtn} onPress={startFocus}>
                      <AppText style={styles.startText}>เริ่มอีกครั้ง</AppText>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => router.back()}>
                      <AppText style={styles.linkText}>กลับ</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1B4B' },
  gradient: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 28,
  },

  presetRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  presetBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  presetActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  presetText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 13 },
  presetTextActive: { color: '#4C1D95' },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  startText: { color: '#4C1D95', fontWeight: '800', fontSize: 15 },

  timerRing: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  timerProgress: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(233,213,255,0.15)',
  },
  timerText: {
    color: '#fff',
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: 2,
  },
  quote: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 36,
    textAlign: 'center',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  stopText: { color: '#fff', fontWeight: '700' },

  doneActions: {
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    width: '100%',
  },
  secondaryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  secondaryText: { color: '#fff', fontWeight: '700' },
  linkText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    fontWeight: '600',
  },
});