import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../../supabase';

export default function DailyDhammaCard() {
  const [dhamma, setDhamma] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRandomDhamma();
  }, []);

  const fetchRandomDhamma = async () => {
    try {
      setLoading(true);
      // ดึงบทสวดหรือคำสอนจากตาราง chants
      const { data, error } = await supabase
        .from('chants')
        .select('id, title, summary, content, category');

      if (error) throw error;

      if (data && data.length > 0) {
        // สุ่มเลือก 1 บทความมาแสดงเป็นคำคมประจำวัน
        const randomIndex = Math.floor(Math.random() * data.length);
        setDhamma(data[randomIndex]);
      }
    } catch (error) {
      console.error('Error fetching dhamma wisdom:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.cardContainer}>
        <ActivityIndicator size="small" color="#7C3AED" />
      </View>
    );
  }

  if (!dhamma) return null;

  return (
    <LinearGradient
      colors={['#4C1D95', '#7C3AED']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardContainer}
    >
      <View style={styles.cardHeader}>
        <View style={styles.badgeRow}>
          <Ionicons name="sparkles" size={14} color="#FDE047" />
          <Text style={styles.badgeText}>ธรรมะเตือนสติวันนี้</Text>
        </View>
        <TouchableOpacity onPress={fetchRandomDhamma} activeOpacity={0.7}>
          <Ionicons name="refresh-outline" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <Text style={styles.titleText}>{dhamma.title}</Text>
      <Text style={styles.contentText} numberOfLines={3}>
        {dhamma.summary || dhamma.content}
      </Text>

      <View style={styles.footerRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{dhamma.category || 'ข้อคิดเตือนใจ'}</Text>
        </View>
        <MaterialCommunityIcons name="flower-tulip" size={18} color="rgba(255,255,255,0.6)" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#FDE047',
    fontSize: 11,
    fontWeight: '700',
  },
  titleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  contentText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 10,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    color: '#E9D5FF',
    fontSize: 10,
    fontWeight: '600',
  },
});