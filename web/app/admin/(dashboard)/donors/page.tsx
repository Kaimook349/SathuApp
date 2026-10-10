"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, Users, HandCoins, Download, BadgeCheck, Loader2, ArrowLeft } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

const formatBaht = (amount: number) => {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

const methodStyle: Record<string, string> = {
  พร้อมเพย์: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60",
  PromptPay: "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60",
  โอนธนาคาร: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60",
  Bank_Transfer: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60",
  บัตรเครดิต: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60",
  Credit_Card: "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60",
  เงินสด: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60",
  Cash: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60",
}

const getMethodStyle = (method: string) => methodStyle[method] || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"

interface DonationItem {
  id: string
  name: string
  amount: number
  method: string
  date: string
  project: string
  anonymous: boolean
}

export default function DonorsPage() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [donations, setDonations] = useState<DonationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDonations = async () => {
      try {
        // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบัน
        const { data: authData } = await supabase.auth.getUser()
        const myId = authData?.user?.id ?? null
        if (!myId) {
          setIsLoading(false)
          return
        }

        // 2. ค้นหา temple_id ของวัดที่ผูกกับ user นี้
        const { data: templeData, error: templeError } = await supabase
          .from("temple_registrations")
          .select("id")
          .eq("user_id", myId)
          .maybeSingle()

        if (templeError || !templeData) {
          setIsLoading(false)
          return
        }

        const currentTempleId = templeData.id

        // 3. ดึงรายการโปรเจคทั้งหมดของวัดนี้ก่อน เพื่อนำ id ไปกรองยอดบริจาค
        const { data: projectsData } = await supabase
          .from("admin_projects")
          .select("id, title")
          .eq("temple_id", currentTempleId)

        const projectIds = projectsData?.map((p) => p.id) || []
        const projectMap = new Map(projectsData?.map((p) => [p.id, p.title]))

        if (projectIds.length === 0) {
          setDonations([])
          setIsLoading(false)
          return
        }

        // 4. ดึงข้อมูลการบริจาคเฉพาะที่ตรงกับโปรเจคของวัดนี้ (หรือกรองด้วย temple_id ตามโครงสร้างตาราง donations ของคุณ)
        const { data, error } = await supabase
          .from("donations")
          .select("id, donor_name, amount, payment_method, created_at, status, project_id")
          .in("project_id", projectIds)
          .order("created_at", { ascending: false })

        if (error) throw error

        if (data) {
          const formattedData: DonationItem[] = data.map((item: any) => ({
            id: item.id,
            name: item.donor_name || "ผู้ไม่ประสงค์ออกนาม",
            amount: Number(item.amount) || 0,
            method: item.payment_method || "โอนธนาคาร",
            date: new Date(item.created_at).toLocaleDateString("th-TH", {
              year: "numeric",
              month: "short",
              day: "numeric",
            }),
            project: projectMap.get(item.project_id) || "บริจาคบำรุงวัดและกิจกรรมทั่วไป",
            anonymous: !item.donor_name,
          }))

          setDonations(formattedData)
        }
      } catch (err: any) {
        console.error("Error fetching donations:", err.message || err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDonations()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return donations
    return donations.filter(
      (d) => d.name.toLowerCase().includes(q) || d.project.toLowerCase().includes(q),
    )
  }, [query, donations])

  const totalAmount = filtered.reduce((s, d) => s + d.amount, 0)
  const totalDonors = filtered.length
  const avgAmount = totalDonors > 0 ? Math.round(totalAmount / totalDonors) : 0

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก")
      return
    }

    const headers = ["ลำดับ,ชื่อผู้บริจาค,โครงการ,ช่องทาง,วันที่,จำนวนเงิน (บาท)"]
    const rows = filtered.map((d, index) => {
      const name = `"${d.name.replace(/"/g, '""')}"`
      const project = `"${d.project.replace(/"/g, '""')}"`
      const method = `"${d.method.replace(/"/g, '""')}"`
      const date = `"${d.date}"`
      const amount = d.amount
      return `${index + 1},${name},${project},${method},${date},${amount}`
    })

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `donors_report_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 font-sans text-slate-800 dark:text-slate-100 animate-fade-in-up">
      
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
              รายชื่อผู้บริจาคทั้งหมด
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ตรวจสอบข้อมูลและสถิติยอดบริจาคจากผู้มีจิตศรัทธาแบบเรียลไทม์
            </p>
          </div>
        </div>

        <button 
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs cursor-pointer"
        >
          <Download className="size-4 text-purple-600 dark:text-purple-400" /> ส่งออก CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shadow-2xs shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {isLoading ? "-" : totalDonors.toLocaleString()} <span className="text-xs font-normal text-slate-400">คน</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ผู้บริจาคทั้งหมด</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-2xs shrink-0">
            <HandCoins size={22} />
          </div>
          <div>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {isLoading ? "-" : formatBaht(totalAmount)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดบริจาครวมทั้งหมด</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shadow-2xs shrink-0">
            <BadgeCheck size={22} />
          </div>
          <div>
            <p className="font-display text-2xl font-black text-slate-900 dark:text-white">
              {isLoading ? "-" : formatBaht(avgAmount)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">ยอดเฉลี่ยต่อคน</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-6 shadow-xl space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">รายการผู้ทำบุญและบริจาคเงิน</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isLoading ? "กำลังโหลดข้อมูล..." : `แสดง ${totalDonors} รายการ · รวม ${formatBaht(totalAmount)}`}
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาชื่อผู้บริจาค..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-purple-600 shadow-2xs"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="size-8 animate-spin text-purple-600" />
            <p className="text-xs font-bold">กำลังโหลดข้อมูลผู้บริจาค...</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 md:block">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-left font-bold text-slate-500 dark:text-slate-400">
                    <th className="px-5 py-3.5">ผู้บริจาค</th>
                    <th className="px-5 py-3.5">โครงการ / รายละเอียด</th>
                    <th className="px-5 py-3.5">ช่องทาง</th>
                    <th className="px-5 py-3.5">วันที่</th>
                    <th className="px-5 py-3.5 text-right">จำนวนเงิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {filtered.map((d) => (
                    <tr key={d.id} className="transition-colors hover:bg-purple-50/40 dark:hover:bg-slate-800/50">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs shadow-2xs">
                            {d.anonymous ? "?" : d.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 truncate max-w-[220px] font-medium">{d.project}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold shadow-2xs ${getMethodStyle(d.method)}`}>
                          {d.method}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 font-medium">{d.date}</td>
                      <td className="px-5 py-4 text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">
                        +{formatBaht(d.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="py-12 text-center text-xs text-slate-400 font-medium">ไม่พบข้อมูลการค้นหา</p>
              )}
            </div>

            <div className="flex flex-col gap-3 md:hidden">
              {filtered.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-950/40 shadow-2xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-xs shadow-2xs">
                      {d.anonymous ? "?" : d.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900 dark:text-white text-xs">{d.name}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{d.project}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getMethodStyle(d.method)}`}>
                          {d.method}
                        </span>
                        <span className="text-[10px] text-slate-400">{d.date}</span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-black text-emerald-600 dark:text-emerald-400">
                    +{formatBaht(d.amount)}
                  </span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="py-12 text-center text-xs text-slate-400 font-medium">ไม่พบข้อมูลการค้นหา</p>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  )
}