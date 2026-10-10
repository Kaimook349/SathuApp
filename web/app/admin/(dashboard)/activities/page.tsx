"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

interface Activity {
  id: string;
  title: string;
  location: string;
  date: string;
  time: string;
  description: string;
  image: string;
  status: string;
  completeness: number;
}

export default function ActivitiesPage() {
  const router = useRouter();

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  
  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState(getLocalDateString(today));
  const [activities, setActivities] = useState<Activity[]>([]);
  const [monthEventDates, setMonthEventDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTempleId, setMyTempleId] = useState<string | null>(null);
  
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  // 1. ค้นหา temple_id ของแอดมินที่ล็อกอินอยู่ปัจจุบัน
  useEffect(() => {
    async function fetchMyTemple() {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setLoading(false);
        return;
      }

      // ค้นหา temple_id จากตาราง temple_registrations ด้วย user_id
      let { data: temple } = await supabase
        .from("temple_registrations")
        .select("id, temple_name")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      // เผื่อกรณีเก็บบันทึกเป็น email
      if (!temple && authData.user.email) {
        const { data: templeByEmail } = await supabase
          .from("temple_registrations")
          .select("id, temple_name")
          .eq("email", authData.user.email)
          .maybeSingle();
        temple = templeByEmail;
      }

      if (temple) {
        setMyTempleId(temple.id);
      } else {
        setLoading(false);
      }
    }
    fetchMyTemple();
  }, []);

  useEffect(() => {
    if (myTempleId) {
      fetchMonthEvents();
    }
  }, [currentYear, currentMonth, myTempleId]);

  useEffect(() => {
    if (myTempleId) {
      fetchActivities();
    }
  }, [selectedDate, myTempleId]);

  const fetchMonthEvents = async () => {
    if (!myTempleId) return;
    const startDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate();
    const endDate = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${lastDay}`;

    // ดึงเฉพาะกิจกรรมที่เป็นของวัดตัวเองเท่านั้น
    const { data } = await supabase
      .from("admin_activities")
      .select("date")
      .eq("temple_id", myTempleId)
      .eq("status", "published")
      .gte("date", startDate)
      .lte("date", endDate);

    if (data) {
      const dates = data.map((item) => item.date);
      setMonthEventDates(dates);
    }
  };

  const fetchActivities = async () => {
    if (!myTempleId) return;
    setLoading(true);
    
    // ดึงเฉพาะรายการกิจกรรมที่เป็นของวัดตัวเองเท่านั้นตามวันที่เลือก
    const { data } = await supabase
      .from("admin_activities")
      .select("*")
      .eq("temple_id", myTempleId)
      .eq("date", selectedDate)
      .eq("status", "published");

    if (data) setActivities(data);
    setLoading(false);
  };

  const handleDeleteActivity = async (id: string) => {
    if (confirm("คุณต้องการลบกิจกรรมนี้ใช่หรือไม่?")) {
      await supabase.from("admin_activities").delete().eq("id", id);
      setActivities(activities.filter((a) => a.id !== id));
      fetchMonthEvents();
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };

  const monthDays = getDaysInMonth(currentYear, currentMonth);
  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 font-sans text-slate-800 dark:text-slate-100">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            กิจกรรมทั้งหมด
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">จัดการ ตรวจสอบ และเลือกดูตารางกิจกรรมวัด</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/activities/drafts")}
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer"
          >
            ดูแบบร่างทั้งหมด
          </button>
          <button
            onClick={() => router.push("/admin/activities/new")}
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition cursor-pointer"
          >
            <Plus size={16} /> สร้างกิจกรรม
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon size={18} className="text-purple-600 dark:text-purple-400" /> {thaiMonths[currentMonth]} {currentYear + 543}
              </span>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
                    else { setCurrentMonth(currentMonth - 1); }
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <button 
                  onClick={() => {
                    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
                    else { setCurrentMonth(currentMonth + 1); }
                  }}
                  className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center">
              {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d, i) => (
                <span key={i} className="text-[11px] font-bold text-slate-400 py-1">{d}</span>
              ))}
              {monthDays.map((dateObj) => {
                const dateStr = getLocalDateString(dateObj);
                const isSelected = selectedDate === dateStr;
                const isToday = dateStr === getLocalDateString(today);
                const hasEvent = monthEventDates.includes(dateStr);

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    className={`py-2 rounded-xl text-xs font-semibold transition relative flex flex-col items-center justify-center cursor-pointer ${
                      isSelected
                        ? "bg-purple-700 text-white shadow-sm"
                        : hasEvent
                        ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-800/60"
                        : isToday
                        ? "border border-purple-600 text-purple-600 dark:text-purple-400 font-bold"
                        : "bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span>{dateObj.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-5 shadow-xl">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-200">
              รายการกิจกรรมวันที่: <span className="text-purple-600 dark:text-purple-400 font-bold">{selectedDate}</span>
            </h3>
          </div>

          {loading ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 text-slate-400 text-xs shadow-xl">
              กำลังโหลดข้อมูล...
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 text-slate-400 text-xs space-y-2 shadow-xl">
              <p>ไม่มีกิจกรรมในวันที่เลือก</p>
              <button
                onClick={() => router.push("/admin/activities/new")}
                className="text-purple-600 dark:text-purple-400 font-bold hover:underline text-xs cursor-pointer"
              >
                + เพิ่มกิจกรรมใหม่ในวันนี้
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((act) => (
                <div key={act.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-5 shadow-xl flex flex-col md:flex-row gap-5 items-start justify-between">
                  <div className="flex items-start gap-4 w-full">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                      <Image src={act.image || "/placeholder.svg"} alt={act.title} fill className="object-cover object-center" />
                    </div>
                    
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug break-words">{act.title}</h3>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800 whitespace-nowrap">
                          เผยแพร่แล้ว
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">📍 สถานที่: {act.location}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">📅 วันที่: {act.date} | ⏰ เวลา: {act.time}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">{act.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 justify-end shrink-0">
                    <button
                      onClick={() => setSelectedActivity(act)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition whitespace-nowrap cursor-pointer"
                    >
                      <Eye size={14} /> ดูรายละเอียด
                    </button>
                    <button
                      onClick={() => handleDeleteActivity(act.id)}
                      className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition whitespace-nowrap cursor-pointer"
                    >
                      <Trash2 size={14} /> ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {selectedActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">รายละเอียดกิจกรรม</h3>
              <button onClick={() => setSelectedActivity(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer p-1">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3">
              {selectedActivity.image && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <Image src={selectedActivity.image} alt={selectedActivity.title} fill className="object-cover object-center" />
                </div>
              )}
              <h4 className="font-bold text-base text-slate-900 dark:text-white">{selectedActivity.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">📍 สถานที่: {selectedActivity.location}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">📅 วันที่: {selectedActivity.date} | ⏰ เวลา: {selectedActivity.time}</p>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {selectedActivity.description}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedActivity(null)}
                className="px-5 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer shadow-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}