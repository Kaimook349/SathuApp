import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Modal,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Entypo,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from './components/BottomNav';
import { useTheme } from '../context/ThemeContext';
// ถ้า error ลอง '../../context/ThemeContext'
import AppText from './components/AppText';
// ถ้า error ลอง '../components/AppText'

const { width } = Dimensions.get('window');

// ถ้า path ไม่ตรง ลอง '../../../assets/images/h19.gif'
const COVER_GIF = require('../../assets/images/h19.gif');

const FORTUNE_DETAILS: Record<string, string> = {
  'สีเสื้อมงคลประจำวัน':
    'วันนี้สีที่เหมาะกับคุณคือ "เขียวมรกต" จะช่วยเสริมดวงด้านการงานให้ราบรื่น ส่วน "สีเหลืองครีม" เสริมเมตตามหานิยม หากต้องเจรจาธุรกิจ แนะนำโทน "ฟ้าสดใส" เพื่อเพิ่มความน่าเชื่อถือและความใจเย็น',
  'ฤกษ์เวลาสตาร์ทรถและออกเดินทาง':
    'ฤกษ์ดีในการสตาร์ทรถวันนี้คือ 06:19 – 07:39 น. ควรเลี่ยงการสตาร์ทในทิศตะวันตกก่อนเที่ยง หากเดินทางไกล แนะนำให้พกสิ่งศักดิ์สิทธิ์ที่นับถือไว้เพื่อความปลอดภัย',
  'เลขป้ายทะเบียนนำโชค และเลขเด่นประจำวัน':
    'เลขเด่นประจำวันคือ 9, 3 และ 0 — เลข 9 เสริมความก้าวหน้า เลข 3 เสริมโชคลาภทางการเงิน เลข 0 ช่วยเรื่องการแก้ปัญหาเฉพาะหน้า เหมาะนำไปใช้กับการตัดสินใจหรือเจรจาในวันนี้',
  'ทิศมงคลในการหันหน้า (โต๊ะทำงาน / ขอพร)':
    'ทิศตะวันออกเฉียงเหนือเป็นทิศมงคลวันนี้ หากมีเรื่องทุกข์ใจหรือต้องการให้งานสำเร็จ ให้หันหน้าไปทางทิศนี้แล้วตั้งจิตอธิษฐานในช่วงสาย พลังงานจะส่งผลดีที่สุด',
};

const FORTUNE_SLIPS: Record<
  number,
  {
    title: string;
    level: string;
    general: string;
    love: string;
    finance: string;
    career: string;
    luckyColor: string;
  }
