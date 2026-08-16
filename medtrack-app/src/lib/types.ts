// ============================================================
// MedTrack AI — TypeScript Interfaces
// ============================================================

export type Gender = 'male' | 'female' | 'other';
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown';

export interface Patient {
  id: string;
  fullName: string;
  nickname?: string;
  gender: Gender;
  dateOfBirth: string; // ISO date string
  bloodType: BloodType;
  height?: number; // cm
  weight?: number; // kg
  allergies: string[];
  medicalHistory: string[];
  surgicalHistory: string[];
  generalNotes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Documents
// ============================================================
export type DocumentCategory =
  | 'Laboratory'
  | 'Hospitalization'
  | 'Prescription'
  | 'Doctor Note'
  | 'Ultrasound'
  | 'CT Scan'
  | 'X-Ray'
  | 'MRI'
  | 'Procedure'
  | 'Transfusion'
  | 'Other';

export type DocumentStatus =
  | 'uploaded'
  | 'processing'
  | 'extracted'
  | 'needs_review'
  | 'confirmed'
  | 'failed';

export interface MedDocument {
  id: string;
  patientId: string;
  filename: string;
  category: DocumentCategory;
  documentDate: string;
  uploadDate: string;
  fileDataUrl?: string; // base64 stored in localStorage
  fileType: string; // 'image/jpeg' | 'application/pdf' etc
  status: DocumentStatus;
  ocrText?: string;
  extractionConfidence?: number;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Lab Results
// ============================================================
export type AbnormalFlag = 'H' | 'L' | 'HH' | 'LL' | 'N' | null;

export interface LabResult {
  id: string;
  patientId: string;
  documentId?: string;
  testDate: string;
  testName: string;
  normalizedName: string;
  value: number | null;
  valueText?: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  abnormalFlag: AbnormalFlag;
  confidence?: number;
  verified: boolean;
  notes?: string;
  createdAt: string;
}

// ============================================================
// Hospitalizations
// ============================================================
export interface Hospitalization {
  id: string;
  patientId: string;
  admissionDate: string;
  dischargeDate?: string;
  hospital: string;
  reason: string;
  symptoms: string[];
  doctorDiagnosis: string;
  hbOnAdmission?: number;
  hbOnDischarge?: number;
  medications: string[];
  procedures: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Transfusions
// ============================================================
export type BloodProduct = 'PRC' | 'WB' | 'FFP' | 'Platelet Concentrate' | 'Cryoprecipitate' | 'Other';

export interface Transfusion {
  id: string;
  patientId: string;
  hospitalizationId?: string;
  transfusionDate: string;
  productType: BloodProduct;
  units: number;
  hbBefore?: number;
  hbAfter?: number;
  indication: string;
  hospital: string;
  notes: string;
  createdAt: string;
}

// ============================================================
// Medications
// ============================================================
export interface Medication {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  prescribedBy?: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

// ============================================================
// Checklist
// ============================================================
export type ChecklistStatus = 'available' | 'missing' | 'outdated' | 'needs_review';

export interface ChecklistItem {
  id: string;
  category: string;
  name: string;
  normalizedName: string;
  description: string;
}

export interface PatientChecklist {
  id: string;
  patientId: string;
  checklistItemId: string;
  status: ChecklistStatus;
  sourceDocumentId?: string;
  lastFoundDate?: string;
  notes?: string;
}

// ============================================================
// AI Analysis
// ============================================================
export interface AIAnalysis {
  id: string;
  patientId: string;
  documentId?: string;
  analysisType: 'extraction' | 'summary' | 'trend';
  content: string;
  model: string;
  createdAt: string;
}

// ============================================================
// Extraction (during AI review flow)
// ============================================================
export type ExtractionAction = 'pending' | 'confirmed' | 'edited' | 'rejected';

export interface ExtractedLabItem {
  id: string;
  testName: string;
  normalizedName: string;
  value: number | null;
  valueText?: string;
  unit: string;
  referenceLow?: number;
  referenceHigh?: number;
  abnormalFlag: AbnormalFlag;
  confidence: number;
  action: ExtractionAction;
  editedValue?: number | null;
  editedUnit?: string;
}

export interface DocumentIdentity {
  patientName?: string;
  documentDate?: string;
  facility?: string;
  doctor?: string;
  documentType?: string;
}

export interface ExtractionResult {
  documentId: string;
  identity: DocumentIdentity;
  labItems: ExtractedLabItem[];
  rawText?: string;
}

// ============================================================
// App Settings
// ============================================================
export interface AppSettings {
  geminiApiKey: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  activePatientId?: string;
  theme: 'dark' | 'light';
}

// ============================================================
// Timeline Event
// ============================================================
export type TimelineEventType =
  | 'lab'
  | 'hospitalization'
  | 'consultation'
  | 'medication'
  | 'transfusion'
  | 'ultrasound'
  | 'ct_scan'
  | 'xray'
  | 'mri'
  | 'procedure'
  | 'document'
  | 'other';

export interface TimelineEvent {
  id: string;
  patientId: string;
  date: string;
  type: TimelineEventType;
  title: string;
  description: string;
  sourceId?: string; // ID from the original table
  sourceType?: string;
}
