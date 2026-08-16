import type { ChecklistItem } from './types';

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // === Anemia Workup ===
  { id: 'cbc', category: 'Anemia', name: 'CBC (Darah Lengkap)', normalizedName: 'hemoglobin', description: 'Complete Blood Count termasuk Hb, Hct, RBC, WBC, Platelets' },
  { id: 'reticulocyte', category: 'Anemia', name: 'Reticulocyte Count', normalizedName: 'reticulocyte', description: 'Jumlah sel darah merah muda' },
  { id: 'peripheral_smear', category: 'Anemia', name: 'Peripheral Blood Smear', normalizedName: 'peripheral smear', description: 'Apusan darah tepi' },
  { id: 'ferritin', category: 'Anemia', name: 'Ferritin', normalizedName: 'ferritin', description: 'Cadangan zat besi dalam tubuh' },
  { id: 'serum_iron', category: 'Anemia', name: 'Serum Iron', normalizedName: 'serum iron', description: 'Kadar zat besi dalam darah' },
  { id: 'tibc', category: 'Anemia', name: 'TIBC', normalizedName: 'tibc', description: 'Total Iron Binding Capacity' },
  { id: 'tsat', category: 'Anemia', name: 'TSAT (Transferrin Saturation)', normalizedName: 'tsat', description: 'Saturasi transferrin' },
  { id: 'b12', category: 'Anemia', name: 'Vitamin B12', normalizedName: 'vitamin b12', description: 'Kadar vitamin B12' },
  { id: 'folate', category: 'Anemia', name: 'Folate / Folic Acid', normalizedName: 'folate', description: 'Kadar asam folat' },
  { id: 'creatinine', category: 'Anemia', name: 'Creatinine', normalizedName: 'creatinine', description: 'Fungsi ginjal - kreatinin' },
  { id: 'egfr', category: 'Anemia', name: 'eGFR', normalizedName: 'egfr', description: 'Estimated Glomerular Filtration Rate' },
  { id: 'ldh', category: 'Anemia', name: 'LDH', normalizedName: 'ldh', description: 'Lactate Dehydrogenase' },
  { id: 'bilirubin', category: 'Anemia', name: 'Bilirubin Total', normalizedName: 'bilirubin', description: 'Total bilirubin' },
  { id: 'haptoglobin', category: 'Anemia', name: 'Haptoglobin', normalizedName: 'haptoglobin', description: 'Marker hemolisis' },
  { id: 'tsh', category: 'Anemia', name: 'TSH', normalizedName: 'tsh', description: 'Thyroid Stimulating Hormone' },

  // === Thyroid ===
  { id: 'tsh_thyroid', category: 'Thyroid', name: 'TSH', normalizedName: 'tsh', description: 'Thyroid Stimulating Hormone' },
  { id: 'ft4', category: 'Thyroid', name: 'Free T4 (FT4)', normalizedName: 'ft4', description: 'Free Thyroxine' },
  { id: 'ft3', category: 'Thyroid', name: 'Free T3 (FT3)', normalizedName: 'ft3', description: 'Free Triiodothyronine' },

  // === Kidney Function ===
  { id: 'creatinine_kidney', category: 'Kidney', name: 'Creatinine', normalizedName: 'creatinine', description: 'Kreatinin serum' },
  { id: 'egfr_kidney', category: 'Kidney', name: 'eGFR', normalizedName: 'egfr', description: 'Estimated Glomerular Filtration Rate' },
  { id: 'urea', category: 'Kidney', name: 'Urea / BUN', normalizedName: 'urea', description: 'Blood Urea Nitrogen' },
  { id: 'sodium', category: 'Kidney', name: 'Sodium (Na)', normalizedName: 'sodium', description: 'Elektrolit natrium' },
  { id: 'potassium', category: 'Kidney', name: 'Potassium (K)', normalizedName: 'potassium', description: 'Elektrolit kalium' },

  // === Liver Function ===
  { id: 'ast', category: 'Liver', name: 'AST (SGOT)', normalizedName: 'ast', description: 'Aspartate aminotransferase' },
  { id: 'alt', category: 'Liver', name: 'ALT (SGPT)', normalizedName: 'alt', description: 'Alanine aminotransferase' },
  { id: 'albumin', category: 'Liver', name: 'Albumin', normalizedName: 'albumin', description: 'Protein albumin' },
  { id: 'bilirubin_liver', category: 'Liver', name: 'Bilirubin', normalizedName: 'bilirubin', description: 'Total dan direct bilirubin' },

  // === Coagulation ===
  { id: 'pt', category: 'Coagulation', name: 'PT / INR', normalizedName: 'pt', description: 'Prothrombin Time / INR' },
  { id: 'aptt', category: 'Coagulation', name: 'APTT', normalizedName: 'aptt', description: 'Activated Partial Thromboplastin Time' },
];

