"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase/client";

const templates = ["ตักบาตร", "ทอดกฐิน", "บริจาค", "ฟังธรรม", "ประเพณี", "อื่นๆ"];

export default function NewActivityPage() {
  const router = useRouter();

  const [selectedTemplate, setSelectedTemplate] = useState("ตักบาตร");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  // เลือกไฟล์รูปจากเครื่อง
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // ฟังก์ชันอัปโหลดรูปขึ้น Supabase Storage
  const uploadImageToSupabase = async (file: File): Promise<string> => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("activity-images")
      .upload(filePath, file);

    if (uploadError) {
      throw new Error("อัปโหลดรูปภาพไม่สำเร็จ: " + uploadError.message);
    }

    // ดึง Public URL ของรูปภาพออกมา
    const { data } = supabase.storage.from("activity-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // เผยแพร่ทันที
  const handlePublish = async () => {
    if (!title || !date) {
      alert("กรุณากรอกชื่อกิจกรรมและวันที่ให้เรียบร้อย");
      return;
    }

    setLoading(true);
    try {
      // 1. ตรวจสอบผู้ใช้ที่ล็อกอินและดึง temple_id อัตโนมัติ
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        alert("กรุณาล็อกอินใหม่");
        setLoading(false);
        return;
      }

      const { data: temple } = await supabase
        .from("temple_registrations")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!temple) {
        alert("ไม่พบข้อมูลวัดของคุณ กรุณาลงทะเบียนวัดก่อน");
        setLoading(false);
        return;
      }

      let imageUrl = "https://images.unsplash.com/photo-1544816155-12df9643f363";
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile);
      }

      // 2. บันทึกข้อมูลพร้อมแนบ temple_id ของวัดตัวเอง
      const { error } = await supabase.from("admin_activities").insert([
        {
          title,
          location,
          date,
          time,
          description,
          image: imageUrl,
          status: "published",
          completeness: 100,
          temple_id: temple.id, // 👈 ผูกรหัสวัดให้อัตโนมัติ
        },
      ]);

      if (error) throw error;

      alert("เผยแพร่กิจกรรมสำเร็จ!");
      router.push("/admin/activities");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // บันทึกแบบร่าง
  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      // 1. ตรวจสอบผู้ใช้ที่ล็อกอินและดึง temple_id อัตโนมัติ
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        alert("กรุณาล็อกอินใหม่");
        setLoading(false);
        return;
      }

      const { data: temple } = await supabase
        .from("temple_registrations")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!temple) {
        alert("ไม่พบข้อมูลวัดของคุณ กรุณาลงทะเบียนวัดก่อน");
        setLoading(false);
        return;
      }

      let imageUrl = imagePreview;
      if (imageFile) {
        imageUrl = await uploadImageToSupabase(imageFile);
      }

      // 2. บันทึกแบบร่างพร้อมแนบ temple_id ของวัดตัวเอง
      const { error } = await supabase.from("admin_activities").insert([
        {
          title: title || "กิจกรรมยังไม่ตั้งชื่อ",
          location,
          date: date || null,
          time,
          description,
          image: imageUrl,
          status: "draft",
          completeness: date && imageUrl && title ? 100 : 70,
          temple_id: temple.id, // 👈 ผูกรหัสวัดให้อัตโนมัติ
        },
      ]);

      if (error) throw error;

      alert("บันทึกแบบร่างสำเร็จ!");
      router.push("/admin/activities/drafts");
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/activities")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card border border-border text-foreground hover:bg-muted transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            โพสต์กิจกรรมวัด
          </h1>
        </div>

        <button
          onClick={() => router.push("/admin/activities/drafts")}
          className="px-4 py-2 rounded-xl bg-[#241A72] text-white text-xs font-semibold shadow-sm hover:opacity-90 transition"
        >
          ดูแบบร่างทั้งหมด
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border/60 p-8 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">เลือก Template</label>
          <div className="flex flex-wrap gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl}
                type="button"
                onClick={() => setSelectedTemplate(tpl)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition ${
                  selectedTemplate === tpl
                    ? "bg-[#241A72] text-white shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {tpl}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">ชื่อกิจกรรม *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ตักบาตรเช้าวันพระ"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">สถานที่</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น ลานหน้าพระอุโบสถ"
              className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">วันที่ *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">เวลา</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3.5 py-3 text-xs text-foreground outline-none focus:border-primary cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">รายละเอียดกิจกรรม</label>
          <textarea
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="เล่าเรื่องราวกิจกรรม..."
            className="w-full rounded-xl border border-input bg-background p-4 text-xs text-foreground outline-none focus:border-primary resize-none"
          />
        </div>

        {/* ช่องอัปโหลดรูปภาพจากเครื่อง */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">อัปโหลดรูปภาพกิจกรรม</label>
          {imagePreview ? (
            <div className="relative aspect-video w-full max-w-md rounded-xl overflow-hidden border border-border bg-muted">
              <Image src={imagePreview} alt="Preview" fill className="object-cover object-center" />
              <button
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-video w-full max-w-md rounded-xl border-2 border-dashed border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition">
              <ImagePlus className="text-primary mb-2" size={32} />
              <span className="text-xs font-semibold text-foreground">คลิกเพื่ออัปโหลดรูปภาพจากเครื่อง</span>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <Eye size={16} /> ดูตัวอย่างก่อนโพสต์
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <button
            type="button"
            disabled={loading}
            onClick={handlePublish}
            className="py-3.5 rounded-xl bg-pink-400 text-white font-bold text-xs shadow-md hover:opacity-95 transition disabled:opacity-50"
          >
            {loading ? "กำลังอัปโหลดและบันทึก..." : "เผยแพร่กิจกรรม"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSaveDraft}
            className="py-3.5 rounded-xl bg-muted text-foreground font-bold text-xs hover:bg-muted/80 transition disabled:opacity-50"
          >
            {loading ? "กำลังอัปโหลดและบันทึก..." : "บันทึกแบบร่าง"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl relative">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground">ตัวอย่างโพสต์กิจกรรม</h3>
              <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-muted">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover object-center" />
                </div>
              ) : (
                <div className="flex items-center justify-center aspect-video w-full rounded-xl bg-muted text-xs text-muted-foreground">
                  ยังไม่ได้เลือกรูปภาพ
                </div>
              )}
              <h4 className="font-bold text-base text-foreground">{title || "ชื่อกิจกรรม..."}</h4>
              <p className="text-xs text-muted-foreground">📍 สถานที่: {location || "สถานที่..."}</p>
              <p className="text-xs text-muted-foreground">📅 วันที่: {date || "วันที่..."} | ⏰ เวลา: {time || "เวลา..."}</p>
              <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-xl">{description || "รายละเอียดกิจกรรม..."}</p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
              >
                ปิดหน้าตัวอย่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}