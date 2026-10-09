import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import QRCode from 'react-native-qrcode-svg';
import generatePayload from 'promptpay-qr';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');

const PROMPTPAY_ID = '0812345678'; // เปลี่ยนเป็นเบอร์/เลขพร้อมเพย์จริง
const AMOUNTS = [20, 50, 100, 300, 500, 1000];

// ภาพปกจาก assets
const COVER_IMAGE = require('../../assets/images/Gemini_Generated_Image_q6mq7mq6mq7mq6mq.jpeg');

type ScreenType = 'main' | 'donate';

interface Project {
  id: string;
  title: string;
  description: string;
  goal: number;
  raised: number;
  donors: number;
  image: string | null;
  status: string;
  end_date: string | null;
  category: string | null;
}

export default function LoyKrathongScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [screen, setScreen] = useState<ScreenType>('main');
  const [project, setProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });
  const [isEventReached, setIsEventReached] = useState(false);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(20);
  const [customAmount, setCustomAmount] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [slipImage, setSlipImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [donorName, setDonorName] = useState('');

  const finalAmount = customAmount ? Number(customAmount) : selectedAmount || 0;

  const cardBg = isDark ? colors.card : '#FFFFFF';
  const softBorder = isDark ? colors.border : 'rgba(236,72,153,0.12)';

  const fetchProject = useCallback(async () => {
    try {
      setLoadingProject(true);
      const { data, error } = await supabase
        .from('admin_projects')
        .select(
          'id, title, description, goal, raised, donors, image, status, end_date, category'
        )
        .ilike('title', '%ลอยกระทง%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.log('project error:', error.message);
        setProject(null);
        return;
      }
      setProject(data as Project | null);
    } catch (e) {
      console.log(e);
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProject();
    }, [fetchProject])
  );

  useEffect(() => {
    const target = project?.end_date
      ? new Date(project.end_date + 'T18:00:00')
      : new Date('2026-11-24T18:00:00');

    const tick = () => {
      const distance = target.getTime() - Date.now();
      if (distance <= 0) {
        setIsEventReached(true);
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      setIsEventReached(false);
      setCountdown({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
      });
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [project?.end_date]);

  const progress = project
    ? Math.min((Number(project.raised) / Math.max(Number(project.goal), 1)) * 100, 100)
    : 0;

  const qrPayload =
    finalAmount >= 20 ? generatePayload(PROMPTPAY_ID, { amount: finalAmount }) : '';

  const pickSlip = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('ต้องการสิทธิ์', 'กรุณาอนุญาตการเข้าถึงรูปภาพ');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSlipImage(result.assets[0].uri);
    }
  };

  const submitDonation = async () => {
    if (!project) {
      Alert.alert('ไม่พบโครงการ', 'ไม่พบโครงการลอยกระทงในระบบ');
      return;
    }
    if (!slipImage) {
      Alert.alert('แจ้งเตือน', 'กรุณาอัปโหลดสลิปการโอนเงิน');
      return;
    }
    if (finalAmount < 20) {
      Alert.alert('แจ้งเตือน', 'ยอดบริจาคขั้นต่ำ 20 บาท');
      return;
    }

    try {
      setUploading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('กรุณาเข้าสู่ระบบก่อน');
        return;
      }

      const fileName = `slip_${user.id}_${Date.now()}.jpg`;
      const response = await fetch(slipImage);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('slips')
        .upload(fileName, blob, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('slips').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('donations').insert([
        {
          user_id: user.id,
          donor_name: donorName.trim() || 'ผู้ใจบุญ',
          amount: finalAmount,
          payment_method: 'promptpay',
          status: 'pending',
          purpose: 'loy-krathong',
          project_id: project.id,
          slip_url: urlData.publicUrl,
        },
      ]);

      if (insertError) {
        if (insertError.message?.includes('column')) {
          const { error: e2 } = await supabase.from('donations').insert([
            {
              user_id: user.id,
              donor_name: donorName.trim() || 'ผู้ใจบุญ',
              amount: finalAmount,
              payment_method: 'promptpay',
              status: 'pending',
            },
          ]);
          if (e2) throw e2;
        } else {
          throw insertError;
        }
      }

      Alert.alert(
        'ส่งข้อมูลสำเร็จ 🪷',
        'ขอบคุณที่ร่วมทำบุญโครงการลอยกระทง\nทีมงานจะตรวจสอบสลิปภายใน 1–2 วันทำการ'
      );

      setShowQR(false);
      setSlipImage(null);
      setSelectedAmount(20);
      setCustomAmount('');
      setDonorName('');
      setScreen('main');
      fetchProject();
    } catch (error: any) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', error.message || 'ไม่สามารถส่งข้อมูลได้');
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `ร่วมทำบุญโครงการ${project?.title || 'ลอยกระทง'} กับแอป Sathu 🪷\nเป้าหมาย ${Number(
          project?.goal || 0
        ).toLocaleString()} บาท`,
      });
    } catch {}
  };

  // ====================== หน้าหลัก ======================
  if (screen === 'main') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFF7FB' }]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        <View style={[styles.header, { backgroundColor: 'transparent' }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: cardBg }]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <AppText style={[styles.headerTitle, { color: colors.text }]}>ลอยกระทง</AppText>
          <TouchableOpacity
            onPress={handleShare}
            style={[styles.iconBtn, { backgroundColor: cardBg }]}
          >
            <Ionicons name="share-outline" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Hero — ใช้ภาพจาก assets */}
          <View style={styles.heroWrap}>
            <Image source={COVER_IMAGE} style={styles.heroImg} resizeMode="cover" />
            <LinearGradient
              colors={['transparent', 'rgba(15,23,42,0.65)']}
              style={styles.heroFade}
            />
            <View style={styles.heroTextBox}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>🪷 ประเพณีไทย</Text>
              </View>
              <Text style={styles.heroTitle}>{project?.title || 'ลอยกระทง'}</Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {project?.description?.replace(/^"|"$/g, '') ||
                  'ร่วมอนุรักษ์ประเพณี ทำบุญออนไลน์ได้ทุกที่'}
              </Text>
            </View>
          </View>

          {/* Countdown */}
          <View
            style={[styles.countdownCard, { backgroundColor: cardBg, borderColor: softBorder }]}
          >
            <AppText style={[styles.cdLabel, { color: colors.textSecondary }]}>
              {isEventReached ? 'ถึงวันงานแล้ว' : 'นับถอยหลังสู่กิจกรรม'}
            </AppText>
            <View style={styles.cdRow}>
              {[
                { v: countdown.days, u: 'วัน' },
                { v: countdown.hours, u: 'ชม.' },
                { v: countdown.minutes, u: 'นาที' },
              ].map((item, i) => (
                <React.Fragment key={item.u}>
                  {i > 0 && <Text style={styles.cdColon}>:</Text>}
                  <View style={styles.cdItem}>
                    <Text style={[styles.cdNum, { color: colors.text }]}>
                      {String(item.v).padStart(2, '0')}
                    </Text>
                    <AppText style={[styles.cdUnit, { color: colors.textSecondary }]}>
                      {item.u}
                    </AppText>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>

          {/* โครงการบริจาค */}
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>โครงการบริจาค</AppText>

          {loadingProject ? (
            <ActivityIndicator color="#EC4899" style={{ marginVertical: 24 }} />
          ) : !project ? (
            <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
              <AppText style={{ color: colors.textSecondary }}>ยังไม่พบโครงการลอยกระทง</AppText>
            </View>
          ) : (
            <View
              style={[styles.projectCard, { backgroundColor: cardBg, borderColor: softBorder }]}
            >
              <View style={styles.projectTop}>
                <View style={styles.projectIcon}>
                  <MaterialCommunityIcons name="flower" size={22} color="#EC4899" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={1}>
                    {project.title}
                  </Text>
                  <AppText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {project.category || 'ประเพณี'} ·{' '}
                    {project.status === 'active' ? 'เปิดรับบริจาค' : project.status}
                  </AppText>
                </View>
              </View>

              <Text style={[styles.projectDesc, { color: colors.textSecondary }]} numberOfLines={3}>
                {project.description?.replace(/^"|"$/g, '')}
              </Text>

              <View style={styles.progressMeta}>
                <Text style={[styles.raisedText, { color: colors.text }]}>
                  ฿{Number(project.raised).toLocaleString()}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  จาก ฿{Number(project.goal).toLocaleString()}
                </Text>
              </View>
              <View
                style={[styles.progressBg, { backgroundColor: isDark ? '#1E293B' : '#FCE7F3' }]}
              >
                <LinearGradient
                  colors={['#F472B6', '#EC4899']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progress}%` }]}
                />
              </View>
              <View style={styles.progressMeta}>
                <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {progress.toFixed(0)}% ของเป้าหมาย
                </AppText>
                <AppText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {Number(project.donors).toLocaleString()} ผู้ร่วมบุญ
                </AppText>
              </View>

              <TouchableOpacity
                style={styles.donateMainBtn}
                onPress={() => {
                  setScreen('donate');
                  setShowQR(false);
                  setSlipImage(null);
                }}
                activeOpacity={0.9}
              >
                <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.donateMainGrad}>
                  <Ionicons name="heart" size={18} color="#fff" />
                  <Text style={styles.donateMainText}>ร่วมทำบุญโครงการนี้</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* กิจกรรม */}
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>กิจกรรม</AppText>
          <View style={styles.actRow}>
            <View style={[styles.actCard, { backgroundColor: cardBg, borderColor: softBorder }]}>
              <View style={[styles.actIcon, { backgroundColor: isDark ? '#831843' : '#FCE7F3' }]}>
                <MaterialCommunityIcons name="spa" size={28} color="#EC4899" />
              </View>
              <AppText style={[styles.actTitle, { color: colors.text }]}>ลอยกระทงออนไลน์</AppText>
              <AppText style={[styles.actDesc, { color: colors.textSecondary }]}>
                ลอยกระทงเสมือนจริง
              </AppText>
              <TouchableOpacity
                style={[styles.actBtn, !isEventReached && { opacity: 0.55 }]}
                onPress={() => {
                  if (!isEventReached) {
                    Alert.alert('ยังไม่ถึงวัน', 'กิจกรรมลอยกระทงออนไลน์จะเปิดเมื่อถึงวันงาน');
                    return;
                  }
                  Alert.alert('เริ่มลอยกระทง', 'กำลังเตรียมหน้าลอยกระทงออนไลน์...');
                }}
              >
                <Text style={styles.actBtnText}>เริ่มลอย</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.actCard, { backgroundColor: cardBg, borderColor: softBorder }]}>
              <View style={[styles.actIcon, { backgroundColor: isDark ? '#4C1D95' : '#F5F3FF' }]}>
                <MaterialCommunityIcons name="hand-heart" size={28} color="#7C3AED" />
              </View>
              <AppText style={[styles.actTitle, { color: colors.text }]}>ทำบุญลอยกระทง</AppText>
              <AppText style={[styles.actDesc, { color: colors.textSecondary }]}>
                เข้าโครงการเดียวกับด้านบน
              </AppText>
              <TouchableOpacity
                style={[styles.actBtn, { backgroundColor: '#7C3AED' }]}
                onPress={() => {
                  setScreen('donate');
                  setShowQR(false);
                  setSlipImage(null);
                }}
              >
                <Text style={styles.actBtnText}>ทำบุญ</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.trustRow}>
            {[
              { icon: 'shield-checkmark' as const, c: '#10B981', t: 'ปลอดภัย' },
              { icon: 'receipt' as const, c: '#3B82F6', t: 'มีหลักฐาน' },
              { icon: 'eye' as const, c: '#8B5CF6', t: 'โปร่งใส' },
            ].map((x) => (
              <View key={x.t} style={styles.trustItem}>
                <Ionicons name={x.icon} size={18} color={x.c} />
                <AppText style={[styles.trustText, { color: colors.textSecondary }]}>{x.t}</AppText>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ====================== หน้าบริจาค ======================
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: cardBg,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: softBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => {
            setScreen('main');
            setShowQR(false);
            setSlipImage(null);
          }}
          style={styles.iconBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          บริจาค · {project?.title || 'ลอยกระทง'}
        </AppText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {project && (
          <View
            style={[styles.miniProject, { backgroundColor: cardBg, borderColor: softBorder }]}
          >
            <Image source={COVER_IMAGE} style={styles.miniImg} resizeMode="cover" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.miniTitle, { color: colors.text }]} numberOfLines={1}>
                {project.title}
              </Text>
              <AppText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                เป้าหมาย ฿{Number(project.goal).toLocaleString()}
              </AppText>
            </View>
          </View>
        )}

        {!showQR ? (
          <>
            <AppText style={[styles.sectionTitle, { color: colors.text }]}>เลือกจำนวนเงิน</AppText>
            <View style={styles.amountGrid}>
              {AMOUNTS.map((amt) => {
                const active = selectedAmount === amt && !customAmount;
                return (
                  <TouchableOpacity
                    key={amt}
                    style={[
                      styles.amountChip,
                      {
                        backgroundColor: active ? (isDark ? '#831843' : '#FDF2F8') : cardBg,
                        borderColor: active ? '#EC4899' : softBorder,
                      },
                    ]}
                    onPress={() => {
                      setSelectedAmount(amt);
                      setCustomAmount('');
                    }}
                  >
                    <Text
                      style={[
                        styles.amountChipText,
                        { color: active ? '#EC4899' : colors.text },
                      ]}
                    >
                      {amt.toLocaleString()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.customRow, { backgroundColor: cardBg, borderColor: softBorder }]}>
              <AppText style={{ color: colors.textSecondary, fontSize: 14 }}>กำหนดเอง</AppText>
              <View style={styles.customInputBox}>
                <TextInput
                  style={[styles.customInput, { color: colors.text }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                  value={customAmount}
                  onChangeText={(t) => {
                    setCustomAmount(t.replace(/[^0-9]/g, ''));
                    setSelectedAmount(null);
                  }}
                />
                <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>฿</Text>
              </View>
            </View>

            <View style={[styles.nameRow, { backgroundColor: cardBg, borderColor: softBorder }]}>
              <AppText style={{ color: colors.textSecondary, fontSize: 14 }}>ชื่อผู้บริจาค</AppText>
              <TextInput
                style={[styles.nameInput, { color: colors.text }]}
                placeholder="ไม่ระบุก็ได้"
                placeholderTextColor={colors.textSecondary}
                value={donorName}
                onChangeText={setDonorName}
              />
            </View>

            <TouchableOpacity
              style={styles.donateMainBtn}
              onPress={() => {
                if (finalAmount < 20) {
                  Alert.alert('แจ้งเตือน', 'ยอดบริจาคขั้นต่ำ 20 บาท');
                  return;
                }
                setShowQR(true);
              }}
            >
              <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.donateMainGrad}>
                <Text style={styles.donateMainText}>
                  สร้าง QR · {finalAmount > 0 ? finalAmount.toLocaleString() : '0'} บาท
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <View style={[styles.qrCard, { backgroundColor: cardBg, borderColor: softBorder }]}>
            <AppText style={[styles.qrTitle, { color: colors.text }]}>สแกน QR พร้อมเพย์</AppText>
            <Text style={styles.qrAmount}>{finalAmount.toLocaleString()} บาท</Text>
            <AppText style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
              เข้าโครงการ: {project?.title || 'ลอยกระทง'}
            </AppText>

            <View style={styles.qrBox}>
              {qrPayload ? (
                <QRCode value={qrPayload} size={200} backgroundColor="#fff" />
              ) : (
                <AppText style={{ color: colors.textSecondary }}>กำลังสร้าง QR...</AppText>
              )}
            </View>

            <AppText style={[styles.qrHint, { color: colors.textSecondary }]}>
              เปิดแอปธนาคาร → สแกน → ชำระเงิน → อัปโหลดสลิป
            </AppText>

            <TouchableOpacity style={styles.uploadBtn} onPress={pickSlip}>
              <Ionicons name="cloud-upload-outline" size={20} color="#EC4899" />
              <Text style={styles.uploadText}>
                {slipImage ? 'เปลี่ยนสลิป' : 'อัปโหลดสลิปการโอน'}
              </Text>
            </TouchableOpacity>

            {slipImage && <Image source={{ uri: slipImage }} style={styles.slipPreview} />}

            <TouchableOpacity
              style={[styles.donateMainBtn, { marginTop: 16 }]}
              onPress={submitDonation}
              disabled={uploading}
            >
              <LinearGradient colors={['#F472B6', '#EC4899']} style={styles.donateMainGrad}>
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.donateMainText}>ยืนยันการบริจาค</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowQR(false);
                setSlipImage(null);
              }}
              style={{ marginTop: 14 }}
            >
              <AppText style={{ textAlign: 'center', color: colors.textSecondary }}>ยกเลิก</AppText>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
          <AppText style={[styles.noteText, { color: colors.textSecondary }]}>
            ยอดจะถูกบันทึกเข้าโครงการ「{project?.title || 'ลอยกระทง'}」หลังแอดมินอนุมัติสลิป
          </AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700' },

  heroWrap: {
    height: 220,
    marginHorizontal: 16,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#FCE7F3',
  },
  heroImg: { width: '100%', height: '100%' },
  heroFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 120,
  },
  heroTextBox: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  heroPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  heroPillText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '800' },
  heroSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4, lineHeight: 18 },

  countdownCard: {
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cdLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  cdRow: { flexDirection: 'row', alignItems: 'center' },
  cdItem: { alignItems: 'center', minWidth: 52 },
  cdNum: { fontSize: 26, fontWeight: '800' },
  cdUnit: { fontSize: 11, marginTop: 2 },
  cdColon: { fontSize: 20, fontWeight: '700', color: '#E2E8F0', marginBottom: 12 },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 12,
  },

  emptyCard: {
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },

  projectCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
  },
  projectTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  projectIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FCE7F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectTitle: { fontSize: 16, fontWeight: '800' },
  projectDesc: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  raisedText: { fontSize: 16, fontWeight: '800' },
  progressBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  progressFill: { height: '100%', borderRadius: 4 },

  donateMainBtn: {
    marginHorizontal: 16,
    marginTop: 14,
    borderRadius: 28,
    overflow: 'hidden',
  },
  donateMainGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
  },
  donateMainText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  actRow: { flexDirection: 'row', marginHorizontal: 16, gap: 12 },
  actCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  actIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actTitle: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  actDesc: { fontSize: 11, marginTop: 3, textAlign: 'center' },
  actBtn: {
    backgroundColor: '#EC4899',
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  actBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  trustRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 24,
    justifyContent: 'space-around',
  },
  trustItem: { alignItems: 'center' },
  trustText: { fontSize: 12, marginTop: 4, fontWeight: '600' },

  miniProject: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  miniImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#FCE7F3' },
  miniTitle: { fontSize: 15, fontWeight: '700' },

  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    gap: 10,
  },
  amountChip: {
    width: (width - 52) / 3,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  amountChipText: { fontSize: 16, fontWeight: '700' },

  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
  },
  customInputBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customInput: { fontSize: 18, fontWeight: '700', minWidth: 60, textAlign: 'right' },

  nameRow: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  nameInput: { fontSize: 15, marginTop: 4, paddingVertical: 4 },

  qrCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  qrTitle: { fontSize: 16, fontWeight: '700' },
  qrAmount: { fontSize: 28, fontWeight: '800', color: '#EC4899', marginVertical: 6 },
  qrBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginVertical: 10,
  },
  qrHint: { fontSize: 13, textAlign: 'center', marginBottom: 14 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: '#EC4899',
    borderRadius: 24,
    borderStyle: 'dashed',
  },
  uploadText: { color: '#EC4899', fontWeight: '700' },
  slipPreview: {
    width: 160,
    height: 220,
    borderRadius: 12,
    marginTop: 14,
  },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 18,
    padding: 12,
  },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
});