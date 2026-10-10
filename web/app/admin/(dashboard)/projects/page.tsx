"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Plus, CheckCircle2, Clock, Edit, Ban } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ProjectsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<"active" | "ended" | "all">("active")
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    try {
      // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบัน
      const { data: authData } = await supabase.auth.getUser()
      const myId = authData?.user?.id ?? null
      if (!myId) {
        setLoading(false)
        return
      }

      // 2. ค้นหา temple_id ของวัดที่ผูกกับ user นี้
      const { data: templeData, error: templeError } = await supabase
        .from("temple_registrations")
        .select("id")
        .eq("user_id", myId)
        .maybeSingle()

      if (templeError || !templeData) {
        setLoading(false)
        return
      }

      const currentTempleId = templeData.id

      // 3. ดึงข้อมูลโปรเจคเฉพาะของ temple_id นี้เท่านั้น
      const { data, error } = await supabase
        .from("admin_projects")
        .select("*")
        .eq("temple_id", currentTempleId)
        .order("created_at", { ascending: false })

      if (error) throw error
      if (data) setProjects(data)
    } catch (err) {
      console.error("Error fetching projects:", err)
    } finally {
      setLoading(false)
    }
  }

  // เปลี่ยนเป็นอัปเดตสถานะเป็น ended แทนการลบ
  const handleCloseProject = async (id: string) => {
    if (confirm("ต้องการปิดรับโครงการนี้ใช่หรือไม่?")) {
      const { error } = await supabase
        .from("admin_projects")
        .update({ status: "ended" })
        .eq("id", id)

      if (error) {
        alert("เกิดข้อผิดพลาด: " + error.message)
      } else {
        setProjects(projects.map((p) => (p.id === id ? { ...p, status: "ended" } : p)))
      }
    }
  }

  const formatBaht = (amount: number) => {
    return new Intl.NumberFormat("th-TH").format(amount)
  }

  const filteredProjects = projects.filter((p) => {
    if (activeTab === "active") return p.status === "active" || !p.status
    if (activeTab === "ended") return p.status === "ended" || p.status === "closed"
    return true
  })

  return (
    <div className="w-full max-w-7xl mx-auto py-8 px-6 space-y-8 font-sans text-slate-800 dark:text-slate-100">
      
      {/* ส่วนหัวหน้าจัดการโครงการ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-0.5">
            รับบริจาค
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">จัดการโครงการระดมทุนและตรวจสอบสถานะการบริจาค</p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/projects/drafts"
            className="px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-xs"
          >
            ดูแบบร่างทั้งหมด
          </Link>
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition"
          >
            <Plus size={16} /> สร้างโปรเจคบริจาคใหม่
          </Link>
        </div>
      </div>

      {/* แท็บตัวเลือกสถานะโครงการ */}
      <div className="flex items-center gap-6 border-b border-slate-200/80 dark:border-slate-800 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("active")}
          className={`pb-2.5 transition-colors relative cursor-pointer ${
            activeTab === "active" ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-700 dark:border-purple-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          กำลังเปิด ({projects.filter((p) => p.status === "active" || !p.status).length})
        </button>
        <button
          onClick={() => setActiveTab("ended")}
          className={`pb-2.5 transition-colors relative cursor-pointer ${
            activeTab === "ended" ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-700 dark:border-purple-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          ปิดแล้ว ({projects.filter((p) => p.status === "ended" || p.status === "closed").length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-2.5 transition-colors relative cursor-pointer ${
            activeTab === "all" ? "text-purple-700 dark:text-purple-400 border-b-2 border-purple-700 dark:border-purple-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          ทั้งหมด ({projects.length})
        </button>
      </div>

      {/* รายการการ์ดโครงการ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400 text-xs font-medium">กำลังโหลดข้อมูล...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-slate-400 text-xs font-medium shadow-xs">
            ไม่มีโครงการในสถานะนี้
          </div>
        ) : (
          filteredProjects.map((p) => {
            const raised = p.raised || 0
            const goal = p.goal || 1
            const pct = Math.min(Math.round((raised / goal) * 100), 100)
            const isEnded = p.status === "ended" || p.status === "closed"

            return (
              <div key={p.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col justify-between group transition hover:border-purple-300 dark:hover:border-purple-800">
                
                {/* รูปภาพและป้ายสถานะ */}
                <div className="relative h-48 w-full bg-slate-100 dark:bg-slate-800">
                  <Image
                    src={p.image || "https://images.unsplash.com/photo-1544816155-12df9643f363"}
                    alt={p.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-md bg-slate-950/60 backdrop-blur-md text-white text-[10px] font-semibold border border-white/10">
                      {p.category || "ทั่วไป"}
                    </span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-[11px]">
                    <span className="text-slate-200">สร้างเมื่อ {new Date(p.created_at).toLocaleDateString("th-TH")}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 shadow-2xs ${
                      isEnded ? "bg-emerald-600 text-white" : "bg-purple-700 text-white"
                    }`}>
                      {isEnded ? <CheckCircle2 size={12}/> : <Clock size={12}/>}
                      {isEnded ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
                    </span>
                  </div>
                </div>

                {/* รายละเอียดโครงการ */}
                <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white leading-snug line-clamp-1">{p.title}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{p.description || "ไม่มีรายละเอียด"}</p>
                    <p className="text-[10px] text-slate-400 pt-1 font-medium">เปิดรับถึง: {p.end_date || "ไม่มีกำหนด"}</p>
                  </div>

                  {/* แถบความคืบหน้า */}
                  <div className="space-y-1.5 pt-2">
                    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-700 dark:bg-purple-600 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{formatBaht(raised)} / {formatBaht(goal)} บ.</span>
                      <span className="text-slate-400">{pct} % • {p.donors || 0} คน</span>
                    </div>
                  </div>

                  {/* ปุ่มจัดการ */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => router.push(`/admin/projects/edit/${p.id}`)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/50 text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/60 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Edit size={12} /> แก้ไข
                    </button>

                    {!isEnded && (
                      <button
                        onClick={() => handleCloseProject(p.id)}
                        className="px-3.5 py-1.5 rounded-xl border border-rose-500/60 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 cursor-pointer"
                      >
                        <Ban size={12} /> ปิดรับ
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )
          })
        )}
      </div>

    </div>
  )
}