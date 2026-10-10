import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Image,
  Animated,
  Easing,
  Platform,
  Modal,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import AppText from './components/AppText';

const { width } = Dimensions.get('window');
const CARD_W = 72;
const CARD_H = 120;
const FAN_RADIUS = 160;

// ใส่ key ใน mobile/.env เท่านั้น — ห้ามฝัง gsk_ ในโค้ด
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

type Mode = 'zodiac' | 'thai' | 'tarot' | 'gypsy';

const MODES: { key: Mode; label: string; icon: string }[] = [
  { key: 'zodiac', label: 'ราศี', icon: 'star-four-points' },
  { key: 'thai', label: 'โหรไทย', icon: 'temple-buddhist' },
  { key: 'tarot', label: 'ทาโร่', icon: 'cards' },
  { key: 'gypsy', label: 'ยิปซี', icon: 'cards-playing' },
];

type DeckCard = {
  id: string;
  name: string;
  th: string;
  meaning: string;
  image: any;
};

const ZODIAC_LIST = [
  { name: 'ราศีเมษ', emoji: '♈' },
  { name: 'ราศีพฤษภ', emoji: '♉' },
  { name: 'ราศีเมถุน', emoji: '♊' },
  { name: 'ราศีกรกฎ', emoji: '♋' },
  { name: 'ราศีสิงห์', emoji: '♌' },
  { name: 'ราศีกันย์', emoji: '♍' },
  { name: 'ราศีตุลย์', emoji: '♎' },
  { name: 'ราศีพิจิก', emoji: '♏' },
  { name: 'ราศีธนู', emoji: '♐' },
  { name: 'ราศีมังกร', emoji: '♑' },
  { name: 'ราศีกุมภ์', emoji: '♒' },
  { name: 'ราศีมีน', emoji: '♓' },
];

const CHINESE_ZODIAC = [
  'ชวด', 'ฉลู', 'ขาล', 'เถาะ', 'มะโรง', 'มะเส็ง',
  'มะเมีย', 'มะแม', 'วอก', 'ระกา', 'จอ', 'กุน',
];
const DAY_NAMES = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
const DAY_LUCKY: Record<string, { color: string; number: number[]; direction: string }> = {
  อาทิตย์: { color: 'แดง · ส้ม', number: [1, 6, 9], direction: 'ทิศตะวันออก' },
  จันทร์: { color: 'ขาว · ครีม · เงิน', number: [2, 7], direction: 'ทิศตะวันตก' },
  อังคาร: { color: 'ชมพู · แดงอ่อน', number: [3, 8], direction: 'ทิศใต้' },
  พุธ: { color: 'เขียว · เขียวอ่อน', number: [4, 5], direction: 'ทิศเหนือ' },
  พฤหัสบดี: { color: 'ส้ม · เหลือง · น้ำตาล', number: [5, 6], direction: 'ทิศตะวันตกเฉียงเหนือ' },
  ศุกร์: { color: 'ฟ้า · น้ำเงินอ่อน', number: [6, 7], direction: 'ทิศตะวันออกเฉียงใต้' },
  เสาร์: { color: 'ม่วง · ดำ · เทา', number: [8, 9], direction: 'ทิศตะวันตกเฉียงใต้' },
};

const THAI_ELEMENTS = ['ดิน', 'น้ำ', 'ไฟ', 'ลม'];
const THAI_NAKSAT = [
  'อัสวินี', 'ภรณี', 'กฤติกา', 'โรหิณี', 'มฤคศิร', 'อารทรา',
  'ปุนัพสุ', 'ผลคุนี', 'อश्लेษา', 'มาฆะ', 'พัคคุณี', 'อุตตรผลคุนี',
];
const THAI_DAY_DEITY: Record<string, string> = {
  อาทิตย์: 'พระอาทิตย์',
  จันทร์: 'พระจันทร์',
  อังคาร: 'พระอังคาร',
  พุธ: 'พระพุธ',
  พฤหัสบดี: 'พระพฤหัสบดี',
  ศุกร์: 'พระศุกร์',
  เสาร์: 'พระเสาร์',
};

const CAREER = [
  'การงานโดดเด่น มีผู้ใหญ่สนับสนุน',
  'งานค่อนข้างหนัก จัดลำดับความสำคัญ',
  'มีโอกาสได้แสดงความสามารถ',
  'เหมาะวางแผนระยะยาว',
];
const FINANCE = [
  'การเงินคล่องตัว มีลาภลอยเล็กน้อย',
  'ระวังรายจ่ายฟุ่มเฟือย',
  'มีโอกาสได้รับเงินพิเศษ',
  'การเงินทรงตัว ควรวางแผน',
];
const LOVE = [
  'ความรักหวานชื่น',
  'ความรักเรื่อย ๆ ระวังอารมณ์',
  'เสน่ห์แรง มีคนเข้ามา',
  'เหมาะพูดคุยเปิดใจ',
];
const HEALTH = [
  'สุขภาพโดยรวมดี',
  'ระวังปวดเมื่อยจากการนั่งนาน',
  'ดูแลระบบย่อย',
  'พลังงานดี เหมาะออกกำลังกายเบา ๆ',
];
const ADVICE = [
  'ทำบุญเกี่ยวกับแสงสว่าง',
  'สวมสีมงคลของวันนี้',
  'ตั้งจิตสงบก่อนเริ่มงาน',
  'แบ่งปันสิ่งของเล็กน้อย',
];
const THAI_READING = [
  'วันนี้ดาวพระเคราะห์เกื้อหนุนด้านการงาน เหมาะเริ่มเรื่องใหม่',
  'ธาตุของคุณวันนี้ค่อนข้างสมดุล ควรใช้โอกาสนี้แก้ปัญหาค้างคา',
  'ระวังการพูดจาแรงไป',
  'บุญเก่าส่งผล เหมาะทำบุญตักบาตร',
  'ทิศมงคลช่วยเรื่องการเดินทาง',
  'ช่วงบ่ายเป็นฤกษ์ดี',
];

