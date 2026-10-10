"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowRight, 
  DollarSign, 
  Star, 
  Calendar, 
  TrendingUp, 
  HandCoins,         
  ReceiptText,       
  Award,             
  MessageSquareText, 
  Activity,          
  CalendarDays,      
  QrCode,
  Loader2,
  Sparkles,
  Flame
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ActivityItem {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  status: string;
}

interface ProjectItem {
  id: string;
  title: string;
  image: string;
  status: string;
}

interface RecentDonation {
  id: string;
  donor_name: string;
  amount: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [templeName, setTempleName] = useState("วัดในระบบ Sathu");
  const [adminName, setAdminName] = useState("ผู้ดูแลระบบ");
  const [currentTempleId, setCurrentTempleId] = useState<string | null>(null);

  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [latestProject, setLatestProject] = useState<ProjectItem | null>(null);
  
  const [totalDonationAmount, setTotalDonationAmount] = useState<number>(0);
  const [totalDonorsCount, setTotalDonorsCount] = useState<number>(0);
  const [recentDonations, setRecentDonations] = useState<RecentDonation[]>([]);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalReviews, setTotalReviews] = useState<number>(0);

  useEffect(() => {
    async function verifyApprovalStatus() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        router.push("/admin/login");
        return;
      }

      const userEmail = session.user.email;

      const { data, error } = await supabase
        .from("temple_registrations")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        alert("ไม่พบข้อมูลการลงทะเบียนวัดด้วยอีเมลนี้");
        router.push("/admin/login");
        return;
      }

      if (data.status !== "approved") {
        alert("คำขอลงทะเบียนวัดของคุณยังไม่ได้รับการอนุมัติจากทีมงาน Sathu (สถานะปัจจุบัน: " + data.status + ")");
        router.push("/admin/register/status");
      } else {
        setTempleName(data.temple_name || "วัดในระบบ Sathu");
        setAdminName(data.admin_name || "ผู้ดูแลระบบ");
        setCurrentTempleId(data.id);
        setChecking(false);
        loadDashboardData(data.id);
      }
    }

    verifyApprovalStatus();
  }, [router]);

  const loadDashboardData = (templeId: string) => {
    fetchRecentActivities(templeId);
    fetchLatestProject(templeId);
    fetchDonationData(templeId);
    fetchReviewData(templeId);
  };

  const fetchRecentActivities = async (templeId: string) => {
    const { data } = await supabase
      .from("admin_activities")
      .select("id, title, location, date, time, status")
      .eq("temple_id", templeId)
      .eq("status", "published")
      .order("date", { ascending: false })
      .limit(2);

    if (data) setRecentActivities(data);
  };

  const fetchLatestProject = async (templeId: string) => {
    const { data } = await supabase
      .from("admin_projects")
      .select("id, title, image, status")
      .eq("temple_id", templeId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) setLatestProject(data);
  };

  const fetchDonationData = async (templeId: string) => {
    const { data: projectsData } = await supabase
      .from("admin_projects")
      .select("id")
      .eq("temple_id", templeId);

    const projectIds = projectsData?.map((p) => p.id) || [];
    if (projectIds.length === 0) {
      setTotalDonationAmount(0);
      setTotalDonorsCount(0);
      setRecentDonations([]);
      return;
    }

    const { data: donations, error } = await supabase
      .from("donations")
      .select("id, donor_name, amount, created_at, status, project_id")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (donations && !error) {
      const validDonations = donations.filter(d => d.status === 'approved' || d.status === 'pending' || !d.status);
      const sum = validDonations.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      setTotalDonationAmount(sum);
      setTotalDonorsCount(validDonations.length);
      setRecentDonations(validDonations.slice(0, 2));
    }
  };

  const fetchReviewData = async (templeId: string) => {
    const { data: projectsData } = await supabase
      .from("admin_projects")
      .select("id")
      .eq("temple_id", templeId);

    const projectIds = projectsData?.map((p) => p.id) || [];
    if (projectIds.length === 0) {
      setAvgRating(5.0);
      setTotalReviews(0);
      return;
    }

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("rating, project_id")
      .in("project_id", projectIds);

    if (reviews && !error && reviews.length > 0) {
      setTotalReviews(reviews.length);
      const totalScore = reviews.reduce((acc, curr) => acc + (curr.rating || 0), 0);
      const average = totalScore / reviews.length;
      setAvgRating(Number(average.toFixed(1)));
    } else {
      setAvgRating(5.0);
      setTotalReviews(0);
    }
  };

  const shortcuts = [
   { title: "โครงการบริจาค", icon: <HandCoins className="text-purple-600 dark:text-purple-400 stroke-[1.75]" size={24} />, path: "/admin/projects" },
    { title: "รายงานการใช้เงิน", icon: <ReceiptText className="text-blue-600 dark:text-blue-400 stroke-[1.75]" size={24} />, path: "/admin/transparency" },
    { title: "ตอบรีวิว", icon: <Award className="text-amber-600 dark:text-amber-400 stroke-[1.75]" size={24} />, path: "/admin/reviews" },
    { title: "สื่อสารชุมชน (แชท)", icon: <MessageSquareText className="text-pink-600 dark:text-pink-400 stroke-[1.75]" size={24} />, path: "/admin/chat" },
    { title: "Analytics", icon: <Activity className="text-emerald-600 dark:text-emerald-400 stroke-[1.75]" size={24} />, path: "/admin/analytics" },
    { title: "โพสต์กิจกรรม", icon: <CalendarDays className="text-violet-600 dark:text-violet-400 stroke-[1.75]" size={24} />, path: "/admin/activities" },
    { title: "สร้างคิวอาร์โค้ด", icon: <QrCode className="text-indigo-600 dark:text-indigo-400 stroke-[1.75]" size={24} />, path: "/admin/qr" },
  ];

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-purple-100 dark:border-purple-900/50 flex items-center gap-3.5 animate-pulse">
          <Loader2 size={30} className="animate-spin text-purple-600" />
          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">กำลังตรวจสอบสิทธิ์การอนุมัติวัด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 animate-fade-in-up font-sans text-slate-800 dark:text-slate-100">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-purple-100/60 dark:border-purple-900/30">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
            {templeName}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            ระบบบริหารจัดการข้อมูลการทำบุญและกิจกรรมวัดแบบเรียลไทม์
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="relative overflow-hidden rounded-2xl bg-purple-950 dark:bg-slate-900 text-white p-6 flex items-center justify-between shadow-md border border-purple-900/40 dark:border-slate-800">
            <div className="space-y-1 z-10">
              <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-white/10 text-purple-200 mb-1">
                ยินดีต้อนรับผู้ดูแลระบบ
              </span>
              <h3 className="font-display text-xl sm:text-2xl font-bold text-white">
                {adminName}
              </h3>
              <p className="text-xs text-purple-200/80 pt-0.5">
                ขอให้วันนี้เป็นวันที่ราบรื่นและร่วมทำนุบำรุงพระพุทธศาสนา
              </p>
            </div>
            <div className="text-4xl select-none z-10 p-2 opacity-90">
              🪷
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-6 space-y-3.5 sm:col-span-2 shadow-xl shadow-purple-900/5 dark:shadow-none hover:border-purple-300 transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider">ยอดบริจาครวมสุทธิ</p>
                </div>
              </div>

              <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700">
                <div className="h-full bg-purple-700 dark:bg-purple-600 rounded-full w-full shadow-sm" />
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">ยอดสะสมทั้งหมด</span>
                <span className="font-display text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {totalDonationAmount.toLocaleString("th-TH", { minimumFractionDigits: 2 })} <span className="text-sm font-bold text-slate-400">บาท</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 pt-2 border-t border-purple-50 dark:border-purple-950/40">
                <TrendingUp size={16} /> ประมวลผลและตรวจสอบยอดเงินอัตโนมัติ 100%
              </div>
            </div>

            <div 
              onClick={() => router.push("/admin/donors")}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-6 flex items-center justify-between cursor-pointer shadow-lg shadow-purple-900/5 dark:shadow-none hover:border-purple-400 dark:hover:border-purple-700 hover:shadow-xl transition group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:scale-110 transition shadow-inner">
                  <DollarSign size={26} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">ผู้บริจาคทั้งหมด</p>
                  <p className="text-xs font-bold text-purple-700 dark:text-purple-300 mt-0.5">คลิกดูรายชื่อ &gt;</p>
                </div>
              </div>
              <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {totalDonorsCount} <span className="text-xs font-normal text-slate-400">คน</span>
              </span>
            </div>

            <div 
              onClick={() => router.push("/admin/reviews")}
              className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-6 flex items-center justify-between cursor-pointer shadow-lg shadow-purple-900/5 dark:shadow-none hover:border-amber-400 dark:hover:border-amber-700 hover:shadow-xl transition group"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 group-hover:scale-110 transition shadow-inner">
                  <Star size={26} className="fill-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">คะแนนรีวิว</p>
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-0.5">จาก {totalReviews} รีวิว</p>
                </div>
              </div>
              <span className="font-display text-2xl font-bold text-slate-900 dark:text-white">
                {avgRating} <span className="text-xs font-normal text-slate-400">/ 5.0</span>
              </span>
            </div>

          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">
              เมนูลัดจัดการระบบ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shortcuts.map((item, index) => (
                <div
                  key={index}
                  onClick={() => router.push(item.path)}
                  className="group flex items-center gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 hover:shadow-md transition cursor-pointer"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/80 shadow-2xs">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">โปรเจกต์ระดมทุนล่าสุด</h3>
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 shadow-xl group cursor-pointer" onClick={() => router.push("/admin/projects")}>
              <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800">
                <img 
                  src={latestProject?.image || "/buddha-bg.png"} 
                  alt="โปรเจกต์" 
                  className="absolute inset-0 h-full w-full object-cover opacity-90 group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between text-white">
                  <div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-700 text-white mb-2 inline-block shadow-md">
                      {latestProject?.status === "active" ? "กำลังระดมทุน" : "โครงการล่าสุด"}
                    </span>
                    <h4 className="text-base sm:text-lg font-bold drop-shadow-md text-white">
                      {latestProject?.title || "ยังไม่มีโครงการระดมทุน"}
                    </h4>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-900 shadow-lg transition group-hover:scale-110">
                    <ArrowRight size={18} />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="space-y-6">
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">กิจกรรมล่าสุด</h3>
              <button 
                onClick={() => router.push("/admin/activities")}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                ดูทั้งหมด &gt;
              </button>
            </div>

            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-medium">ยังไม่มีกิจกรรมที่เผยแพร่</p>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium gap-2">
                      <span className="flex items-center gap-1 font-bold truncate"><Calendar size={10} className="text-purple-600 shrink-0"/> {act.location || templeName}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                        เผยแพร่แล้ว
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{act.title}</h4>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">📅 {act.date} | ⏰ {act.time}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/40 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">บริจาคล่าสุด</h3>
              <button 
                onClick={() => router.push("/admin/donors")}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
              >
                ดูทั้งหมด &gt;
              </button>
            </div>

            <div className="space-y-3">
              {recentDonations.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 font-medium">ยังไม่มีรายการบริจาค</p>
              ) : (
                recentDonations.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-xs shadow-md">
                        {item.donor_name ? item.donor_name.charAt(0) : "ผู้"}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{item.donor_name || "ผู้ใจบุญ"}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {new Date(item.created_at).toLocaleDateString("th-TH", {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-xl shadow-2xs">
                      + {Number(item.amount).toLocaleString()} บ.
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}