> = {
  1: {
    title: 'เซียมซีใบที่ 1 · สุวรรณมงคล',
    level: 'โชคลาภดีเยี่ยม',
    general:
      'เปรียบดังอรุณรุ่งแห่งวันใหม่ แสงอาทิตย์สาดส่องความมืดให้จางหาย สิ่งที่ท่านปรารถนาจะค่อยปรากฏเป็นจริง ความเพียรที่ผ่านมาจะเริ่มส่งผล ผู้ใหญ่ให้ความเมตตาอุปถัมภ์',
    love:
      'คนโสดมีเกณฑ์พบเนื้อคู่จากการเดินทางหรือมีคนแนะนำ คนมีคู่ความรักหวานชื่น เข้าใจกันดี มีโอกาสวางแผนอนาคตร่วมกัน',
    finance:
      'การเงินคล่องตัวดี มีโชคลาภลอยเข้ามา การลงทุนมีความเสี่ยงต่ำและได้ผลตอบแทนน่าพอใจ',
    career:
      'การงานก้าวหน้า มีผู้ใหญ่เล็งเห็นความสามารถ ได้รับมอบหมายงานสำคัญหรือมีโอกาสเลื่อนขั้น',
    luckyColor: 'เหลืองทอง · ส้ม',
  },
  2: {
    title: 'เซียมซีใบที่ 2 · ทิพย์พฤกษา',
    level: 'โชคลาภปานกลาง',
    general:
      'เปรียบดังต้นไม้ใหญ่ที่ต้องผ่านลมฝนจึงหยั่งรากลึก ช่วงนี้อาจมีอุปสรรคบ้าง แต่หากอดทนและตั้งมั่นในความดี ปัญหาจะคลี่คลายไปในทางที่ดี',
    love:
      'คนโสดให้ค่อยเป็นค่อยไป อย่ารีบตัดสินใจ คนมีคู่ควรเติมความหวานและรับฟังกันมากขึ้น',
    finance:
      'รายรับเข้ามาเรื่อย ๆ ควรระวังการใช้จ่ายตามอารมณ์ และงดค้ำประกันหรือให้กู้ยืมชั่วคราว',
    career:
      'งานมีความรับผิดชอบเพิ่มขึ้น ต้องละเอียดรอบคอบ อดทนผ่านช่วงนี้จะเกิดผลงานที่ดี',
    luckyColor: 'เขียว · ฟ้าอ่อน',
  },
  3: {
    title: 'เซียมซีใบที่ 3 · บัวบานกลางน้ำ',
    level: 'โชคลาภดี',
    general:
      'ดั่งใบบัวชูช่อเหนือน้ำ แม้มีคลื่นมากระทบก็ยังสงบงาม จิตใจควรตั้งมั่นในศีลธรรม หมั่นทำบุญและแผ่เมตตา สิ่งศักดิ์สิทธิ์จะคุ้มครองให้แคล้วคลาด',
    love:
      'ความรักอบอุ่น เข้าใจกันดี จิตใจสงบเมื่ออยู่ใกล้คนรัก คนโสดจะพบคนจิตใจดีเข้ามาในชีวิต',
    finance:
      'การเงินมั่นคง รายได้สม่ำเสมอ เหมาะแบ่งเงินส่วนหนึ่งไปทำบุญสร้างกุศล',
    career:
      'เพื่อนร่วมงานและเจ้านายให้ความร่วมมือดี งานราบรื่น เหมาะเริ่มโปรเจกต์ใหม่',
    luckyColor: 'ขาว · ครีม',
  },
  5: {
    title: 'เซียมซีใบที่ 5 · มังกรฟ้าประทานพร',
    level: 'โชคลาภดีมาก',
    general:
      'เปรียบดังมังกรผงาดสู่ฟ้า โอกาสทองมาถึงแล้ว สิ่งที่เคยติดขัดจะได้รับการสะสางอย่างรวดเร็ว มีเกณฑ์เดินทางไกลเพื่อสร้างชื่อเสียงหรือรับโชคครั้งใหญ่',
    love:
      'คนโสดมีเกณฑ์พบรักกับคนต่างถิ่น คนมีคู่ความสัมพันธ์แน่นแฟ้น มีเกณฑ์ข่าวดีเรื่องครอบครัว',
    finance:
      'เงินทองไหลมาเทมา ค้าขายได้กำไร มีโชคจากการเสี่ยงโชคเล็กน้อย',
    career:
      'ประสบความสำเร็จ ไอเดียได้รับการยอมรับ ได้รับคำชมหรือเกียรติจากผู้บังคับบัญชา',
    luckyColor: 'แดง · ทอง',
  },
};

