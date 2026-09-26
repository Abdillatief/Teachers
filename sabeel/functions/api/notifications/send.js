// Cloudflare Pages Function route: /api/notifications/send
import worker from '../../notification-worker.js';

export async function onRequestPost(context) {
  return worker.fetch(context.request, context.env, context);
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
