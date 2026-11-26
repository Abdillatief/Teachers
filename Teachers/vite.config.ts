import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

/**
 * Vite's dev server normally serves a bare .css request as a JavaScript module
 * (text/javascript), which Chromium refuses to apply to <link rel=stylesheet>.
 * Adding ?direct makes it serve real text/css during development only.
 * Production builds keep the normal, bundled CSS output.
 */
const cssDirectLinks = {
  name: 'sabeel-css-direct-links',
  transformIndexHtml(html: string) {
    return html.replace(/<link\b[^>]*>/gi, (tag) => {
      if (!/rel\s*=\s*["']stylesheet["']/i.test(tag)) return tag;
      if (!/\.css/i.test(tag)) return tag;
      return tag.replace(/href\s*=\s*(["'])([^"']+\.css)\1/i, (_m, quote, href) => `href=${quote}${href}?direct${quote}`);
    });
  }
};

/**
 * Local /api/tts endpoint for the Egyptian text-to-speech tool.
 * Mirrors the production Cloudflare function (functions/api/tts.ts) so the
 * downloadable Arabic audio works in `npm run dev` without an API key.
 */
const arabicTtsApi = () => ({
  name: 'sabeel-arabic-tts-api',
  configureServer(server: any) {
    server.middlewares.use('/api/tts', async (req: any, res: any) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
        return;
      }
      let raw = '';
      req.on('data', (chunk: any) => { raw += chunk; });
      req.on('end', async () => {
        try {
          const { text } = JSON.parse(raw || '{}');
          const clean = String(text || '').replace(/[\r\n]+/g, ' ').trim();
          if (!clean) throw new Error('Empty text');

          // Split into Google Translate TTS sized chunks, preferring sentence boundaries.
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

          const buffers: Buffer[] = [];
          for (const chunk of chunks) {
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=ar&client=tw-ob`;
            const response = await fetch(url, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                Accept: 'audio/mpeg, audio/*;q=0.9',
              },
            });
            if (!response.ok) throw new Error(`Arabic TTS service returned ${response.status}`);
            buffers.push(Buffer.from(await response.arrayBuffer()));
          }

          res.end(JSON.stringify({
            success: true,
            base64Audio: Buffer.concat(buffers).toString('base64'),
            mimeType: 'audio/mpeg',
            provider: 'محرك النطق العربي — صوت عربي حقيقي',
          }));
        } catch (error: any) {
          res.statusCode = 502;
          res.end(JSON.stringify({ success: false, error: String(error?.message || error) }));
        }
      });
    });
  },
});

export default defineConfig(({ command }) => {
  return {
    plugins: [react(), tailwindcss(), arabicTtsApi(), ...(command === 'serve' ? [cssDirectLinks] : [])],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          register: path.resolve(__dirname, 'register.html'),
          tool_text_to_speech: path.resolve(__dirname, 'tools/text-to-speech.html'),
          admin_dashboard: path.resolve(__dirname, 'admin/dashboard.html'),
          admin_teachers: path.resolve(__dirname, 'admin/teachers.html'),
          admin_teacher_details: path.resolve(__dirname, 'admin/teacher-details.html'),
          admin_trash: path.resolve(__dirname, 'admin/trash.html'),
          admin_version_history: path.resolve(__dirname, 'admin/version-history.html'),
          admin_academy_reports: path.resolve(__dirname, 'admin/academy-reports.html'),
          admin_academy_stats: path.resolve(__dirname, 'admin/academy-stats.html'),
          admin_attendance: path.resolve(__dirname, 'admin/attendance.html'),
          admin_payments: path.resolve(__dirname, 'admin/payments.html'),
          admin_permissions: path.resolve(__dirname, 'admin/permissions.html'),
          admin_reports: path.resolve(__dirname, 'admin/reports.html'),
          admin_salary_archive: path.resolve(__dirname, 'admin/salary-archive.html'),
          admin_sessions: path.resolve(__dirname, 'admin/sessions.html'),
          admin_settings: path.resolve(__dirname, 'admin/settings.html'),
          admin_student_archive: path.resolve(__dirname, 'admin/student-archive.html'),
          admin_students: path.resolve(__dirname, 'admin/students.html'),
          admin_subscriptions: path.resolve(__dirname, 'admin/subscriptions.html'),
          admin_today_sessions: path.resolve(__dirname, 'admin/today-sessions.html'),
          admin_transfer_students: path.resolve(__dirname, 'admin/transfer-students.html'),
          admin_groups: path.resolve(__dirname, 'admin/groups.html'),
          admin_whatsapp_groups: path.resolve(__dirname, 'admin/whatsapp-groups.html'),
          admin_investigation: path.resolve(__dirname, 'admin/investigation.html'),
          admin_blackbox: path.resolve(__dirname, 'admin/blackbox.html'),
          admin_notifications: path.resolve(__dirname, 'admin/notifications.html'),
          admin_earnings: path.resolve(__dirname, 'admin/earnings.html'),
          admin_payroll_reconciliation: path.resolve(__dirname, 'admin/payroll-reconciliation.html'),
          admin_teacher_schedules: path.resolve(__dirname, 'admin/teacher-schedules.html'),
          admin_warnings: path.resolve(__dirname, 'admin/warnings.html'),
          admin_account_requests: path.resolve(__dirname, 'admin/account-requests.html'),
          admin_community: path.resolve(__dirname, 'admin/community.html'),
          admin_feedback: path.resolve(__dirname, 'admin/feedback.html'),
          admin_supervisor_requests: path.resolve(__dirname, 'admin/supervisor-requests.html'),
          supervisor_dashboard: path.resolve(__dirname, 'supervisor/dashboard.html'),
          supervisor_students: path.resolve(__dirname, 'supervisor/students.html'),
          supervisor_lessons: path.resolve(__dirname, 'supervisor/lessons.html'),
          supervisor_absences: path.resolve(__dirname, 'supervisor/absences.html'),
          supervisor_postponed: path.resolve(__dirname, 'supervisor/postponed.html'),
          supervisor_schedules: path.resolve(__dirname, 'supervisor/schedules.html'),
          supervisor_requests: path.resolve(__dirname, 'supervisor/requests.html'),
          supervisor_reports: path.resolve(__dirname, 'supervisor/reports.html'),
          supervisor_profile: path.resolve(__dirname, 'supervisor/profile.html'),
          teacher_dashboard: path.resolve(__dirname, 'teacher/dashboard.html'),
          teacher_sessions: path.resolve(__dirname, 'teacher/sessions.html'),
          teacher_students: path.resolve(__dirname, 'teacher/students.html'),
          teacher_groups: path.resolve(__dirname, 'teacher/groups.html'),
          teacher_calendar: path.resolve(__dirname, 'teacher/calendar.html'),
          teacher_profile: path.resolve(__dirname, 'teacher/profile.html'),
          teacher_today_sessions: path.resolve(__dirname, 'teacher/today-sessions.html'),
          teacher_weekly_schedule: path.resolve(__dirname, 'teacher/weekly-schedule.html'),
          teacher_salary_archive: path.resolve(__dirname, 'teacher/salary-archive.html'),
          teacher_current_salary: path.resolve(__dirname, 'teacher/current-salary.html'),
          teacher_community: path.resolve(__dirname, 'teacher/community.html'),
          teacher_maintenance: path.resolve(__dirname, 'teacher/maintenance.html'),
        }
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
