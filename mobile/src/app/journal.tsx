import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

// ใส่ key ใน mobile/.env เท่านั้น
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

type Mood = {
  key: string;
  label: string;
  emoji: string;
};

const MOODS: Mood[] = [
  { key: 'happy', label: 'สดใส', emoji: '😊' },
  { key: 'calm', label: 'สงบ', emoji: '😌' },
  { key: 'stressed', label: 'หนักใจ', emoji: '😔' },
  { key: 'grateful', label: 'ซาบซึ้ง', emoji: '🙏' },
];

async function askJournalAI(content: string): Promise<string> {
  const fallback =
    'ขอบคุณที่แบ่งปันความรู้สึกนะ ขอให้ใจเบาและมีกำลังใจในวันนี้';

  if (!GROQ_API_KEY) {
    return fallback;
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.7,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'คุณเป็นเพื่อนทางธรรม พูดสุภาพ อบอุ่น ภาษาไทยสั้น ๆ 2-3 ประโยค ให้กำลังใจ ไม่เทศน์ยาว ไม่ตัดสินผู้ใช้',
          },
          {
            role: 'user',
            content: `ผู้ใช้เพิ่งเขียนบันทึกสั้นว่า:\n"${content}"\n\nช่วยตอบกลับสั้น ๆ ให้กำลังใจ`,
          },
        ],
      }),
    });

    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) return fallback;
    return reply;
  } catch {
    return 'ขอบคุณที่บันทึกความรู้สึกไว้ ขอให้วันนี้ใจสงบและอ่อนโยนกับตัวเอง';
  }
}

export default function JournalScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  const loadJournals = useCallback(async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('แจ้งเตือน', 'กรุณาเข้าสู่ระบบก่อน');
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.log(e);
      Alert.alert('ผิดพลาด', 'โหลดบันทึกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadJournals();
  }, [loadJournals]);

  const handleSave = async () => {
    const content = text.trim();
    if (!content) {
      Alert.alert('แจ้งเตือน', 'กรุณาเขียนข้อความสั้น ๆ ก่อนบันทึก');
      return;
    }

    try {
      setSaving(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: row, error } = await supabase
        .from('journals')
        .insert({
          user_id: user.id,
          content,
          mood,
        })
        .select()
        .single();

      if (error) throw error;

      const aiReply = await askJournalAI(content);

      const { error: updateError } = await supabase
        .from('journals')
        .update({ ai_reply: aiReply })
        .eq('id', row.id);

      if (updateError) throw updateError;

      setText('');
      setMood(null);
      await loadJournals();
      Alert.alert('บันทึกแล้ว', 'AI ตอบกลับให้คุณแล้ว');
    } catch (e: any) {
      console.log(e);
      Alert.alert('ผิดพลาด', e.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const moodMeta = (key?: string | null) =>
    MOODS.find((m) => m.key === key) || null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>บันทึกใจสั้น ๆ</AppText>
            <View style={{ width: 40 }} />
          </View>
          <AppText style={styles.headerSub}>
            เขียนสั้น ๆ แล้วให้ AI เป็นเพื่อนตอบกลับ
          </AppText>
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.composer,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <AppText style={[styles.label, { color: colors.text }]}>
              วันนี้ใจเป็นอย่างไร
            </AppText>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: colors.border,
                },
              ]}
              placeholder="เช่น ไปวัดแล้วใจเบาขึ้น..."
              placeholderTextColor={colors.textSecondary}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={300}
            />
            <Text style={[styles.counter, { color: colors.textSecondary }]}>
              {text.length}/300
            </Text>

            <AppText style={[styles.label, { marginTop: 12, color: colors.text }]}>
              อารมณ์ (ไม่บังคับ)
            </AppText>
            <View style={styles.moodRow}>
              {MOODS.map((m) => {
                const active = mood === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[
                      styles.moodChip,
                      {
                        backgroundColor: active
                          ? isDark
                            ? '#4C1D95'
                            : '#F5F3FF'
                          : isDark
                          ? '#1E293B'
                          : '#F8FAFC',
                        borderColor: active
                          ? isDark
                            ? '#A78BFA'
                            : '#C4B5FD'
                          : colors.border,
                      },
                    ]}
                    onPress={() => setMood(active ? null : m.key)}
                  >
                    <Text style={styles.moodEmoji}>{m.emoji}</Text>
                    <AppText
                      style={[
                        styles.moodText,
                        {
                          color: active
                            ? isDark
                              ? '#E9D5FF'
                              : '#6D28D9'
                            : colors.textSecondary,
                        },
                      ]}
                    >
                      {m.label}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#EC4899', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <AppText style={styles.saveText}>บันทึก + ให้ AI ตอบ</AppText>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            บันทึกล่าสุด
          </AppText>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : items.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <AppText style={[styles.emptyTitle, { color: colors.text }]}>
                ยังไม่มีบันทึก
              </AppText>
              <AppText style={[styles.emptySub, { color: colors.textSecondary }]}>
                ลองเขียนสั้น ๆ 1–2 ประโยคเกี่ยวกับวันนี้
              </AppText>
            </View>
          ) : (
            items.map((item) => {
              const m = moodMeta(item.mood);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardDate, { color: colors.textSecondary }]}>
                      {new Date(item.created_at).toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    {m ? (
                      <AppText
                        style={[
                          styles.cardMood,
                          { color: isDark ? '#C4B5FD' : '#7C3AED' },
                        ]}
                      >
                        {m.emoji} {m.label}
                      </AppText>
                    ) : null}
                  </View>

                  <Text style={[styles.cardContent, { color: colors.text }]}>
                    {item.content}
                  </Text>

                  {item.ai_reply ? (
                    <View
                      style={[
                        styles.aiBox,
                        {
                          backgroundColor: isDark ? '#2E1065' : '#F5F3FF',
                          borderColor: isDark ? '#6D28D9' : '#E9D5FF',
                        },
                      ]}
                    >
                      <View style={styles.aiHeader}>
                        <Ionicons
                          name="sparkles"
                          size={14}
                          color={isDark ? '#C4B5FD' : '#7C3AED'}
                        />
                        <AppText
                          style={[
                            styles.aiLabel,
                            { color: isDark ? '#C4B5FD' : '#7C3AED' },
                          ]}
                        >
                          AI เพื่อนธรรม
                        </AppText>
                      </View>
                      <Text
                        style={[
                          styles.aiText,
                          { color: isDark ? '#E9D5FF' : '#4C1D95' },
                        ]}
                      >
                        {item.ai_reply}
                      </Text>
                    </View>
                  ) : (
                    <AppText style={[styles.aiPending, { color: colors.textSecondary }]}>
                      กำลังรอคำตอบจาก AI...
                    </AppText>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },

  scroll: { padding: 16, paddingBottom: 40 },
  composer: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontSize: 11,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  moodEmoji: { fontSize: 14 },
  moodText: { fontSize: 12, fontWeight: '600' },

  saveBtn: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  emptyBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13, marginTop: 4, textAlign: 'center' },

  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardDate: { fontSize: 12, fontWeight: '600' },
  cardMood: { fontSize: 12, fontWeight: '700' },
  cardContent: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10,
  },
  aiBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiLabel: { fontSize: 12, fontWeight: '700' },
  aiText: { fontSize: 13, lineHeight: 20 },
  aiPending: { fontSize: 12, fontStyle: 'italic' },
});