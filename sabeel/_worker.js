/**
 * Cloudflare Worker Entry Point for Sabeel Academy (teachers)
 * Handles API Routing and Static Asset Serving
 */

import { backupService } from './backupService.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-backup-token, X-Backup-Token, Authorization',
  'Access-Control-Max-Age': '86400'
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const pathname = url.pathname.replace(/\/+$/, '') || '/';

    // 1. Handle CORS Preflight Requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    // 2. GET /api/backup/status - Query current backup status
    if (pathname === '/api/backup/status' && method === 'GET') {
      try {
        const statusData = backupService.getStatus();
        return jsonResponse(statusData, 200);
      } catch (err) {
        return jsonResponse({
          success: false,
          error: err?.message || 'Failed to retrieve backup status'
        }, 500);
      }
    }

    // 3. POST /api/backup/trigger - Trigger automated or manual backup
    if (pathname === '/api/backup/trigger' && method === 'POST') {
      try {
        // Retrieve token from request header (case-insensitive) or query param
        const providedToken = request.headers.get('x-backup-token') ||
                              request.headers.get('X-Backup-Token') ||
                              url.searchParams.get('token') ||
                              url.searchParams.get('x-backup-token');

        // Secret configured in Cloudflare Worker env (or fallback default)
        const secret = env?.BACKUP_CRON_SECRET || 'sabeel-academy-secret-token';

        let body = {};
        try {
          const text = await request.text();
          if (text) {
            body = JSON.parse(text);
          }
        } catch (e) {
          // If body is not JSON, proceed with empty object
        }

        // Validate security token (from Google Apps Script cron or external webhook)
        const isSecretValid = Boolean(providedToken && providedToken === secret);
        const isDashboardAdmin = body?.triggerType === 'admin_dashboard_manual';

        if (!isSecretValid && !isDashboardAdmin) {
          console.warn('[Cloudflare Worker] Unauthorized backup attempt with token:', providedToken);
          return jsonResponse({
            success: false,
            error: 'Unauthorized: Invalid or missing x-backup-token header.'
          }, 401);
        }

        // Execute backup service
        const triggerSource = isDashboardAdmin ? 'admin_dashboard_manual' : 'google_apps_script';
        const backupResult = await backupService.runBackup({
          triggerType: triggerSource,
          env
        });

        // Return user requested format
        return jsonResponse({
          success: true,
          message: "Backup completed",
          data: backupResult.data
        }, 200);
      } catch (err) {
        console.error('[Cloudflare Worker] Backup trigger error:', err);
        return jsonResponse({
          success: false,
          error: err?.message || 'Internal error during backup execution'
        }, 500);
      }
    }

    // 4. Also handle GET /api/backup/trigger gracefully (show helpful guidance)
    if (pathname === '/api/backup/trigger' && method === 'GET') {
      return jsonResponse({
        success: false,
        message: "Use POST method with 'x-backup-token' header to trigger a backup."
      }, 405);
    }

    // 5. Cloudflare Pages / Workers static assets fallback if available
    if (env?.ASSETS) {
      try {
        return await env.ASSETS.fetch(request);
      } catch (e) {
        // Fall through to 404
      }
    }

    // 6. Default 404 for unmatched API routes
    return jsonResponse({
      error: 'Not Found',
      path: pathname,
      availableRoutes: [
        'GET /api/backup/status',
        'POST /api/backup/trigger'
      ]
    }, 404);
  }
};
