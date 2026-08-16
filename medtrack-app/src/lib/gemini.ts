import type {
  ExtractionResult,
  ExtractedLabItem,
  DocumentIdentity,
  AbnormalFlag,
} from './types';

const EXTRACTION_PROMPT = `You are a medical document analyzer. Analyze the provided medical document image and extract all laboratory results and document metadata.

Return ONLY a valid JSON object with this exact structure:
{
  "identity": {
    "patientName": "string or null",
    "documentDate": "YYYY-MM-DD or null",
    "facility": "string or null",
    "doctor": "string or null",
    "documentType": "Laboratory | Hospitalization | Prescription | Doctor Note | Ultrasound | CT Scan | X-Ray | MRI | Procedure | Transfusion | Other"
  },
  "labItems": [
    {
      "testName": "original name from document",
      "normalizedName": "standard English name",
      "value": number or null,
      "valueText": "string representation or null",
      "unit": "unit string",
      "referenceLow": number or null,
      "referenceHigh": number or null,
      "abnormalFlag": "H" | "L" | "HH" | "LL" | "N" | null,
      "confidence": 0.0 to 1.0
    }
  ]
}

CRITICAL RULES:
1. Do NOT invent values that are not visible in the document
2. If a value is not found, set value to null
3. Extract ALL lab parameters visible in the document
4. Include reference ranges if shown
5. Set confidence based on how clearly you can read the value (0.9+ = very clear, 0.7-0.9 = readable, <0.7 = uncertain)
6. For abnormalFlag: H=high, L=low, HH=critically high, LL=critically low, N=normal, null=no flag shown
7. Return ONLY the JSON object, no other text`;

const SUMMARY_PROMPT = `You are a medical records assistant helping a family caregiver understand their patient's medical data. 

Based on the provided medical data, generate a professional summary in Indonesian language. 

IMPORTANT RULES:
- Use language like "menunjukkan", "perlu dikonfirmasi", "dapat menjadi pertimbangan", "diskusikan dengan dokter"
- DO NOT use: "pasti", "terdiagnosis", "pasti terkena", "obat ini harus diminum"
- You are NOT a doctor - you are an information organizer
- Keep it factual and based only on provided data
- If data is insufficient, say "Data belum cukup untuk menyimpulkan"
- Highlight trends (naik/turun) in key parameters
- Suggest questions for the doctor based on observed patterns

Structure your response with these sections:
1. **Kondisi Terkini** - ringkasan data terbaru
2. **Perubahan Penting** - perubahan signifikan vs pemeriksaan sebelumnya
3. **Data Belum Tersedia** - pemeriksaan yang belum ada datanya
4. **Pertanyaan untuk Dokter** - saran pertanyaan berdasarkan data`;

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

async function generateWithFallback(genAI: any, contents: any) {
  let lastErr: any = null;
  for (const modelName of CANDIDATE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(contents);
      return result;
    } catch (err: any) {
      lastErr = err;
      const msg = err?.message || '';
      if (msg.includes('404') || msg.includes('not found') || msg.includes('is not supported')) {
        console.warn(`Model ${modelName} failed/404, trying next candidate...`);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function extractDocumentWithGemini(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  documentId: string
): Promise<ExtractionResult> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  // Strip data URL prefix if present
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

  const result = await generateWithFallback(genAI, [
    EXTRACTION_PROMPT,
    {
      inlineData: {
        data: base64Data,
        mimeType: mimeType as string,
      },
    },
  ]);

  const text = result.response.text();

  // Parse JSON from response
  let parsed: { identity: DocumentIdentity; labItems: ExtractedLabItem[] };
  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error('Failed to parse Gemini response:', text);
    throw new Error('Gagal membaca respons AI. Pastikan dokumen berupa hasil lab yang jelas.');
  }

  // Map to our type with IDs
  const labItems: ExtractedLabItem[] = (parsed.labItems || []).map((item, index) => ({
    id: `${documentId}-item-${index}`,
    testName: item.testName || '',
    normalizedName: item.normalizedName || item.testName || '',
    value: item.value ?? null,
    valueText: item.valueText ?? undefined,
    unit: item.unit || '',
    referenceLow: item.referenceLow ?? undefined,
    referenceHigh: item.referenceHigh ?? undefined,
    abnormalFlag: (item.abnormalFlag as AbnormalFlag) ?? null,
    confidence: item.confidence ?? 0.8,
    action: 'pending' as const,
  }));

  return {
    documentId,
    identity: parsed.identity || {},
    labItems,
  };
}

export async function generateMedicalSummary(
  apiKey: string,
  patientData: {
    patient: {
      fullName: string;
      dateOfBirth: string;
      gender: string;
      allergies: string[];
      medicalHistory: string[];
    };
    labResults: Array<{
      testName: string;
      value: number | null;
      unit: string;
      testDate: string;
      abnormalFlag: string | null;
    }>;
    hospitalizations: Array<{
      admissionDate: string;
      reason: string;
      doctorDiagnosis: string;
    }>;
    transfusions: Array<{
      transfusionDate: string;
      units: number;
      hbBefore?: number;
      hbAfter?: number;
    }>;
    medications: Array<{
      medicationName: string;
      dosage: string;
      isActive: boolean;
    }>;
  }
): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const dataStr = JSON.stringify(patientData, null, 2);
  const prompt = `${SUMMARY_PROMPT}\n\nDATA PASIEN:\n${dataStr}`;

  const result = await generateWithFallback(genAI, prompt);
  return result.response.text();
}

export async function generateDoctorQuestions(
  apiKey: string,
  labResults: Array<{
    testName: string;
    value: number | null;
    unit: string;
    testDate: string;
    abnormalFlag: string | null;
    referenceLow?: number;
    referenceHigh?: number;
  }>
): Promise<string> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);

  const prompt = `Berdasarkan hasil lab berikut, buatkan 5-8 pertanyaan yang dapat diajukan kepada dokter. 
Gunakan bahasa yang sopan dan tidak menakutkan. Pertanyaan harus membantu keluarga mendapatkan penjelasan yang lebih baik dari dokter.
Format: numbered list dalam bahasa Indonesia.
DO NOT diagnose. Just generate helpful questions.

Data lab:
${JSON.stringify(labResults, null, 2)}`;

  const result = await generateWithFallback(genAI, prompt);
  return result.response.text();
}
