export type PublicVehicleStatus = "available" | "reserved";

export type PublicVehiclePhoto = {
  fileId: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type PublicVehicleListing = {
  carId: string;
  slug: string;
  status: PublicVehicleStatus;
  brand: string;
  model: string;
  variant?: string;
  year: number;
  color?: string;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  conditionSummary?: string;
  salePrice?: number;
  downPayment?: number;
  financeAmount?: number;
  installment?: number;
  monthlyPayment?: number;
  title: string;
  description?: string;
  featured: boolean;
  coverImageUrl?: string;
  youtubeVideoId?: string;
  youtubeVideoUrl?: string;
  videoCaption?: string;
  photos: PublicVehiclePhoto[];
  updatedAt: string;
};

export type VehicleDataResult = {
  vehicles: PublicVehicleListing[];
  source: "supabase" | "not_configured" | "view_not_ready";
  message?: string;
};
