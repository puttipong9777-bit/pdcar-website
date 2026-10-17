import { businessHoursText, businessMapUrl, viewingAppointmentText } from "@/lib/business-info";

export function BusinessVisitInfo() {
  return <div className="business-visit-info">
    <p>{businessHoursText}</p>
    <p>{viewingAppointmentText}</p>
    <a href={businessMapUrl} target="_blank" rel="noopener noreferrer">ดูแผนที่ PD Car Center บน Google Maps (เปิดแท็บใหม่)</a>
  </div>;
}