const DAILY_ITEMS = [
  {
    key: 'สีเสื้อมงคลประจำวัน',
    icon: 'palette',
    label: 'สีเสื้อมงคล',
    desc: 'สีเสริมดวงวันนี้',
    bg: '#FDF2F8',
    bgDark: '#831843',
    color: '#EC4899',
  },
  {
    key: 'ฤกษ์เวลาสตาร์ทรถและออกเดินทาง',
    icon: 'car',
    label: 'ฤกษ์เดินทาง',
    desc: 'เวลาสตาร์ทรถมงคล',
    bg: '#EFF6FF',
    bgDark: '#1E3A8A',
    color: '#3B82F6',
    type: 'fa' as const,
  },
  {
    key: 'เลขป้ายทะเบียนนำโชค และเลขเด่นประจำวัน',
    icon: 'numeric',
    label: 'เลขนำโชค',
    desc: 'เลขเด่น · ป้ายทะเบียน',
    bg: '#F5F3FF',
    bgDark: '#4C1D95',
    color: '#7C3AED',
  },
  {
    key: 'ทิศมงคลในการหันหน้า (โต๊ะทำงาน / ขอพร)',
    icon: 'compass',
    label: 'ทิศมงคล',
    desc: 'โต๊ะทำงาน · ขอพร',
    bg: '#ECFDF5',
    bgDark: '#065F46',
    color: '#10B981',
    type: 'entypo' as const,
  },
];

const MENU_ITEMS = [
  {
    key: 'horoscope',
    title: 'ดูดวงรายละเอียด',
    sub: 'ราศี · วันเกิด · คำทำนาย',
    icon: 'moon',
    route: '/horoscope',
    colors: ['#7C3AED', '#6D28D9'] as [string, string],
  },
  {
    key: 'tarot',
    title: 'ไพ่ทาโร่',
    sub: 'สุ่มไพ่ · เปิดคำทำนาย',
    icon: 'cards-playing',
    route: '/tarot',
    colors: ['#DB2777', '#9D174D'] as [string, string],
  },
];

