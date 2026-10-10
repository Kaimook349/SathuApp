import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../supabase';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../../components/AppText'

import provincesData from '../../assets/data/provinces.json';
import districtsData from '../../assets/data/districts.json';
import subDistrictsData from '../../assets/data/sub_districts.json';

const AddTempleScreen = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [activeCategory, setActiveCategory] = useState<'event' | 'donation'>('event');
  const [formData, setFormData] = useState({
    temple_name: '',
    activity_name: '',
    province: '',
    district: '',
    subdistrict: '',
    village: '',
    description: '',
    image_url: '',
    event_date: new Date().toISOString().split('T')[0],
    event_time: '08:00 น.',
    bank_name: '',
    bank_account: '',
    account_name: '',
    donation_purpose: '',
  });

  const [districtOptions, setDistrictOptions] = useState<any[]>([]);
  const [subdistrictOptions, setSubdistrictOptions] = useState<any[]>([]);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'province' | 'district' | 'subdistrict'>('province');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (formData.province) {
      const provinceObj = provincesData.find((p: any) => p.name_th === formData.province);
      const filtered = districtsData.filter((d: any) => d.province_id === provinceObj?.id);
      setDistrictOptions(filtered);
      setFormData((prev) => ({ ...prev, district: '', subdistrict: '' }));
    }
  }, [formData.province]);

  useEffect(() => {
    if (formData.district) {
      const districtObj = districtOptions.find((d) => d.name_th === formData.district);
      const filtered = subDistrictsData.filter((s: any) => s.district_id === districtObj?.id);
      setSubdistrictOptions(filtered);
      setFormData((prev) => ({ ...prev, subdistrict: '' }));
    }
  }, [formData.district]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      setFormData({ ...formData, image_url: uri });
    }
  };

  const handleSubmit = async () => {
    if (!formData.temple_name || !formData.activity_name || !formData.province) {
      Alert.alert('กรุณากรอกข้อมูล', 'ชื่อวัด, ชื่อกิจกรรม และจังหวัดจำเป็นต้องกรอก');
      return;
    }
    if (activeCategory === 'donation' && (!formData.bank_account || !formData.bank_name)) {
      Alert.alert('กรุณากรอกข้อมูล', 'กรุณาระบุชื่อธนาคารและเลขที่บัญชีสำหรับรับบริจาค');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('temples_activities').insert({
        temple_name: formData.temple_name,
        activity_name: formData.activity_name,
        category: activeCategory,
        province: formData.province,
        district: formData.district,
        subdistrict: formData.subdistrict,
        village: formData.village,
        description: formData.description,
        image_url: formData.image_url,
        event_date: activeCategory === 'event' ? formData.event_date : null,
        event_time: activeCategory === 'event' ? formData.event_time : null,
        bank_name: activeCategory === 'donation' ? formData.bank_name : null,
        bank_account: activeCategory === 'donation' ? formData.bank_account : null,
        account_name: activeCategory === 'donation' ? formData.account_name : null,
        donation_purpose: activeCategory === 'donation' ? formData.donation_purpose : null,
        created_by: user?.id,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert('ส่งข้อมูลสำเร็จ 🙏', 'ข้อมูลเข้าสู่ระบบรออนุมัติจากผู้ดูแลแล้ว', [
        { text: 'ตกลง', onPress: () => router.push('/map') },
      ]);
    } catch (error: any) {
      Alert.alert('เกิดข้อผิดพลาด', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getModalData = () => {
    if (modalType === 'province') {
      return provincesData.filter((p: any) => p.name_th.includes(searchText));
    }
    if (modalType === 'district') {
      return districtOptions.filter((d: any) => d.name_th.includes(searchText));
    }
    return subdistrictOptions.filter((s: any) => s.name_th.includes(searchText));
  };

  const getModalTitle = () => {
    if (modalType === 'province') return 'เลือกจังหวัด';
    if (modalType === 'district') return 'เลือกอำเภอ / เขต';
    return 'เลือกตำบล / แขวง';
  };

  const handleSelectModalItem = (item: any) => {
    if (modalType === 'province') setFormData((prev) => ({ ...prev, province: item.name_th }));
    else if (modalType === 'district') setFormData((prev) => ({ ...prev, district: item.name_th }));
    else setFormData((prev) => ({ ...prev, subdistrict: item.name_th }));
    setModalVisible(false);
    setSearchText('');
  };

  const openModal = (type: 'province' | 'district' | 'subdistrict') => {
    setModalType(type);
    setSearchText('');
    setModalVisible(true);
  };

  const filledCount = [
    formData.temple_name,
    formData.activity_name,
    formData.province,
    image,
  ].filter(Boolean).length;

  const inputBg = isDark ? '#0F172A' : '#F8FAFC';
  const inputBorder = colors.border;
  const cardBg = colors.card;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <LinearGradient
          colors={['#7C3AED', '#6D28D9', '#5B21B6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <AppText style={styles.headerTitle}>เพิ่มข้อมูลวัด</AppText>
              <AppText style={styles.headerSub}>แบ่งปันบุญ · กิจกรรม · บริจาค</AppText>
            </View>

            <View style={styles.lotusBadge}>
              <MaterialCommunityIcons name="flower-tulip" size={20} color="#F9A8D4" />
            </View>
          </View>

          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${(filledCount / 4) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{filledCount}/4</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Tip banner */}
          <View style={styles.tipCard}>
            <LinearGradient
              colors={isDark ? ['#1E1B4B', '#4A044E'] : ['#F5F3FF', '#FDF2F8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tipGradient}
            >
              <View style={[styles.tipIcon, { backgroundColor: isDark ? '#334155' : '#fff' }]}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.tipTitle, { color: isDark ? '#E9D5FF' : '#5B21B6' }]}>
                  ข้อมูลจะเผยแพร่หลังอนุมัติ
                </AppText>
                <AppText style={[styles.tipDesc, { color: isDark ? '#C4B5FD' : '#7C3AED' }]}>
                  กรอกให้ครบ ชัดเจน เพื่อให้คนอื่นค้นหาได้ง่าย
                </AppText>
              </View>
            </LinearGradient>
          </View>

          {/* Category tabs */}
          <AppText style={[styles.blockLabel, { color: colors.textSecondary }]}>
            ประเภทข้อมูล
          </AppText>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabBtn,
                { borderColor: isDark ? '#334155' : '#E9D5FF' },
                activeCategory === 'event' && styles.tabEventActive,
              ]}
              onPress={() => setActiveCategory('event')}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={
                  activeCategory === 'event'
                    ? ['#3B82F6', '#1D4ED8']
                    : [cardBg, cardBg]
                }
                style={styles.tabInner}
              >
                <View
                  style={[
                    styles.tabIconCircle,
                    activeCategory === 'event'
                      ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                      : { backgroundColor: isDark ? '#1E3A8A' : '#EFF6FF' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar-star"
                    size={20}
                    color={activeCategory === 'event' ? '#fff' : isDark ? '#93C5FD' : '#1D4ED8'}
                  />
                </View>
                <AppText
                  style={[
                    styles.tabTitle,
                    { color: activeCategory === 'event' ? '#fff' : colors.text },
                  ]}
                >
                  พิธีสงฆ์
                </AppText>
                <AppText
                  style={[
                    styles.tabSub,
                    {
                      color:
                        activeCategory === 'event'
                          ? 'rgba(255,255,255,0.85)'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  งานบุญ · วันที่
                </AppText>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabBtn,
                { borderColor: isDark ? '#334155' : '#E9D5FF' },
                activeCategory === 'donation' && styles.tabDonationActive,
              ]}
              onPress={() => setActiveCategory('donation')}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={
                  activeCategory === 'donation'
                    ? ['#EC4899', '#BE185D']
                    : [cardBg, cardBg]
                }
                style={styles.tabInner}
              >
                <View
                  style={[
                    styles.tabIconCircle,
                    activeCategory === 'donation'
                      ? { backgroundColor: 'rgba(255,255,255,0.25)' }
                      : { backgroundColor: isDark ? '#831843' : '#FDF2F8' },
                  ]}
                >
                  <Ionicons
                    name="heart"
                    size={20}
                    color={activeCategory === 'donation' ? '#fff' : isDark ? '#F9A8D4' : '#BE185D'}
                  />
                </View>
                <AppText
                  style={[
                    styles.tabTitle,
                    { color: activeCategory === 'donation' ? '#fff' : colors.text },
                  ]}
                >
                  บริจาค
                </AppText>
                <AppText
                  style={[
                    styles.tabSub,
                    {
                      color:
                        activeCategory === 'donation'
                          ? 'rgba(255,255,255,0.85)'
                          : colors.textSecondary,
                    },
                  ]}
                >
                  บัญชี · จุดประสงค์
                </AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Image */}
          <AppText style={[styles.blockLabel, { color: colors.textSecondary }]}>
            รูปภาพปก
          </AppText>
          <TouchableOpacity
            style={[
              styles.imageUpload,
              {
                backgroundColor: cardBg,
                borderColor: isDark ? '#4C1D95' : '#E9D5FF',
              },
            ]}
            onPress={pickImage}
            activeOpacity={0.92}
          >
            {image ? (
              <>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(15,23,42,0.55)']}
                  style={styles.imageOverlay}
                />
                <View style={styles.imageEditBadge}>
                  <Ionicons name="camera" size={14} color="#fff" />
                  <AppText style={styles.imageEditText}>เปลี่ยนรูป</AppText>
                </View>
              </>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <LinearGradient
                  colors={isDark ? ['#4C1D95', '#831843'] : ['#EDE9FE', '#FCE7F3']}
                  style={styles.uploadRing}
                >
                  <View style={[styles.uploadInner, { backgroundColor: cardBg }]}>
                    <Ionicons name="images-outline" size={28} color={colors.primary} />
                  </View>
                </LinearGradient>
                <AppText style={[styles.uploadTitle, { color: isDark ? '#E9D5FF' : '#4C1D95' }]}>
                  เพิ่มรูปภาพกิจกรรม
                </AppText>
                <AppText style={[styles.uploadHint, { color: colors.textSecondary }]}>
                  แนะนำสัดส่วน 16:9 · แตะเพื่อเลือก
                </AppText>
              </View>
            )}
          </TouchableOpacity>

          {/* Main info */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: isDark ? '#334155' : '#F3E8FF',
              },
            ]}
          >
            <View style={styles.cardHead}>
              <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.cardIcon}>
                <Ionicons name="business" size={16} color="#fff" />
              </LinearGradient>
              <View>
                <AppText style={[styles.cardTitle, { color: colors.text }]}>ข้อมูลหลัก</AppText>
                <AppText style={[styles.cardSub, { color: colors.textSecondary }]}>
                  ชื่อวัดและชื่อกิจกรรม
                </AppText>
              </View>
            </View>

            <FieldLabel text="ชื่อวัด / สถานที่" required colors={colors} />
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="home-outline" size={18} color="#A78BFA" />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="เช่น วัดศาลาลอย"
                placeholderTextColor={colors.textSecondary}
                value={formData.temple_name}
                onChangeText={(t) => setFormData({ ...formData, temple_name: t })}
              />
            </View>

            <FieldLabel text="ชื่อกิจกรรม" required colors={colors} />
            <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
              <Ionicons name="sparkles-outline" size={18} color="#A78BFA" />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="เช่น งานทอดกฐินประจำปี"
                placeholderTextColor={colors.textSecondary}
                value={formData.activity_name}
                onChangeText={(t) => setFormData({ ...formData, activity_name: t })}
              />
            </View>
          </View>

          {/* Event */}
          {activeCategory === 'event' && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFF',
                  borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
                },
              ]}
            >
              <View style={styles.cardHead}>
                <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={styles.cardIcon}>
                  <Ionicons name="calendar" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <AppText style={[styles.cardTitle, { color: isDark ? '#93C5FD' : '#1E3A8A' }]}>
                    กำหนดการ
                  </AppText>
                  <AppText style={[styles.cardSub, { color: colors.textSecondary }]}>
                    วันและเวลาจัดกิจกรรม
                  </AppText>
                </View>
              </View>

              <FieldLabel text="วันที่จัดกิจกรรม" required colors={colors} />
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="YYYY-MM-DD เช่น 2026-11-24"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.event_date}
                  onChangeText={(t) => setFormData({ ...formData, event_date: t })}
                />
              </View>

              <FieldLabel text="เวลาเริ่มพิธี" required colors={colors} />
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="time-outline" size={18} color="#60A5FA" />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="เช่น 08:00 น."
                  placeholderTextColor={colors.textSecondary}
                  value={formData.event_time}
                  onChangeText={(t) => setFormData({ ...formData, event_time: t })}
                />
              </View>
            </View>
          )}

          {/* Donation */}
          {activeCategory === 'donation' && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? '#1A0A12' : '#FFF7FA',
                  borderColor: isDark ? '#831843' : '#FECDD3',
                },
              ]}
            >
              <View style={styles.cardHead}>
                <LinearGradient colors={['#EC4899', '#BE185D']} style={styles.cardIcon}>
                  <Ionicons name="card" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <AppText style={[styles.cardTitle, { color: isDark ? '#F9A8D4' : '#9D174D' }]}>
                    บัญชีรับบริจาค
                  </AppText>
                  <AppText style={[styles.cardSub, { color: colors.textSecondary }]}>
                    ข้อมูลโอนและจุดประสงค์
                  </AppText>
                </View>
              </View>

              <FieldLabel text="ชื่อธนาคาร" required colors={colors} />
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="business-outline" size={18} color="#F472B6" />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="เช่น กสิกรไทย, กรุงไทย"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.bank_name}
                  onChangeText={(t) => setFormData({ ...formData, bank_name: t })}
                />
              </View>

              <FieldLabel text="เลขที่บัญชี" required colors={colors} />
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="keypad-outline" size={18} color="#F472B6" />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="เช่น 123-4-56789-0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={formData.bank_account}
                  onChangeText={(t) => setFormData({ ...formData, bank_account: t })}
                />
              </View>

              <FieldLabel text="ชื่อบัญชี" colors={colors} />
              <View style={[styles.inputWrap, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                <Ionicons name="person-outline" size={18} color="#F472B6" />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="ชื่อบัญชีวัดหรือผู้จัดงาน"
                  placeholderTextColor={colors.textSecondary}
                  value={formData.account_name}
                  onChangeText={(t) => setFormData({ ...formData, account_name: t })}
                />
              </View>

              <FieldLabel text="จุดประสงค์การบริจาค" colors={colors} />
              <TextInput
                style={[
                  styles.textArea,
                  { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
                ]}
                placeholder="เช่น สมทบทุนสร้างศาลาการเปรียญ..."
                placeholderTextColor={colors.textSecondary}
                multiline
                textAlignVertical="top"
                value={formData.donation_purpose}
                onChangeText={(t) => setFormData({ ...formData, donation_purpose: t })}
              />
            </View>
          )}

          {/* Location */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: cardBg,
                borderColor: isDark ? '#334155' : '#F3E8FF',
              },
            ]}
          >
            <View style={styles.cardHead}>
              <LinearGradient colors={['#10B981', '#059669']} style={styles.cardIcon}>
                <Ionicons name="location" size={16} color="#fff" />
              </LinearGradient>
              <View>
                <AppText style={[styles.cardTitle, { color: colors.text }]}>ที่ตั้ง</AppText>
                <AppText style={[styles.cardSub, { color: colors.textSecondary }]}>
                  จังหวัด · อำเภอ · ตำบล
                </AppText>
              </View>
            </View>

            <FieldLabel text="จังหวัด" required colors={colors} />
            <SelectBox
              value={formData.province}
              placeholder="เลือกจังหวัด"
              icon="map-outline"
              onPress={() => openModal('province')}
              colors={colors}
              isDark={isDark}
            />

            <FieldLabel text="อำเภอ / เขต" colors={colors} />
            <SelectBox
              value={formData.district}
              placeholder="เลือกอำเภอ"
              icon="navigate-outline"
              disabled={!formData.province}
              onPress={() => openModal('district')}
              colors={colors}
              isDark={isDark}
            />

            <FieldLabel text="ตำบล / แขวง" colors={colors} />
            <SelectBox
              value={formData.subdistrict}
              placeholder="เลือกตำบล"
              icon="pin-outline"
              disabled={!formData.district}
              onPress={() => openModal('subdistrict')}
              colors={colors}
              isDark={isDark}
            />

            <FieldLabel text="รายละเอียดเพิ่มเติม" colors={colors} />
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: inputBg, borderColor: inputBorder, color: colors.text },
              ]}
              placeholder="เส้นทาง ป้าย หรือข้อมูลอื่นที่ช่วยให้หาเจอง่าย..."
              placeholderTextColor={colors.textSecondary}
              multiline
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
            />
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.9}
            style={styles.submitWrap}
          >
            <LinearGradient
              colors={loading ? ['#C4B5FD', '#A78BFA'] : ['#8B5CF6', '#7C3AED', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <AppText style={styles.submitText}>ส่งข้อมูลเพื่อรออนุมัติ</AppText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.footerNote}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.textSecondary} />
            <AppText style={[styles.noteText, { color: colors.textSecondary }]}>
              ข้อมูลจะเผยแพร่หลังผู้ดูแลอนุมัติ
            </AppText>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <AppText style={[styles.modalTitle, { color: colors.text }]}>
                {getModalTitle()}
              </AppText>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDark ? '#334155' : '#F1F5F9' }]}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.searchBox,
                { backgroundColor: inputBg, borderColor: inputBorder },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="พิมพ์เพื่อค้นหา..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                autoFocus
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={getModalData()}
              keyExtractor={(item: any) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelectModalItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemLeft}>
                    <View style={styles.modalDot} />
                    {/* ชื่อจังหวัด/อำเภอ/ตำบล ไม่แปล */}
                    <Text style={[styles.modalItemText, { color: colors.text }]}>
                      {item.name_th}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <AppText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  ไม่พบรายการ
                </AppText>
              }
            />
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
};

