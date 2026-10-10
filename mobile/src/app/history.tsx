import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

type DonationStatus = 'pending' | 'success' | 'rejected' | string;

export default function DonationHistoryScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [donationHistory, setDonationHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchDonationHistory();

    const subscription = supabase
      .channel('public:donations_history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        () => {
          fetchDonationHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [filterType]);

  const fetchDonationHistory = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      let query = supabase
        .from('donations')
        .select(`
          *,
          activity:activity_id (
            activity_name,
            image_url
          )
        `)
        .in('status', ['pending', 'success', 'rejected'])
        .order('created_at', { ascending: false });

      if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const now = new Date();
        const filtered = data.filter((item) => {
          const itemDate = new Date(item.created_at);
          if (filterType === 'month') {
            return (
              itemDate.getMonth() === now.getMonth() &&
              itemDate.getFullYear() === now.getFullYear()
            );
          } else if (filterType === '6months') {
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(now.getMonth() - 6);
            return itemDate >= sixMonthsAgo;
          } else if (filterType === 'year') {
            return itemDate.getFullYear() === now.getFullYear();
          }
          return true;
        });

        const formattedData = filtered.map((item) => {
          const dateObj = new Date(item.created_at);
          const thaiDate = dateObj.toLocaleDateString('th-TH', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          });
          const thaiTime = dateObj.toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit',
          });

          return {
            id: item.id,
            title: item.activity?.activity_name || 'บริจาคทั่วไป',
            donorName: item.donor_name || 'ไม่ระบุชื่อ',
            amount: Number(item.amount),
            date: thaiDate,
            time: thaiTime,
            status: (item.status || 'pending') as DonationStatus,
            isTaxDeductible: !!item.is_tax_deductible,
            image:
              item.activity?.image_url ||
              'https://picsum.photos/id/237/200/200',
          };
        });

        setDonationHistory(formattedData);
      } else {
        setDonationHistory([]);
      }
    } catch (error) {
      console.error('Error fetching donation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (item: {
    status: DonationStatus;
    isTaxDeductible?: boolean;
  }) => {
    if (item.isTaxDeductible) {
      if (isDark) {
        return {
          label: 'e-Donation',
          bg: '#064E3B',
          text: '#6EE7B7',
          dot: '#10B981',
        };
      }
      return {
        label: 'e-Donation',
        bg: '#ECFDF5',
        text: '#059669',
        dot: '#10B981',
      };
    }

    if (isDark) {
      switch (item.status) {
        case 'success':
          return { label: 'สำเร็จ', bg: '#14532D', text: '#86EFAC', dot: '#22C55E' };
        case 'pending':
          return { label: 'รอตรวจสลิป', bg: '#4C1D95', text: '#DDD6FE', dot: '#8B5CF6' };
        case 'rejected':
          return { label: 'ไม่ผ่าน', bg: '#7F1D1D', text: '#FCA5A5', dot: '#EF4444' };
        default:
          return { label: item.status || 'ไม่ระบุ', bg: '#334155', text: '#94A3B8', dot: '#64748B' };
      }
    }

    switch (item.status) {
      case 'success':
        return { label: 'สำเร็จ', bg: '#DCFCE7', text: '#166534', dot: '#16A34A' };
      case 'pending':
        return { label: 'รอตรวจสลิป', bg: '#F3E8FF', text: '#7C3AED', dot: '#8B5CF6' };
      case 'rejected':
        return { label: 'ไม่ผ่าน', bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' };
      default:
        return { label: item.status || 'ไม่ระบุ', bg: '#F1F5F9', text: '#475569', dot: '#94A3B8' };
    }
  };

  const getAmountColor = (item: any) => {
    if (item.isTaxDeductible) {
      return isDark ? '#6EE7B7' : '#059669';
    }
    if (item.status === 'rejected') {
      return isDark ? '#FCA5A5' : '#DC2626';
    }
    if (item.status === 'pending') {
      return isDark ? '#C4B5FD' : '#7C3AED';
    }
    return isDark ? '#4ADE80' : '#16A34A';
  };

  const handleCardPress = (item: any) => {
    if (item.isTaxDeductible) {
      Alert.alert(
        'e-Donation',
        item.status === 'success'
          ? 'รายการนี้เป็นบริจาคผ่านแนวทาง e-Donation (ลดหย่อนภาษี)\nสามารถขอใบอนุโมทนาบัตรในแอปได้'
          : 'รายการนี้เป็นโหมดลดหย่อนภาษี (e-Donation)\nกรุณาสแกน QR ด้วยแอปธนาคาร และเลือกส่งข้อมูลไปกรมสรรพากร\nยอดในแอปจะอัปเดตเมื่อเจ้าหน้าที่ตรวจสอบแล้ว'
      );
      if (item.status === 'success') {
        handleGenerateReceipt(item);
      }
      return;
    }

    if (item.status === 'success') {
      handleGenerateReceipt(item);
      return;
    }
    if (item.status === 'pending') {
      Alert.alert(
        'รอตรวจสลิป',
        'รายการนี้อยู่ระหว่างตรวจสอบสลิป\nเมื่ออนุมัติแล้วจึงจะสร้างใบอนุโมทนาบัตรได้'
      );
      return;
    }
    if (item.status === 'rejected') {
      Alert.alert(
        'รายการไม่ผ่าน',
        'รายการนี้ไม่ผ่านการตรวจสอบ จึงไม่สามารถออกใบอนุโมทนาบัตรได้'
      );
      return;
    }
    Alert.alert('แจ้งเตือน', 'สถานะรายการนี้ยังไม่พร้อมออกใบอนุโมทนาบัตร');
  };

  const handleGenerateReceipt = async (item: any) => {
    if (item.status !== 'success') {
      Alert.alert('แจ้งเตือน', 'ออกใบอนุโมทนาบัตรได้เฉพาะรายการที่สำเร็จเท่านั้น');
      return;
    }

    try {
      const taxLine = item.isTaxDeductible
        ? `<div class="info-row">
             <span class="info-label">ประเภท</span>
             <span class="info-value">e-Donation (ลดหย่อนภาษี)</span>
           </div>`
        : '';

      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <style>
              body {
                font-family: 'Helvetica', Arial, sans-serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #fdf4ff 0%, #f5f3ff 100%);
                color: #1E2937;
              }
              .certificate {
                max-width: 400px;
                margin: 20px auto;
                background: white;
                border-radius: 20px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(124, 58, 237, 0.15);
              }
              .header {
                background: linear-gradient(135deg, #7C3AED, #EC4899);
                padding: 28px 20px;
                text-align: center;
                color: white;
              }
              .header-title { font-size: 22px; font-weight: bold; margin: 0 0 4px 0; }
              .header-sub { font-size: 13px; opacity: 0.9; margin: 0; }
              .lotus { font-size: 36px; margin-bottom: 8px; }
              .body { padding: 24px 22px; }
              .amount-box {
                background: #F0FDF4;
                border: 2px solid #BBF7D0;
                border-radius: 14px;
                padding: 16px;
                text-align: center;
                margin-bottom: 20px;
              }
              .amount-label { font-size: 13px; color: #166534; margin-bottom: 4px; }
              .amount-value { font-size: 28px; font-weight: bold; color: #16A34A; }
              .info-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px solid #F1F5F9;
                font-size: 14px;
              }
              .info-label { color: #64748B; }
              .info-value {
                font-weight: 600;
                color: #1E2937;
                text-align: right;
                max-width: 60%;
              }
              .blessing {
                text-align: center;
                margin-top: 22px;
                padding: 16px;
                background: #F5F3FF;
                border-radius: 12px;
                font-size: 13px;
                color: #5B21B6;
                line-height: 1.7;
              }
              .footer {
                text-align: center;
                padding: 16px;
                font-size: 11px;
                color: #94A3B8;
                border-top: 1px dashed #E2E8F0;
              }
              .ref { font-size: 11px; color: #94A3B8; margin-top: 8px; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <div class="header">
                <div class="lotus">🪷</div>
                <div class="header-title">ใบอนุโมทนาบัตร</div>
                <div class="header-sub">Sathu ทำบุญออนไลน์</div>
              </div>
              <div class="body">
                <div class="amount-box">
                  <div class="amount-label">จำนวนบุญที่ถวาย</div>
                  <div class="amount-value">${item.amount.toLocaleString()} บาท</div>
                </div>
                <div class="info-row">
                  <span class="info-label">รายการ</span>
                  <span class="info-value">${item.title}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">ผู้บริจาค</span>
                  <span class="info-value">${item.donorName}</span>
                </div>
                ${taxLine}
                <div class="info-row">
                  <span class="info-label">วันที่</span>
                  <span class="info-value">${item.date} ${item.time} น.</span>
                </div>
                <div class="info-row">
                  <span class="info-label">รหัสอ้างอิง</span>
                  <span class="info-value">#${String(item.id).slice(0, 8).toUpperCase()}</span>
                </div>
                <div class="blessing">
                  ขออำนาจคุณพระศรีรัตนตรัย<br/>
                  จงดลบันดาลให้ท่านและครอบครัว<br/>
                  ประสบแต่ความสุข ความเจริญ<br/>
                  และความสำเร็จในทุกประการ
                </div>
              </div>
              <div class="footer">
                เอกสารนี้ออกโดยระบบอิเล็กทรอนิกส์ของ Sathu<br/>
                <span class="ref">สามารถตรวจสอบได้ด้วยรหัสอ้างอิงด้านบน</span>
              </div>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'แชร์ใบอนุโมทนาบัตร',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('สำเร็จ', 'สร้างใบอนุโมทนาบัตรเรียบร้อยแล้ว');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('เกิดข้อผิดพลาด', 'ไม่สามารถสร้างใบอนุโมทนาบัตรได้');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <AppText style={[styles.headerTitle, { color: colors.text }]}>
          ประวัติการบริจาค
        </AppText>
      </View>

      {/* Filter Tabs */}
      <View
        style={[
          styles.filterContainer,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {[
          { key: 'all', label: 'ทั้งหมด' },
          { key: 'month', label: 'เดือนนี้' },
          { key: '6months', label: '6 เดือน' },
          { key: 'year', label: 'ปีนี้' },
        ].map((tab) => {
          const active = filterType === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                {
                  backgroundColor: active
                    ? isDark
                      ? '#4C1D95'
                      : '#1E1B4B'
                    : colors.card,
                  borderColor: active
                    ? isDark
                      ? '#4C1D95'
                      : '#1E1B4B'
                    : colors.border,
                },
              ]}
              onPress={() => setFilterType(tab.key)}
            >
              <AppText
                style={[
                  styles.filterText,
                  {
                    color: active ? '#FFFFFF' : colors.textSecondary,
                  },
                ]}
              >
                {tab.label}
              </AppText>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText style={[styles.loadingText, { color: colors.textSecondary }]}>
                กำลังโหลดข้อมูล...
              </AppText>
            </View>
          ) : donationHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
                ]}
              >
                <Feather name="clock" size={40} color={colors.primary} />
              </View>
              <AppText style={[styles.emptyText, { color: colors.text }]}>
                ไม่มีประวัติการบริจาค
              </AppText>
              <AppText style={[styles.emptySubText, { color: colors.textSecondary }]}>
                ขอบคุณที่ร่วมทำบุญกับเรา
              </AppText>
            </View>
          ) : (
            <View style={styles.timelineWrapper}>
              <View
                style={[
                  styles.timelineLineVertical,
                  { backgroundColor: colors.border },
                ]}
              />

              {donationHistory.map((item) => {
                const statusInfo = getStatusInfo(item);
                const canReceipt = item.status === 'success';
                const amountColor = getAmountColor(item);

                return (
                  <View key={item.id} style={styles.timelineItem}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor: statusInfo.dot,
                          borderColor: colors.card,
                        },
                      ]}
                    />

                    <TouchableOpacity
                      style={[
                        styles.card,
                        {
                          backgroundColor: colors.card,
                          borderColor: isDark ? colors.border : '#F3E8FF',
                        },
                      ]}
                      onPress={() => handleCardPress(item)}
                      activeOpacity={0.7}
                    >
                      <Image source={{ uri: item.image }} style={styles.cardImage} />

                      <View style={styles.cardBody}>
                        <View style={styles.titleRow}>
                          <Text
                            style={[styles.title, { color: colors.text }]}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                        </View>

                        {/* Badge */}
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusInfo.bg },
                          ]}
                        >
                          <AppText
                            style={[
                              styles.statusBadgeText,
                              { color: statusInfo.text },
                            ]}
                          >
                            {statusInfo.label}
                          </AppText>
                        </View>

                        <AppText
                          style={[
                            styles.donorText,
                            { color: isDark ? '#C4B5FD' : '#7C3AED' },
                          ]}
                          numberOfLines={1}
                        >
                          ผู้บริจาค: {item.donorName}
                        </AppText>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                          {item.date} • {item.time}
                        </Text>
                        <AppText
                          style={[
                            styles.receiptHint,
                            {
                              color: canReceipt
                                ? isDark
                                  ? '#C4B5FD'
                                  : '#7C3AED'
                                : colors.textSecondary,
                            },
                          ]}
                        >
                          {item.isTaxDeductible
                            ? canReceipt
                              ? '📄 e-Donation · กดเพื่อขอใบอนุโมทนา'
                              : '🟢 e-Donation · รอตรวจสอบในระบบ'
                            : canReceipt
                            ? '📄 กดเพื่อขอใบอนุโมทนาบัตร'
                            : item.status === 'pending'
                            ? '⏳ รอตรวจสลิป — ยังออกใบอนุโมทนาไม่ได้'
                            : '🚫 ไม่สามารถออกใบอนุโมทนาบัตรได้'}
                        </AppText>
                      </View>

                      <View style={styles.amountContainer}>
                        <Text style={[styles.amount, { color: amountColor }]}>
                          {item.amount.toLocaleString()} บาท
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: '700' },

  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterText: { fontSize: 13, fontWeight: '600' },

  scrollView: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },

  centerContainer: { paddingVertical: 60, alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 15 },

  emptyContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: { fontSize: 17, fontWeight: '700' },
  emptySubText: { fontSize: 13, marginTop: 4 },

  timelineWrapper: { position: 'relative', paddingLeft: 16 },
  timelineLineVertical: {
    position: 'absolute',
    left: 23,
    top: 10,
    bottom: 20,
    width: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 3,
    position: 'absolute',
    left: 0,
    zIndex: 1,
  },

  card: {
    flex: 1,
    marginLeft: 24,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    resizeMode: 'cover',
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: { marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  donorText: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  dateText: { fontSize: 12 },
  receiptHint: { fontSize: 10, fontWeight: '600', marginTop: 4 },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  amount: { fontSize: 15, fontWeight: '700' },
});