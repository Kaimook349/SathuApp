import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมล');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase()
      );

      if (error) throw error;

      Alert.alert('ส่งรหัสแล้ว', 'กรุณาตรวจสอบอีเมลเพื่อรับรหัส OTP 6 หลัก', [
        {
          text: 'ตกลง',
          onPress: () => {
            router.push({
              pathname: '/verify-otp' as any,
              params: { email: email.trim().toLowerCase() },
            });
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งรหัสได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1E1B4B' : '#311060' },
      ]}
    >
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.headerBackground}>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: colors.card }]}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons
              name="lock-closed"
              size={50}
              color={isDark ? '#C4B5FD' : '#6B46C1'}
            />
          </View>
        </View>

        <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>ลืมรหัสผ่าน</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            กรอกอีเมลที่ใช้สมัคร ระบบจะส่งรหัส OTP 6 หลักไปให้
          </Text>

          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDark ? '#0F172A' : '#F7FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="อีเมลของคุณ"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSendOtp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ส่งรหัส OTP</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: { height: 180, paddingHorizontal: 20, paddingTop: 20 },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: { alignItems: 'center', marginTop: 10 },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, marginBottom: 28, lineHeight: 20 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    marginBottom: 24,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  button: {
    height: 52,
    backgroundColor: '#FF4D94',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});