const TAROT_DECK: DeckCard[] = [
  { id: 't0', name: 'The Fool', th: 'คนโง่', meaning: 'เริ่มต้นใหม่ ความกล้า', image: require('../../assets/tarot/00-fool.jpeg') },
  { id: 't1', name: 'The Magician', th: 'นักมายากล', meaning: 'พลังสร้างสรรค์ ทักษะ', image: require('../../assets/tarot/01-magician.jpeg') },
  { id: 't2', name: 'The High Priestess', th: 'นักบวชหญิง', meaning: 'สัญชาตญาณ ความลับ', image: require('../../assets/tarot/02-high-priestess.jpeg') },
  { id: 't3', name: 'The Empress', th: 'จักรพรรดินี', meaning: 'ความอุดม ความรัก', image: require('../../assets/tarot/03-empress.jpeg') },
  { id: 't4', name: 'The Emperor', th: 'จักรพรรดิ', meaning: 'โครงสร้าง อำนาจ', image: require('../../assets/tarot/04-emperor.jpeg') },
  { id: 't5', name: 'The Hierophant', th: 'นักบวช', meaning: 'ธรรมเนียม คำสอน', image: require('../../assets/tarot/05-hierophant.jpeg') },
  { id: 't6', name: 'The Lovers', th: 'คู่รัก', meaning: 'ความสัมพันธ์ ทางเลือก', image: require('../../assets/tarot/06-lovers.jpeg') },
  { id: 't7', name: 'The Chariot', th: 'รถศึก', meaning: 'ชัยชนะ ความมุ่งมั่น', image: require('../../assets/tarot/07-chariot.jpeg') },
  { id: 't8', name: 'Strength', th: 'พลัง', meaning: 'อดทน พลังภายใน', image: require('../../assets/tarot/08-strength.jpeg') },
  { id: 't9', name: 'The Hermit', th: 'ฤๅษี', meaning: 'ค้นหาตัวเอง ไตร่ตรอง', image: require('../../assets/tarot/09-hermit.jpeg') },
  { id: 't10', name: 'Wheel of Fortune', th: 'วงล้อโชคชะตา', meaning: 'การเปลี่ยนแปลง', image: require('../../assets/tarot/10-wheel-of-fortune.jpeg') },
  { id: 't11', name: 'Justice', th: 'ความยุติธรรม', meaning: 'สมดุล กรรม', image: require('../../assets/tarot/11-justice.jpeg') },
  { id: 't12', name: 'The Hanged Man', th: 'คนถูกแขวน', meaning: 'มุมมองใหม่ ปล่อยวาง', image: require('../../assets/tarot/12-hanged-man.jpeg') },
  { id: 't13', name: 'Death', th: 'ความตาย', meaning: 'จบแล้วเริ่มใหม่', image: require('../../assets/tarot/13-death.jpeg') },
  { id: 't14', name: 'Temperance', th: 'ความพอดี', meaning: 'สมดุล อดทน', image: require('../../assets/tarot/14-temperance.jpeg') },
  { id: 't15', name: 'The Devil', th: 'ปีศาจ', meaning: 'พันธนาการ ตัณหา', image: require('../../assets/tarot/15-devil.jpeg') },
  { id: 't16', name: 'The Tower', th: 'หอคอย', meaning: 'สั่นสะเทือน ความจริง', image: require('../../assets/tarot/16-tower.jpeg') },
  { id: 't17', name: 'The Star', th: 'ดวงดาว', meaning: 'ความหวัง เยียวยา', image: require('../../assets/tarot/17-star.jpeg') },
  { id: 't18', name: 'The Moon', th: 'พระจันทร์', meaning: 'ไม่ชัดเจน อารมณ์', image: require('../../assets/tarot/18-moon.jpeg') },
  { id: 't19', name: 'The Sun', th: 'พระอาทิตย์', meaning: 'สำเร็จ ความสุข', image: require('../../assets/tarot/19-sun.jpeg') },
  { id: 't20', name: 'Judgement', th: 'การพิพากษา', meaning: 'ตื่นรู้ ประเมินใหม่', image: require('../../assets/tarot/20-judgement.jpeg') },
  { id: 't21', name: 'The World', th: 'โลก', meaning: 'สำเร็จสมบูรณ์', image: require('../../assets/tarot/21-world.jpeg') },
];

