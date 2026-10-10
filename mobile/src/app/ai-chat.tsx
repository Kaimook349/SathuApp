import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

// ========== Groq API (ใส่ key ใน .env เท่านั้น) ==========
const AI_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const AI_BASE_URL = 'https://api.groq.com/openai/v1';

const MODELS_TO_TRY = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
];
// ========================================================

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

const SYSTEM_PROMPT = `คุณคือ "สาธุ AI" ผู้ช่วยด้านพระพุทธศาสนาและการทำบุญของแอป Sathu
ตอบเป็นภาษาไทย สุภาพ อบอุ่น เข้าใจง่าย
หัวข้อที่คุณเชี่ยวชาญ:
- ธรรมะ คำสอนพุทธ กรรม บุญ กุศล
- วันพระ วันสำคัญทางพุทธศาสนา
- การทำบุญ ตักบาตร ถวายสังฆทาน ลอยกระทง
- พิธีสงฆ์ กิจกรรมวัด การปฏิบัติธรรม
- การแนะนำแนวทางการทำความดีในชีวิตประจำวัน

กฎ:
- ตอบสั้นกระชับ ชัดเจน
- ถ้าไม่แน่ใจ ให้บอกว่าควรปรึกษาพระหรือผู้รู้
- ไม่วิพากษ์ศาสนาอื่นในทางลบ
- ไม่ให้คำแนะนำทางการแพทย์หรือการเงินแบบเด็ดขาด
- ลงท้ายด้วยความเมตตาเมื่อเหมาะสม`;

export default function AIChatScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'สวัสดีครับ 🙏 ผมคือสาธุ AI\nพร้อมตอบคำถามเรื่องธรรมะ ทำบุญ วันพระ และกิจกรรมวัด\nมีอะไรให้ช่วยไหมครับ?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextInfo, setContextInfo] = useState('');
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    loadAppContext();
  }, []);

  const loadAppContext = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let ctx = '';
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, first_name')
          .eq('id', user.id)
          .single();
        const name = profile?.username || profile?.first_name || '';
        if (name) ctx += `ชื่อผู้ใช้: ${name}\n`;
      }

      const { data: activities } = await supabase
        .from('temples_activities')
        .select('activity_name, temple_name, province, event_date, event_time')
        .eq('status', 'approved')
        .order('event_date', { ascending: true })
        .limit(3);

      if (activities && activities.length > 0) {
        ctx += 'กิจกรรมที่กำลังจะมาถึงในแอป:\n';
        activities.forEach((a) => {
          ctx += `- ${a.activity_name} @ ${a.temple_name || ''} (${a.province || ''}) ${a.event_date || ''} ${a.event_time || ''}\n`;
        });
      }

      setContextInfo(ctx);
    } catch (e) {
      console.log('Context load error:', e);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (!AI_API_KEY) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'user',
          content: text,
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'ยังไม่ได้ตั้งค่า AI\nกรุณาใส่ EXPO_PUBLIC_GROQ_API_KEY ในไฟล์ mobile/.env แล้วรีสตาร์ทแอป',
        },
      ]);
      setInput('');
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== 'welcome')
        .slice(-10)
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const systemContent = contextInfo
        ? `${SYSTEM_PROMPT}\n\nข้อมูลจากแอปปัจจุบัน:\n${contextInfo}`
        : SYSTEM_PROMPT;

      let lastError = '';
      let reply = '';

      for (const model of MODELS_TO_TRY) {
        try {
          const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${AI_API_KEY}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'system', content: systemContent }, ...history],
              temperature: 0.7,
              max_tokens: 800,
            }),
          });

          const data = await response.json();
          console.log(`[AI] model=${model} status=${response.status}`);

          if (response.ok && data.choices?.[0]?.message?.content) {
            reply = data.choices[0].message.content.trim();
            break;
          }

          lastError =
            data.error?.message ||
            data.message ||
            `HTTP ${response.status}`;
        } catch (err: any) {
          lastError = err?.message || String(err);
        }
      }

      if (!reply) {
        throw new Error(
          typeof lastError === 'string' ? lastError : JSON.stringify(lastError)
        );
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
        },
      ]);
    } catch (error: any) {
      console.error('AI Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `เกิดข้อผิดพลาด: ${error.message || 'เชื่อมต่อ AI ไม่ได้'}\nลองใหม่อีกครั้งนะครับ`,
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 120);
    }
  };

  const quickQuestions = [
    'วันพระถัดไปคือวันไหน?',
    'ทำบุญวันเกิดทำอย่างไร?',
    'ความหมายของกรรมคืออะไร?',
    'ลอยกระทงมีความหมายว่าอะไร?',
  ];

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        {!isUser && (
          <View style={[styles.botAvatar, { backgroundColor: colors.primary }]}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
        )}
        <View
          style={[
            styles.bubble,
            isUser
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [
                  styles.botBubble,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ],
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              { color: isUser ? '#fff' : colors.text },
            ]}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <AppText style={styles.headerTitle}>สาธุ AI</AppText>
          <AppText style={styles.headerSub}>ผู้ช่วยธรรมะ · ใช้งานได้จริง</AppText>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            loading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                  กำลังคิด...
                </AppText>
              </View>
            ) : null
          }
        />

        {messages.length <= 2 && (
          <View style={styles.quickBox}>
            <AppText style={[styles.quickLabel, { color: colors.textSecondary }]}>
              ลองถาม:
            </AppText>
            <View style={styles.quickRow}>
              {quickQuestions.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[
                    styles.quickChip,
                    {
                      backgroundColor: isDark ? '#4C1D95' : '#F3E8FF',
                    },
                  ]}
                  onPress={() => setInput(q)}
                >
                  <AppText
                    style={[
                      styles.quickChipText,
                      { color: isDark ? '#E9D5FF' : '#7C3AED' },
                    ]}
                  >
                    {q}
                  </AppText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View
          style={[
            styles.inputBar,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                color: colors.text,
              },
            ]}
            placeholder="ถามเรื่องธรรมะ ทำบุญ วันพระ..."
            placeholderTextColor={colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!input.trim() || loading) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  listContent: { padding: 16, paddingBottom: 8 },

  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 14,
    alignItems: 'flex-end',
  },
  bubbleRowUser: { justifyContent: 'flex-end' },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  botBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 22 },

  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 40,
    marginBottom: 10,
  },
  loadingText: { fontSize: 13 },

  quickBox: { paddingHorizontal: 16, paddingBottom: 8 },
  quickLabel: { fontSize: 12, marginBottom: 8 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  quickChipText: { fontSize: 12, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C4B5FD' },
});