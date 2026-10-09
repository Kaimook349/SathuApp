import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  StatusBar,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../supabase';
import AppText from './components/AppText';

const { height } = Dimensions.get('window');

type DonationItem = {
  id: string;
  donor_name: string;
  amount: number;
  created_at: string;
};

const maskName = (name: string) => {
  if (!name) return 'ผู้มีจิตศรัทธา';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].length <= 2 ? parts[0] : parts[0].slice(0, 2) + '...';
  }
  return `${parts[0]} ${parts[1].charAt(0)}.`;
};

const getRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'เมื่อสักครู่';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
  return date.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });
};

export default function LiveDonationWall({ activityId }: { activityId?: string }) {
  const [totalAmount, setTotalAmount] = useState(0);
  const [recentDonations, setRecentDonations] = useState<DonationItem[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    fetchInitialData();
    const channel = subscribeRealtime();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId]);

  const fetchInitialData = async () => {
    try {
      let query = supabase
        .from('donations')
        .select('id, donor_name, amount, created_at')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(25);

      if (activityId) {
        query = query.eq('activity_id', activityId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        setRecentDonations(data);
      }
      await fetchTotal();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchTotal = async () => {
    let query = supabase
      .from('donations')
      .select('amount')
      .eq('status', 'success');

    if (activityId) {
      query = query.eq('activity_id', activityId);
    }

    const { data } = await query;
    const total = (data || []).reduce((sum, item) => sum + Number(item.amount), 0);
    setTotalAmount(total);
  };

  const subscribeRealtime = () => {
    const channel = supabase
      .channel('live-donations-wall')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations',
        },
        (payload) => {
          const newRecord = payload.new as any;

          if (newRecord?.status === 'success') {
            if (activityId && newRecord.activity_id !== activityId) return;

            setRecentDonations((prev) => {
              const exists = prev.some((d) => d.id === newRecord.id);
              if (exists) return prev;

              const newItem: DonationItem = {
                id: newRecord.id,
                donor_name: newRecord.donor_name || 'ผู้มีจิตศรัทธา',
                amount: Number(newRecord.amount),
                created_at: newRecord.created_at || new Date().toISOString(),
              };

              return [newItem, ...prev].slice(0, 30);
            });

            setTotalAmount((prev) => prev + Number(newRecord.amount));

            slideAnim.setValue(40);
            fadeAnim.setValue(0);

            Animated.parallel([
              Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
              }),
              Animated.spring(slideAnim, {
                toValue: 0,
                friction: 7,
                useNativeDriver: true,
              }),
            ]).start();
          }
        }
      )
      .subscribe();

    return channel;
  };

  const renderItem = (item: DonationItem, index: number) => {
    const isNewest = index === 0;

    return (
      <Animated.View
        key={item.id}
        style={[
          styles.donationItem,
          isNewest && {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.donor_name || 'บ').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.donorName} numberOfLines={1}>
            {maskName(item.donor_name)}
          </Text>
          <Text style={styles.time}>{getRelativeTime(item.created_at)}</Text>
        </View>

        <Text style={styles.amount}>+{item.amount.toLocaleString()} ฿</Text>
      </Animated.View>
    );
  };

  const WallContent = ({ fullscreen = false }: { fullscreen?: boolean }) => (
    <View style={[styles.container, fullscreen && styles.fullscreenContainer]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <AppText style={[styles.totalLabel, fullscreen && styles.fullscreenLabel]}>
            ยอดบริจาคทั้งหมด
          </AppText>
          <Text style={[styles.totalAmount, fullscreen && styles.fullscreenAmount]}>
            ฿{totalAmount.toLocaleString()}
          </Text>
        </View>

        <View style={styles.rightHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <AppText style={styles.liveText}>LIVE</AppText>
          </View>

          {!fullscreen && (
            <TouchableOpacity
              style={styles.fullscreenBtn}
              onPress={() => setIsFullscreen(true)}
            >
              <Feather name="maximize" size={18} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <AppText style={[styles.sectionTitle, fullscreen && { color: '#E2E8F0' }]}>
        ผู้ร่วมบุญล่าสุด
      </AppText>

      <ScrollView
        style={[styles.list, fullscreen && { maxHeight: height * 0.65 }]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {recentDonations.length === 0 ? (
          <AppText style={styles.emptyText}>ยังไม่มีผู้ร่วมบุญ</AppText>
        ) : (
          recentDonations.map((item, index) => renderItem(item, index))
        )}
      </ScrollView>

      {fullscreen && (
        <TouchableOpacity
          style={styles.exitFullscreen}
          onPress={() => setIsFullscreen(false)}
        >
          <Feather name="minimize" size={20} color="#fff" />
          <AppText style={styles.exitText}>ออกจากโหมดเต็มจอ</AppText>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <>
      <WallContent />

      <Modal visible={isFullscreen} animationType="fade" statusBarTranslucent>
        <StatusBar hidden />
        <View style={styles.fullscreenWrapper}>
          <WallContent fullscreen />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  fullscreenWrapper: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  fullscreenContainer: {
    backgroundColor: '#0F172A',
    margin: 0,
    borderRadius: 0,
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  fullscreenLabel: {
    color: '#94A3B8',
    fontSize: 16,
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1E2937',
  },
  fullscreenAmount: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  rightHeader: {
    alignItems: 'flex-end',
    gap: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginRight: 6,
  },
  liveText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  fullscreenBtn: {
    padding: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E2937',
    marginBottom: 12,
  },
  list: {
    maxHeight: 300,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 14,
    paddingVertical: 24,
  },
  donationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E0E7FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4F46E5',
  },
  info: {
    flex: 1,
  },
  donorName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E2937',
  },
  time: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10B981',
  },
  exitFullscreen: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
  },
  exitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});