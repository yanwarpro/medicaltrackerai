import type {
  Patient,
  MedDocument,
  LabResult,
  Hospitalization,
  Transfusion,
  Medication,
  PatientChecklist,
  AIAnalysis,
  AppSettings,
} from './types';
import { getSupabaseClient } from './supabase';

// ============================================================
// Storage Keys
// ============================================================
const KEYS = {
  PATIENTS: 'medtrack_patients',
  DOCUMENTS: 'medtrack_documents',
  LAB_RESULTS: 'medtrack_lab_results',
  HOSPITALIZATIONS: 'medtrack_hospitalizations',
  TRANSFUSIONS: 'medtrack_transfusions',
  MEDICATIONS: 'medtrack_medications',
  PATIENT_CHECKLIST: 'medtrack_patient_checklist',
  AI_ANALYSES: 'medtrack_ai_analyses',
  SETTINGS: 'medtrack_settings',
} as const;

// ============================================================
// Generic helpers
// ============================================================
function getAll<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateId(): string {
  // Use standard UUID v4 format if possible, or fallback
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================
// Settings
// ============================================================
const defaultSettings: AppSettings = {
  geminiApiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://pqmxnlvvqghmhltmlhcb.supabase.co',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxbXhubHZ2cWdobWhsdG1saGNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4MTk3MTIsImV4cCI6MjEwMjM5NTcxMn0.By5PSB72kVv8DTXAE9X5hbM6_nxPyv7KHKYz773yrIY',
  activePatientId: undefined,
  theme: 'dark',
};

export const settingsStorage = {
  get(): AppSettings {
    try {
      const raw = localStorage.getItem(KEYS.SETTINGS);
      const current = raw ? JSON.parse(raw) : {};
      return {
        ...defaultSettings,
        ...current,
        geminiApiKey: current.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || '',
        supabaseUrl: current.supabaseUrl || import.meta.env.VITE_SUPABASE_URL || defaultSettings.supabaseUrl,
        supabaseAnonKey: current.supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || defaultSettings.supabaseAnonKey,
      };
    } catch {
      return defaultSettings;
    }
  },
  save(settings: Partial<AppSettings>): void {
    const current = settingsStorage.get();
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify({ ...current, ...settings }));
  },
};

// ============================================================
// Patients (Profiles in Supabase)
// ============================================================
export const patientStorage = {
  getAll(): Patient[] {
    // Return local cache immediately
    const local = getAll<Patient>(KEYS.PATIENTS);
    
    // Async fetch from Supabase if connected
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('profiles').select('*').then(({ data, error }) => {
        if (!error && data && data.length > 0) {
          const mapped: Patient[] = data.map((p) => ({
            id: p.id,
            fullName: p.full_name,
            nickname: p.nickname || undefined,
            gender: p.gender || 'female',
            dateOfBirth: p.date_of_birth,
            bloodType: p.blood_type || 'unknown',
            height: p.height || undefined,
            weight: p.weight || undefined,
            allergies: p.allergies || [],
            medicalHistory: p.medical_history || [],
            surgicalHistory: p.surgical_history || [],
            generalNotes: p.general_notes || '',
            createdAt: p.created_at,
            updatedAt: p.updated_at,
          }));
          saveAll(KEYS.PATIENTS, mapped);
        }
      });
    }
    
    return local;
  },
  getById(id: string): Patient | undefined {
    return patientStorage.getAll().find((p) => p.id === id);
  },
  save(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient {
    const now = new Date().toISOString();
    const newPatient: Patient = { ...patient, id: generateId(), createdAt: now, updatedAt: now };
    const all = patientStorage.getAll();
    all.push(newPatient);
    saveAll(KEYS.PATIENTS, all);

    // Sync to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('profiles').insert({
        id: newPatient.id,
        full_name: newPatient.fullName,
        nickname: newPatient.nickname,
        gender: newPatient.gender,
        date_of_birth: newPatient.dateOfBirth,
        blood_type: newPatient.bloodType,
        height: newPatient.height,
        weight: newPatient.weight,
        allergies: newPatient.allergies,
        medical_history: newPatient.medicalHistory,
        surgical_history: newPatient.surgicalHistory,
        general_notes: newPatient.generalNotes,
      }).then();
    }

    return newPatient;
  },
  update(id: string, updates: Partial<Patient>): Patient | null {
    const all = patientStorage.getAll();
    const idx = all.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    all[idx] = { ...all[idx], ...updates, updatedAt: now };
    saveAll(KEYS.PATIENTS, all);

    // Sync to Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('profiles').update({
        full_name: u.fullName,
        nickname: u.nickname,
        gender: u.gender,
        date_of_birth: u.dateOfBirth,
        blood_type: u.bloodType,
        height: u.height,
        weight: u.weight,
        allergies: u.allergies,
        medical_history: u.medicalHistory,
        surgical_history: u.surgicalHistory,
        general_notes: u.generalNotes,
        updated_at: now,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.PATIENTS, patientStorage.getAll().filter((p) => p.id !== id));
    saveAll(KEYS.DOCUMENTS, getAll<MedDocument>(KEYS.DOCUMENTS).filter((d) => d.patientId !== id));
    saveAll(KEYS.LAB_RESULTS, getAll<LabResult>(KEYS.LAB_RESULTS).filter((r) => r.patientId !== id));
    saveAll(KEYS.HOSPITALIZATIONS, getAll<Hospitalization>(KEYS.HOSPITALIZATIONS).filter((h) => h.patientId !== id));
    saveAll(KEYS.TRANSFUSIONS, getAll<Transfusion>(KEYS.TRANSFUSIONS).filter((t) => t.patientId !== id));
    saveAll(KEYS.MEDICATIONS, getAll<Medication>(KEYS.MEDICATIONS).filter((m) => m.patientId !== id));

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('profiles').delete().eq('id', id).then();
    }
  },
};

