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

export default function NewPasswordScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (password.length < 6) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว', [
        {
          text: 'เข้าสู่ระบบ',
          onPress: () => router.replace('/login' as any),
        },
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
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
          <View style={styles.iconContainer}>
            <Ionicons
              name="key"
              size={50}
              color={isDark ? '#C4B5FD' : '#6B46C1'}
            />
          </View>
        </View>

        <View
          style={[
            styles.cardContainer,
            { backgroundColor: colors.card },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>
            ตั้งรหัสผ่านใหม่
          </Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            กรุณากำหนดรหัสผ่านใหม่สำหรับบัญชีของคุณ
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
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="รหัสผ่านใหม่"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.inputBox,
              {
                backgroundColor: isDark ? '#0F172A' : '#F7FAFC',
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="ยืนยันรหัสผ่านใหม่"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleUpdatePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>บันทึกรหัสผ่านใหม่</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBackground: { height: 160, paddingTop: 40 },
  iconContainer: { alignItems: 'center' },
  cardContainer: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, marginBottom: 28 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15 },
  button: {
    height: 52,
    backgroundColor: '#FF4D94',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});