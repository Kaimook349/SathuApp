import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');
const STAGE_CARD_W = Math.min(225, width * 0.56);
const STAGE_CARD_H = STAGE_CARD_W * 1.68;

// ใส่ key ใน mobile/.env เท่านั้น
const AI_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const AI_BASE_URL = 'https://api.groq.com/openai/v1';
const AI_MODEL = 'llama-3.3-70b-versatile';

type TarotCard = {
  id: string;
  no: number;
  roman: string;
  nameTh: string;
  nameEn: string;
  meaning: string;
  keywords: string;
  image: any;
};

const TAROT_CARDS: TarotCard[] = [
  {
    id: 'fool',
    no: 0,
    roman: '0',
    nameTh: 'เดอะฟูล · การเริ่มต้น',
    nameEn: 'The Fool',
    meaning: 'การเริ่มต้นใหม่ การผจญภัย ความไร้เดียงสา ความเป็นอิสระ',
    keywords: 'เริ่มต้น · โอกาสใหม่ · อิสระ',
    image: require('../../assets/tarot/00-fool.jpeg'),
  },
  {
    id: 'magician',
    no: 1,
    roman: 'I',
    nameTh: 'นักมายากลผู้สร้างสรรค์',
    nameEn: 'The Magician',
    meaning: 'พลังสร้างสรรค์ ทักษะ การลงมือทำ ใช้ศักยภาพที่มี',
    keywords: 'พลังสร้างสรรค์ · ทักษะ · ลงมือทำ',
    image: require('../../assets/tarot/01-magician.jpeg'),
  },
  {
    id: 'high-priestess',
    no: 2,
    roman: 'II',
    nameTh: 'ราชินีพระจันทร์',
    nameEn: 'The High Priestess',
    meaning: 'สัญชาตญาณ ความลึกลับ การรอคอยอย่างมีสติ',
    keywords: 'สัญชาตญาณ · ความสงบ · ปัญญาภายใน',
    image: require('../../assets/tarot/02-high-priestess.jpeg'),
  },
  {
    id: 'empress',
    no: 3,
    roman: 'III',
    nameTh: 'จักรพรรดินีผู้เปี่ยมสุข',
    nameEn: 'The Empress',
    meaning: 'ความอุดมสมบูรณ์ ความรัก การดูแล ความงอกงาม',
    keywords: 'ความรัก · อุดมสมบูรณ์ · โอบอุ้ม',
    image: require('../../assets/tarot/03-empress.jpeg'),
  },
  {
    id: 'emperor',
    no: 4,
    roman: 'IV',
    nameTh: 'จักรพรรดิผู้มั่นคง',
    nameEn: 'The Emperor',
    meaning: 'อำนาจ ระเบียบ ความมั่นคง ความรับผิดชอบ',
    keywords: 'ภาวะผู้นำ · โครงสร้าง · มั่นคง',
    image: require('../../assets/tarot/04-emperor.jpeg'),
  },
  {
    id: 'hierophant',
    no: 5,
    roman: 'V',
    nameTh: 'พระสังฆราชผู้ทรงศีล',
    nameEn: 'The Hierophant',
    meaning: 'ธรรมเนียม ความเชื่อ คำแนะนำจากผู้รู้',
    keywords: 'คำสอน · ผู้ใหญ่อุปถัมภ์ · คุณธรรม',
    image: require('../../assets/tarot/05-hierophant.jpeg'),
  },
  {
    id: 'lovers',
    no: 6,
    roman: 'VI',
    nameTh: 'คู่รักและทางเลือก',
    nameEn: 'The Lovers',
    meaning: 'ความสัมพันธ์ ทางเลือกสำคัญ ความกลมกลืน',
    keywords: 'ความรัก · การตัดสินใจ · เชื่อมโยง',
    image: require('../../assets/tarot/06-lovers.jpeg'),
  },
  {
    id: 'chariot',
    no: 7,
    roman: 'VII',
    nameTh: 'อัศวินรถศึก',
    nameEn: 'The Chariot',
    meaning: 'ชัยชนะ ความมุ่งมั่น การควบคุมทิศทาง',
    keywords: 'ชัยชนะ · มุ่งมั่น · ก้าวหน้า',
    image: require('../../assets/tarot/07-chariot.jpeg'),
  },
  {
    id: 'strength',
    no: 8,
    roman: 'VIII',
    nameTh: 'พลังใจอันแข็งแกร่ง',
    nameEn: 'Strength',
    meaning: 'ความกล้าหาญ ความอดทน พลังใจที่อ่อนโยน',
    keywords: 'กล้าหาญ · อดทน · เมตตา',
    image: require('../../assets/tarot/08-strength.jpeg'),
  },
  {
    id: 'hermit',
    no: 9,
    roman: 'IX',
    nameTh: 'ฤๅษีผู้ทรงปัญญา',
    nameEn: 'The Hermit',
    meaning: 'การค้นหาภายใน ปัญญา การถอยมาไตร่ตรอง',
    keywords: 'ไตร่ตรอง · สติปัญญา · ความสงบ',
    image: require('../../assets/tarot/09-hermit.jpeg'),
  },
  {
    id: 'wheel',
    no: 10,
    roman: 'X',
    nameTh: 'กงล้อแห่งโชคชะตา',
    nameEn: 'Wheel of Fortune',
    meaning: 'การเปลี่ยนแปลง วัฏจักร โชคที่หมุนเวียน',
    keywords: 'โชคชะตา · จังหวะชีวิต · เปลี่ยนแปลง',
    image: require('../../assets/tarot/10-wheel-of-fortune.jpeg'),
  },
  {
    id: 'justice',
    no: 11,
    roman: 'XI',
    nameTh: 'ตราชั่งแห่งความยุติธรรม',
    nameEn: 'Justice',
    meaning: 'ความถูกต้อง เหตุและผล ความสมดุล',
    keywords: 'ยุติธรรม · สมดุล · เหตุและผล',
    image: require('../../assets/tarot/11-justice.jpeg'),
  },
  {
    id: 'hanged',
    no: 12,
    roman: 'XII',
    nameTh: 'มุมมองใหม่แห่งการปล่อยวาง',
    nameEn: 'The Hanged Man',
    meaning: 'มุมมองใหม่ การยอมปล่อย การรออย่างมีสติ',
    keywords: 'ปล่อยวาง · มุมมองใหม่ · รอคอย',
    image: require('../../assets/tarot/12-hanged-man.jpeg'),
  },
  {
    id: 'death',
    no: 13,
    roman: 'XIII',
    nameTh: 'การสิ้นสุดเพื่อเริ่มต้นใหม่',
    nameEn: 'Death',
    meaning: 'การจบเพื่อเริ่มใหม่ การเปลี่ยนแปลงครั้งใหญ่',
    keywords: 'ผลัดใบ · เปลี่ยนผ่าน · เริ่มต้นใหม่',
    image: require('../../assets/tarot/13-death.jpeg'),
  },
  {
    id: 'temperance',
    no: 14,
    roman: 'XIV',
    nameTh: 'ความสมดุลอันงดงาม',
    nameEn: 'Temperance',
    meaning: 'ความสมดุล ความอดทน การผสมผสานอย่างลงตัว',
    keywords: 'ทางสายกลาง · กลมกลืน · ปรับตัว',
    image: require('../../assets/tarot/14-temperance.jpeg'),
  },
  {
    id: 'devil',
    no: 15,
    roman: 'XV',
    nameTh: 'พันธนาการและแรงปรารถนา',
    nameEn: 'The Devil',
    meaning: 'พันธนาการ ความยึดติด สิ่งที่ต้องปลดปล่อย',
    keywords: 'รู้เท่าทัน · ปลดปล่อย · มีสติ',
    image: require('../../assets/tarot/15-devil.jpeg'),
  },
  {
    id: 'tower',
    no: 16,
    roman: 'XVI',
    nameTh: 'การเปลี่ยนแปลงฉับพลัน',
    nameEn: 'The Tower',
    meaning: 'เหตุการณ์พลิกผัน การพังทลายของสิ่งเก่าเพื่อสร้างใหม่',
    keywords: 'พลิกผัน · ตื่นรู้ · สร้างใหม่',
    image: require('../../assets/tarot/16-tower.jpeg'),
  },
  {
    id: 'star',
    no: 17,
    roman: 'XVII',
    nameTh: 'ดวงดาวแห่งความหวัง',
    nameEn: 'The Star',
    meaning: 'ความหวัง การเยียวยา แรงบันดาลใจ',
    keywords: 'ความหวัง · เยียวยา · แรงบันดาลใจ',
    image: require('../../assets/tarot/17-star.jpeg'),
  },
  {
    id: 'moon',
    no: 18,
    roman: 'XVIII',
    nameTh: 'จันทราและอารมณ์ลึกซึ้ง',
    nameEn: 'The Moon',
    meaning: 'ความไม่ชัดเจน อารมณ์ สัญชาตญาณลึก',
    keywords: 'จินตนาการ · อารมณ์ · ค่อยเป็นค่อยไป',
    image: require('../../assets/tarot/18-moon.jpeg'),
  },
  {
    id: 'sun',
    no: 19,
    roman: 'XIX',
    nameTh: 'ตะวันแห่งความรุ่งโรจน์',
    nameEn: 'The Sun',
    meaning: 'ความสำเร็จ ความสุข ความชัดเจน',
    keywords: 'ความสุข · รุ่งเรือง · สำเร็จ',
    image: require('../../assets/tarot/19-sun.jpeg'),
  },
  {
    id: 'judgement',
    no: 20,
    roman: 'XX',
    nameTh: 'การตื่นรู้และข่าวดี',
    nameEn: 'Judgement',
    meaning: 'การตื่นรู้ การตัดสินใจครั้งสำคัญ ผลแห่งความดี',
    keywords: 'ข่าวดี · ตื่นรู้ · กุศลหนุนนำ',
    image: require('../../assets/tarot/20-judgement.jpeg'),
  },
  {
    id: 'world',
    no: 21,
    roman: 'XXI',
    nameTh: 'ความสำเร็จสมบูรณ์แบบ',
    nameEn: 'The World',
    meaning: 'ความสำเร็จสมบูรณ์ การบรรลุเป้าหมาย การครบวงจร',
    keywords: 'สำเร็จ · สมบูรณ์ · บรรลุเป้าหมาย',
    image: require('../../assets/tarot/21-world.jpeg'),
  },
];