// ============================================================
// Documents
// ============================================================
export const documentStorage = {
  getAll(patientId?: string): MedDocument[] {
    const all = getAll<MedDocument>(KEYS.DOCUMENTS);
    
    // Async sync from Supabase
    const supabase = getSupabaseClient();
    if (supabase && patientId) {
      supabase.from('documents').select('*').eq('patient_id', patientId).then(({ data, error }) => {
        if (!error && data) {
          const mapped: MedDocument[] = data.map((d) => ({
            id: d.id,
            patientId: d.patient_id,
            filename: d.file_name,
            category: d.document_type as any,
            documentDate: d.document_date,
            uploadDate: d.upload_date,
            fileDataUrl: d.file_data_url || undefined,
            fileType: d.file_type || 'application/pdf',
            status: d.processing_status as any,
            ocrText: d.ocr_text || undefined,
            extractionConfidence: d.extraction_confidence || undefined,
            notes: d.notes || undefined,
            createdAt: d.created_at,
          }));
          const localForPatient = all.filter((d) => d.patientId === patientId);
          const merged = [
            ...mapped,
            ...localForPatient.filter((localItem) => !mapped.some((s) => s.id === localItem.id))
          ];
          const existingOtherPatients = all.filter((d) => d.patientId !== patientId);
          saveAll(KEYS.DOCUMENTS, [...existingOtherPatients, ...merged]);
        }
      });
    }

    return patientId ? all.filter((d) => d.patientId === patientId) : all;
  },
  getById(id: string): MedDocument | undefined {
    return documentStorage.getAll().find((d) => d.id === id);
  },
  save(doc: Omit<MedDocument, 'id' | 'createdAt'>): MedDocument {
    const newDoc: MedDocument = { ...doc, id: generateId(), createdAt: new Date().toISOString() };
    const all = documentStorage.getAll();
    all.push(newDoc);
    saveAll(KEYS.DOCUMENTS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('documents').insert({
        id: newDoc.id,
        patient_id: newDoc.patientId,
        document_type: newDoc.category,
        file_name: newDoc.filename,
        file_data_url: newDoc.fileDataUrl,
        file_type: newDoc.fileType,
        document_date: newDoc.documentDate,
        upload_date: newDoc.uploadDate,
        processing_status: newDoc.status,
        notes: newDoc.notes,
      }).then();
    }

    return newDoc;
  },
  update(id: string, updates: Partial<MedDocument>): MedDocument | null {
    const all = getAll<MedDocument>(KEYS.DOCUMENTS);
    const idx = all.findIndex((d) => d.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    saveAll(KEYS.DOCUMENTS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('documents').update({
        processing_status: u.status,
        ocr_text: u.ocrText,
        extraction_confidence: u.extractionConfidence,
        notes: u.notes,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.DOCUMENTS, documentStorage.getAll().filter((d) => d.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('documents').delete().eq('id', id).then();
    }
  },
};

// ============================================================
// Lab Results
// ============================================================
export const labResultStorage = {
  getAll(patientId?: string): LabResult[] {
    const all = getAll<LabResult>(KEYS.LAB_RESULTS);

    const supabase = getSupabaseClient();
    if (supabase && patientId) {
      supabase.from('lab_results').select('*').eq('patient_id', patientId).then(({ data, error }) => {
        if (!error && data) {
          const mapped: LabResult[] = data.map((r) => ({
            id: r.id,
            patientId: r.patient_id,
            documentId: r.document_id || undefined,
            testDate: r.test_date,
            testName: r.test_name,
            normalizedName: r.normalized_name,
            value: r.value_numeric !== null ? Number(r.value_numeric) : null,
            valueText: r.value_text || undefined,
            unit: r.unit || '',
            referenceLow: r.reference_low !== null ? Number(r.reference_low) : undefined,
            referenceHigh: r.reference_high !== null ? Number(r.reference_high) : undefined,
            abnormalFlag: r.abnormal_flag as any,
            confidence: r.confidence !== null ? Number(r.confidence) : 1,
            verified: r.verified !== false,
            notes: r.notes || undefined,
            createdAt: r.created_at,
          }));
          const localForPatient = all.filter((r) => r.patientId === patientId);
          const merged = [
            ...mapped,
            ...localForPatient.filter((localItem) => !mapped.some((s) => s.id === localItem.id))
          ];
          const existingOtherPatients = all.filter((r) => r.patientId !== patientId);
          saveAll(KEYS.LAB_RESULTS, [...existingOtherPatients, ...merged]);
        }
      });
    }

    return patientId ? all.filter((r) => r.patientId === patientId) : all;
  },
  getByDocument(documentId: string): LabResult[] {
    return getAll<LabResult>(KEYS.LAB_RESULTS).filter((r) => r.documentId === documentId);
  },
  save(result: Omit<LabResult, 'id' | 'createdAt'>): LabResult {
    const newResult: LabResult = { ...result, id: generateId(), createdAt: new Date().toISOString() };
    const all = getAll<LabResult>(KEYS.LAB_RESULTS);
    all.push(newResult);
    saveAll(KEYS.LAB_RESULTS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('lab_results').insert({
        id: newResult.id,
        patient_id: newResult.patientId,
        document_id: newResult.documentId || null,
        test_date: newResult.testDate,
        test_name: newResult.testName,
        normalized_name: newResult.normalizedName,
        value_numeric: newResult.value,
        value_text: newResult.valueText,
        unit: newResult.unit,
        reference_low: newResult.referenceLow,
        reference_high: newResult.referenceHigh,
        abnormal_flag: newResult.abnormalFlag,
        confidence: newResult.confidence,
        verified: newResult.verified,
        notes: newResult.notes,
      }).then();
    }

    return newResult;
  },
  saveBatch(results: Omit<LabResult, 'id' | 'createdAt'>[]): LabResult[] {
    const now = new Date().toISOString();
    const newResults = results.map((r) => ({ ...r, id: generateId(), createdAt: now }));
    const all = getAll<LabResult>(KEYS.LAB_RESULTS);
    saveAll(KEYS.LAB_RESULTS, [...all, ...newResults]);

    const supabase = getSupabaseClient();
    if (supabase && newResults.length > 0) {
      supabase.from('lab_results').insert(
        newResults.map((r) => ({
          id: r.id,
          patient_id: r.patientId,
          document_id: r.documentId || null,
          test_date: r.testDate,
          test_name: r.testName,
          normalized_name: r.normalizedName,
          value_numeric: r.value,
          value_text: r.valueText,
          unit: r.unit,
          reference_low: r.referenceLow,
          reference_high: r.referenceHigh,
          abnormal_flag: r.abnormalFlag,
          confidence: r.confidence,
          verified: r.verified,
          notes: r.notes,
        }))
      ).then();
    }

    return newResults;
  },
  update(id: string, updates: Partial<LabResult>): LabResult | null {
    const all = getAll<LabResult>(KEYS.LAB_RESULTS);
    const idx = all.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    saveAll(KEYS.LAB_RESULTS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('lab_results').update({
        value_numeric: u.value,
        unit: u.unit,
        verified: u.verified,
        notes: u.notes,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.LAB_RESULTS, labResultStorage.getAll().filter((r) => r.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('lab_results').delete().eq('id', id).then();
    }
  },
  deleteByDocument(documentId: string): void {
    saveAll(KEYS.LAB_RESULTS, getAll<LabResult>(KEYS.LAB_RESULTS).filter((r) => r.documentId !== documentId));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('lab_results').delete().eq('document_id', documentId).then();
    }
  },
};

// ============================================================
// Hospitalizations
// ============================================================
export const hospitalizationStorage = {
  getAll(patientId?: string): Hospitalization[] {
    const all = getAll<Hospitalization>(KEYS.HOSPITALIZATIONS);

    const supabase = getSupabaseClient();
    if (supabase && patientId) {
      supabase.from('hospitalizations').select('*').eq('patient_id', patientId).then(({ data, error }) => {
        if (!error && data) {
          const mapped: Hospitalization[] = data.map((h) => ({
            id: h.id,
            patientId: h.patient_id,
            admissionDate: h.admission_date,
            dischargeDate: h.discharge_date || undefined,
            hospital: h.hospital,
            reason: h.reason || '',
            symptoms: h.symptoms || [],
            doctorDiagnosis: h.doctor_diagnosis || '',
            hbOnAdmission: h.hb_on_admission || undefined,
            hbOnDischarge: h.hb_on_discharge || undefined,
            medications: h.medications || [],
            procedures: h.procedures || [],
            notes: h.notes || '',
            createdAt: h.created_at,
            updatedAt: h.updated_at,
          }));
          const localForPatient = all.filter((h) => h.patientId === patientId);
          const merged = [
            ...mapped,
            ...localForPatient.filter((localItem) => !mapped.some((s) => s.id === localItem.id))
          ];
          const existingOtherPatients = all.filter((h) => h.patientId !== patientId);
          saveAll(KEYS.HOSPITALIZATIONS, [...existingOtherPatients, ...merged]);
        }
      });
    }

    return patientId ? all.filter((h) => h.patientId === patientId) : all;
  },
  getById(id: string): Hospitalization | undefined {
    return hospitalizationStorage.getAll().find((h) => h.id === id);
  },
  save(hosp: Omit<Hospitalization, 'id' | 'createdAt' | 'updatedAt'>): Hospitalization {
    const now = new Date().toISOString();
    const newHosp: Hospitalization = { ...hosp, id: generateId(), createdAt: now, updatedAt: now };
    const all = hospitalizationStorage.getAll();
    all.push(newHosp);
    saveAll(KEYS.HOSPITALIZATIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('hospitalizations').insert({
        id: newHosp.id,
        patient_id: newHosp.patientId,
        admission_date: newHosp.admissionDate,
        discharge_date: newHosp.dischargeDate,
        hospital: newHosp.hospital,
        reason: newHosp.reason,
        symptoms: newHosp.symptoms,
        doctor_diagnosis: newHosp.doctorDiagnosis,
        hb_on_admission: newHosp.hbOnAdmission,
        hb_on_discharge: newHosp.hbOnDischarge,
        medications: newHosp.medications,
        procedures: newHosp.procedures,
        notes: newHosp.notes,
      }).then();
    }

    return newHosp;
  },
  update(id: string, updates: Partial<Hospitalization>): Hospitalization | null {
    const all = getAll<Hospitalization>(KEYS.HOSPITALIZATIONS);
    const idx = all.findIndex((h) => h.id === id);
    if (idx === -1) return null;
    const now = new Date().toISOString();
    all[idx] = { ...all[idx], ...updates, updatedAt: now };
    saveAll(KEYS.HOSPITALIZATIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('hospitalizations').update({
        discharge_date: u.dischargeDate,
        hospital: u.hospital,
        reason: u.reason,
        symptoms: u.symptoms,
        doctor_diagnosis: u.doctorDiagnosis,
        hb_on_admission: u.hbOnAdmission,
        hb_on_discharge: u.hbOnDischarge,
        medications: u.medications,
        procedures: u.procedures,
        notes: u.notes,
        updated_at: now,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.HOSPITALIZATIONS, hospitalizationStorage.getAll().filter((h) => h.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('hospitalizations').delete().eq('id', id).then();
    }
  },
};

// ============================================================
// Transfusions
// ============================================================
export const transfusionStorage = {
  getAll(patientId?: string): Transfusion[] {
    const all = getAll<Transfusion>(KEYS.TRANSFUSIONS);

    const supabase = getSupabaseClient();
    if (supabase && patientId) {
      supabase.from('transfusions').select('*').eq('patient_id', patientId).then(({ data, error }) => {
        if (!error && data) {
          const mapped: Transfusion[] = data.map((t) => ({
            id: t.id,
            patientId: t.patient_id,
            hospitalizationId: t.hospitalization_id || undefined,
            transfusionDate: t.transfusion_date,
            productType: t.product_type as any,
            units: t.units || 1,
            hbBefore: t.hb_before || undefined,
            hbAfter: t.hb_after || undefined,
            indication: t.indication || '',
            hospital: t.hospital || '',
            notes: t.notes || '',
            createdAt: t.created_at,
          }));
          const localForPatient = all.filter((t) => t.patientId === patientId);
          const merged = [
            ...mapped,
            ...localForPatient.filter((localItem) => !mapped.some((s) => s.id === localItem.id))
          ];
          const existingOtherPatients = all.filter((t) => t.patientId !== patientId);
          saveAll(KEYS.TRANSFUSIONS, [...existingOtherPatients, ...merged]);
        }
      });
    }

    return patientId ? all.filter((t) => t.patientId === patientId) : all;
  },
  save(trans: Omit<Transfusion, 'id' | 'createdAt'>): Transfusion {
    const newTrans: Transfusion = { ...trans, id: generateId(), createdAt: new Date().toISOString() };
    const all = transfusionStorage.getAll();
    all.push(newTrans);
    saveAll(KEYS.TRANSFUSIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('transfusions').insert({
        id: newTrans.id,
        patient_id: newTrans.patientId,
        hospitalization_id: newTrans.hospitalizationId || null,
        transfusion_date: newTrans.transfusionDate,
        product_type: newTrans.productType,
        units: newTrans.units,
        hb_before: newTrans.hbBefore,
        hb_after: newTrans.hbAfter,
        indication: newTrans.indication,
        hospital: newTrans.hospital,
        notes: newTrans.notes,
      }).then();
    }

    return newTrans;
  },
  update(id: string, updates: Partial<Transfusion>): Transfusion | null {
    const all = getAll<Transfusion>(KEYS.TRANSFUSIONS);
    const idx = all.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    saveAll(KEYS.TRANSFUSIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('transfusions').update({
        product_type: u.productType,
        units: u.units,
        hb_before: u.hbBefore,
        hb_after: u.hbAfter,
        indication: u.indication,
        hospital: u.hospital,
        notes: u.notes,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.TRANSFUSIONS, transfusionStorage.getAll().filter((t) => t.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('transfusions').delete().eq('id', id).then();
    }
  },
};

// ============================================================
// Medications
// ============================================================
export const medicationStorage = {
  getAll(patientId?: string): Medication[] {
    const all = getAll<Medication>(KEYS.MEDICATIONS);

    const supabase = getSupabaseClient();
    if (supabase && patientId) {
      supabase.from('medications').select('*').eq('patient_id', patientId).then(({ data, error }) => {
        if (!error && data) {
          const mapped: Medication[] = data.map((m) => ({
            id: m.id,
            patientId: m.patient_id,
            medicationName: m.medication_name,
            dosage: m.dosage || '',
            frequency: m.frequency || '',
            startDate: m.start_date,
            endDate: m.end_date || undefined,
            prescribedBy: m.prescribed_by || undefined,
            notes: m.notes || '',
            isActive: m.is_active !== false,
            createdAt: m.created_at,
          }));
          const localForPatient = all.filter((m) => m.patientId === patientId);
          const merged = [
            ...mapped,
            ...localForPatient.filter((localItem) => !mapped.some((s) => s.id === localItem.id))
          ];
          const existingOtherPatients = all.filter((m) => m.patientId !== patientId);
          saveAll(KEYS.MEDICATIONS, [...existingOtherPatients, ...merged]);
        }
      });
    }

    return patientId ? all.filter((m) => m.patientId === patientId) : all;
  },
  save(med: Omit<Medication, 'id' | 'createdAt'>): Medication {
    const newMed: Medication = { ...med, id: generateId(), createdAt: new Date().toISOString() };
    const all = medicationStorage.getAll();
    all.push(newMed);
    saveAll(KEYS.MEDICATIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('medications').insert({
        id: newMed.id,
        patient_id: newMed.patientId,
        medication_name: newMed.medicationName,
        dosage: newMed.dosage,
        frequency: newMed.frequency,
        start_date: newMed.startDate,
        end_date: newMed.endDate,
        prescribed_by: newMed.prescribedBy,
        notes: newMed.notes,
        is_active: newMed.isActive,
      }).then();
    }

    return newMed;
  },
  update(id: string, updates: Partial<Medication>): Medication | null {
    const all = getAll<Medication>(KEYS.MEDICATIONS);
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    saveAll(KEYS.MEDICATIONS, all);

    const supabase = getSupabaseClient();
    if (supabase) {
      const u = all[idx];
      supabase.from('medications').update({
        medication_name: u.medicationName,
        dosage: u.dosage,
        frequency: u.frequency,
        end_date: u.endDate,
        is_active: u.isActive,
        notes: u.notes,
      }).eq('id', id).then();
    }

    return all[idx];
  },
  delete(id: string): void {
    saveAll(KEYS.MEDICATIONS, medicationStorage.getAll().filter((m) => m.id !== id));
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('medications').delete().eq('id', id).then();
    }
  },
};

// ============================================================
// Patient Checklist
// ============================================================
export const checklistStorage = {
  getAll(patientId?: string): PatientChecklist[] {
    const all = getAll<PatientChecklist>(KEYS.PATIENT_CHECKLIST);
    return patientId ? all.filter((c) => c.patientId === patientId) : all;
  },
  upsert(item: Omit<PatientChecklist, 'id'>): PatientChecklist {
    const all = getAll<PatientChecklist>(KEYS.PATIENT_CHECKLIST);
    const idx = all.findIndex(
      (c) => c.patientId === item.patientId && c.checklistItemId === item.checklistItemId
    );
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...item };
      saveAll(KEYS.PATIENT_CHECKLIST, all);
      return all[idx];
    }
    const newItem: PatientChecklist = { ...item, id: generateId() };
    all.push(newItem);
    saveAll(KEYS.PATIENT_CHECKLIST, all);
    return newItem;
  },
};

// ============================================================
// AI Analyses
// ============================================================
export const aiAnalysisStorage = {
  getAll(patientId?: string): AIAnalysis[] {
    const all = getAll<AIAnalysis>(KEYS.AI_ANALYSES);
    return patientId ? all.filter((a) => a.patientId === patientId) : all;
  },
  save(analysis: Omit<AIAnalysis, 'id' | 'createdAt'>): AIAnalysis {
    const newAnalysis: AIAnalysis = { ...analysis, id: generateId(), createdAt: new Date().toISOString() };
    const all = aiAnalysisStorage.getAll();
    all.push(newAnalysis);
    saveAll(KEYS.AI_ANALYSES, all);
    return newAnalysis;
  },
};
