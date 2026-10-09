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

export default function ResetPassword() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState<'email' | 'otp' | 'newPassword'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const sendOTP = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('ผิดพลาด', 'กรุณากรอกอีเมลที่ถูกต้อง');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          shouldCreateUser: false,
        },
      });

      if (error) throw error;

      setSentEmail(email);
      setStep('otp');
      Alert.alert('ส่ง OTP แล้ว', `กรุณาตรวจสอบรหัส 6 หลักในอีเมล ${email}`);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('ผิดพลาด', 'รหัส OTP ต้องมี 6 หลัก');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: sentEmail,
        token: otp,
        type: 'email',
      });

      if (error) throw error;

      setStep('newPassword');
    } catch (error: any) {
      Alert.alert(
        'OTP ไม่ถูกต้อง',
        'รหัสอาจหมดอายุหรือไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
      );
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('ผิดพลาด', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('ผิดพลาด', 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('สำเร็จ!', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', [
        {
          text: 'เข้าสู่ระบบ',
          onPress: () => router.replace('/index' as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Ionicons
            name="lock-closed"
            size={80}
            color={isDark ? '#C4B5FD' : '#6B46C1'}
            style={styles.icon}
          />

          {step === 'email' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>ลืมรหัสผ่าน</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                กรอกอีเมลเพื่อรับรหัส OTP
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                placeholder="อีเมลของคุณ"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={sendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>ส่งรหัส OTP</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {step === 'otp' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>ยืนยัน OTP</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                ส่งรหัสไปที่ {sentEmail}
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                placeholder="กรอก OTP 6 หลัก"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={verifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>ยืนยัน OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setStep('email')}>
                <Text
                  style={[
                    styles.resendText,
                    { color: isDark ? '#C4B5FD' : '#6B46C1' },
                  ]}
                >
                  กรอกอีเมลใหม่อีกครั้ง
                </Text>
              </TouchableOpacity>
            </>
          )}

          {step === 'newPassword' && (
            <>
              <Text style={[styles.title, { color: colors.text }]}>
                ตั้งรหัสผ่านใหม่
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                กรุณาตั้งรหัสผ่านใหม่ของคุณ
              </Text>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                    color: colors.text,
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
                placeholder="ยืนยันรหัสผ่านใหม่"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              <TouchableOpacity
                style={styles.button}
                onPress={updatePassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>เปลี่ยนรหัสผ่าน</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  icon: { alignSelf: 'center', marginBottom: 30 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#FF4D94',
    height: 58,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  resendText: {
    textAlign: 'center',
    marginTop: 20,
    fontWeight: '600',
  },
});