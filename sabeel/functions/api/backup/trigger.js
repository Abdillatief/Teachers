import { backupService } from '../../../backupService.js';

export async function onRequestPost(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const providedToken = request.headers.get('x-backup-token') ||
                        request.headers.get('X-Backup-Token') ||
                        url.searchParams.get('token') ||
                        url.searchParams.get('x-backup-token');

  const secret = env?.BACKUP_CRON_SECRET || 'sabeel-academy-secret-token';

  let body = {};
  try {
    const text = await request.text();
    if (text) {
      body = JSON.parse(text);
    }
  } catch (e) {}

  const isSecretValid = Boolean(providedToken && providedToken === secret);
  const isDashboardAdmin = body?.triggerType === 'admin_dashboard_manual';

  if (!isSecretValid && !isDashboardAdmin) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized: Invalid or missing x-backup-token header.'
    }, null, 2), {
      status: 401,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const triggerSource = isDashboardAdmin ? 'admin_dashboard_manual' : 'google_apps_script';
  const result = await backupService.runBackup({ triggerType: triggerSource, env });

  return new Response(JSON.stringify({
    success: true,
    message: "Backup completed",
    data: result.data
  }, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-backup-token, X-Backup-Token, Authorization'
    }
  });
}
