import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { spawn } from 'node:child_process'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const azureSpeechKey = env.AZURE_SPEECH_KEY;
  const azureSpeechRegion = env.AZURE_SPEECH_REGION;
  const azureSpeechVoice = env.AZURE_SPEECH_VOICE || 'sk-SK-ViktoriaNeural';
  const edgeTtsPython = env.EDGE_TTS_PYTHON || 'python';
  const edgeTtsVoices: Record<string, string> = {
    en: env.EDGE_TTS_EN_VOICE || 'en-US-EmmaNeural',
    es: env.EDGE_TTS_ES_VOICE || 'es-ES-ElviraNeural',
    de: env.EDGE_TTS_DE_VOICE || 'de-DE-KatjaNeural',
    fr: env.EDGE_TTS_FR_VOICE || 'fr-FR-DeniseNeural',
    it: env.EDGE_TTS_IT_VOICE || 'it-IT-ElsaNeural',
    ja: env.EDGE_TTS_JA_VOICE || 'ja-JP-NanamiNeural',
    sk: env.EDGE_TTS_VOICE || 'sk-SK-ViktoriaNeural',
    cs: env.EDGE_TTS_CS_VOICE || 'cs-CZ-VlastaNeural'
  };
  const edgeTtsRate = env.EDGE_TTS_RATE || '-12%';

  const synthesizeWithEdgeTts = (text: string, lang: string): Promise<Buffer> => new Promise((resolve, reject) => {
    const voice = edgeTtsVoices[lang];
    if (!voice) {
      reject(new Error(`No Edge-TTS voice configured for ${lang}`));
      return;
    }
    const child = spawn(edgeTtsPython, [
      '-m', 'edge_tts',
      '--text', text,
      '--voice', voice,
      `--rate=${edgeTtsRate}`
    ], { windowsHide: true });
    const chunks: Buffer[] = [];
    let errorOutput = '';

    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => { errorOutput += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        resolve(Buffer.concat(chunks));
      } else {
        reject(new Error(errorOutput.trim() || `edge-tts exited with code ${code}`));
      }
    });
  });

  return ({
  plugins: [
    react(),
    {
      name: 'tts-proxy-plugin',
      configureServer(server) {
        server.middlewares.use('/api/tts', (req, res) => {
          try {
            const urlObj = new URL(req.url || '', 'http://localhost');
            const text = urlObj.searchParams.get('text') || '';
            const lang = (urlObj.searchParams.get('lang') || 'ja').toLowerCase();

            if (!text.trim()) {
              res.statusCode = 400;
              res.end('Missing text');
              return;
            }

            if (text.length > 500) {
              res.statusCode = 413;
              res.end('Text is too long');
              return;
            }

            // Same whitelist as production (api/tts.py VOICES keys): an unknown
            // language must fail loudly instead of silently reading the text
            // with the Japanese voice.
            if (!Object.prototype.hasOwnProperty.call(edgeTtsVoices, lang)) {
              res.statusCode = 400;
              res.end('Unsupported language');
              return;
            }

            const targetLang = lang;

            const sendAudio = (audioBuffer: Buffer) => {
              res.setHeader('Content-Type', 'audio/mpeg');
              res.setHeader('X-Content-Type-Options', 'nosniff');
              // Text is user supplied, so keep it out of shared caches.
              res.setHeader('Cache-Control', 'private, max-age=3600');
              res.end(audioBuffer);
            };

            const fetchGoogleTts = async (): Promise<Buffer> => {
              const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${targetLang}&client=tw-ob`;
              let response = await fetch(googleUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
              });
              if (!response.ok) {
                const youdaoLang = targetLang === 'ja' ? 'jap' : targetLang;
                const youdaoUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=${youdaoLang}`;
                response = await fetch(youdaoUrl);
              }
              if (!response.ok) throw new Error(`Fallback TTS ${response.status}`);
              return Buffer.from(await response.arrayBuffer());
            };

            const fetchAzureTts = async (): Promise<Buffer> => {
              if (!azureSpeechKey || !azureSpeechRegion) throw new Error('Azure TTS is not configured');
              const escapeXml = (value: string) => value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
              const ssml = `<speak version="1.0" xml:lang="sk-SK"><voice name="${escapeXml(azureSpeechVoice)}">${escapeXml(text)}</voice></speak>`;
              const response = await fetch(`https://${azureSpeechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
                method: 'POST',
                headers: {
                  'Ocp-Apim-Subscription-Key': azureSpeechKey,
                  'Content-Type': 'application/ssml+xml',
                  'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3'
                },
                body: ssml
              });
              if (!response.ok) throw new Error(`Azure TTS ${response.status}`);
              return Buffer.from(await response.arrayBuffer());
            };

            synthesizeWithEdgeTts(text, targetLang)
              .catch(async (edgeError) => {
                console.warn('Edge-TTS unavailable, trying fallback:', edgeError.message);
                if (lang === 'sk' && azureSpeechKey && azureSpeechRegion) {
                  try {
                    return await fetchAzureTts();
                  } catch (azureError) {
                    console.warn('Azure TTS unavailable, using Google fallback:', azureError);
                  }
                }
                return fetchGoogleTts();
              })
              .then(sendAudio)
              .catch((error) => {
                console.error('Server TTS proxy error:', error);
                res.statusCode = 502;
                res.end('TTS providers unavailable');
              });
          } catch (e) {
            res.statusCode = 500;
            res.end('Error');
          }
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: true
  }
  });
});
