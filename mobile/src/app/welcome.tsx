import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Animated, Dimensions, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

// คำที่จะให้แสดงสลับกันตามลำดับ (ตามภาพ)
const WORDS = ['Hello :)', 'Welcome to', 'Sathu'];

export default function WelcomeScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const runAnimation = async () => {
      for (let i = 0; i < WORDS.length; i++) {
        setWordIndex(i);
        
        // 1. เฟดข้อความปรากฏขึ้น
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();

        // 2. ค้างข้อความไว้
        await new Promise((resolve) => setTimeout(resolve, 1500));

        // 3. เฟดข้อความหายไป (ยกเว้นคำสุดท้าย)
        if (i < WORDS.length - 1) {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start();
          
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }

      // เสร็จสิ้นการแสดงคำทั้งหมด เด้งไปหน้าหลัก
      setTimeout(() => {
  router.replace('/select-location' as any);
      }, 1000);
    };

    runAnimation();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.contentContainer}>
        <Animated.Text style={[styles.welcomeText, { opacity: fadeAnim }]}>
          {WORDS[wordIndex]}
        </Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#0A1428' // สีน้ำเงินเข้มตามภาพ
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 52,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(255, 107, 203, 0.4)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 20,
    ...Platform.select({
      ios: { fontFamily: 'System' },
      android: { fontFamily: 'sans-serif-medium' },
    }),
  },
});