const TOPICS = [
  { id: 'general', label: 'ภาพรวมวันนี้', icon: 'sparkles-outline' },
  { id: 'work', label: 'การงาน · การเรียน', icon: 'briefcase-outline' },
  { id: 'finance', label: 'การเงิน · โชคลาภ', icon: 'wallet-outline' },
  { id: 'love', label: 'ความรัก', icon: 'heart-outline' },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function askTarotAI(card: TarotCard, topicLabel: string): Promise<string> {
  const offline = `✨ ไพ่ของคุณคือ「${card.nameEn} (${card.nameTh})」\n\n• พลังงานหลัก (${topicLabel}): ${card.meaning}\n\n• ข้อควรระวัง: อย่าเพิ่งด่วนตัดสินใจด้วยอารมณ์ ให้ใช้สติไตร่ตรองอย่างรอบคอบ\n\n• คำแนะนำเสริมดวง: ตั้งมั่นในความดีและเปิดใจรับโอกาสใหม่ ๆ ที่กำลังเข้ามา`;

  if (!AI_API_KEY) return offline;

  try {
    const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.78,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'คุณคือผู้เชี่ยวชาญไพ่ทาโรต์ที่สุภาพ อบอุ่น ใช้ภาษาไทยสละสลวย อ่านง่าย ให้กำลังใจและแฝงข้อคิดทางสติ',
          },
          {
            role: 'user',
            content: `ผู้ถามเน้นเรื่อง: ${topicLabel}\nไพ่ที่เลือกได้: ${card.nameEn} (${card.nameTh})\nความหมายพื้นฐาน: ${card.meaning}\nคีย์เวิร์ด: ${card.keywords}\n\nช่วยทำนายสั้นกระชับแบ่งเป็น 3 หัวข้อ:\n1) คำทำนายด้าน${topicLabel}\n2) สิ่งที่ควรระวัง\n3) คำแนะนำเสริมดวงวันนี้`,
          },
        ],
      }),
    });

    if (!res.ok) return offline;
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    return text || offline;
  } catch {
    return offline;
  }
}

