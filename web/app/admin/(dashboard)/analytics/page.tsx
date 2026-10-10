"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, BarChart3, TrendingUp, Users, Loader2, DollarSign, MessageSquare } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

interface ProjectStat {
  title: string;
  amount: number;
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [period, setPeriod] = useState<"7d" | "1m" | "3m" | "1y">("7d")
  const [isLoading, setIsLoading] = useState(true)

  const [totalAmount, setTotalAmount] = useState<number>(0)
  const [totalDonors, setTotalDonors] = useState<number>(0)
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([])
  const [reviewsCount, setReviewsCount] = useState<number>(0)

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setIsLoading(true)

        // 1. ตรวจสอบผู้ใช้ปัจจุบันและดึง temple_id ของวัดตัวเอง
        const { data: authData } = await supabase.auth.getUser()
        if (!authData?.user) {
          setIsLoading(false)
          return
        }

        let { data: temple } = await supabase
          .from("temple_registrations")
          .select("id")
          .eq("user_id", authData.user.id)
          .maybeSingle()

        if (!temple && authData.user.email) {
          const { data: templeByEmail } = await supabase
            .from("temple_registrations")
            .select("id")
            .eq("email", authData.user.email)
            .maybeSingle()
          temple = templeByEmail
        }

        if (!temple) {
          setIsLoading(false)
          return
        }

        const myTempleId = temple.id

        // 2. ดึงข้อมูลโครงการ (Projects) เฉพาะของวัดตัวเองก่อน เพื่อเอา ID ไปกรองยอดบริจาค
        const { data: projects, error: projectError } = await supabase
          .from("admin_projects")
          .select("id, title")
          .eq("temple_id", myTempleId)

        if (projectError) throw projectError

        const projectIds = projects?.map(p => p.id) || []

        // 3. ดึงข้อมูลยอดบริจาคเฉพาะของโปรเจกต์ในวัดตัวเอง
        let donations: any[] = []
        if (projectIds.length > 0) {
          const { data: donationData, error: donationError } = await supabase
            .from("donations")
            .select("amount, donor_name, created_at, project_id")
            .in("project_id", projectIds)

          if (donationError) throw donationError
          donations = donationData || []
        }

        if (donations.length > 0) {
          const sum = donations.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
          setTotalAmount(sum)
          setTotalDonors(donations.length)
        } else {
          setTotalAmount(0)
          setTotalDonors(0)
        }

        // 4. คำนวณยอดบริจาคแยกตามโปรเจกต์ของวัดตัวเอง
        if (projects && donations) {
          const stats = projects.map(proj => {
            const projDonations = donations.filter(d => d.project_id === proj.id)
            const projSum = projDonations.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)
            return {
              title: proj.title,
              amount: projSum
            }
          })
          setProjectStats(stats)
        }

        // 5. ดึงจำนวนรีวิวเฉพาะของวัดตัวเอง
        const { count, error: reviewError } = await supabase
          .from("reviews")
          .select("*", { count: "exact", head: true })
          .eq("temple_id", myTempleId)

        if (!reviewError && count !== null) {
          setReviewsCount(count)
        } else {
          setReviewsCount(0)
        }

      } catch (err) {
        console.error("Error fetching analytics:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [period])

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 font-sans text-slate-800 dark:text-slate-100 animate-fade-in-up">
      
      {/* ส่วนหัวพร้อมปุ่มย้อนกลับ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs cursor-pointer shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
              ข้อมูลสถิติเชิงลึก (Analytics)
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              วิเคราะห์ภาพรวมการระดมทุน สถิติยอดทำบุญ และความคิดเห็นของผู้มีจิตศรัทธา
            </p>
          </div>
        </div>

        {/* แท็บเลือกช่วงเวลา */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
          {[
            { id: "7d", label: "7 วัน" },
            { id: "1m", label: "1 เดือน" },
            { id: "3m", label: "3 เดือน" },
            { id: "1y", label: "1 ปี" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === item.id
                  ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* การ์ดสรุปยอดบริจาค & ภาพรวม */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 shadow-xl border border-purple-100 dark:border-purple-900/40 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-600 dark:text-purple-400" /> สถิติภาพรวมการบริจาค
          </h3>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-8 animate-spin text-purple-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="bg-purple-50/50 dark:bg-purple-950/30 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/50 space-y-1.5 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{formatBaht(totalAmount)}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดบริจาครวมทั้งหมด (บาท)</p>
            </div>
            
            <div className="bg-purple-50/50 dark:bg-purple-950/30 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/50 space-y-1.5 shadow-2xs">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{totalDonors.toLocaleString()} <span className="text-sm font-normal text-slate-400">คน</span></span>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">จำนวนครั้งและผู้ร่วมทำบุญ</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ยอดบริจาคแยกตามโปรเจกต์ */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 shadow-xl border border-purple-100 dark:border-purple-900/40 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-600 dark:text-purple-400" /> ยอดบริจาคแยกตามโครงการระดมทุน
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="size-8 animate-spin text-purple-600" />
            </div>
          ) : projectStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-12 font-medium">ยังไม่มีข้อมูลโครงการระดมทุนในระบบ</p>
          ) : (
            <div className="space-y-5 pt-1">
              {projectStats.map((item, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-800 dark:text-slate-200">{item.title}</span>
                    <span className="text-purple-700 dark:text-purple-300 font-black">{formatBaht(item.amount)}</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-700 dark:bg-purple-600 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, (item.amount / (totalAmount || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* สรุปข้อมูลรีวิวและความคิดเห็น */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-7 shadow-xl border border-purple-100 dark:border-purple-900/40 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MessageSquare size={18} className="text-purple-600 dark:text-purple-400" /> สถิติรีวิวและความคิดเห็น
              </h3>
            </div>
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/60 dark:border-slate-800 space-y-2 shadow-2xs">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ความคิดเห็นทั้งหมดในระบบ</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{reviewsCount} <span className="text-xs font-normal text-slate-400">รีวิว</span></p>
            </div>
          </div>

          <button
            onClick={() => router.push("/admin/reviews")}
            className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white text-xs font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-2"
          >
            จัดการรีวิวและความคิดเห็น
          </button>
        </div>

      </div>

    </div>
  )
}