const FortuneTelling = () => {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({ title: '', content: '' });
  const [luckyNumbers, setLuckyNumbers] = useState({
    main: [1, 4, 6, 8],
    sub: ['24', '42', '55', '68'],
  });
  const [shaking, setShaking] = useState(false);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [fortuneData, setFortuneData] = useState<any>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shakeLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    const main: number[] = [];
    while (main.length < 4) {
      const n = Math.floor(Math.random() * 10);
      if (!main.includes(n)) main.push(n);
    }
    const sub: string[] = [];
    while (sub.length < 4) {
      const n = (Math.floor(Math.random() * 90) + 10).toString();
      if (!sub.includes(n)) sub.push(n);
    }
    setLuckyNumbers({ main, sub });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const startShake = () => {
    shakeLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
      ])
    );
    shakeLoop.current.start();

    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.12, duration: 250, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const stopShake = () => {
    shakeLoop.current?.stop();
    shakeAnim.setValue(0);
  };

  const handleShakeFortune = () => {
    if (shaking) return;
    setShaking(true);
    setResultNumber(null);
    setFortuneData(null);
    fadeAnim.setValue(0);
    startShake();

    setTimeout(() => {
      stopShake();
      const keys = Object.keys(FORTUNE_SLIPS).map(Number);
      const key = keys[Math.floor(Math.random() * keys.length)];
      setResultNumber(key);
      setFortuneData(FORTUNE_SLIPS[key]);
      setShaking(false);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, 1800);
  };

  const handleReadMore = (title: string) => {
    setSelectedDetail({
      title,
      content: FORTUNE_DETAILS[title] || 'ไม่มีข้อมูล',
    });
    setModalVisible(true);
  };

  const todayDate = new Date().toLocaleDateString('th-TH', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ===== หน้าปก GIF เต็มความกว้าง ===== */}
      <View style={styles.coverWrap}>
        <ImageBackground source={COVER_GIF} style={styles.coverImage} resizeMode="cover">
          <LinearGradient
            colors={[
              'rgba(15,23,42,0.15)',
              'rgba(76,29,149,0.45)',
              'rgba(49,16,89,0.92)',
            ]}
            style={styles.coverGradient}
          >
            <SafeAreaView edges={['top']}>
              <View style={styles.coverHeader}>
                <TouchableOpacity
                  onPress={() => router.back()}
                  style={styles.backBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.coverBadge}>
                  <Ionicons name="sparkles" size={12} color="#FDE68A" />
                  <AppText style={styles.coverBadgeText}>ดูดวงวันนี้</AppText>
                </View>
                <View style={{ width: 40 }} />
              </View>
            </SafeAreaView>

            <View style={styles.coverBody}>
              <AppText style={styles.coverTitle}>ดวงชะตาของคุณ</AppText>
              <AppText style={styles.coverSub}>
                เปิดคำทำนาย · เสี่ยงเซียมซี · เลขมงคล
              </AppText>
              <View style={styles.coverDatePill}>
                <Ionicons name="calendar-outline" size={13} color="#E9D5FF" />
                <Text style={styles.coverDateText}>{todayDate}</Text>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* เมนูด่วน */}
        <View style={styles.menuRow}>
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.menuCard}
              activeOpacity={0.9}
              onPress={() => router.push(item.route as any)}
            >
              <LinearGradient
                colors={item.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.menuGrad}
              >
                <View style={styles.menuIconCircle}>
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={22}
                    color="#fff"
                  />
                </View>
                <AppText style={styles.menuTitle}>{item.title}</AppText>
                <AppText style={styles.menuSub}>{item.sub}</AppText>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* ดวงรายวัน */}
        <View style={styles.sectionHead}>
          <AppText style={[styles.sectionTitle, { color: colors.text }]}>
            ดวงรายวัน
          </AppText>
          <AppText style={[styles.sectionHint, { color: colors.textSecondary }]}>
            แตะการ์ดเพื่ออ่านเพิ่ม
          </AppText>
        </View>

        <View style={styles.grid2}>
          {DAILY_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={[
                styles.gridCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleReadMore(item.key)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.gridIcon,
                  { backgroundColor: isDark ? item.bgDark : item.bg },
                ]}
              >
                {item.type === 'fa' ? (
                  <FontAwesome5 name={item.icon as any} size={16} color={item.color} />
                ) : item.type === 'entypo' ? (
                  <Entypo name={item.icon as any} size={18} color={item.color} />
                ) : (
                  <MaterialCommunityIcons
                    name={item.icon as any}
                    size={20}
                    color={item.color}
                  />
                )}
              </View>
              <AppText style={[styles.gridLabel, { color: colors.text }]}>
                {item.label}
              </AppText>
              <AppText style={[styles.gridDesc, { color: colors.textSecondary }]}>
                {item.desc}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* เลขมงคล */}
        <AppText style={[styles.sectionTitle, { color: colors.text, marginTop: 8 }]}>
          เลขมงคลประจำวัน
        </AppText>
        <View
          style={[
            styles.numberCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.numberHeader}>
            <MaterialCommunityIcons name="star-four-points" size={16} color="#7C3AED" />
            <AppText style={[styles.numberHeaderText, { color: '#7C3AED' }]}>
              เลขเด่น
            </AppText>
          </View>
          <View style={styles.numberRow}>
            {luckyNumbers.main.map((num, i) => (
              <LinearGradient
                key={i}
                colors={
                  i < 2
                    ? isDark
                      ? ['#831843', '#9D174D']
                      : ['#FDF2F8', '#FBCFE8']
                    : isDark
                    ? ['#4C1D95', '#5B21B6']
                    : ['#F5F3FF', '#DDD6FE']
                }
                style={styles.numCircle}
              >
                <Text
                  style={[
                    styles.numText,
                    { color: i < 2 ? (isDark ? '#F9A8D4' : '#DB2777') : isDark ? '#C4B5FD' : '#7C3AED' },
                  ]}
                >
                  {num}
                </Text>
              </LinearGradient>
            ))}
          </View>

          <View style={[styles.numberHeader, { marginTop: 16 }]}>
            <MaterialCommunityIcons name="numeric" size={16} color={colors.textSecondary} />
            <AppText style={[styles.numberHeaderText, { color: colors.textSecondary }]}>
              เลขเสริม
            </AppText>
          </View>
          <View style={styles.numberRow}>
            {luckyNumbers.sub.map((n, i) => (
              <View
                key={i}
                style={[
                  styles.numOutline,
                  {
                    borderColor: colors.border,
                    backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  },
                ]}
              >
                <Text style={[styles.numOutlineText, { color: colors.text }]}>{n}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* เซียมซี */}
        <LinearGradient
          colors={
            isDark
              ? ['#4A044E', '#831843', '#9D174D']
              : ['#FDF2F8', '#FCE7F3', '#FBCFE8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.siemBox}
        >
          <View style={styles.siemTop}>
            <View
              style={[
                styles.siemIconBox,
                { backgroundColor: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.7)' },
              ]}
            >
              <MaterialCommunityIcons
                name="temple-buddhist"
                size={22}
                color={isDark ? '#F9A8D4' : '#9D174D'}
              />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText style={[styles.siemTitle, { color: isDark ? '#FCE7F3' : '#831843' }]}>
                เสี่ยงเซียมซี
              </AppText>
              <AppText style={[styles.siemSub, { color: isDark ? '#F9A8D4' : '#9D174D' }]}>
                ตั้งจิตอธิษฐานก่อนเขย่า · วัดศาลาลอย
              </AppText>
            </View>
          </View>

          <Animated.View
            style={{
              transform: [{ rotate }, { scale: Animated.multiply(scaleAnim, pulseAnim) }],
              marginVertical: 20,
            }}
          >
            <TouchableOpacity
              style={[styles.siemCircle, shaking && styles.siemCircleActive]}
              onPress={handleShakeFortune}
              disabled={shaking}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={
                  shaking
                    ? isDark
                      ? ['#4C1D95', '#5B21B6']
                      : ['#EDE9FE', '#DDD6FE']
                    : isDark
                    ? ['#831843', '#9D174D']
                    : ['#FFF1F2', '#FFE4E6']
                }
                style={styles.siemCircleInner}
              >
                {shaking ? (
                  <ActivityIndicator size="large" color="#7C3AED" />
                ) : (
                  <MaterialCommunityIcons name="jellyfish-outline" size={52} color="#F472B6" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            onPress={handleShakeFortune}
            disabled={shaking}
            style={[
              styles.siemCta,
              { backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.75)' },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons name="hand-left" size={16} color={isDark ? '#F9A8D4' : '#9D174D'} />
            <AppText style={[styles.siemCtaText, { color: isDark ? '#F9A8D4' : '#9D174D' }]}>
              {shaking ? 'กำลังอธิษฐาน... กรุณารอสักครู่' : 'แตะเพื่อเขย่าเซียมซี'}
            </AppText>
          </TouchableOpacity>
        </LinearGradient>

        {/* ผลเซียมซี */}
        {resultNumber !== null && fortuneData && (
          <Animated.View
            style={[
              styles.resultCard,
              { opacity: fadeAnim, backgroundColor: colors.card },
            ]}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9', '#5B21B6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.resultHead}
            >
              <View style={styles.resultBadge}>
                <AppText style={styles.resultBadgeText}>ใบที่ {resultNumber}</AppText>
              </View>
              <Text style={styles.resultTitle}>{fortuneData.title}</Text>
              <View style={styles.levelRow}>
                <Ionicons name="trophy" size={14} color="#FDE68A" />
                <AppText style={styles.resultLevel}>{fortuneData.level}</AppText>
              </View>
            </LinearGradient>

            <View style={styles.resultBody}>
              <ResultBlock emoji="📜" title="ภาพรวม" text={fortuneData.general} colors={colors} />
              <ResultBlock emoji="❤️" title="ความรัก" text={fortuneData.love} colors={colors} />
              <ResultBlock
                emoji="💰"
                title="การเงิน & โชคลาภ"
                text={fortuneData.finance}
                colors={colors}
              />
              <ResultBlock
                emoji="💼"
                title="การงาน & การเรียน"
                text={fortuneData.career}
                colors={colors}
              />
              <View
                style={[
                  styles.luckyBar,
                  { backgroundColor: isDark ? '#78350F' : '#FEF3C7' },
                ]}
              >
                <Ionicons name="color-palette" size={16} color={isDark ? '#FCD34D' : '#B45309'} />
                <AppText
                  style={[styles.luckyBarText, { color: isDark ? '#FCD34D' : '#B45309' }]}
                >
                  สีมงคลเสริมดวง · {fortuneData.luckyColor}
                </AppText>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 28 }} />
      </ScrollView>

      {/* Modal รายละเอียด */}
      <Modal animationType="slide" transparent visible={modalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <AppText style={[styles.modalTitle, { color: colors.text }]}>
              {selectedDetail.title}
            </AppText>
            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalBody, { color: colors.textSecondary }]}>
                {selectedDetail.content}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.9}
            >
              <LinearGradient colors={['#7C3AED', '#6D28D9']} style={styles.modalCloseGrad}>
                <AppText style={styles.modalCloseText}>ปิด</AppText>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNav />
    </View>
  );
};

const ResultBlock = ({
  emoji,
  title,
  text,
  colors,
}: {
  emoji: string;
  title: string;
  text: string;
  colors: any;
}) => (
  <View style={styles.block}>
    <AppText style={[styles.blockTitle, { color: colors.primary }]}>
      {emoji}  {title}
    </AppText>
    <Text style={[styles.blockText, { color: colors.textSecondary }]}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },

  /* หน้าปก */
  coverWrap: {
    height: Platform.OS === 'ios' ? 260 : 240,
    width: '100%',
  },
  coverImage: { flex: 1 },
  coverGradient: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 22,
  },
  coverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coverBadgeText: { color: '#FDE68A', fontSize: 12, fontWeight: '700' },
  coverBody: { paddingHorizontal: 20 },
  coverTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  coverSub: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    marginTop: 6,
    marginBottom: 12,
  },
  coverDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  coverDateText: { color: '#E9D5FF', fontSize: 12, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 110, paddingTop: 16 },

  /* เมนูด่วน */
  menuRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  menuCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  menuGrad: { padding: 16, minHeight: 120, justifyContent: 'flex-end' },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  menuTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  menuSub: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 3 },

  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHint: { fontSize: 12, fontWeight: '500' },

  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
    marginBottom: 8,
  },
  gridCard: {
    width: (width - 34) / 2,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gridIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridLabel: { fontSize: 14, fontWeight: '700' },
  gridDesc: { fontSize: 11, marginTop: 3 },

  numberCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  numberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  numberHeaderText: { fontSize: 13, fontWeight: '700' },
  numberRow: { flexDirection: 'row', gap: 10 },
  numCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numText: { fontSize: 18, fontWeight: '800' },
  numOutline: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numOutlineText: { fontSize: 15, fontWeight: '700' },

  siemBox: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  siemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  siemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  siemTitle: { fontSize: 18, fontWeight: '800' },
  siemSub: { fontSize: 12, marginTop: 2 },
  siemCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  siemCircleActive: { borderColor: '#C4B5FD' },
  siemCircleInner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  siemCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  siemCtaText: { fontSize: 13, fontWeight: '700' },

  resultCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    marginBottom: 12,
  },
  resultHead: { padding: 20 },
  resultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 8,
  },
  resultBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  resultTitle: { color: '#fff', fontSize: 17, fontWeight: '800', lineHeight: 24 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  resultLevel: { color: '#FDE68A', fontSize: 13, fontWeight: '700' },
  resultBody: { padding: 16 },
  block: { marginBottom: 14 },
  blockTitle: { fontSize: 13, fontWeight: '700', marginBottom: 5 },
  blockText: { fontSize: 13, lineHeight: 21 },
  luckyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 4,
  },
  luckyBarText: { fontSize: 13, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalBody: { fontSize: 14, lineHeight: 23, textAlign: 'center' },
  modalClose: { marginTop: 20, borderRadius: 14, overflow: 'hidden' },
  modalCloseGrad: { paddingVertical: 14, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default FortuneTelling;