export default function TarotScreen() {
  const router = useRouter();
  const { isDark } = useTheme();

  const [deck, setDeck] = useState<TarotCard[]>(() => shuffle(TAROT_CARDS));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState(TOPICS[0]);
  const [revealed, setRevealed] = useState(false);
  const [reading, setReading] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  const flipAnim = useRef(new Animated.Value(0)).current;
  const stageScale = useRef(new Animated.Value(0.95)).current;
  const deckShake = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  const pickedCard = selectedIndex !== null ? deck[selectedIndex] : null;

  const handleShuffleDeck = () => {
    if (loadingAI) return;
    setSelectedIndex(null);
    setRevealed(false);
    setReading('');
    flipAnim.setValue(0);

    Animated.sequence([
      Animated.timing(deckShake, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(deckShake, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(deckShake, { toValue: 0.6, duration: 80, useNativeDriver: true }),
      Animated.timing(deckShake, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start(() => {
      setDeck(shuffle(TAROT_CARDS));
    });
  };

  const handleSelectCardFromDeck = (index: number) => {
    if (loadingAI) return;

    if (revealed) {
      setRevealed(false);
      setReading('');
      flipAnim.setValue(0);
    }

    setSelectedIndex(index);
    stageScale.setValue(0.9);
    Animated.spring(stageScale, {
      toValue: 1,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  const handleRevealCard = async () => {
    if (!pickedCard || loadingAI) return;

    setLoadingAI(true);
    Animated.timing(flipAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      setRevealed(true);
      const resultText = await askTarotAI(pickedCard, selectedTopic.label);
      setReading(resultText);
      setLoadingAI(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 200);
    });
  };

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['180deg', '90deg', '0deg'],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['0deg', '90deg', '180deg'],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [0, 0, 1, 1],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.51, 1],
    outputRange: [1, 1, 0, 0],
  });
  const deckTranslateX = deckShake.interpolate({
    inputRange: [-1, 1],
    outputRange: [-14, 14],
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={
          isDark
            ? ['#070913', '#161130', '#090C15']
            : ['#1A0B2E', '#2E1065', '#130722']
        }
        style={styles.bgGradient}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenterBadge}>
            <MaterialCommunityIcons name="star-four-points" size={14} color="#FBBF24" />
            <AppText style={styles.headerBadgeText}>MYSTIC TAROT</AppText>
          </View>

          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={handleShuffleDeck}
            activeOpacity={0.8}
          >
            <Ionicons name="shuffle" size={20} color="#FDE68A" />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleSection}>
            <AppText style={styles.mainTitle}>ตั้งจิตอธิษฐานและเลือกไพ่</AppText>
            <AppText style={styles.subTitle}>
              เลือกเรื่องที่ต้องการถาม แล้วใช้นิ้วเลื่อนแตะไพ่ใบที่ดึงดูดใจคุณที่สุด
            </AppText>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.topicRow}
          >
            {TOPICS.map((t) => {
              const active = selectedTopic.id === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedTopic(t)}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={
                      active
                        ? ['#F59E0B', '#D97706']
                        : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']
                    }
                    style={[
                      styles.topicChip,
                      !active && { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
                    ]}
                  >
                    <Ionicons
                      name={t.icon as any}
                      size={15}
                      color={active ? '#1E1B4B' : '#E9D5FF'}
                    />
                    <AppText
                      style={[
                        styles.topicChipText,
                        { color: active ? '#1E1B4B' : '#F3E8FF' },
                      ]}
                    >
                      {t.label}
                    </AppText>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.deckSection}>
            <View style={styles.deckHeaderRow}>
              <View style={styles.deckLabelLeft}>
                <MaterialCommunityIcons
                  name="cards-playing-outline"
                  size={18}
                  color="#FBBF24"
                />
                <AppText style={styles.deckHeaderTitle}>
                  เลื่อนเพื่อเลือกไพ่ของคุณ (22 ใบ)
                </AppText>
              </View>

              <TouchableOpacity
                style={styles.shuffleMiniBtn}
                onPress={handleShuffleDeck}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={14} color="#FDE68A" />
                <AppText style={styles.shuffleMiniText}>สับไพ่ใหม่</AppText>
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ translateX: deckTranslateX }] }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.spreadScroll}
              >
                {deck.map((card, idx) => {
                  const isSelected = selectedIndex === idx;
                  return (
                    <TouchableOpacity
                      key={`${card.id}-${idx}`}
                      activeOpacity={0.9}
                      onPress={() => handleSelectCardFromDeck(idx)}
                      style={[
                        styles.spreadCardWrap,
                        { marginLeft: idx === 0 ? 0 : -22 },
                        isSelected && styles.spreadCardSelected,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? ['#F59E0B', '#B45309', '#78350F']
                            : ['#3B0764', '#1E1B4B', '#0F172A']
                        }
                        style={[
                          styles.spreadCardInner,
                          isSelected && { borderColor: '#FEF08A', borderWidth: 2 },
                        ]}
                      >
                        <View style={styles.spreadCardPattern}>
                          <Text
                            style={[
                              styles.spreadCardNo,
                              { color: isSelected ? '#FFFBEB' : 'rgba(253,230,138,0.45)' },
                            ]}
                          >
                            {idx + 1}
                          </Text>
                          <View
                            style={[
                              styles.spreadCenterIcon,
                              isSelected && { backgroundColor: 'rgba(255,255,255,0.22)' },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={isSelected ? 'check-decagram' : 'star-four-points-outline'}
                              size={18}
                              color={isSelected ? '#FFFFFF' : '#FBBF24'}
                            />
                          </View>
                          <Text
                            style={[
                              styles.spreadCardBottomDot,
                              { color: isSelected ? '#FFFBEB' : 'rgba(253,230,138,0.4)' },
                            ]}
                          >
                            {isSelected ? 'เลือกแล้ว' : '✦'}
                          </Text>
                        </View>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </Animated.View>
          </View>

          <Animated.View
            style={[styles.stageWrapper, { transform: [{ scale: stageScale }] }]}
          >
            {pickedCard ? (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => {
                  if (!revealed) handleRevealCard();
                }}
                style={styles.cardStage}
              >
                <Animated.View
                  style={[
                    styles.cardFace,
                    {
                      opacity: backOpacity,
                      transform: [{ rotateY: backRotate }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#4C1D95', '#2E1065', '#0F172A']}
                    style={styles.stageCardBack}
                  >
                    <View style={styles.stageCardBackFrame}>
                      <MaterialCommunityIcons
                        name="moon-waning-crescent"
                        size={26}
                        color="#FDE68A"
                      />
                      <View style={styles.sacredCircle}>
                        <MaterialCommunityIcons
                          name="dharmachakra"
                          size={58}
                          color="#FBBF24"
                        />
                      </View>
                      <View style={styles.tapToFlipPill}>
                        <Ionicons name="sparkles" size={13} color="#1E1B4B" />
                        <AppText style={styles.tapToFlipText}>
                          แตะเพื่อเปิดหน้าไพ่
                        </AppText>
                      </View>
                    </View>
                  </LinearGradient>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.cardFace,
                    {
                      opacity: frontOpacity,
                      transform: [{ rotateY: frontRotate }],
                    },
                  ]}
                >
                  <View style={styles.stageCardFront}>
                    <Image source={pickedCard.image} style={styles.cardImage} />
                    <LinearGradient
                      colors={['transparent', 'rgba(15, 23, 42, 0.85)']}
                      style={styles.cardImageOverlay}
                    >
                      <Text style={styles.overlayRoman}>{pickedCard.roman}</Text>
                      <Text style={styles.overlayNameEn}>{pickedCard.nameEn}</Text>
                    </LinearGradient>
                  </View>
                </Animated.View>
              </TouchableOpacity>
            ) : (
              <View style={styles.emptyStageBox}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="gesture-tap" size={34} color="#FBBF24" />
                </View>
                <AppText style={styles.emptyStageTitle}>ยังไม่ได้เลือกไพ่</AppText>
                <AppText style={styles.emptyStageSub}>
                  กรุณาแตะเลือกไพ่ 1 ใบจากสำรับด้านบน
                </AppText>
              </View>
            )}
          </Animated.View>

          {pickedCard && revealed && (
            <View style={styles.cardInfoSection}>
              <View style={styles.keywordBadge}>
                <Ionicons name="sparkles" size={12} color="#FBBF24" />
                <AppText style={styles.keywordBadgeText}>{pickedCard.keywords}</AppText>
              </View>
              <Text style={styles.revealedCardTitle}>
                {pickedCard.nameEn} · {pickedCard.nameTh}
              </Text>
              <AppText style={styles.revealedCardMeaning}>{pickedCard.meaning}</AppText>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.predictCta,
              (!pickedCard || loadingAI) && { opacity: 0.45 },
            ]}
            disabled={!pickedCard || loadingAI}
            onPress={revealed ? handleShuffleDeck : handleRevealCard}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                revealed
                  ? ['#6D28D9', '#4C1D95']
                  : ['#F59E0B', '#D97706', '#B45309']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.predictCtaGrad}
            >
              {loadingAI ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <AppText style={styles.predictCtaText}>
                    กำลังอ่านพลังงานจากหน้าไพ่...
                  </AppText>
                </View>
              ) : (
                <>
                  <Ionicons
                    name={revealed ? 'refresh' : 'sparkles'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <AppText style={styles.predictCtaText}>
                    {!pickedCard
                      ? 'เลือกไพ่จากสำรับด้านบนก่อน'
                      : revealed
                      ? 'สับไพ่และเลือกใบใหม่'
                      : 'เปิดไพ่และรับคำทำนาย'}
                  </AppText>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {!!reading && (
            <View style={styles.resultBox}>
              <LinearGradient
                colors={['rgba(30, 27, 75, 0.95)', 'rgba(15, 23, 42, 0.98)']}
                style={styles.resultInner}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultIconWrap}>
                    <Ionicons name="sparkles" size={16} color="#FBBF24" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.resultHeaderTitle}>
                      คำทำนายพยากรณ์ ({selectedTopic.label})
                    </AppText>
                    <Text style={styles.resultHeaderSub}>
                      จากไพ่ {pickedCard?.nameEn}
                    </Text>
                  </View>
                </View>

                <View style={styles.resultDivider} />
                <Text style={styles.resultBodyText}>{reading}</Text>
              </LinearGradient>
            </View>
          )}

          <AppText style={styles.disclaimer}>
            * คำทำนายเป็นเพียงแนวทางเพื่อเสริมสติและแรงบันดาลใจในการดำเนินชีวิต
          </AppText>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090C15',
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerCircleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  headerBadgeText: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 14,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subTitle: {
    color: 'rgba(233, 213, 255, 0.78)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  topicRow: {
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 18,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  topicChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  deckSection: {
    marginBottom: 16,
  },
  deckHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  deckLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deckHeaderTitle: {
    color: '#F3E8FF',
    fontSize: 13,
    fontWeight: '700',
  },
  shuffleMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  shuffleMiniText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  spreadScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  spreadCardWrap: {
    width: 72,
    height: 116,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  spreadCardSelected: {
    transform: [{ translateY: -14 }, { scale: 1.08 }],
    zIndex: 50,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  spreadCardInner: {
    flex: 1,
    borderRadius: 12,
    padding: 5,
    borderWidth: 1,
    borderColor: 'rgba(196, 181, 253, 0.4)',
  },
  spreadCardPattern: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.25)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  spreadCardNo: {
    fontSize: 10,
    fontWeight: '800',
  },
  spreadCenterIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spreadCardBottomDot: {
    fontSize: 9,
    fontWeight: '800',
  },
  stageWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  cardStage: {
    width: STAGE_CARD_W,
    height: STAGE_CARD_H,
  },
  cardFace: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backfaceVisibility: 'hidden',
  },
  stageCardBack: {
    flex: 1,
    borderRadius: 22,
    padding: 10,
    borderWidth: 2,
    borderColor: '#FBBF24',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 10,
  },
  stageCardBackFrame: {
    flex: 1,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.4)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  sacredCircle: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapToFlipPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FDE68A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tapToFlipText: {
    color: '#1E1B4B',
    fontSize: 12,
    fontWeight: '800',
  },
  stageCardFront: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2.5,
    borderColor: '#FBBF24',
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImageOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  overlayRoman: {
    color: '#FDE68A',
    fontSize: 12,
    fontWeight: '800',
  },
  overlayNameEn: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  emptyStageBox: {
    width: STAGE_CARD_W,
    height: STAGE_CARD_H,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(253, 230, 138, 0.35)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyStageTitle: {
    color: '#FDE68A',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyStageSub: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  cardInfoSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 14,
  },
  keywordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  keywordBadgeText: {
    color: '#FDE68A',
    fontSize: 11,
    fontWeight: '700',
  },
  revealedCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  revealedCardMeaning: {
    color: 'rgba(233, 213, 255, 0.85)',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 20,
  },
  predictCta: {
    marginHorizontal: 24,
    marginTop: 18,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  predictCtaGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 24,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  predictCtaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  resultBox: {
    marginHorizontal: 16,
    marginTop: 22,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.35)',
  },
  resultInner: {
    padding: 18,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resultIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultHeaderTitle: {
    color: '#FDE68A',
    fontSize: 15,
    fontWeight: '800',
  },
  resultHeaderSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 2,
  },
  resultDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 14,
  },
  resultBodyText: {
    color: '#F1F5F9',
    fontSize: 14,
    lineHeight: 23,
  },
  disclaimer: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 18,
    paddingHorizontal: 24,
  },
});