import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import QRCode from 'react-native-qrcode-svg';
import generatePayload from 'promptpay-qr';
import { supabase } from '../../supabase';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const donationAmounts = [20, 50, 100, 300, 500, 1000];

const PROMPTPAY_ID = '0812345678';
const DEMO_ORG_CODE = 'RD-ORG-2569-001';
const DEMO_ORG_NAME = 'มูลนิธิ/วัดในระบบสาธุ (Demo)';

export default function DonationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, isDark } = useTheme();

  const activityId = (params.activityId as string) || '';
  const projectId = (params.projectId as string) || '';
  const activityName =
    (params.activityName as string) || (params.title as string) || 'บริจาค';
  const templeName = (params.templeName as string) || '';
  const province = (params.province as string) || '';
  const imageUrl =
    (params.imageUrl as string) || (params.image as string) || '';
  const bankName = (params.bankName as string) || '';
  const bankAccount = (params.bankAccount as string) || '';
  const accountName = (params.accountName as string) || '';
  const totalGoal = Number(params.goal) || 100000;

  const [selectedAmount, setSelectedAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState('');
  const [donorName, setDonorName] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<
    'promptpay' | 'truemoney' | 'bank'
  >('promptpay');
  const [slipUri, setSlipUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentDonated, setCurrentDonated] = useState(0);

  const [donationMode, setDonationMode] = useState<'normal' | 'tax'>('normal');
  const [donorTaxId, setDonorTaxId] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [donorPhone, setDonorPhone] = useState('');

  const [showQR, setShowQR] = useState(false);
  const [qrPayload, setQrPayload] = useState('');
  const [timerSec, setTimerSec] = useState(600);

  const [mockEdonationRef, setMockEdonationRef] = useState('');
  const [mockTxnRef, setMockTxnRef] = useState('');

  const finalAmount = customAmount
    ? parseInt(customAmount, 10) || 0
    : selectedAmount;

  const progress =
    totalGoal > 0 ? Math.min((currentDonated / totalGoal) * 100, 100) : 0;

  const canSubmit =
    finalAmount > 0 &&
    donorName.trim().length > 0 &&
    !loading &&
    !uploading &&
    (donationMode === 'tax' || !!slipUri);

  useEffect(() => {
    fetchTotalDonations();

    const channel = supabase
      .channel('donation-total-' + (projectId || activityId || 'all'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (projectId && row.project_id === projectId) fetchTotalDonations();
          else if (activityId && row.activity_id === activityId) fetchTotalDonations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId, projectId]);

  useEffect(() => {
    if (!showQR) return;
    if (timerSec <= 0) {
      setShowQR(false);
      return;
    }
    const t = setTimeout(() => setTimerSec((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [showQR, timerSec]);

  const fetchTotalDonations = async () => {
    try {
      let query = supabase
        .from('donations')
        .select('amount')
        .eq('status', 'success');

      if (projectId) query = query.eq('project_id', projectId);
      else if (activityId) query = query.eq('activity_id', activityId);
      else {
        setCurrentDonated(0);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;

      const total = (data || []).reduce(
        (sum, d) => sum + Number(d.amount || 0),
        0
      );
      setCurrentDonated(total);
    } catch (e) {
      console.log('fetchTotalDonations error', e);
      setCurrentDonated(0);
    }
  };

  const formatMoney = (n: number) =>
    n.toLocaleString('th-TH', { maximumFractionDigits: 0 });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isValidTaxId = (value: string) => {
    const v = value.replace(/\D/g, '');
    return v.length === 0 || v.length === 13;
  };

  const generateMockRefs = () => {
    const ts = Date.now().toString();
    const edonationRef = `EDN${ts.slice(-12)}`;
    const txnRef = `TXN${ts.slice(-10)}`;
    setMockEdonationRef(edonationRef);
    setMockTxnRef(txnRef);
    return { edonationRef, txnRef };
  };

  const pickSlip = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setSlipUri(result.assets[0].uri);
    }
  };

  const uploadSlip = async (uri: string, userId: string) => {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${userId}/${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const { error } = await supabase.storage
      .from('payment-slips')
      .upload(path, decode(base64), { contentType, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from('payment-slips').getPublicUrl(path);
    return data.publicUrl;
  };

  const openPromptPayQR = () => {
    if (finalAmount <= 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกหรือกรอกจำนวนเงิน');
      return;
    }
    if (!donorName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อผู้บริจาค');
      return;
    }
    if (donationMode === 'tax' && !isValidTaxId(donorTaxId)) {
      Alert.alert('แจ้งเตือน', 'เลขประจำตัวผู้เสียภาษีต้องเป็น 13 หลัก');
      return;
    }

    try {
      const payload = generatePayload(PROMPTPAY_ID, { amount: finalAmount });
      setQrPayload(payload);
      setTimerSec(600);
      generateMockRefs();
      setShowQR(true);
    } catch (e) {
      console.log(e);
      Alert.alert('เกิดข้อผิดพลาด', 'สร้าง QR ไม่สำเร็จ');
    }
  };

  const submitDonation = async () => {
    if (finalAmount <= 0) {
      Alert.alert('แจ้งเตือน', 'กรุณาเลือกหรือกรอกจำนวนเงิน');
      return;
    }
    if (!donorName.trim()) {
      Alert.alert('แจ้งเตือน', 'กรุณากรอกชื่อผู้บริจาค');
      return;
    }
    if (donationMode === 'normal' && !slipUri) {
      Alert.alert('แจ้งเตือน', 'กรุณาแนบสลิปการโอน');
      return;
    }
    if (donationMode === 'tax' && !isValidTaxId(donorTaxId)) {
      Alert.alert('แจ้งเตือน', 'เลขประจำตัวผู้เสียภาษีต้องเป็น 13 หลัก');
      return;
    }

    setLoading(true);
    setUploading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let slipUrl: string | null = null;
      if (donationMode === 'normal' && user && slipUri) {
        slipUrl = await uploadSlip(slipUri, user.id);
      }

      const refs =
        donationMode === 'tax'
          ? mockEdonationRef && mockTxnRef
            ? { edonationRef: mockEdonationRef, txnRef: mockTxnRef }
            : generateMockRefs()
          : { edonationRef: null, txnRef: null };

      const insertData: any = {
        user_id: user?.id || null,
        donor_name: donorName.trim(),
        amount: finalAmount,
        payment_method: selectedPayment,
        status: donationMode === 'tax' ? 'success' : 'pending',
        transaction_ref: donationMode === 'tax' ? refs.txnRef : null,
        activity_id: activityId || null,
        project_id: projectId || null,
        slip_url: slipUrl,
        is_tax_deductible: donationMode === 'tax',
        donor_tax_id:
          donationMode === 'tax' && donorTaxId.trim()
            ? donorTaxId.replace(/\D/g, '')
            : null,
        edonation_ref: donationMode === 'tax' ? refs.edonationRef : null,
      };

      const { error } = await supabase.from('donations').insert(insertData);
      if (error) throw error;

      setShowQR(false);

      if (donationMode === 'tax') {
        Alert.alert(
          'ทำรายการ e-Donation สำเร็จ',
          [
            `หน่วยงาน: ${DEMO_ORG_NAME}`,
            `รหัสหน่วยงาน: ${DEMO_ORG_CODE}`,
            `ผู้บริจาค: ${donorName.trim()}`,
            `จำนวนเงิน: ${formatMoney(finalAmount)} บาท`,
            `เลขอ้างอิง e-Donation: ${refs.edonationRef}`,
            `เลขที่ธุรกรรม: ${refs.txnRef}`,
            '',
            'สถานะ: บันทึกสำเร็จ (ข้อมูลจำลอง)',
            'หมายเหตุ: ระบบนี้จำลอง flow ให้เหมือนจริง สำหรับ Demo/นำเสนอ',
          ].join('\n'),
          [{ text: 'ตกลง', onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          'ส่งสลิปแล้ว',
          'ระบบได้รับสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ\nเมื่ออนุมัติ ยอดจะถูกอัปเดตในระบบ',
          [{ text: 'ตกลง', onPress: () => router.back() }]
        );
      }
    } catch (e: any) {
      console.log(e);
      Alert.alert('เกิดข้อผิดพลาด', e.message || 'ส่งไม่สำเร็จ');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <ImageBackground
          source={{
            uri:
              imageUrl ||
              'https://images.unsplash.com/photo-1548013146-72479768bada?w=800&h=400&fit=crop',
          }}
          style={styles.banner}
        >
          <View style={styles.bannerOverlay}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.bannerTitle} numberOfLines={3}>
              {activityName}
            </Text>
            {!!templeName && (
              <Text style={styles.bannerSub}>
                📍 {templeName}
                {province ? ` · ${province}` : ''}
              </Text>
            )}
          </View>
        </ImageBackground>

        <View style={styles.body}>
          {/* Progress */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.progressHeader}>
              <AppText style={[styles.progressLabel, { color: colors.textSecondary }]}>
                ยอดระดมทุน (ที่อนุมัติแล้ว)
              </AppText>
              <Text style={styles.progressPercent}>{progress.toFixed(0)}%</Text>
            </View>
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: isDark ? '#334155' : '#F1F5F9' },
              ]}
            >
              <View style={[styles.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressAmount, { color: colors.textSecondary }]}>
              {formatMoney(currentDonated)} / {formatMoney(totalGoal)} บาท
            </Text>
          </View>

          {/* โหมดบริจาค */}
          <AppText style={[styles.label, { color: colors.text }]}>ประเภทการบริจาค</AppText>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    donationMode === 'normal'
                      ? isDark
                        ? '#2E1065'
                        : '#F5F3FF'
                      : colors.card,
                  borderColor:
                    donationMode === 'normal' ? '#7C3AED' : colors.border,
                },
              ]}
              onPress={() => setDonationMode('normal')}
            >
              <Ionicons
                name="heart"
                size={22}
                color={donationMode === 'normal' ? '#7C3AED' : '#94A3B8'}
              />
              <AppText
                style={[
                  styles.modeTitle,
                  { color: donationMode === 'normal' ? '#7C3AED' : colors.text },
                ]}
              >
                บริจาคธรรมดา
              </AppText>
              <AppText style={styles.modeSub}>ได้บุญ + ใบอนุโมทนา</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                {
                  backgroundColor:
                    donationMode === 'tax'
                      ? isDark
                        ? '#064E3B'
                        : '#ECFDF5'
                      : colors.card,
                  borderColor: donationMode === 'tax' ? '#10B981' : colors.border,
                },
              ]}
              onPress={() => setDonationMode('tax')}
            >
              <Ionicons
                name="document-text"
                size={22}
                color={donationMode === 'tax' ? '#10B981' : '#94A3B8'}
              />
              <AppText
                style={[
                  styles.modeTitle,
                  { color: donationMode === 'tax' ? '#10B981' : colors.text },
                ]}
              >
                ลดหย่อนภาษี
              </AppText>
              <AppText style={styles.modeSub}>e-Donation</AppText>
            </TouchableOpacity>
          </View>

          {donationMode === 'tax' && (
            <View style={styles.taxInfoBox}>
              <View style={styles.taxInfoHeader}>
                <Ionicons name="shield-checkmark" size={18} color="#047857" />
                <AppText style={styles.taxInfoTitle}>ระบบ e-Donation (จำลองเหมือนจริง)</AppText>
              </View>
              <AppText style={styles.taxInfoText}>
                รายการนี้จะสร้างเลขอ้างอิง e-Donation และเลขที่ธุรกรรมให้อัตโนมัติ
                {'\n'}
                หน่วยงาน: {DEMO_ORG_NAME}
                {'\n'}
                รหัสหน่วยงาน: {DEMO_ORG_CODE}
                {'\n\n'}
                * ข้อมูลถูกจำลองสำหรับ Demo/นำเสนอ ไม่ได้ส่งเข้ากรมสรรพากรจริง
              </AppText>
            </View>
          )}

          {/* ผู้บริจาค */}
          <AppText style={[styles.label, { color: colors.text }]}>ชื่อผู้บริจาค</AppText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder="ชื่อ-นามสกุล ตามบัตรประชาชน"
            placeholderTextColor={colors.textSecondary}
            value={donorName}
            onChangeText={setDonorName}
          />

          {donationMode === 'tax' && (
            <>
              <AppText style={[styles.label, { color: colors.text }]}>
                เลขประจำตัวผู้เสียภาษีอากร
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="เลขบัตรประชาชน 13 หลัก (ไม่บังคับ)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={13}
                value={donorTaxId}
                onChangeText={(t) => setDonorTaxId(t.replace(/\D/g, ''))}
              />

              <AppText style={[styles.label, { color: colors.text }]}>
                อีเมลสำหรับรับหลักฐาน (ไม่บังคับ)
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="name@email.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                value={donorEmail}
                onChangeText={setDonorEmail}
              />

              <AppText style={[styles.label, { color: colors.text }]}>
                เบอร์โทรศัพท์ (ไม่บังคับ)
              </AppText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="08xxxxxxxx"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
                value={donorPhone}
                onChangeText={(t) => setDonorPhone(t.replace(/\D/g, ''))}
              />
            </>
          )}

          {/* จำนวนเงิน */}
          <AppText style={[styles.label, { color: colors.text }]}>เลือกจำนวนเงิน</AppText>
          <View style={styles.amountGrid}>
            {donationAmounts.map((amt) => {
              const active = !customAmount && selectedAmount === amt;
              return (
                <TouchableOpacity
                  key={amt}
                  style={[
                    styles.amountBtn,
                    {
                      backgroundColor: active ? '#FF4D94' : colors.card,
                      borderColor: active ? '#FF4D94' : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.amountBtnText,
                      { color: active ? '#fff' : colors.text },
                    ]}
                  >
                    {amt}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View
            style={[
              styles.customRow,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <TextInput
              style={[styles.customInput, { color: colors.text }]}
              placeholder="หรือกรอกจำนวนเอง"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              value={customAmount}
              onChangeText={setCustomAmount}
            />
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>บาท</Text>
          </View>

          {/* วิธีชำระ */}
          <AppText style={[styles.label, { color: colors.text }]}>วิธีชำระเงิน</AppText>
          <View style={styles.payRow}>
            {(['promptpay', 'truemoney', 'bank'] as const).map((p) => {
              const active = selectedPayment === p;
              const label =
                p === 'promptpay'
                  ? 'PromptPay'
                  : p === 'truemoney'
                  ? 'TrueMoney'
                  : 'โอนธนาคาร';
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.payBtn,
                    {
                      backgroundColor: active ? '#FF4D94' : colors.card,
                      borderColor: active ? '#FF4D94' : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedPayment(p)}
                >
                  <Text
                    style={{
                      color: active ? '#fff' : colors.text,
                      fontWeight: '600',
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(bankName || bankAccount) && (
            <View
              style={[
                styles.accountBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <AppText style={[styles.accountTitle, { color: colors.text }]}>
                บัญชีรับบริจาค
              </AppText>
              {!!bankName && (
                <Text style={{ color: colors.textSecondary }}>ธนาคาร: {bankName}</Text>
              )}
              {!!accountName && (
                <Text style={{ color: colors.textSecondary }}>
                  ชื่อบัญชี: {accountName}
                </Text>
              )}
              {!!bankAccount && (
                <Text style={{ color: colors.textSecondary }}>
                  เลขบัญชี: {bankAccount}
                </Text>
              )}
            </View>
          )}

          {/* แนบสลิปเฉพาะโหมดธรรมดา */}
          {donationMode === 'normal' && (
            <>
              <AppText style={[styles.label, { color: colors.text }]}>แนบสลิปการโอน</AppText>
              {!slipUri ? (
                <TouchableOpacity
                  style={[styles.uploadBox, { borderColor: '#C4B5FD' }]}
                  onPress={pickSlip}
                >
                  <View style={styles.uploadIconCircle}>
                    <Feather name="upload" size={24} color="#7C3AED" />
                  </View>
                  <AppText style={styles.uploadTitle}>แตะเพื่อเลือกสลิป</AppText>
                  <AppText style={styles.uploadSub}>รองรับ JPG, PNG</AppText>
                </TouchableOpacity>
              ) : (
                <View style={[styles.slipPreview, { borderColor: colors.border }]}>
                  <Image source={{ uri: slipUri }} style={styles.slipImage} />
                  <TouchableOpacity style={styles.changeSlipButton} onPress={pickSlip}>
                    <Feather name="refresh-cw" size={16} color="#7C3AED" />
                    <AppText style={styles.changeSlipText}>เปลี่ยนสลิป</AppText>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {selectedPayment === 'promptpay' && (
            <TouchableOpacity style={styles.qrOutlineBtn} onPress={openPromptPayQR}>
              <Feather name="maximize" size={18} color="#FF4D94" />
              <AppText style={styles.qrOutlineText}>
                {donationMode === 'tax'
                  ? `เปิดหน้า e-Donation · ${formatMoney(finalAmount)} บาท`
                  : `แสดง QR PromptPay · ${formatMoney(finalAmount)} บาท`}
              </AppText>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.donateButton,
              !canSubmit && styles.donateButtonDisabled,
              donationMode === 'tax' && { backgroundColor: '#10B981' },
            ]}
            onPress={submitDonation}
            disabled={!canSubmit}
          >
            {loading || uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <AppText style={styles.donateButtonText}>
                {donationMode === 'tax'
                  ? `ยืนยัน e-Donation · ${formatMoney(finalAmount)} บาท`
                  : `ส่งสลิปรออนุมัติ · ${formatMoney(finalAmount)} บาท`}
              </AppText>
            )}
          </TouchableOpacity>

          <AppText style={[styles.note, { color: colors.textSecondary }]}>
            {donationMode === 'tax'
              ? 'โหมดนี้จำลองเอกสารและเลขอ้างอิงให้เหมือนระบบจริง สำหรับ Demo'
              : 'ยอดจะขึ้นหลังเจ้าหน้าที่ตรวจสอบสลิปและอนุมัติแล้วเท่านั้น'}
          </AppText>
        </View>
      </ScrollView>

      {/* Modal QR / e-Donation */}
      <Modal visible={showQR} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.qrModal, { backgroundColor: colors.card }]}>
            <AppText style={[styles.qrTitle, { color: colors.text }]}>
              {donationMode === 'tax' ? 'e-Donation' : 'PromptPay QR'}
            </AppText>

            {donationMode === 'tax' && (
              <View style={styles.orgBox}>
                <Text style={styles.orgName}>{DEMO_ORG_NAME}</Text>
                <Text style={styles.orgCode}>รหัสหน่วยงาน {DEMO_ORG_CODE}</Text>
              </View>
            )}

            <Text style={styles.qrAmount}>{formatMoney(finalAmount)} บาท</Text>
            <AppText style={[styles.qrDonor, { color: colors.textSecondary }]}>
              ผู้บริจาค: {donorName || '-'}
            </AppText>

            {donationMode === 'tax' && (
              <Text style={styles.refText}>
                เลขอ้างอิง: {mockEdonationRef || '-'}
                {'\n'}
                เลขที่ธุรกรรม: {mockTxnRef || '-'}
              </Text>
            )}

            <View style={styles.qrBox}>
              {qrPayload ? (
                <QRCode value={qrPayload} size={210} />
              ) : (
                <ActivityIndicator size="large" color="#7C3AED" />
              )}
            </View>

            <AppText style={[styles.qrTimer, { color: colors.textSecondary }]}>
              หมดอายุใน {formatTimer(timerSec)}
            </AppText>

            <AppText style={[styles.qrHint, { color: colors.textSecondary }]}>
              {donationMode === 'tax'
                ? 'สแกนโอนตามยอด แล้วกดยืนยันเพื่อออกเลข e-Donation จำลอง'
                : 'โอนแล้วแนบสลิป จากนั้นกดส่งเพื่อรออนุมัติ'}
            </AppText>

            {donationMode === 'normal' && (
              <>
                {!slipUri ? (
                  <TouchableOpacity style={styles.modalUploadBtn} onPress={pickSlip}>
                    <Feather name="image" size={18} color="#7C3AED" />
                    <AppText style={styles.modalUploadText}>แนบสลิปการโอน</AppText>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.modalSlipWrap}>
                    <Image source={{ uri: slipUri }} style={styles.modalSlipImage} />
                    <TouchableOpacity onPress={pickSlip}>
                      <AppText style={styles.changeSlipText}>เปลี่ยนสลิป</AppText>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity
              style={[
                styles.modalSubmitBtn,
                donationMode === 'tax' && { backgroundColor: '#10B981' },
                ((donationMode === 'normal' && !slipUri) || loading) && { opacity: 0.45 },
              ]}
              onPress={submitDonation}
              disabled={(donationMode === 'normal' && !slipUri) || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText style={styles.modalSubmitText}>
                  {donationMode === 'tax'
                    ? 'ยืนยันและออกเลข e-Donation'
                    : slipUri
                    ? 'ส่งสลิปรออนุมัติ'
                    : 'แนบสลิปก่อนส่ง'}
                </AppText>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQR(false)}>
              <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>
                ปิดหน้าต่างนี้
              </AppText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { height: 220, justifyContent: 'flex-end' },
  bannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 16,
    justifyContent: 'flex-end',
  },
  backBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 36,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 6,
  },
  bannerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 13 },

  body: { padding: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressPercent: { fontSize: 14, fontWeight: '800', color: '#FF4D94' },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4D94',
    borderRadius: 4,
  },
  progressAmount: { fontSize: 12, marginTop: 8, textAlign: 'right' },

  label: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 14,
  },

  modeRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  modeCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  modeTitle: {
    marginTop: 6,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  modeSub: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },

  taxInfoBox: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  taxInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  taxInfoTitle: {
    fontWeight: '700',
    color: '#065F46',
    fontSize: 14,
  },
  taxInfoText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 20,
  },

  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  amountBtn: {
    width: '30%',
    flexGrow: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  amountBtnText: { fontSize: 16, fontWeight: '700' },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  customInput: { flex: 1, paddingVertical: 12, fontSize: 15 },

  payRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  payBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },

  accountBox: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 4,
  },
  accountTitle: { fontWeight: '700', marginBottom: 4 },

  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadTitle: { fontSize: 15, fontWeight: '700', color: '#5B21B6' },
  uploadSub: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  slipPreview: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: 8,
  },
  slipImage: { width: '100%', height: 220, resizeMode: 'cover' },
  changeSlipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F5F3FF',
  },
  changeSlipText: { fontSize: 14, fontWeight: '600', color: '#7C3AED' },

  qrOutlineBtn: {
    marginTop: 16,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FF4D94',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  qrOutlineText: { color: '#FF4D94', fontSize: 15, fontWeight: '700' },

  donateButton: {
    backgroundColor: '#FF4D94',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  donateButtonDisabled: { backgroundColor: '#F9A8D4' },
  donateButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  note: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  qrModal: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  qrTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  orgBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  orgName: { color: '#065F46', fontWeight: '700', fontSize: 13 },
  orgCode: { color: '#047857', fontSize: 12, marginTop: 2 },
  qrAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FF4D94',
    marginBottom: 4,
  },
  qrDonor: { fontSize: 14, marginBottom: 6 },
  refText: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
    fontWeight: '600',
  },
  qrBox: {
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 10,
  },
  qrTimer: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  qrHint: { fontSize: 12, textAlign: 'center', marginBottom: 12 },
  modalUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#7C3AED',
    borderStyle: 'dashed',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  modalUploadText: { color: '#7C3AED', fontWeight: '700' },
  modalSlipWrap: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
  },
  modalSlipImage: {
    width: 140,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  modalSubmitBtn: {
    backgroundColor: '#FF4D94',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  modalSubmitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  modalCloseBtn: { marginTop: 14, padding: 8 },
});