const TAROT_READING: Record<string, string> = {
  t0: `ภาพรวม: เป็นช่วงเริ่มต้นใหม่ กล้าก้าวออกจากกรอบเดิม
การงาน: เหมาะเริ่มโปรเจกต์หรือเปลี่ยนแนวทาง
การเงิน: ยังไม่นิ่ง อย่าลงทุนใหญ่
ความรัก: มีเสน่ห์แบบสดใส
ข้อแนะนำ: เชื่อสัญชาตญาณและลงมือทำทีละขั้น
สาธุ`,
  t1: `ภาพรวม: คุณมีเครื่องมือครบ แค่ลงมือใช้ให้เป็น
การงาน: แสดงทักษะได้เด่น
การเงิน: วางแผนดีจะได้ผลชัด
ความรัก: สื่อสารตรงไปตรงมาได้ผลดี
ข้อแนะนำ: โฟกัสสิ่งที่ทำได้วันนี้
สาธุ`,
  t2: `ภาพรวม: ใช้สัญชาตญาณมากกว่าเหตุผลชั่วคราว
การงาน: ข้อมูลยังไม่ครบ ชะลอตัดสินใจใหญ่
การเงิน: ระวังข้อเสนอที่ดูดีเกินจริง
ความรัก: ฟังหัวใจตัวเองให้มากขึ้น
ข้อแนะนำ: เงียบพักความคิด คำตอบจะค่อย ๆ ชัด
สาธุ`,
  t3: `ภาพรวม: พลังสร้างสรรค์และความอบอุ่นสูง
การงาน: งานที่ต้องดูแลคนหรือทีมไปได้สวย
การเงิน: มีเกณฑ์ได้ลาภจากของที่สร้าง
ความรัก: ความสัมพันธ์อบอุ่น
ข้อแนะนำ: ดูแลตัวเองไปพร้อมดูแลคนอื่น
สาธุ`,
  t4: `ภาพรวม: ต้องการโครงสร้างและระเบียบ
การงาน: เหมาะเป็นผู้นำหรือวางระบบ
การเงิน: วางแผนระยะยาวสำคัญ
ความรัก: ต้องการความชัดเจน
ข้อแนะนำ: ตั้งกติกาที่ทำได้จริง
สาธุ`,
  t5: `ภาพรวม: เรียนรู้จากผู้รู้หรือกฎเกณฑ์
การงาน: ทำตามมาตรฐานจะปลอดภัย
การเงิน: ปรึกษาผู้เชี่ยวชาญก่อน
ความรัก: ความสัมพันธ์แบบจริงจังมีโอกาส
ข้อแนะนำ: เปิดใจรับคำแนะนำที่เหมาะกับคุณ
สาธุ`,
  t6: `ภาพรวม: มีทางเลือกสำคัญ
การงาน: ร่วมงานกับคนที่ตรงแนวคิด
การเงิน: ตัดสินใจด้วยใจและเหตุผล
ความรัก: ความผูกพันลึกขึ้น
ข้อแนะนำ: เลือกสิ่งที่สอดคล้องกับหัวใจ
สาธุ`,
  t7: `ภาพรวม: ความมุ่งมั่นจะพาไปข้างหน้า
การงาน: คุมทิศทางให้ชัด
การเงิน: ควบคุมรายจ่ายแล้วจะชนะ
ความรัก: เดินไปด้วยกันด้วยเป้าหมายเดียวกัน
ข้อแนะนำ: อย่าไขว้เขว โฟกัสปลายทาง
สาธุ`,
  t8: `ภาพรวม: พลังใจและความอดทนคือกุญแจ
การงาน: งานยากจะผ่านด้วยความใจเย็น
การเงิน: ค่อยเป็นค่อยไป
ความรัก: โอบรับจุดอ่อนของกันและกัน
ข้อแนะนำ: ใช้ความอ่อนโยนควบคู่ความเข้มแข็ง
สาธุ`,
  t9: `ภาพรวม: ช่วงเก็บตัว ทบทวน
การงาน: เหมาะทำงานคนเดียวหรือวิจัยลึก
การเงิน: ไม่ใช่ช่วงเสี่ยง
ความรัก: ต้องการพื้นที่ส่วนตัวชั่วคราว
ข้อแนะนำ: เงียบคิดให้ชัด แล้วค่อยลงมือ
สาธุ`,
  t10: `ภาพรวม: วงล้อหมุน มีการเปลี่ยนแปลง
การงาน: โอกาสใหม่เข้ามา รับให้ทัน
การเงิน: ขึ้นลงได้ อย่าตื่นตระหนก
ความรัก: อาจมีจังหวะพลิก
ข้อแนะนำ: ปรับตัวเร็วและรักษาใจให้มั่น
สาธุ`,
  t11: `ภาพรวม: ความยุติธรรมและสมดุล
การงาน: ตัดสินใจด้วยข้อเท็จจริง
การเงิน: บัญชีและการแบ่งสัดส่วนสำคัญ
ความรัก: พูดคุยให้แฟร์ทั้งสองฝ่าย
ข้อแนะนำ: ทำสิ่งที่ถูกต้อง แม้จะยาก
สาธุ`,
  t12: `ภาพรวม: มุมมองใหม่สำคัญกว่าเร่งรีบ
การงาน: ชะลอเพื่อเห็นทางเลือกใหม่
การเงิน: อย่าตัดสินใจตอนเครียด
ความรัก: ลองเข้าใจอีกมุม
ข้อแนะนำ: ปล่อยวางการควบคุมชั่วคราว
สาธุ`,
  t13: `ภาพรวม: จบของเก่าเพื่อเปิดของใหม่
การงาน: ปิดโปรเจกต์หรือเปลี่ยนบทบาทได้
การเงิน: ตัดรายจ่ายที่ไม่จำเป็น
ความรัก: อาจเปลี่ยนรูปแบบความสัมพันธ์
ข้อแนะนำ: อย่ากลัวการจบ
สาธุ`,
  t14: `ภาพรวม: ความพอดีคือคำตอบ
การงาน: บาลานซ์งานกับพักผ่อน
การเงิน: ใช้จ่ายอย่างมีสติ
ความรัก: ประนีประนอมโดยไม่เสียตัวตน
ข้อแนะนำ: อย่าสุดโต่ง
สาธุ`,
  t15: `ภาพรวม: มีสิ่งที่ผูกมัดหรือยั่วยวน
การงาน: ระวังงานที่กินเวลาเกินจำเป็น
การเงิน: ระวังใช้จ่ายตามอารมณ์
ความรัก: ตรวจว่าเสรีภาพพอไหม
ข้อแนะนำ: รู้ทันตัณหา แล้วเลือกอย่างมีสติ
สาธุ`,
  t16: `ภาพรวม: มีการสั่นสะเทือนหรือข่าวเปลี่ยนแผน
การงาน: โครงสร้างเก่าอาจพังเพื่อสร้างใหม่
การเงิน: เตรียมเงินสำรองไว้
ความรัก: ความจริงอาจโผล่
ข้อแนะนำ: ยอมรับความจริง แล้วสร้างฐานใหม่
สาธุ`,
  t17: `ภาพรวม: ความหวังและการเยียวยา
การงาน: แรงบันดาลใจกลับมา
การเงิน: ค่อย ๆ ฟื้นจากช่วงตึง
ความรัก: อบอุ่นและจริงใจ
ข้อแนะนำ: เชื่อในสิ่งดี ๆ
สาธุ`,
  t18: `ภาพรวม: สถานการณ์ยังไม่ชัด
การงาน: ตรวจข้อมูลซ้ำก่อนสรุป
การเงิน: อย่าเชื่อคำสัญญาลอย ๆ
ความรัก: ความเข้าใจผิดอาจเกิดง่าย
ข้อแนะนำ: รอให้หมอกจางก่อนตัดสินใจใหญ่
สาธุ`,
  t19: `ภาพรวม: พลังบวกและความสำเร็จเด่น
การงาน: ผลงานถูกเห็น
การเงิน: มีเกณฑ์ได้ข่าวดีเรื่องเงิน
ความรัก: ความสุขแบบเปิดเผย
ข้อแนะนำ: ฉลองแบบพอดี แล้วเดินต่อ
สาธุ`,
  t20: `ภาพรวม: ถึงเวลาประเมินและตื่นรู้
การงาน: ทบทวนเป้าหมายแล้วปรับทิศ
การเงิน: เคลียร์บัญชีค้างคา
ความรัก: คุยเรื่องสำคัญที่เลื่อนมา
ข้อแนะนำ: ฟังเสียงในใจ แล้วลงมือ
สาธุ`,
  t21: `ภาพรวม: ความสำเร็จครบวงจร
การงาน: ปิดงานใหญ่หรือถึงไมล์สโตน
การเงิน: ผลตอบแทนจากความพยายามเก่า
ความรัก: ความสัมพันธ์สมบูรณ์หรือก้าวหน้า
ข้อแนะนำ: สำเร็จแล้วตั้งเป้าหมายรอบใหม่
สาธุ`,
};

