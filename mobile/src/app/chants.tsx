import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../components/AppText' หรือ '../../components/AppText'

const MOODS = [
  { key: 'anxious', label: 'ไม่สบายใจ', emoji: '😔', tags: ['ไม่สบายใจ', 'เครียด', 'วิตก'] },
  { key: 'fear', label: 'กลัว', emoji: '😨', tags: ['กลัว', 'ไม่ปลอดภัย'] },
  { key: 'sick', label: 'ไม่สบายตัว', emoji: '🤒', tags: ['ป่วย', 'อ่อนแรง', 'นอนไม่หลับ'] },
  { key: 'calm', label: 'อยากสงบ', emoji: '🧘', tags: ['สงบ', 'สมาธิ', 'เริ่มต้น'] },
  { key: 'thanks', label: 'ขอบพระคุณ', emoji: '🙏', tags: ['ขอบคุณ', 'ทำบุญ', 'อุทิศ'] },
];

export default function ChantsScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [chants, setChants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [recommended, setRecommended] = useState<any[]>([]);

  const loadChants = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('chants')
        .select('*')
        .eq('is_active', true)
        .order('title');

      if (search.trim()) {
        query = query.or(
          `title.ilike.%${search.trim()}%,summary.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      setChants(data || []);
    } catch (e) {
      console.log('loadChants error', e);
      setChants([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadChants();
  }, [loadChants]);

  useEffect(() => {
    if (!selectedMood) {
      setRecommended([]);
      return;
    }
    const mood = MOODS.find((m) => m.key === selectedMood);
    if (!mood) {
      setRecommended([]);
      return;
    }
    const tags = mood.tags.map((t) => t.toLowerCase());
    const filtered = chants.filter((c) => {
      const hay = `${c.title || ''} ${c.summary || ''} ${c.category || ''} ${
        c.tags || ''
      }`.toLowerCase();
      return tags.some((t) => hay.includes(t));
    });
    setRecommended(filtered.slice(0, 5));
  }, [selectedMood, chants]);

  const openDetail = (id: string) => {
    router.push({ pathname: '/chant-detail' as any, params: { id } });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.headerBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <AppText style={[styles.headerTitle, { color: colors.text }]}>
              บทสวดมนต์
            </AppText>
            <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>
              เลือกตามอารมณ์หรือค้นหาบทที่ต้องการ
            </AppText>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <LinearGradient
          colors={isDark ? ['#4C1D95', '#5B21B6'] : ['#7C3AED', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <AppText style={styles.heroTitle}>สวดมนต์ตามใจ</AppText>
          <AppText style={styles.heroSub}>
            เลือกอารมณ์ด้านล่าง ระบบจะแนะนำบทสวดที่เหมาะสม
          </AppText>
        </LinearGradient>

        {/* Mood */}
        <View style={styles.sectionPad}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            ตอนนี้รู้สึกอย่างไร?
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.moodRow}>
              {MOODS.map((m) => {
                const active = selectedMood === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.moodCard,
                      {
                        backgroundColor: active
                          ? '#7C3AED'
                          : colors.card,
                        borderColor: active ? '#7C3AED' : colors.border,
                      },
                    ]}
                    onPress={() =>
                      setSelectedMood((prev) => (prev === m.key ? null : m.key))
                    }
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <AppText
                      style={[
                        styles.moodLabel,
                        { color: active ? '#fff' : colors.text },
                      ]}
                    >
                      {m.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Recommended */}
        {selectedMood && (
          <View style={styles.sectionPad}>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              แนะนำสำหรับคุณ
            </AppText>
            {recommended.length === 0 ? (
              <AppText style={{ color: colors.textSecondary, marginBottom: 8 }}>
                ยังไม่มีบทที่ตรงอารมณ์นี้ ลองเลือกอารมณ์อื่นหรือค้นหาด้านล่าง
              </AppText>
            ) : (
              recommended.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.recommendCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isDark ? colors.border : '#E9D5FF',
                    },
                  ]}
                  onPress={() => openDetail(item.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.listIcon}>
                    <Ionicons name="sparkles" size={20} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.chantTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!!item.summary && (
                      <Text
                        style={[styles.chantSummary, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.summary}
                      </Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Search */}
        <View style={styles.sectionPad}>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="ค้นหาบทสวด..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {!!search && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* All list */}
        <View style={styles.sectionPad}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            บทสวดทั้งหมด
          </AppText>

          {loading ? (
            <View style={{ paddingVertical: 30, alignItems: 'center' }}>
              <ActivityIndicator color="#7C3AED" />
              <AppText style={{ marginTop: 10, color: colors.textSecondary }}>
                กำลังโหลด...
              </AppText>
            </View>
          ) : chants.length === 0 ? (
            <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
              ไม่พบบทสวด
            </AppText>
          ) : (
            chants.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.listCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => openDetail(item.id)}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.listIcon,
                    { backgroundColor: isDark ? '#312E81' : '#F5F3FF' },
                  ]}
                >
                  <Ionicons name="book-outline" size={20} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chantTitle, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {!!item.summary && (
                    <Text
                      style={[styles.chantSummary, { color: colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {item.summary}
                    </Text>
                  )}
                  {(!!item.category || !!item.duration_text) && (
                    <Text style={[styles.chantMeta, { color: colors.textSecondary }]}>
                      {[item.category, item.duration_text].filter(Boolean).join(' · ')}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },

  hero: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
  },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 20 },

  sectionPad: { paddingHorizontal: 16, marginTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

  moodRow: { flexDirection: 'row', gap: 10, paddingRight: 8 },
  moodCard: {
    width: 96,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: 'center',
  },
  moodEmoji: { fontSize: 22, marginBottom: 4 },
  moodLabel: { fontSize: 12, fontWeight: '700' },

  recommendCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
  },

  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
  },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chantTitle: { fontSize: 15, fontWeight: '800' },
  chantSummary: { fontSize: 12, marginTop: 4, lineHeight: 18 },
  chantMeta: { fontSize: 12, marginTop: 3 },
  emptyText: { textAlign: 'center', marginVertical: 16, fontSize: 14 },
});