"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, Send, Edit2, MoreVertical, Loader2, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  time: string;
  comment: string;
  reply?: string;
  replyId?: string;
  isEditingReply?: boolean;
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"reviews" | "chats">("reviews");
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "year">("today");

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [replyInputs, setReplyInputs] = useState<{ [key: string]: string }>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchReviewsAndReplies = async () => {
      try {
        // 1. ดึงข้อมูล user ที่ล็อกอินอยู่ปัจจุบัน
        const { data: authData } = await supabase.auth.getUser();
        const myId = authData?.user?.id ?? null;
        if (!myId) {
          setIsLoading(false);
          return;
        }

        // 2. ค้นหา temple_id ของวัดที่ผูกกับ user นี้
        const { data: templeData, error: templeError } = await supabase
          .from("temple_registrations")
          .select("id")
          .eq("user_id", myId)
          .maybeSingle();

        if (templeError || !templeData) {
          setIsLoading(false);
          return;
        }

        const currentTempleId = templeData.id;

        // 3. ดึงรายการโปรเจคของวัดนี้ เพื่อกรองรีวิวที่เกี่ยวข้อง
        const { data: projectsData } = await supabase
          .from("admin_projects")
          .select("id")
          .eq("temple_id", currentTempleId);

        const projectIds = projectsData?.map((p) => p.id) || [];

        // 4. ดึงข้อมูลรีวิวเฉพาะของวัดนี้ (หรือกรองตาม project_id หรือ temple_id)
        let reviewsQuery = supabase.from("reviews").select("*").order("created_at", { ascending: false });
        
        if (projectIds.length > 0) {
          reviewsQuery = reviewsQuery.in("project_id", projectIds);
        } else {
          // ถ้ายังไม่มีโปรเจค ให้ดึงเงื่อนไข temple_id ตรงๆ (หากมีฟิลด์นี้ในตาราง reviews)
          // หรือกำหนดให้แสดงเฉพาะรีวิวของวัดตนเอง
        }

        const { data: reviewsData, error: reviewsError } = await reviewsQuery;

        if (reviewsError) throw reviewsError;

        const { data: repliesData, error: repliesError } = await supabase
          .from("admin_review_replies")
          .select("*");

        if (repliesError) {
          console.warn("Could not fetch replies table:", repliesError);
        }

        if (reviewsData) {
          const formattedReviews: ReviewItem[] = reviewsData.map((item: any) => {
            const foundReply = repliesData?.find((r: any) => r.review_id === item.id);
            
            return {
              id: item.id,
              name: item.donor_name || item.name || "ผู้ใช้งานทั่วไป",
              rating: item.rating || 5,
              time: item.created_at ? new Date(item.created_at).toLocaleDateString("th-TH", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }) : "เมื่อเร็วๆ นี้",
              comment: item.comment || "",
              reply: foundReply?.reply_text || "",
              replyId: foundReply?.id || null,
              isEditingReply: false,
            };
          });

          setReviews(formattedReviews);

          if (formattedReviews.length > 0) {
            const totalScore = formattedReviews.reduce((acc, curr) => acc + curr.rating, 0);
            setAvgRating(Number((totalScore / formattedReviews.length).toFixed(1)));
          } else {
            setAvgRating(5.0);
          }
        }
      } catch (err: any) {
        console.error("Error fetching reviews and replies:", err?.message || err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReviewsAndReplies();
  }, []);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("คุณต้องการลบคอมเมนต์นี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) {
      setOpenMenuId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from("reviews")
        .delete()
        .eq("id", reviewId);

      if (error) throw error;

      const updatedReviews = reviews.filter(r => r.id !== reviewId);
      setReviews(updatedReviews);
      setOpenMenuId(null);

      if (updatedReviews.length > 0) {
        const totalScore = updatedReviews.reduce((acc, curr) => acc + curr.rating, 0);
        setAvgRating(Number((totalScore / updatedReviews.length).toFixed(1)));
      } else {
        setAvgRating(5.0);
      }

      alert("ลบคอมเมนต์สำเร็จ");
    } catch (err: any) {
      console.error("Error deleting review:", err);
      alert("เกิดข้อผิดพลาดในการลบคอมเมนต์: " + (err?.message || "unknown error"));
    }
  };

  const handleSendReply = async (reviewId: string, existingReplyId?: string) => {
    const text = replyInputs[reviewId];
    if (!text?.trim()) return;

    setSubmittingId(reviewId);

    try {
      if (existingReplyId) {
        const { error } = await supabase
          .from("admin_review_replies")
          .update({ 
            reply_text: text.trim(), 
            updated_at: new Date().toISOString() 
          })
          .eq("id", existingReplyId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("admin_review_replies")
          .insert([
            {
              review_id: reviewId,
              reply_text: text.trim(),
            }
          ])
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setReviews(reviews.map(r => r.id === reviewId ? { ...r, replyId: data.id } : r));
        }
      }

      setReviews(reviews.map(r => r.id === reviewId ? { ...r, reply: text.trim(), isEditingReply: false } : r));
      setReplyInputs({ ...replyInputs, [reviewId]: "" });
    } catch (err: any) {
      console.error("Error saving reply:", err);
      alert("เกิดข้อผิดพลาดในการบันทึกคำตอบ");
    } finally {
      setSubmittingId(null);
    }
  };

  const handleToggleEditReply = (id: string, currentReply?: string) => {
    setReviews(reviews.map(r => {
      if (r.id === id) {
        return { ...r, isEditingReply: !r.isEditingReply };
      }
      return r;
    }));
    if (currentReply) {
      setReplyInputs({ ...replyInputs, [id]: currentReply });
    }
  };

  const totalReviewsCount = reviews.length;
  const repliedCount = reviews.filter(r => r.reply && r.reply.trim() !== "").length;

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
              ความคิดเห็นและรีวิว
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ตรวจสอบความคิดเห็นจากผู้ทำบุญและตอบกลับข้อความเพื่อสร้างความสัมพันธ์ที่ดี
            </p>
          </div>
        </div>

        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 border border-slate-200/80 dark:border-slate-700/60 shadow-2xs">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reviews"
                ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            รีวิวทั้งหมด ({totalReviewsCount})
          </button>
          <button
            onClick={() => {
              setActiveTab("chats");
              router.push("/admin/chat");
            }}
            className={`px-6 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "chats"
                ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            แชทกับทีมงาน
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">คะแนนรีวิวเฉลี่ย</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">จากความพึงพอใจของผู้ทำบุญ</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {isLoading ? "-" : avgRating}
            </span>
            <Star size={20} className="text-amber-500 fill-amber-500 inline" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ตอบกลับแล้ว</span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">จัดการตอบกลับความคิดเห็นเรียบร้อย</p>
          </div>
          <div>
            <span className="font-display text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              {isLoading ? "-" : repliedCount} <span className="text-xs font-normal text-slate-400">/ {totalReviewsCount}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white tracking-wide">
            รายการรีวิวทั้งหมด
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { key: "today", label: "วันนี้" },
            { key: "week", label: "สัปดาห์นี้" },
            { key: "month", label: "เดือนนี้" },
            { key: "year", label: "ปีนี้" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setDateFilter(tab.key as any)}
              className={`px-5 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                dateFilter === tab.key
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-purple-100 dark:border-purple-900/40 shadow-xl">
            <Loader2 className="size-8 animate-spin text-purple-600" />
            <p className="text-xs font-bold">กำลังโหลดความคิดเห็น...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center text-slate-400 border border-purple-100 dark:border-purple-900/40 shadow-xl space-y-2">
            <MessageSquare size={36} className="mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">ยังไม่มีความคิดเห็นหรือรีวิวในระบบ</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {reviews.map((rev) => (
              <div key={rev.id} className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-purple-100 dark:border-purple-900/40 space-y-4 relative">
                
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-center font-bold text-sm shadow-2xs">
                      {rev.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{rev.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            size={13}
                            className={i < rev.rating ? "text-amber-500 fill-amber-500" : "text-slate-200 dark:text-slate-700"}
                          />
                        ))}
                        <span className="text-[11px] text-slate-400 ml-1.5 font-medium">{rev.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative" ref={openMenuId === rev.id ? menuRef : null}>
                    <button
                      onClick={() => setOpenMenuId(openMenuId === rev.id ? null : rev.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === rev.id && (
                      <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 animate-fade-in-up">
                        <button
                          onClick={() => handleDeleteReview(rev.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer text-left"
                        >
                          <Trash2 size={14} /> ลบคอมเมนต์
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-normal bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/60">
                  {rev.comment}
                </p>

                {rev.reply && !rev.isEditingReply ? (
                  <div className="relative mt-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border-l-4 border-purple-700 p-4 text-xs space-y-2 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-purple-700 dark:text-purple-300">คำตอบจากผู้ดูแลวัด</span>
                      <button
                        onClick={() => handleToggleEditReply(rev.id, rev.reply)}
                        className="flex items-center gap-1 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                      >
                        <Edit2 size={12} /> แก้ไขคำตอบ
                      </button>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{rev.reply}</p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-2xs">
                      <input
                        type="text"
                        placeholder="พิมพ์ตอบกลับความคิดเห็น..."
                        value={replyInputs[rev.id] !== undefined ? replyInputs[rev.id] : (rev.isEditingReply ? rev.reply : "")}
                        onChange={(e) => setReplyInputs({ ...replyInputs, [rev.id]: e.target.value })}
                        className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400"
                      />
                      <button
                        onClick={() => handleSendReply(rev.id, rev.replyId)}
                        disabled={submittingId === rev.id}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-500 text-white transition ml-2 cursor-pointer disabled:opacity-50 shadow-sm"
                      >
                        {submittingId === rev.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}