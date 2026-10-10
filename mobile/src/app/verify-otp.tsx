import React, { useState, useRef } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

export default function VerifyOtpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();
  const email = (params.email as string) || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const handleTextChange = (text: string, index: number) => {
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกรหัสยืนยันให้ครบ 6 หลัก');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email,
        token: fullCode,
        type: 'recovery',
      });

      if (error) throw error;

      Alert.alert('สำเร็จ', 'ยืนยันรหัส OTP สำเร็จ', [
        {
          text: 'ตกลง',
          onPress: () => {
            router.replace({
              pathname: '/new-password' as any,
              params: { email },
            });
          },
        },
      ]);
    } catch (error: any) {
      console.log('OTP Error:', error);
      Alert.alert(
        'เกิดข้อผิดพลาด',
        error.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ กรุณาขอรหัสใหม่'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      Alert.alert('ส่งแล้ว', 'ส่งรหัส OTP ใหม่ไปที่อีเมลแล้ว');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error: any) {
      Alert.alert('ผิดพลาด', error.message);
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
        style={styles.keyboardView}
      >
        <View style={styles.headerBackground}>
          <TouchableOpacity
            style={[
              styles.closeBtn,
              { backgroundColor: isDark ? colors.card : '#fff' },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons
              name="close"
              size={28}
              color={isDark ? colors.text : '#1E1B4B'}
            />
          </TouchableOpacity>
          <View style={styles.iconContainer}>
            <Ionicons
              name="shield-checkmark"
              size={50}
              color={isDark ? '#C4B5FD' : '#6B46C1'}
            />
          </View>
        </View>

        <View style={[styles.cardContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            ยืนยันรหัส OTP
          </Text>
          <Text style={[styles.subtitleTitle, { color: colors.textSecondary }]}>
            Verify Code
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            กรุณากรอกรหัส 6 หลักที่ส่งไปที่{'\n'}
            <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
          </Text>

          <View style={styles.otpContainer}>
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpBox,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#F7FAFC',
                    borderColor: code[index]
                      ? isDark
                        ? '#A78BFA'
                        : '#6B46C1'
                      : colors.border,
                    color: colors.text,
                  },
                  code[index] && {
                    backgroundColor: isDark ? '#4C1D95' : '#F5F3FF',
                  },
                ]}
                keyboardType="number-pad"
                maxLength={index === 0 ? 6 : 1}
                value={code[index]}
                onChangeText={(text) => handleTextChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                selectTextOnFocus
                placeholderTextColor={colors.textSecondary}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerify}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.verifyButtonText}>ยืนยันรหัส</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResend}
            disabled={loading}
          >
            <Text
              style={[
                styles.resendText,
                { color: isDark ? '#C4B5FD' : '#6B46C1' },
              ]}
            >
              ไม่ได้รับรหัส? ส่งใหม่
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
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
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 4 },
  subtitleTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  description: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 20,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 32,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  verifyButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FF4D94',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  resendBtn: { marginTop: 20, padding: 8 },
  resendText: { fontSize: 14, fontWeight: '600' },
});