export const CHECKLIST_CATEGORIES = [...new Set(CHECKLIST_ITEMS.map((i) => i.category))];

// Normalized names that match each checklist item
export const LAB_NORMALIZATION_MAP: Record<string, string> = {
  // CBC
  'hemoglobin': 'hemoglobin',
  'hb': 'hemoglobin',
  'haemoglobin': 'hemoglobin',
  'hematocrit': 'hematocrit',
  'hct': 'hematocrit',
  'ht': 'hematocrit',
  'rbc': 'rbc',
  'red blood cell': 'rbc',
  'eritrosit': 'rbc',
  'wbc': 'wbc',
  'leukosit': 'wbc',
  'white blood cell': 'wbc',
  'platelets': 'platelets',
  'trombosit': 'platelets',
  'platelet': 'platelets',
  'mcv': 'mcv',
  'mch': 'mch',
  'mchc': 'mchc',
  'rdw': 'rdw',
  'neutrophil': 'neutrophils',
  'neutrophils': 'neutrophils',
  'neutrofil': 'neutrophils',
  'lymphocyte': 'lymphocytes',
  'lymphocytes': 'lymphocytes',
  'limfosit': 'lymphocytes',
  'monocyte': 'monocytes',
  'monocytes': 'monocytes',
  'monosit': 'monocytes',
  'eosinophil': 'eosinophils',
  'eosinophils': 'eosinophils',
  'eosinofil': 'eosinophils',
  'basophil': 'basophils',
  'basophils': 'basophils',
  'basofil': 'basophils',
  // Iron Studies
  'ferritin': 'ferritin',
  'feritin': 'ferritin',
  'serum iron': 'serum iron',
  'besi serum': 'serum iron',
  'fe': 'serum iron',
  'tibc': 'tibc',
  'tsat': 'tsat',
  'transferrin saturation': 'tsat',
  // Vitamins
  'vitamin b12': 'vitamin b12',
  'b12': 'vitamin b12',
  'cyanocobalamin': 'vitamin b12',
  'folate': 'folate',
  'folic acid': 'folate',
  'asam folat': 'folate',
  // Reticulocyte
  'reticulocyte': 'reticulocyte',
  'retikulosit': 'reticulocyte',
  'reticulocyte count': 'reticulocyte',
  // Kidney
  'creatinine': 'creatinine',
  'kreatinin': 'creatinine',
  'egfr': 'egfr',
  'gfr': 'egfr',
  'urea': 'urea',
  'bun': 'urea',
  'blood urea nitrogen': 'urea',
  'sodium': 'sodium',
  'natrium': 'sodium',
  'na': 'sodium',
  'potassium': 'potassium',
  'kalium': 'potassium',
  'k': 'potassium',
  // Liver
  'ast': 'ast',
  'sgot': 'ast',
  'alt': 'alt',
  'sgpt': 'alt',
  'albumin': 'albumin',
  'bilirubin': 'bilirubin',
  'bilirubin total': 'bilirubin',
  'total bilirubin': 'bilirubin',
  'ldh': 'ldh',
  'lactate dehydrogenase': 'ldh',
  'haptoglobin': 'haptoglobin',
  // Thyroid
  'tsh': 'tsh',
  'ft4': 'ft4',
  'free t4': 'ft4',
  'ft3': 'ft3',
  'free t3': 'ft3',
};

export function normalizeLabName(rawName: string): string {
  const lower = rawName.toLowerCase().trim();
  return LAB_NORMALIZATION_MAP[lower] || lower;
}

export const PARAM_OPTIONS = [
  { label: 'Hemoglobin (Hb)', normalized: 'hemoglobin', unit: 'g/dL', refLow: 12, refHigh: 16 },
  { label: 'Trombosit', normalized: 'platelets', unit: '10³/µL', refLow: 150, refHigh: 400 },
  { label: 'Leukosit (WBC)', normalized: 'wbc', unit: '10³/µL', refLow: 4.5, refHigh: 11 },
  { label: 'MCV', normalized: 'mcv', unit: 'fL', refLow: 80, refHigh: 100 },
  { label: 'Ferritin', normalized: 'ferritin', unit: 'ng/mL', refLow: 12, refHigh: 150 },
  { label: 'Creatinine', normalized: 'creatinine', unit: 'mg/dL', refLow: 0.5, refHigh: 1.1 },
  { label: 'eGFR', normalized: 'egfr', unit: 'mL/min/1.73m²', refLow: 90, refHigh: 120 },
  { label: 'LDH', normalized: 'ldh', unit: 'U/L', refLow: 140, refHigh: 280 },
  { label: 'TSH', normalized: 'tsh', unit: 'µIU/mL', refLow: 0.4, refHigh: 4.0 },
];
