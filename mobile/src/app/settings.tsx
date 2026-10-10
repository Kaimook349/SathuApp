import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';
// ถ้า error ลอง './components/AppText' หรือ '../../components/AppText'

export default function SettingsScreen() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const { mode, setMode, colors, isDark } = useTheme();

  const handleLogout = () => {
    // ใช้ข้อความคงที่ ไม่ต้อง await translateText ใน Alert
    const title = lang === 'en' ? 'Log out' : 'ออกจากระบบ';
    const cancel = lang === 'en' ? 'Cancel' : 'ยกเลิก';

    Alert.alert(title, '', [
      { text: cancel, style: 'cancel' },
      {
        text: title,
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.card }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>

          <AppText style={[styles.title, { color: colors.text }]}>
            การตั้งค่า
          </AppText>

          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ภาษา */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ภาษา
          </AppText>

          <TouchableOpacity
            style={[
              styles.optionRow,
              { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
              lang === 'th' && [
                styles.optionActive,
                isDark && { backgroundColor: '#2E1065', borderColor: '#7C3AED' },
              ],
            ]}
            onPress={() => setLang('th')}
          >
            {/* ชื่อภาษาไม่ต้องแปล */}
            <AppText
              noTranslate
              style={[styles.optionText, { color: colors.text }]}
            >
              ภาษาไทย
            </AppText>
            {lang === 'th' && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionRow,
              { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
              lang === 'en' && [
                styles.optionActive,
                isDark && { backgroundColor: '#2E1065', borderColor: '#7C3AED' },
              ],
            ]}
            onPress={() => setLang('en')}
          >
            <AppText
              noTranslate
              style={[styles.optionText, { color: colors.text }]}
            >
              English
            </AppText>
            {lang === 'en' && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* ธีม */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            ธีม
          </AppText>

          {(
            [
              { key: 'light', label: 'สว่าง', icon: 'sunny-outline' },
              { key: 'dark', label: 'มืด', icon: 'moon-outline' },
              { key: 'system', label: 'ตามระบบ', icon: 'phone-portrait-outline' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.optionRow,
                { backgroundColor: isDark ? '#0F172A' : '#F8FAFC' },
                mode === item.key && [
                  styles.optionActive,
                  isDark && { backgroundColor: '#2E1065', borderColor: '#7C3AED' },
                ],
              ]}
              onPress={() => setMode(item.key)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={
                    mode === item.key ? colors.primary : colors.textSecondary
                  }
                />
                <AppText style={[styles.optionText, { color: colors.text }]}>
                  {item.label}
                </AppText>
              </View>
              {mode === item.key && (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* บัญชี */}
        <View
          style={[
            styles.section,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <AppText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            บัญชี
          </AppText>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <AppText style={[styles.logoutText, { color: colors.danger }]}>
              ออกจากระบบ
            </AppText>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800' },

  section: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  optionActive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionText: { fontSize: 16, fontWeight: '700' },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
});