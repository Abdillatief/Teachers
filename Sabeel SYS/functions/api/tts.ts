// Cloudflare Pages Function: /api/tts
// Real Arabic speech fallback for the Egyptian text-to-speech tool.
export interface Env {
  GEMINI_API_KEY?: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export const onRequestOptions = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const onRequestPost = async (context: { env: Env; request: Request }) => {
  try {
    const body = (await context.request.json().catch(() => ({}))) as { text?: string };
    const clean = String(body.text || '').replace(/[\r\n]+/g, ' ').trim();
    if (!clean) {
      return json({ success: false, error: 'Empty text' }, 400);
    }

    const chunks: string[] = [];
    const parts = clean.split(/([.!؟،,;]+)/);
    let current = '';
    for (const part of parts) {
      if (!part) continue;
      if ((current + part).length > 130) {
        if (current.trim()) chunks.push(current.trim());
        if (part.length > 130) {
          let sub = '';
          for (const word of part.split(/\s+/)) {
            if ((sub + ' ' + word).length > 130) {
              if (sub.trim()) chunks.push(sub.trim());
              sub = word;
            } else {
              sub = sub ? `${sub} ${word}` : word;
            }
          }
          current = sub;
        } else {
          current = part;
        }
      } else {
        current += part;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const buffers: Uint8Array[] = [];
    for (const chunk of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ar&client=tw-ob`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'audio/mpeg, audio/*;q=0.9',
        },
      });
      if (!response.ok) throw new Error(`Arabic TTS service returned ${response.status}`);
      buffers.push(new Uint8Array(await response.arrayBuffer()));
    }

    const merged = concat(buffers);
    return json({
      success: true,
      base64Audio: bytesToBase64(merged),
      mimeType: 'audio/mpeg',
      provider: 'محرك النطق العربي — صوت عربي حقيقي',
    });
  } catch (error: any) {
    return json({ success: false, error: String(error?.message || error) }, 502);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS },
  });
}

function concat(chunks: Uint8Array[]) {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
