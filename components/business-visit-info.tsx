import { Clock3, MapPin } from "lucide-react";
import { businessHoursText, businessMapUrl, viewingAppointmentText } from "@/lib/business-info";

export function BusinessVisitInfo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`business-visit-info${compact ? " compact" : ""}`}>
      <div><Clock3 size={18} /><p><strong>{businessHoursText}</strong><span>{viewingAppointmentText}</span></p></div>
      <a href={businessMapUrl} target="_blank" rel="noopener noreferrer"><MapPin size={18} />เปิดแผนที่ร้าน</a>
    </div>
  );
}
