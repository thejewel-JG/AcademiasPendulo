export interface Module {
  code: string;
  name: string;
  hours: number;
}

export interface Course {
  id: string;
  code: string; // e.g. TMVG0209
  title: string;
  categoryId: string;
  categoryName: string;
  level: string;
  totalHours: number;
  practiceHours: number;
  modality: string;
  schedule: string;
  nextCall: string;
  placesLeft: number;
  isSubsidized: boolean;
  shortDescription: string;
  fullDescription: string;
  requirements: string[];
  jobOutlets: string[];
  modules: Module[];
  equipmentHighlights: string[];
  imageUrl: string;
  targetAudience: string;
}

export interface SpecialtyCategory {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  iconName: string;
  badge: string;
  description: string;
  image: string;
  coursesCount: number;
}

export interface Testimonial {
  id: string;
  name: string;
  age?: number;
  role: string;
  courseTaken: string;
  companyHired: string;
  location: string;
  text: string;
  rating: number;
  avatarUrl: string;
  year: string;
}

export interface CenterInfo {
  name: string;
  logoUrl?: string;
  officialCode: string;
  address: string;
  postalCode: string;
  city: string;
  province: string;
  phone: string;
  phoneAlt: string;
  email: string;
  hours: string;
  googleMapsUrl: string;
}
