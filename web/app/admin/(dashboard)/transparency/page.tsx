"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, FileText, CheckCircle2, Clock } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

export default function TransparencyPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [reportDetail, setReportDetail] = useState("")
  const [loading, setLoading] = useState(false)

  // ดึงข้อมูลโครงการเฉพาะของวัดที่ล็อกอินอยู่จาก Supabase
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบัน
      const { data: authData } = await supabase.auth.getUser()
      const myId = authData?.user?.id ?? null
      if (!myId) return

      // 2. ค้นหา temple_id ของวัดที่ผูกกับ user นี้
      const { data: templeData, error: templeError } = await supabase
        .from("temple_registrations")
        .select("id")
        .eq("user_id", myId)
        .maybeSingle()

      if (templeError || !templeData) return

      const currentTempleId = templeData.id

      // 3. ดึงข้อมูลโปรเจคเฉพาะของ temple_id นี้เท่านั้น
      const { data, error } = await supabase
        .from("admin_projects")
        .select("*")
        .eq("temple_id", currentTempleId)
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) {
        setProjects(data)
      }
    } catch (err) {
      console.error("Error fetching projects for transparency:", err)
    }
  }

  // ฟังก์ชันบันทึกข้อมูลการอัปเดตลง Supabase จริง
  const handlePublishReport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProjectId || !reportDetail.trim()) {
      alert("กรุณาเลือกโครงการและกรอกรายละเอียดความคืบหน้า")
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from("admin_projects")
        .update({ 
          description: reportDetail 
        })
        .eq("id", selectedProjectId)

      if (error) throw error

      alert("อัปเดตรายงานความโปร่งใสสำเร็จ!")
      setSelectedProjectId("")
      setReportDetail("")
      fetchProjects()
    } catch (err: any) {
      console.error("Error updating transparency:", err)
      alert("เกิดข้อผิดพลาดในการอัปเดตข้อมูล")
    } finally {
      setLoading(false)
    }
  }

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount) + " บ."
  }

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 font-sans text-slate-800 dark:text-slate-100 animate-fade-in-up">
      
      {/* ส่วนหัว */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            รายงานความโปร่งใส
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ติดตามและอัปเดตรายงานการใช้จ่ายงบประมาณโครงการระดมทุนภายในวัด
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* คอลัมน์ซ้าย: รายการโปรเจคทั้งหมดของวัด */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-5 shadow-xl">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <FileText size={16} className="text-purple-600 dark:text-purple-400" /> โครงการระดมทุนทั้งหมดของวัดคุณ
            </h2>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 text-slate-400 text-xs shadow-xl">
              ยังไม่มีโครงการบริจาคในระบบ
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => {
                const raised = p.raised || 0
                const goal = p.goal || 1
                const pct = Math.min(Math.round((raised / goal) * 100), 100)
                const isEnded = p.status === "ended" || p.status === "closed"

                return (
                  <div key={p.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-6 shadow-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">{p.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shrink-0 ${
                          isEnded ? "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800" : "bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                        }`}>
                          {isEnded ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                          {isEnded ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{p.description || "ยังไม่มีรายละเอียดรายงานความโปร่งใส"}</p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-900 dark:text-white">{formatBaht(raised)} / {formatBaht(goal)}</span>
                        <span className="text-purple-600 dark:text-purple-400">{pct} %</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-700 dark:bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* คอลัมน์ขวา: ฟอร์มสำหรับอัปเดตความคืบหน้า */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 p-6 shadow-xl space-y-5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              อัปเดตความคืบหน้าโครงการ
            </h3>

            <form onSubmit={handlePublishReport} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">เลือกโปรเจค</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-purple-600 cursor-pointer shadow-2xs"
                >
                  <option value="">เลือกโปรเจคของคุณ...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">รายละเอียดความคืบหน้า</label>
                <textarea
                  rows={5}
                  value={reportDetail}
                  onChange={(e) => setReportDetail(e.target.value)}
                  placeholder="รายงานความคืบหน้าและสรุปการใช้จ่ายงบประมาณ..."
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-purple-600 resize-none shadow-2xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {loading ? "กำลังบันทึกข้อมูล..." : "อัปเดตรายงานจริง"}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

    </div>
  )
}