const FieldLabel = ({
  text,
  required,
  colors,
}: {
  text: string;
  required?: boolean;
  colors: any;
}) => (
  <AppText style={[styles.label, { color: colors.textSecondary }]}>
    {text}
    {required ? <Text style={styles.required}> *</Text> : null}
  </AppText>
);

const SelectBox = ({
  value,
  placeholder,
  disabled,
  onPress,
  icon,
  colors,
  isDark,
}: {
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPress: () => void;
  icon?: any;
  colors: any;
  isDark: boolean;
}) => (
  <TouchableOpacity
    style={[
      styles.selectBox,
      {
        backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
        borderColor: value
          ? isDark
            ? '#4C1D95'
            : '#DDD6FE'
          : colors.border,
      },
      disabled && styles.disabledBox,
    ]}
    disabled={disabled}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.selectLeft}>
      {icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={value ? colors.primary : colors.textSecondary}
        />
      ) : null}
      {value ? (
        <Text style={[styles.selectBoxText, { color: colors.text }]}>{value}</Text>
      ) : (
        <AppText style={[styles.selectBoxText, { color: colors.textSecondary }]}>
          {placeholder}
        </AppText>
      )}
    </View>
    <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerSafe: { backgroundColor: '#7C3AED' },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
  lotusBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F9A8D4',
    borderRadius: 99,
  },
  progressText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '700' },

  scrollContent: { paddingBottom: 120, paddingTop: 12 },

  tipCard: { marginHorizontal: 16, marginBottom: 14, borderRadius: 16, overflow: 'hidden' },
  tipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipTitle: { fontSize: 13, fontWeight: '800' },
  tipDesc: { fontSize: 11, marginTop: 2 },

  blockLabel: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  tabEventActive: { borderColor: '#1D4ED8' },
  tabDonationActive: { borderColor: '#BE185D' },
  tabInner: { paddingVertical: 14, paddingHorizontal: 12, alignItems: 'center' },
  tabIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  tabTitle: { fontSize: 14, fontWeight: '800' },
  tabSub: { fontSize: 11, marginTop: 2 },

  imageUpload: {
    height: 190,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  previewImage: { width: '100%', height: '100%' },
  imageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 70,
  },
  imageEditBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124,58,237,0.92)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  imageEditText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  uploadPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  uploadRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  uploadInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTitle: { fontSize: 15, fontWeight: '800' },
  uploadHint: { fontSize: 12, marginTop: 4 },

  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 11, marginTop: 1 },

  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 2,
  },
  required: { color: '#EF4444' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 90,
    fontSize: 15,
    marginBottom: 6,
  },

  selectBox: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  selectLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  disabledBox: { opacity: 0.45 },
  selectBoxText: { fontSize: 15, fontWeight: '500' },

  submitWrap: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 5,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    marginBottom: 8,
  },
  noteText: { fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '78%',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#C4B5FD',
  },
  modalItemText: { fontSize: 15, fontWeight: '500' },
  emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14 },
});

export default AddTempleScreen;