const GYPSY_DECK: DeckCard[] = [
  { id: 'g1', name: 'Sun', th: 'ดวงอาทิตย์', meaning: 'โชคดี ความสำเร็จ', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400&h=650&fit=crop' },
  { id: 'g2', name: 'Moon', th: 'พระจันทร์', meaning: 'อารมณ์ ความฝัน', image: 'https://images.unsplash.com/photo-1532693322450-2cb5c511067d?w=400&h=650&fit=crop' },
  { id: 'g3', name: 'Star', th: 'ดาว', meaning: 'ความหวัง โอกาส', image: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400&h=650&fit=crop' },
  { id: 'g4', name: 'Heart', th: 'หัวใจ', meaning: 'ความรัก ความผูกพัน', image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&h=650&fit=crop' },
  { id: 'g5', name: 'Ring', th: 'แหวน', meaning: 'สัญญา ความสัมพันธ์ถาวร', image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=650&fit=crop' },
  { id: 'g6', name: 'Letter', th: 'จดหมาย', meaning: 'ข่าวสาร ข้อความสำคัญ', image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&h=650&fit=crop' },
  { id: 'g7', name: 'Key', th: 'กุญแจ', meaning: 'ทางออก คำตอบ', image: 'https://images.unsplash.com/photo-1582139329536-e7284feee809?w=400&h=650&fit=crop' },
  { id: 'g8', name: 'Book', th: 'หนังสือ', meaning: 'ความรู้ ความลับ', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=650&fit=crop' },
  { id: 'g9', name: 'Ship', th: 'เรือ', meaning: 'การเดินทาง โอกาสไกล', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=650&fit=crop' },
  { id: 'g10', name: 'House', th: 'บ้าน', meaning: 'ครอบครัว ความมั่นคง', image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400&h=650&fit=crop' },
  { id: 'g11', name: 'Tree', th: 'ต้นไม้', meaning: 'สุขภาพ รากฐาน', image: 'https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=400&h=650&fit=crop' },
  { id: 'g12', name: 'Clouds', th: 'เมฆ', meaning: 'ความสับสน ชั่วคราว', image: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?w=400&h=650&fit=crop' },
  { id: 'g13', name: 'Fish', th: 'ปลา', meaning: 'เงินทอง ธุรกิจ', image: 'https://images.unsplash.com/photo-1524704654690-b46e8b8d71d1?w=400&h=650&fit=crop' },
  { id: 'g14', name: 'Dog', th: 'สุนัข', meaning: 'เพื่อนซื่อ ความภักดี', image: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&h=650&fit=crop' },
  { id: 'g15', name: 'Mountain', th: 'ภูเขา', meaning: 'อุปสรรค ต้องอดทน', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=650&fit=crop' },
  { id: 'g16', name: 'Paths', th: 'ทางแยก', meaning: 'การตัดสินใจ', image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=650&fit=crop' },
];

const GYPSY_READING: Record<string, string> = {
  g1: 'ดวงอาทิตย์นำโชค ความสำเร็จใกล้เข้ามา เหมาะเริ่มเรื่องใหม่',
  g2: 'พระจันทร์เตือนเรื่องอารมณ์ ใช้สัญชาตญาณ แต่ตรวจข้อเท็จจริงด้วย',
  g3: 'ดาวแห่งความหวัง โอกาสดีกำลังมา รักษาแรงบันดาลใจไว้',
  g4: 'หัวใจเด่น ความรักและความสัมพันธ์สำคัญวันนี้',
  g5: 'แหวนสื่อถึงสัญญาและความผูกพันระยะยาว',
  g6: 'จดหมาย ข่าวสารสำคัญกำลังมา เตรียมตอบให้ดี',
  g7: 'กุญแจคือทางออก คุณใกล้พบคำตอบแล้ว',
  g8: 'หนังสือ ความรู้และความลับจะถูกเปิด',
  g9: 'เรือ การเดินทางหรือโอกาสจากที่ไกล',
  g10: 'บ้าน ความมั่นคงของครอบครัวเป็นพลังหนุน',
  g11: 'ต้นไม้ ดูแลสุขภาพและรากฐานชีวิต',
  g12: 'เมฆ ความสับสนชั่วคราว รอให้จางก่อนตัดสินใจ',
  g13: 'ปลา เรื่องเงินทองและธุรกิจมีโอกาส',
  g14: 'สุนัข เพื่อนแท้และคนซื่อสัตย์อยู่ใกล้',
  g15: 'ภูเขา มีอุปสรรค ต้องอดทนและค่อย ๆ ปีน',
  g16: 'ทางแยก ถึงเวลาเลือกทาง อย่ารอจนสาย',
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function cardSource(image: any) {
  return typeof image === 'string' ? { uri: image } : image;
}

function pickOne<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function askAI(prompt: string, fallback: string): Promise<string> {
  if (!GROQ_API_KEY) return fallback;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.8,
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'คุณคือหมอดูที่สุภาพ อบอุ่น ตอบภาษาไทยสั้น ๆ ให้กำลังใจ ไม่ฟันธงสุขภาพ/การเงินแบบเด็ดขาด',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!res.ok) return fallback;
    const json = await res.json();
    return json?.choices?.[0]?.message?.content?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export default function HoroscopeScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const [mode, setMode] = useState<Mode>('zodiac');
  const [selectedZodiac, setSelectedZodiac] = useState(0);
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [tempDate, setTempDate] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [zodiacResult, setZodiacResult] = useState<any>(null);
  const [thaiResult, setThaiResult] = useState<any>(null);
  const [loadingZodiac, setLoadingZodiac] = useState(false);
  const [loadingThai, setLoadingThai] = useState(false);

  const [deck, setDeck] = useState<DeckCard[]>(() => shuffle(TAROT_DECK));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [opened, setOpened] = useState(false);
  const [reversed, setReversed] = useState(false);
  const [aiText, setAiText] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [deckStatus, setDeckStatus] = useState('');

  const fanScale = useRef(new Animated.Value(1)).current;
  const revealAnim = useRef(new Animated.Value(0)).current;

  const isCardMode = mode === 'tarot' || mode === 'gypsy';

  const fanCards = useMemo(() => {
    const count = Math.min(deck.length, 12);
    const start = -30;
    const step = count > 1 ? 60 / (count - 1) : 0;
    return deck.slice(0, count).map((card, i) => ({
      card,
      i,
      angle: start + step * i,
    }));
  }, [deck]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setZodiacResult(null);
    setThaiResult(null);
    setOpened(false);
    setSelectedIndex(null);
    setAiText('');
    setDeckStatus('');
    if (m === 'tarot') setDeck(shuffle(TAROT_DECK));
    if (m === 'gypsy') setDeck(shuffle(GYPSY_DECK));
  };

  const onShuffle = () => {
    const source = mode === 'gypsy' ? GYPSY_DECK : TAROT_DECK;
    setDeck(shuffle(source));
    setSelectedIndex(null);
    setOpened(false);
    setAiText('');
    setDeckStatus('สับไพ่แล้ว');
    Animated.sequence([
      Animated.timing(fanScale, { toValue: 0.92, duration: 120, useNativeDriver: true }),
      Animated.timing(fanScale, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onCut = () => {
    if (deck.length < 2) return;
    const cutAt = Math.floor(deck.length / 2);
    setDeck([...deck.slice(cutAt), ...deck.slice(0, cutAt)]);
    setSelectedIndex(null);
    setOpened(false);
    setAiText('');
    setDeckStatus('ตัดไพ่แล้ว');
  };

  const onPredictCard = async () => {
    if (selectedIndex == null || loadingAI) return;
    const card = deck[selectedIndex];
    const isRev = Math.random() < 0.2;
    setReversed(isRev);
    setOpened(true);
    setLoadingAI(true);
    revealAnim.setValue(0);
    Animated.timing(revealAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const offline =
      mode === 'tarot'
        ? TAROT_READING[card.id] || `ความหมาย: ${card.meaning}`
        : GYPSY_READING[card.id] || `ความหมาย: ${card.meaning}`;

    const text = await askAI(
      `ไพ่${mode === 'tarot' ? 'ทาโร่' : 'ยิปซี'}: ${card.th} (${card.name})${isRev ? ' กลับหัว' : ''}\nความหมาย: ${card.meaning}\nช่วยทำนายสั้น ๆ ด้านการงาน การเงิน ความรัก และข้อแนะนำ`,
      offline
    );
    setAiText(text);
    setLoadingAI(false);
  };

  const predictZodiac = async () => {
    setLoadingZodiac(true);
    const z = ZODIAC_LIST[selectedZodiac];
    const dayName = DAY_NAMES[new Date().getDay()];
    const lucky = DAY_LUCKY[dayName];
    setZodiacResult({
      name: z.name,
      emoji: z.emoji,
      dayName,
      color: lucky.color,
      numbers: lucky.number.join(', '),
      direction: lucky.direction,
      career: pickOne(CAREER),
      finance: pickOne(FINANCE),
      love: pickOne(LOVE),
      health: pickOne(HEALTH),
      advice: pickOne(ADVICE),
    });
    setLoadingZodiac(false);
  };

  const predictThai = async () => {
    setLoadingThai(true);
    const dayName = DAY_NAMES[birthDate.getDay()];
    const year = birthDate.getFullYear();
    setThaiResult({
      birthDay: dayName,
      deity: THAI_DAY_DEITY[dayName],
      element: THAI_ELEMENTS[birthDate.getDate() % 4],
      naksat: THAI_NAKSAT[birthDate.getMonth()],
      chineseZodiac: CHINESE_ZODIAC[(year - 4) % 12],
      reading: pickOne(THAI_READING),
      career: pickOne(CAREER),
      finance: pickOne(FINANCE),
      love: pickOne(LOVE),
      advice: pickOne(ADVICE),
    });
    setLoadingThai(false);
  };

  const onChangeDate = (_: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setTempDate(date);
  };

  const confirmDate = () => {
    setBirthDate(tempDate);
    setShowDatePicker(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&h=1200&fit=crop',
        }}
        style={{ flex: 1 }}
        blurRadius={2}
      >
        <LinearGradient
          colors={['rgba(15,10,30,0.92)', 'rgba(30,15,55,0.95)', 'rgba(15,10,30,0.96)']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#F3E8FF" />
          </TouchableOpacity>
          <AppText style={styles.title}>ดูดวง</AppText>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.tabRow}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.tabItem, active && styles.tabItemActive]}
                onPress={() => switchMode(m.key)}
              >
                <MaterialCommunityIcons
                  name={m.icon as any}
                  size={14}
                  color={active ? '#fff' : '#C4B5FD'}
                />
                <AppText style={[styles.tabText, active && styles.tabTextActive]}>{m.label}</AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {mode === 'zodiac' && (
            <>
              <AppText style={styles.sectionTitle}>เลือกราศีของคุณ</AppText>
              <View style={styles.zodiacGrid}>
                {ZODIAC_LIST.map((z, idx) => (
                  <TouchableOpacity
                    key={z.name}
                    style={[styles.zodiacItem, selectedZodiac === idx && styles.selectedZodiacItem]}
                    onPress={() => setSelectedZodiac(idx)}
                  >
                    <Text style={styles.zodiacEmoji}>{z.emoji}</Text>
                    <Text
                      style={[
                        styles.zodiacName,
                        selectedZodiac === idx && styles.selectedZodiacText,
                      ]}
                    >
                      {z.name.replace('ราศี', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.mainBtn} onPress={predictZodiac} disabled={loadingZodiac}>
                <LinearGradient colors={['#9333EA', '#7C3AED']} style={styles.gradientButton}>
                  {loadingZodiac ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="crystal-ball" size={18} color="#fff" />
                      <AppText style={styles.mainBtnText}>ดูดวงราศี</AppText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {zodiacResult && (
                <View style={styles.resultContainer}>
                  <Text style={styles.zodiacBig}>
                    {zodiacResult.emoji} {zodiacResult.name}
                  </Text>
                  <Text style={styles.dateText}>วัน{zodiacResult.dayName}</Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>สีมงคล</AppText>
                      <Text style={styles.infoValue}>{zodiacResult.color}</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>เลขเด่น</AppText>
                      <Text style={styles.infoValue}>{zodiacResult.numbers}</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>ทิศมงคล</AppText>
                      <Text style={styles.infoValue}>{zodiacResult.direction}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionText}>การงาน: {zodiacResult.career}</Text>
                  <Text style={styles.sectionText}>การเงิน: {zodiacResult.finance}</Text>
                  <Text style={styles.sectionText}>ความรัก: {zodiacResult.love}</Text>
                  <Text style={styles.sectionText}>สุขภาพ: {zodiacResult.health}</Text>
                  <View style={styles.adviceBox}>
                    <AppText style={styles.adviceTitle}>ข้อแนะนำ</AppText>
                    <Text style={styles.adviceText}>{zodiacResult.advice}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {mode === 'thai' && (
            <>
              <AppText style={styles.sectionTitle}>วันเดือนปีเกิด</AppText>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => {
                  setTempDate(birthDate);
                  setShowDatePicker(true);
                }}
              >
                <View style={styles.dateIconContainer}>
                  <Ionicons name="calendar" size={20} color="#C084FC" />
                </View>
                <View>
                  <AppText style={styles.dateLabel}>วันเกิด</AppText>
                  <Text style={styles.dateValue}>
                    {birthDate.toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.mainBtn} onPress={predictThai} disabled={loadingThai}>
                <LinearGradient colors={['#9333EA', '#7C3AED']} style={styles.gradientButton}>
                  {loadingThai ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="temple-buddhist" size={18} color="#fff" />
                      <AppText style={styles.mainBtnText}>ดูดวงโหรไทย</AppText>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {thaiResult && (
                <View style={styles.resultContainer}>
                  <AppText style={styles.zodiacBig}>โหราศาสตร์ไทย</AppText>
                  <Text style={styles.dateText}>
                    วัน{thaiResult.birthDay} · {thaiResult.deity}
                  </Text>
                  <View style={styles.infoGrid}>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>ธาตุ</AppText>
                      <Text style={styles.infoValue}>{thaiResult.element}</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>นักษัตร</AppText>
                      <Text style={styles.infoValue}>{thaiResult.naksat}</Text>
                    </View>
                    <View style={styles.infoBox}>
                      <AppText style={styles.infoLabel}>ปีนักษัตร</AppText>
                      <Text style={styles.infoValue}>{thaiResult.chineseZodiac}</Text>
                    </View>
                  </View>
                  <Text style={styles.sectionText}>{thaiResult.reading}</Text>
                  <Text style={styles.sectionText}>การงาน: {thaiResult.career}</Text>
                  <Text style={styles.sectionText}>การเงิน: {thaiResult.finance}</Text>
                  <Text style={styles.sectionText}>ความรัก: {thaiResult.love}</Text>
                  <View style={styles.adviceBox}>
                    <AppText style={styles.adviceTitle}>ข้อแนะนำ</AppText>
                    <Text style={styles.adviceText}>{thaiResult.advice}</Text>
                  </View>
                </View>
              )}
            </>
          )}

          {isCardMode && (
            <>
              <View style={styles.hintCard}>
                <MaterialCommunityIcons name="cards" size={22} color="#FCD34D" />
                <AppText style={styles.hintText}>
                  {mode === 'tarot' ? 'ไพ่ทาโร่ Rider–Waite' : 'ไพ่ยิปซี'} · สับ/ตัดไพ่ได้ แล้วแตะเลือก 1 ใบ
                  {deckStatus ? `\n${deckStatus}` : ''}
                </AppText>
              </View>

              <Animated.View style={[styles.fanWrap, { transform: [{ scale: fanScale }] }]}>
                {fanCards.map(({ card, i, angle }) => {
                  const selected = selectedIndex === i;
                  const showFace = opened && selected;
                  return (
                    <TouchableOpacity
                      key={`${card.id}-${i}`}
                      activeOpacity={0.9}
                      onPress={() => {
                        if (opened) return;
                        setSelectedIndex(i);
                        setDeckStatus(`เลือกใบที่ ${i + 1} แล้ว · กดทำนาย`);
                      }}
                      style={[
                        styles.fanCard,
                        {
                          transform: [
                            { translateY: FAN_RADIUS },
                            { rotate: `${angle}deg` },
                            { translateY: -FAN_RADIUS },
                            { translateY: selected ? -18 : 0 },
                          ],
                          zIndex: selected ? 300 : i + 1,
                          borderColor: selected ? '#FCD34D' : 'rgba(196,181,253,0.5)',
                          borderWidth: selected ? 2.5 : 1.5,
                        },
                      ]}
                    >
                      {showFace ? (
                        <Image source={cardSource(card.image)} style={styles.cardImage} resizeMode="cover" />
                      ) : (
                        <LinearGradient colors={['#4C1D95', '#1E1B4B']} style={styles.cardBack}>
                          <MaterialCommunityIcons name="cards-playing" size={28} color="#C4B5FD" />
                        </LinearGradient>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </Animated.View>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionChip} onPress={onShuffle}>
                  <MaterialCommunityIcons name="shuffle-variant" size={18} color="#E9D5FF" />
                  <AppText style={styles.linkText}>สับไพ่</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionChip} onPress={onCut}>
                  <MaterialCommunityIcons name="content-cut" size={18} color="#E9D5FF" />
                  <AppText style={styles.linkText}>ตัดไพ่</AppText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.predictBtn, (selectedIndex == null || loadingAI) && { opacity: 0.5 }]}
                onPress={onPredictCard}
                disabled={selectedIndex == null || loadingAI}
              >
                {loadingAI ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText style={styles.predictText}>ทำนาย</AppText>
                )}
              </TouchableOpacity>

              {opened && selectedIndex != null && (
                <Animated.View style={[styles.resultContainer, { opacity: revealAnim }]}>
                  <Image
                    source={cardSource(deck[selectedIndex].image)}
                    style={styles.resultCardImage}
                    resizeMode="cover"
                  />
                  <Text style={[styles.zodiacBig, { textAlign: 'center', marginTop: 12 }]}>
                    {deck[selectedIndex].th} · {deck[selectedIndex].name}
                  </Text>
                  {reversed && (
                    <AppText style={[styles.reversedText, { textAlign: 'center' }]}>กลับหัว</AppText>
                  )}
                  <Text style={[styles.meaning, { textAlign: 'center' }]}>
                    ความหมาย: {deck[selectedIndex].meaning}
                  </Text>
                  <View style={styles.aiBox}>
                    <AppText style={styles.aiLabel}>คำทำนาย</AppText>
                    {loadingAI ? (
                      <ActivityIndicator color="#C084FC" style={{ marginVertical: 12 }} />
                    ) : (
                      <Text style={styles.aiText}>{aiText}</Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.resetBtn} onPress={onShuffle}>
                    <MaterialCommunityIcons name="refresh" size={18} color="#E9D5FF" />
                    <AppText style={styles.resetText}>จั่วใหม่</AppText>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>

        <Modal visible={showDatePicker} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? colors.card : '#FFF' }]}>
              <AppText style={[styles.modalTitle, { color: colors.text }]}>เลือกวันเดือนปีเกิด</AppText>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onChangeDate}
                maximumDate={new Date()}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowDatePicker(false)}>
                  <AppText style={{ color: colors.textSecondary, fontWeight: '600' }}>ยกเลิก</AppText>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmDate}>
                  <AppText style={{ color: '#fff', fontWeight: '700' }}>ยืนยัน</AppText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#F3E8FF' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 4,
    gap: 3,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabItemActive: { backgroundColor: 'rgba(168,85,247,0.55)' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#C4B5FD' },
  tabTextActive: { color: '#FFF', fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 48 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#E9D5FF', marginBottom: 10 },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(192,132,252,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dateLabel: { color: '#9CA3AF', fontSize: 11, marginBottom: 2 },
  dateValue: { color: '#F3E8FF', fontSize: 15, fontWeight: '600' },
  hintCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  hintText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#FDE68A' },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  zodiacItem: {
    width: '31%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  selectedZodiacItem: {
    backgroundColor: 'rgba(168,85,247,0.28)',
    borderColor: '#C084FC',
  },
  zodiacEmoji: { fontSize: 26 },
  zodiacName: { color: '#E5E7EB', fontWeight: '600', fontSize: 12, marginTop: 2 },
  selectedZodiacText: { color: '#FFF', fontWeight: '700' },
  mainBtn: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  gradientButton: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mainBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resultContainer: {
    backgroundColor: 'rgba(25,10,45,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.25)',
    borderRadius: 20,
    padding: 16,
    marginTop: 10,
  },
  zodiacBig: { fontSize: 18, fontWeight: '700', color: '#F3E8FF' },
  dateText: { color: '#C084FC', fontSize: 12, marginTop: 4, marginBottom: 10 },
  infoGrid: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  infoBox: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  infoLabel: { fontSize: 10, color: '#9CA3AF' },
  infoValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 3,
    textAlign: 'center',
  },
  sectionText: { fontSize: 13, lineHeight: 20, color: '#D1D5DB', marginBottom: 6 },
  adviceBox: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.28)',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
  },
  adviceTitle: { fontSize: 14, fontWeight: '700', color: '#FCD34D', marginBottom: 6 },
  adviceText: { fontSize: 13, lineHeight: 19, color: '#FDE68A' },
  fanWrap: {
    height: 340,
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'visible',
  },
  fanCard: {
    position: 'absolute',
    left: (width - CARD_W) / 2,
    bottom: 20,
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1E1B4B',
  },
  cardBack: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardImage: { width: '100%', height: '100%' },
  resultCardImage: {
    width: 190,
    height: 318,
    borderRadius: 14,
    alignSelf: 'center',
    borderWidth: 2,
    borderColor: 'rgba(252,211,77,0.55)',
  },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 4 },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  linkText: { color: '#E9D5FF', fontSize: 14, fontWeight: '700' },
  predictBtn: {
    alignSelf: 'center',
    marginTop: 14,
    backgroundColor: '#D97706',
    paddingHorizontal: 40,
    paddingVertical: 13,
    borderRadius: 24,
    minWidth: 130,
    alignItems: 'center',
  },
  predictText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  meaning: { color: '#C4B5FD', fontSize: 13, marginVertical: 8 },
  reversedText: { color: '#FCA5A5', fontWeight: '700', marginTop: 4 },
  aiBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
  },
  aiLabel: { color: '#FCD34D', fontWeight: '800', fontSize: 13, marginBottom: 8 },
  aiText: { color: '#E5E7EB', fontSize: 14, lineHeight: 22 },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  resetText: { color: '#E9D5FF', fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  modalButtons: { flexDirection: 'row', width: '100%', marginTop: 12 },
  cancelBtn: {
    flex: 1,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    marginRight: 8,
  },
  confirmBtn: {
    flex: 1,
    padding: 13,
    alignItems: 'center',
    backgroundColor: '#9333EA',
    borderRadius: 12,
    marginLeft: 8,
  },
});