import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

export default function ChantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const [chant, setChant] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChant();
  }, [id]);

  const loadChant = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('chants')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      setChant(data);
    } catch (e) {
      console.log(e);
      setChant(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    Alert.alert('สาธุ', 'ขออนุโมทนาบุญด้วยค่ะ', [
      { text: 'ตกลง', onPress: () => router.back() },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#7C3AED" />
        <AppText style={{ marginTop: 12, color: colors.textSecondary }}>
          กำลังโหลดบทสวด...
        </AppText>
      </View>
    );
  }

  if (!chant) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <Ionicons name="book-outline" size={48} color={colors.textSecondary} />
        <AppText style={{ marginTop: 12, color: colors.text, fontWeight: '700' }}>
          ไม่พบบทสวด
        </AppText>
        <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
          <AppText style={{ color: '#7C3AED', fontWeight: '700' }}>ย้อนกลับ</AppText>
        </TouchableOpacity>
      </View>
    );
  }

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
            <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
              {chant.title || 'บทสวด'}
            </Text>
            {!!chant.category && (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {chant.category}
              </Text>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta */}
        <View style={styles.metaRow}>
          {!!chant.duration_text && (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F5F3FF',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={14} color="#7C3AED" />
              <Text style={[styles.metaText, { color: colors.text }]}>
                {chant.duration_text}
              </Text>
            </View>
          )}
          {!!chant.level && (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: isDark ? '#1E293B' : '#ECFDF5',
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="leaf-outline" size={14} color="#10B981" />
              <Text style={[styles.metaText, { color: colors.text }]}>{chant.level}</Text>
            </View>
          )}
        </View>

        {/* สรุป */}
        {!!chant.summary && (
          <>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              สรุปสั้นๆ
            </AppText>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              {chant.summary}
            </Text>
          </>
        )}

        {/* เนื้อหาบทสวด */}
        <AppText style={[styles.sectionTitle, { color: colors.text }]}>บทสวด</AppText>
        <View
          style={[
            styles.contentBox,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.contentText, { color: colors.text }]}>
            {chant.content || chant.text || '—'}
          </Text>
        </View>

        {/* ประโยชน์ */}
        {!!chant.benefit && (
          <>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>
              อานิสงส์ / ประโยชน์
            </AppText>
            <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
              {chant.benefit}
            </Text>
          </>
        )}
      </ScrollView>

      {/* ปุ่มเสร็จสิ้น */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <LinearGradient
            colors={['#7C3AED', '#A78BFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.finishGradient}
          >
            <AppText style={styles.finishText}>เสร็จสิ้น · สาธุ</AppText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  backLink: { marginTop: 16, padding: 8 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '800' },

  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaText: { fontSize: 12, fontWeight: '600' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  contentBox: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 28,
    fontWeight: '500',
  },
  benefitText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopWidth: 1,
  },
  finishBtn: { borderRadius: 16, overflow: 'hidden' },
  finishGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  finishText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});