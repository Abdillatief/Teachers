// Cloudflare Pages Function: /api/health
export interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequestGet = async (context: { env: Env; request: Request }) => {
  const hasApiKey = Boolean(context.env.GEMINI_API_KEY);
  return new Response(
    JSON.stringify({
      status: 'ok',
      platform: 'cloudflare-pages-functions',
      hasApiKey,
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    }
  );
};
