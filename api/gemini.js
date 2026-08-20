// Vercel Serverless Function: /api/gemini
// Handles proxying requests to Google Gemini AI API securely

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

async function callGeminiDirect(apiKey, contents, systemInstruction = null) {
  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: Array.isArray(contents) ? contents : [{ parts: [{ text: contents }] }],
      };

      if (systemInstruction) {
        payload.systemInstruction = {
          parts: [{ text: systemInstruction }],
        };
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText;
        if (response.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          console.warn(`Model ${model} returned 404/not supported, trying next candidate...`);
          lastError = new Error(errorMsg);
          continue;
        }
        throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
      }

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p) => p.text).join('') || '';
      return text;
    } catch (err) {
      lastError = err;
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond');
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Status check endpoint (GET /api/gemini)
  if (req.method === 'GET') {
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
    return res.status(200).json({
      status: 'ok',
      proxyActive: true,
      hasDefaultApiKey: hasServerKey,
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const customKey = req.headers['x-gemini-api-key'];
    const apiKey = customKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'API Key tidak ditemukan. Harap atur GEMINI_API_KEY di server environment atau masukkan API Key di menu Pengaturan.',
        code: 'MISSING_API_KEY',
      });
    }

    const { action, payload } = req.body || {};

    if (!action) {
      return res.status(400).json({ error: 'Missing action parameter in request body' });
    }

    let resultText = '';

    if (action === 'extractDocument') {
      const { imageBase64, mimeType, prompt } = payload;
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      
      const contents = [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType || 'image/jpeg',
              },
            },
          ],
        },
      ];
      resultText = await callGeminiDirect(apiKey, contents);
    } else if (action === 'generateSummary') {
      const { prompt, patientData } = payload;
      const fullPrompt = `${prompt}\n\nDATA PASIEN:\n${JSON.stringify(patientData, null, 2)}`;
      resultText = await callGeminiDirect(apiKey, fullPrompt);
    } else if (action === 'generateQuestions') {
      const { prompt, labResults } = payload;
      const fullPrompt = `${prompt}\n\nData lab:\n${JSON.stringify(labResults, null, 2)}`;
      resultText = await callGeminiDirect(apiKey, fullPrompt);
    } else if (action === 'chat') {
      const { systemInstructions, history, userPrompt, patientData } = payload;
      const sysInst = `${systemInstructions}\n\nDATA REKAM MEDIS PASIEN SAAT INI:\n${JSON.stringify(patientData, null, 2)}`;

      const contents = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          contents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.content }],
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }],
      });

      resultText = await callGeminiDirect(apiKey, contents, sysInst);
    } else {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }

    return res.status(200).json({ success: true, text: resultText });
  } catch (err) {
    console.error('Error in /api/gemini proxy:', err);
    return res.status(500).json({
      error: err.message || 'Internal Server Error in Gemini Proxy',
      details: err.toString(),
    });
  }
}
