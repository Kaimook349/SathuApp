import { NextResponse } from 'next/server';

export async function POST() {
  // โค้ดสำหรับออกจากระบบ
  return NextResponse.json({ success: true });
}