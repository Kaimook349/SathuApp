import React, { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  ImageBackground,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext'; // ถ้า error ลอง '../../context/ThemeContext'

WebBrowser.maybeCompleteAuthSession();

const { height } = Dimensions.get('window');

const redirectTo = makeRedirectUri({
  scheme: 'mobile',
  path: 'auth/callback',
});

export default function LoginScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [showLoginSheet, setShowLoginSheet] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);

  const sheetTranslateY = useRef(new Animated.Value(height)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  const openLoginSheet = () => {
    setShowLoginSheet(true);
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLoginSheet = () => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowLoginSheet(false));
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      if (data.user) {
        router.replace('/welcome');
      }
    } catch (e: any) {
      Alert.alert(
        'เข้าสู่ระบบไม่สำเร็จ',
        e.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createSessionFromUrl = async (url: string) => {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      throw new Error(errorCode);
    }

    const { access_token, refresh_token } = params;
    if (!access_token) {
      return null;
    }

    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token: refresh_token || '',
    });

    if (error) throw error;
    return data.session;
  };

  const signInWithProvider = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    try {
      console.log('redirectTo =', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          scopes: provider === 'facebook' ? 'email,public_profile' : undefined,
        },
      });

      if (error) throw error;
      if (!data?.url) throw new Error('ไม่พบ URL สำหรับเข้าสู่ระบบ');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

      if (result.type === 'success' && result.url) {
        let session = await createSessionFromUrl(result.url);

        if (!session) {
          session = await createSessionFromUrl(result.url.replace('#', '?'));
        }

        if (session) {
          router.replace('/welcome');
        } else {
          Alert.alert('แจ้งเตือน', 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่');
        }
      }
    } catch (e: any) {
      console.log('OAuth error:', e);
      Alert.alert('เข้าสู่ระบบไม่สำเร็จ', e.message || 'กรุณาลองใหม่อีกครั้ง');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />

      <ImageBackground
        source={require('../../assets/images/aum.png')}
        style={styles.bgImage}
        resizeMode="cover"
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? 'rgba(15, 23, 42, 0.85)'
                : 'rgba(26, 35, 77, 0.78)',
            },
          ]}
        />

        <Image
          source={require('../../assets/images/meditation-icon.png')}
          style={styles.meditateIcon}
        />

        <View style={styles.titleContainer}>
          <Text style={styles.helloText}>Hello</Text>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.sathuText}>
            Sat<Text style={styles.pinkText}>hu</Text>
          </Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.logInButton,
              { backgroundColor: isDark ? colors.card : '#fff' },
            ]}
            onPress={openLoginSheet}
          >
            <Text style={[styles.logInText, { color: isDark ? colors.text : '#1A234D' }]}>
              Log in
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/register')}
          >
            <Text style={styles.registerText}>Register</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            By tapping Log in, you agree to our Terms and acknowledge that you
            have read our Privacy Policy
          </Text>
        </View>
      </ImageBackground>

      {showLoginSheet && (
        <>
          <Animated.View
            style={[styles.overlaySheet, { opacity: overlayOpacity }]}
          />
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                transform: [{ translateY: sheetTranslateY }],
                backgroundColor: colors.card,
              },
            ]}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View
                style={[
                  styles.dragIndicator,
                  { backgroundColor: isDark ? '#475569' : '#ddd' },
                ]}
              />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                Sign in
              </Text>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#f8f8f8',
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Feather name="user" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="User name (หรืออีเมล)"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View
                style={[
                  styles.inputContainer,
                  {
                    backgroundColor: isDark ? '#0F172A' : '#f8f8f8',
                    borderColor: colors.border,
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Feather name="lock" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Feather
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={() => router.push('/forgot-password')}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.signInButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.signInText}>Sign in</Text>
                )}
              </TouchableOpacity>

              <View style={styles.orRow}>
                <View
                  style={[styles.orLine, { backgroundColor: colors.border }]}
                />
                <Text style={[styles.orText, { color: colors.textSecondary }]}>
                  Or Log in with
                </Text>
                <View
                  style={[styles.orLine, { backgroundColor: colors.border }]}
                />
              </View>

              <View style={styles.socialRow}>
                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                      borderColor: colors.border,
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                  onPress={() => signInWithProvider('facebook')}
                  disabled={!!socialLoading}
                >
                  {socialLoading === 'facebook' ? (
                    <ActivityIndicator color="#1877F2" />
                  ) : (
                    <FontAwesome name="facebook" size={26} color="#1877F2" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                      borderColor: colors.border,
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                  onPress={() =>
                    Alert.alert(
                      'เร็วๆ นี้',
                      'LINE ยังไม่รองรับผ่าน Supabase โดยตรง'
                    )
                  }
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={24}
                    color="#06C755"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.socialBtn,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#F3F4F6',
                      borderColor: colors.border,
                      borderWidth: isDark ? 1 : 0,
                    },
                  ]}
                  onPress={() => signInWithProvider('google')}
                  disabled={!!socialLoading}
                >
                  {socialLoading === 'google' ? (
                    <ActivityIndicator color="#EA4335" />
                  ) : (
                    <FontAwesome name="google" size={24} color="#EA4335" />
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={[styles.signupText, { color: colors.textSecondary }]}>
                  Don't have an account yet?{' '}
                  <Text style={styles.signupLink}>Sign up</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeLoginSheet}
                style={styles.closeButton}
              >
                <Text style={[styles.closeText, { color: colors.textSecondary }]}>
                  ปิด
                </Text>
              </TouchableOpacity>
            </KeyboardAvoidingView>
          </Animated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgImage: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  meditateIcon: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 40,
    height: 40,
    tintColor: '#fff',
  },

  titleContainer: {
    position: 'absolute',
    top: height * 0.28,
    alignSelf: 'center',
    alignItems: 'center',
  },
  helloText: { fontSize: 42, fontWeight: '700', color: '#fff' },
  welcomeText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    marginTop: -10,
  },
  sathuText: { fontSize: 52, fontWeight: '800', color: '#fff', marginTop: 4 },
  pinkText: { color: '#FF4D94' },

  buttonContainer: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  logInButton: {
    width: '100%',
    height: 56,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logInText: { fontSize: 18, fontWeight: '700' },
  registerButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FF4D94',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
  },

  overlaySheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16 },

  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#FF4D94', fontSize: 14 },

  signInButton: {
    backgroundColor: '#FF4D94',
    height: 56,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  signInText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  orLine: { flex: 1, height: 1 },
  orText: { marginHorizontal: 12, fontSize: 13 },

  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  socialBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },

  signupText: { textAlign: 'center', fontSize: 14 },
  signupLink: { color: '#2563EB', fontWeight: '700' },

  closeButton: { marginTop: 16, alignSelf: 'center' },
  closeText: { fontSize: 16 },
});