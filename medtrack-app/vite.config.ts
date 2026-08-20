import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
];

async function callGeminiDirect(apiKey: string, contents: any, systemInstruction: any = null) {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload: any = {
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

      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText;
        if (response.status === 404 || errorMsg.includes('not found') || errorMsg.includes('not supported')) {
          lastError = new Error(errorMsg);
          continue;
        }
        throw new Error(`Gemini API error (${response.status}): ${errorMsg}`);
      }

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';
      return text;
    } catch (err: any) {
      lastError = err;
      if (err.message && (err.message.includes('404') || err.message.includes('not found'))) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error('All Gemini candidate models failed to respond');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      {
        name: 'gemini-dev-proxy',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req, res) => {
            res.setHeader('Content-Type', 'application/json');

            if (req.method === 'GET') {
              const hasServerKey = Boolean(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY);
              res.statusCode = 200;
              return res.end(JSON.stringify({
                status: 'ok',
                proxyActive: true,
                hasDefaultApiKey: hasServerKey,
              }));
            }

            if (req.method !== 'POST') {
              res.statusCode = 405;
              return res.end(JSON.stringify({ error: 'Method not allowed' }));
            }

            // Read request body
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });

            req.on('end', async () => {
              try {
                const customKey = req.headers['x-gemini-api-key'] as string;
                const apiKey = customKey || env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY;

                if (!apiKey) {
                  res.statusCode = 400;
                  return res.end(JSON.stringify({
                    error: 'API Key tidak ditemukan. Atur GEMINI_API_KEY di file .env atau masukkan di menu Pengaturan.',
                    code: 'MISSING_API_KEY',
                  }));
                }

                const parsed = JSON.parse(body || '{}');
                const { action, payload } = parsed;

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

                  const contents: any[] = [];
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
                  res.statusCode = 400;
                  return res.end(JSON.stringify({ error: `Unknown action: ${action}` }));
                }

                res.statusCode = 200;
                return res.end(JSON.stringify({ success: true, text: resultText }));
              } catch (err: any) {
                console.error('Vite Gemini dev proxy error:', err);
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
              }
            });
          });
        },
      },
    ],
  };
});

