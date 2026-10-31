export const businessMapUrl = "https://maps.app.goo.gl/nzqpjnq3GD5LNs5W6";

export const businessHoursText = "เปิดทุกวัน 08:00–17:00 น. (เวลาประเทศไทย)";

export const viewingAppointmentText =
  "นอกเวลาทำการ สามารถนัดชมรถล่วงหน้าได้ถึง 19:00 น. เฉพาะเมื่อนัดหมายกับร้านแล้ว";

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const businessOpeningHours = {
  "@type": "OpeningHoursSpecification",
  dayOfWeek: days.map((day) => `https://schema.org/${day}`),
  opens: "08:00",
  closes: "17:00"
};
