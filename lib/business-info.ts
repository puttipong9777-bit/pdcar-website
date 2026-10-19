// Business owner confirmed these facts on 17 October 2026.
export const businessMapUrl = "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6?g_st=ic";
export const businessHoursText = "เปิดทุกวัน 08:00–17:00 น. (เวลาประเทศไทย)";
export const viewingAppointmentText = "นอกเวลาทำการ สามารถนัดชมรถล่วงหน้าได้ถึง 19:00 น. (เวลาประเทศไทย) เฉพาะเมื่อนัดหมายกับร้านแล้ว";
export const businessOpeningHours = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => `https://schema.org/${day}`),
  opens: "08:00",
  closes: "17:00"
};
