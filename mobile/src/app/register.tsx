import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';

const FALLBACK_PROVINCES = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'พะเยา',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อุดรธานี',
  'อุทัยธานี',
  'อุตรดิตถ์',
  'อุบลราชธานี',
  'อำนาจเจริญ',
  'อื่นๆ',
];

export default function RegisterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [step, setStep] = useState(1);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  const [birthDateObj, setBirthDateObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  const [address, setAddress] = useState('');
  const [province, setProvince] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [provinces, setProvinces] = useState<string[]>(FALLBACK_PROVINCES);
  const [loadingProvinces, setLoadingProvinces] = useState(true);

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownType, setDropdownType] = useState<
    'gender' | 'nationality' | 'province' | null
  >(null);

  const dropdownOptions = {
    gender: ['ชาย', 'หญิง', 'อื่นๆ'],
    nationality: ['ไทย', 'ต่างชาติ', 'อื่นๆ'],
  };

  const pwdRules = useMemo(
    () => ({
      min8: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*]/.test(password),
    }),
    [password]
  );

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const isValidPhone = phone.replace(/\D/g, '').length >= 9;
  const isValidUsername = username.trim().length >= 3;
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const birthDateDisplay = birthDateObj
    ? birthDateObj.toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  const birthDateForDB = birthDateObj
    ? `${birthDateObj.getFullYear()}-${String(birthDateObj.getMonth() + 1).padStart(2, '0')}-${String(birthDateObj.getDate()).padStart(2, '0')}`
    : '';

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const response = await fetch(
          'https://raw.githubusercontent.com/kongvut/thai-province-data/refs/heads/master/api/latest/province.json'
        );
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const list = data
          .map((item: any) => item.name_th)
          .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
          .sort((a: string, b: string) => a.localeCompare(b, 'th'));
        if (list.length > 0) {
          setProvinces(list);
        }
      } catch {
        setProvinces(FALLBACK_PROVINCES);
      } finally {
        setLoadingProvinces(false);
      }
    };
    fetchProvinces();
  }, []);

  const onChangeBirthDate = (_event: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selected) {
      setBirthDateObj(selected);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตให้เข้าถึงคลังรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setLocalImageUri(result.assets[0].uri);
      setImageUrl(result.assets[0].uri);
    }
  };

  const uploadImageForUser = async (uri: string, userId: string) => {
    const fileExt = uri.split('.').pop()?.toLowerCase()?.split('?')[0] || 'jpg';
    const safeExt = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(fileExt)
      ? fileExt
      : 'jpg';
    const filePath = `${userId}/${Date.now()}.${safeExt}`;

    const base64Data = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const contentType =
      safeExt === 'jpg' || safeExt === 'jpeg'
        ? 'image/jpeg'
        : `image/${safeExt}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(filePath, arrayBuffer, {
        contentType,
        upsert: true,
      });
    if (error) throw error;

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleNextStep = () => {
    if (
      !isValidUsername ||
      !isValidEmail ||
      !isValidPhone ||
      !password ||
      !confirmPassword
    ) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบและถูกต้อง');
      return;
    }
    if (!pwdRules.min8 || !pwdRules.upper || !pwdRules.lower || !pwdRules.number) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านยังไม่ตรงตามเงื่อนไข');
      return;
    }
    if (!passwordsMatch) {
      Alert.alert('แจ้งเตือน', 'รหัสผ่านไม่ตรงกัน');
      return;
    }
    if (!isAccepted) {
      Alert.alert('แจ้งเตือน', 'กรุณายอมรับข้อกำหนดและเงื่อนไข');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!birthDateObj || !gender || !nationality || !address || !province) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    if (!isAccepted) {
      Alert.alert('แจ้งเตือน', 'กรุณายอมรับข้อกำหนดและเงื่อนไข');
      return;
    }

    setIsLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let userId: string | undefined;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          const { data: signInData, error: signInErr } =
            await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
          if (signInErr) {
            throw new Error(
              'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น หรือกลับไปหน้าเข้าสู่ระบบ'
            );
          }
          userId = signInData.user?.id;
        } else {
          throw authError;
        }
      } else {
        userId = authData.user?.id;
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
      }

      if (!userId) {
        throw new Error('ไม่สามารถสร้างข้อมูลผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง');
      }

      let finalImageUrl: string | null = null;
      if (localImageUri) {
        try {
          setUploading(true);
          finalImageUrl = await uploadImageForUser(localImageUri, userId);
        } catch (uploadErr) {
          console.log('upload avatar error', uploadErr);
        } finally {
          setUploading(false);
        }
      }

      const profilePayload = {
        id: userId,
        username: username.trim(),
        phone: phone.trim(),
        birth_date: birthDateForDB,
        gender,
        nationality,
        address: address.trim(),
        province,
        image_url: finalImageUrl,
        avatar_url: finalImageUrl,
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ ...profilePayload, email: cleanEmail }, { onConflict: 'id' });

      if (profileError) {
        const { error: fallbackError } = await supabase
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' });
        if (fallbackError) throw fallbackError;
      }

      Alert.alert('ยินดีต้อนรับ!', 'สมัครสมาชิกสำเร็จแล้ว', [
        { text: 'ตกลง', onPress: () => router.replace('/home') },
      ]);
    } catch (error: any) {
      let msg = error.message || 'กรุณาลองใหม่อีกครั้ง';
      if (msg.includes('User already registered')) {
        msg =
          'อีเมลนี้มีในระบบแล้ว กรุณาใช้อีเมลอื่น หรือกลับไปหน้าเข้าสู่ระบบ';
      } else if (msg.includes('Email not confirmed')) {
        msg =
          'สมัครสมาชิกสำเร็จแล้ว! กรุณาตรวจสอบกล่องจดหมายเพื่อยืนยันอีเมลก่อนเข้าใช้งาน';
      }
      Alert.alert('เกิดข้อผิดพลาด', msg);
    } finally {
      setIsLoading(false);
      setUploading(false);
    }
  };

  const openDropdown = (type: 'gender' | 'nationality' | 'province') => {
    setDropdownType(type);
    setDropdownVisible(true);
  };

  const selectOption = (value: string) => {
    if (dropdownType === 'gender') setGender(value);
    if (dropdownType === 'nationality') setNationality(value);
    if (dropdownType === 'province') setProvince(value);
    setDropdownVisible(false);
    setDropdownType(null);
  };

  const getDropdownData = (): string[] => {
    if (dropdownType === 'province') {
      return provinces.length > 0 ? provinces : FALLBACK_PROVINCES;
    }
    if (dropdownType === 'gender') return dropdownOptions.gender;
    if (dropdownType === 'nationality') return dropdownOptions.nationality;
    return [];
  };

  const closeDropdown = () => {
    setDropdownVisible(false);
    setDropdownType(null);
  };

  const maxDate = new Date();
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  const previewUri = localImageUri || imageUrl;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (step === 2 ? setStep(1) : router.back())}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={isDark ? '#C4B5FD' : '#6D28D9'}
          />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={[styles.title, { color: colors.text }]}>สร้างบัญชีใหม่</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            ขั้นตอนที่ {step} จาก 2
          </Text>
        </View>

        <View style={styles.lotusWrap}>
          <MaterialCommunityIcons name="flower-tulip" size={42} color="#F9A8D4" />
        </View>
      </View>

      <View style={styles.stepRow}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            {step === 2 ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.stepNum}>1</Text>
            )}
          </View>
          <Text style={[styles.stepLabel, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
            ข้อมูลบัญชี
          </Text>
        </View>

        <View
          style={[
            styles.stepLine,
            {
              backgroundColor:
                step === 2 ? '#6D28D9' : isDark ? colors.border : '#E5E7EB',
            },
          ]}
        />

        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step === 2
                ? styles.stepActive
                : { backgroundColor: isDark ? '#334155' : '#E5E7EB' },
            ]}
          >
            <Text
              style={[
                styles.stepNum,
                step !== 2 && { color: isDark ? '#94A3B8' : '#9CA3AF' },
              ]}
            >
              2
            </Text>
          </View>
          <Text
            style={[
              styles.stepLabel,
              step === 2
                ? { color: isDark ? '#C4B5FD' : '#6D28D9', fontWeight: '600' }
                : { color: colors.textSecondary },
            ]}
          >
            ข้อมูลส่วนตัว
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 1 ? (
            <>
              <InputRow
                icon="person-outline"
                placeholder="ชื่อผู้ใช้ ( Username ) *"
                value={username}
                onChangeText={setUsername}
                valid={isValidUsername}
                colors={colors}
                isDark={isDark}
              />
              <InputRow
                icon="mail-outline"
                placeholder="อีเมล ( Email ) *"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                valid={isValidEmail}
                colors={colors}
                isDark={isDark}
              />
              <InputRow
                icon="phone-portrait-outline"
                placeholder="เบอร์โทรศัพท์ ( Phone Number ) *"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                valid={isValidPhone}
                colors={colors}
                isDark={isDark}
              />
              <InputRow
                icon="lock-closed-outline"
                placeholder="รหัสผ่าน ( Password ) *"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                valid={
                  pwdRules.min8 &&
                  pwdRules.upper &&
                  pwdRules.lower &&
                  pwdRules.number
                }
                colors={colors}
                isDark={isDark}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />
              <InputRow
                icon="lock-closed-outline"
                placeholder="ยืนยันรหัสผ่าน ( Confirm Password ) *"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                valid={passwordsMatch}
                colors={colors}
                isDark={isDark}
                rightIcon={
                  <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                    <Ionicons
                      name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              <View
                style={[
                  styles.rulesBox,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rulesTitleRow}>
                  <Text style={[styles.rulesTitle, { color: colors.text }]}>
                    รหัสผ่านต้องมี
                  </Text>
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                </View>
                <View style={styles.rulesGrid}>
                  <RuleItem ok={pwdRules.min8} text="อย่างน้อย 8 ตัวอักษร" colors={colors} />
                  <RuleItem ok={pwdRules.number} text="ตัวเลข ( 0-9 )" colors={colors} />
                  <RuleItem ok={pwdRules.upper} text="ตัวพิมพ์ใหญ่ ( A-Z )" colors={colors} />
                  <RuleItem ok={pwdRules.special} text="อักขระพิเศษ ( !@#$%^&* )" colors={colors} />
                  <RuleItem ok={pwdRules.lower} text="ตัวพิมพ์เล็ก ( a-z )" colors={colors} />
                </View>
              </View>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setIsAccepted((v) => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: isDark ? '#475569' : '#D1D5DB' },
                    isAccepted && styles.checkboxOn,
                  ]}
                >
                  {isAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  ยินยอมรับ{' '}
                  <Text style={[styles.termsLink, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                    ข้อกำหนดการใช้งาน
                  </Text>{' '}
                  และ{' '}
                  <Text style={[styles.termsLink, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                    นโยบายความเป็นส่วนตัว
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleNextStep} activeOpacity={0.9}>
                <LinearGradient
                  colors={['#7C3AED', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainBtn}
                >
                  <Text style={styles.mainBtnText}>ถัดไป</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.avatarBanner,
                  { backgroundColor: isDark ? '#1E293B' : '#F3F4F6' },
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: isDark ? '#334155' : '#E5E7EB',
                      borderColor: colors.card,
                    },
                  ]}
                  onPress={pickImage}
                  activeOpacity={0.85}
                >
                  {uploading ? (
                    <ActivityIndicator color="#6D28D9" />
                  ) : previewUri ? (
                    <Image source={{ uri: previewUri }} style={styles.avatarImg} />
                  ) : (
                    <Ionicons name="image-outline" size={28} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.addPhotoBtn,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={pickImage}
                >
                  <Ionicons name="image-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>
                    เพิ่มรูปภาพ
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.fieldBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={isDark ? '#C4B5FD' : '#6D28D9'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    วันเกิด ( Date of Birth ) *
                  </Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      { color: birthDateObj ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {birthDateDisplay || 'แตะเพื่อเลือกวันเกิด'}
                  </Text>
                </View>
                <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && Platform.OS === 'android' && (
                <DateTimePicker
                  value={birthDateObj || new Date(2000, 0, 1)}
                  mode="date"
                  display="default"
                  onChange={onChangeBirthDate}
                  maximumDate={maxDate}
                  minimumDate={minDate}
                />
              )}

              {showDatePicker && Platform.OS === 'ios' && (
                <Modal transparent animationType="slide">
                  <View style={styles.dateModalOverlay}>
                    <View style={[styles.dateModalSheet, { backgroundColor: colors.card }]}>
                      <View style={styles.dateModalHeader}>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>
                            ยกเลิก
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.dateModalTitle, { color: colors.text }]}>
                          เลือกวันเกิด
                        </Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                          <Text style={{ color: '#6D28D9', fontSize: 16, fontWeight: '700' }}>
                            ตกลง
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <DateTimePicker
                        value={birthDateObj || new Date(2000, 0, 1)}
                        mode="date"
                        display="spinner"
                        onChange={onChangeBirthDate}
                        maximumDate={maxDate}
                        minimumDate={minDate}
                        locale="th-TH"
                        style={{ height: 200 }}
                      />
                    </View>
                  </View>
                </Modal>
              )}

              <View style={styles.row2}>
                <TouchableOpacity
                  style={[
                    styles.fieldBox,
                    { flex: 1, backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => openDropdown('gender')}
                >
                  <View
                    style={[
                      styles.fieldIcon,
                      { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={isDark ? '#C4B5FD' : '#6D28D9'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      เพศ *
                    </Text>
                    <Text
                      style={[
                        styles.fieldValue,
                        { color: gender ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {gender || 'เลือกเพศ'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.fieldBox,
                    { flex: 1, backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => openDropdown('nationality')}
                >
                  <View
                    style={[
                      styles.fieldIcon,
                      { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                    ]}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color={isDark ? '#C4B5FD' : '#6D28D9'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      สัญชาติ *
                    </Text>
                    <Text
                      style={[
                        styles.fieldValue,
                        { color: nationality ? colors.text : colors.textSecondary },
                      ]}
                    >
                      {nationality || 'เลือกสัญชาติ'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.fieldBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                  ]}
                >
                  <Ionicons
                    name="home-outline"
                    size={18}
                    color={isDark ? '#C4B5FD' : '#6D28D9'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    ที่อยู่ *
                  </Text>
                  <TextInput
                    style={[styles.fieldInput, { color: colors.text }]}
                    placeholder="เลขที่/หมู่บ้าน/ซอย/ถนน"
                    placeholderTextColor={colors.textSecondary}
                    value={address}
                    onChangeText={setAddress}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.fieldBox,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => openDropdown('province')}
                disabled={loadingProvinces}
              >
                <View
                  style={[
                    styles.fieldIcon,
                    { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' },
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={isDark ? '#C4B5FD' : '#6D28D9'}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                    จังหวัด *
                  </Text>
                  <Text
                    style={[
                      styles.fieldValue,
                      { color: province ? colors.text : colors.textSecondary },
                    ]}
                  >
                    {loadingProvinces ? 'กำลังโหลด...' : province || 'เลือกจังหวัด'}
                  </Text>
                </View>
                {loadingProvinces ? (
                  <ActivityIndicator size="small" color="#6D28D9" />
                ) : (
                  <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setIsAccepted((v) => !v)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: isDark ? '#475569' : '#D1D5DB' },
                    isAccepted && styles.checkboxOn,
                  ]}
                >
                  {isAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={[styles.termsText, { color: colors.textSecondary }]}>
                  ยินยอมรับ{' '}
                  <Text style={[styles.termsLink, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                    ข้อกำหนดการใช้งาน
                  </Text>{' '}
                  และ{' '}
                  <Text style={[styles.termsLink, { color: isDark ? '#C4B5FD' : '#6D28D9' }]}>
                    นโยบายความเป็นส่วนตัว
                  </Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRegister}
                disabled={isLoading || uploading}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={['#7C3AED', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.mainBtn}
                >
                  {isLoading || uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.mainBtnText}>สร้างบัญชี</Text>
                      <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal เลือกเพศ / สัญชาติ / จังหวัด */}
      <Modal visible={dropdownVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            activeOpacity={1}
            onPress={closeDropdown}
          />
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.modalHandle,
                { backgroundColor: isDark ? '#475569' : '#E5E7EB' },
              ]}
            />
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {dropdownType === 'gender'
                ? 'เลือกเพศ'
                : dropdownType === 'nationality'
                ? 'เลือกสัญชาติ'
                : 'เลือกจังหวัด'}
            </Text>

            <FlatList
              data={getDropdownData()}
              keyExtractor={(item, index) => `${dropdownType}-${index}-${String(item)}`}
              style={{ maxHeight: 380 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text
                  style={{
                    textAlign: 'center',
                    color: colors.textSecondary,
                    paddingVertical: 28,
                    fontSize: 14,
                  }}
                >
                  {dropdownType === 'province' && loadingProvinces
                    ? 'กำลังโหลดจังหวัด...'
                    : 'ไม่พบรายการ'}
                </Text>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => selectOption(item)}
                >
                  <Text style={[styles.modalItemText, { color: colors.text }]}>{item}</Text>
                  {((dropdownType === 'province' && province === item) ||
                    (dropdownType === 'gender' && gender === item) ||
                    (dropdownType === 'nationality' && nationality === item)) && (
                    <Ionicons name="checkmark" size={18} color="#6D28D9" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const InputRow = ({
  icon,
  placeholder,
  value,
  onChangeText,
  valid,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  rightIcon,
  colors,
  isDark,
}: any) => (
  <View
    style={[
      styles.inputRow,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <Ionicons
      name={icon}
      size={20}
      color={colors.textSecondary}
      style={{ marginRight: 10 }}
    />
    <TextInput
      style={[styles.inputFlex, { color: colors.text }]}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize || 'sentences'}
    />
    {rightIcon}
    {valid ? (
      <Ionicons name="checkmark-circle" size={22} color="#22C55E" style={{ marginLeft: 8 }} />
    ) : value?.length > 0 ? (
      <Ionicons
        name="ellipse-outline"
        size={20}
        color={isDark ? '#475569' : '#E5E7EB'}
        style={{ marginLeft: 8 }}
      />
    ) : null}
  </View>
);

const RuleItem = ({
  ok,
  text,
  colors,
}: {
  ok: boolean;
  text: string;
  colors: any;
}) => (
  <View style={styles.ruleItem}>
    <Ionicons
      name={ok ? 'checkmark-circle' : 'ellipse-outline'}
      size={16}
      color={ok ? '#22C55E' : colors.textSecondary}
    />
    <Text style={[styles.ruleText, { color: ok ? colors.text : colors.textSecondary }]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  headerTextWrap: { flex: 1, marginLeft: 2 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2 },
  lotusWrap: { marginTop: -2 },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    marginVertical: 14,
  },
  stepItem: { alignItems: 'center', width: 78 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepActive: { backgroundColor: '#6D28D9' },
  stepNum: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  stepLabel: { fontSize: 11, fontWeight: '600' },
  stepLine: { flex: 1, height: 2, marginBottom: 20 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 2,
    marginBottom: 12,
    minHeight: 52,
  },
  inputFlex: { flex: 1, fontSize: 14, paddingVertical: 12 },
  rulesBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 2,
    marginBottom: 16,
  },
  rulesTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  rulesTitle: { fontSize: 13, fontWeight: '700' },
  rulesGrid: { gap: 8 },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ruleText: { fontSize: 12 },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: '#6D28D9', borderColor: '#6D28D9' },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  termsLink: { fontWeight: '600' },
  mainBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  avatarBanner: {
    height: 120,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
  },
  avatarImg: { width: '100%', height: '100%' },
  addPhotoBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  addPhotoText: { fontSize: 12, fontWeight: '600' },
  fieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
  },
  fieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fieldLabel: { fontSize: 11, fontWeight: '600' },
  fieldInput: { fontSize: 14, paddingVertical: 2 },
  fieldValue: { fontSize: 14, marginTop: 2 },
  row2: { flexDirection: 'row', gap: 10 },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  dateModalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 30,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dateModalTitle: { fontSize: 16, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    paddingTop: 10,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalItemText: { fontSize: 15 },
});