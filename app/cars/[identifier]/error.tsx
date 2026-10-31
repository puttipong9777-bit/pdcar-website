"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function VehicleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("vehicle_detail_unavailable", error.digest || error.name);
  }, [error]);

  return <main className="detail-error" role="alert">
    <meta name="robots" content="noindex,nofollow" />
    <h1>ข้อมูลรถไม่พร้อมใช้งานชั่วคราว</h1>
    <p>ระบบยังไม่ยืนยันว่ารถคันนี้หายไป กรุณาลองโหลดข้อมูลใหม่อีกครั้ง</p>
    <div><button type="button" onClick={reset}><RefreshCw size={18} />ลองใหม่</button><Link href="/">กลับหน้าแรก</Link></div>
  </main>;
}
