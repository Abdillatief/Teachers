import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
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
          admin_dashboard: path.resolve(__dirname, 'admin/dashboard.html'),
          admin_teachers: path.resolve(__dirname, 'admin/teachers.html'),
          admin_teacher_details: path.resolve(__dirname, 'admin/teacher-details.html'),
          admin_trash: path.resolve(__dirname, 'admin/trash.html'),
          admin_version_history: path.resolve(__dirname, 'admin/version-history.html'),
          admin_academy_reports: path.resolve(__dirname, 'admin/academy-reports.html'),
          admin_academy_stats: path.resolve(__dirname, 'admin/academy-stats.html'),
          admin_attendance: path.resolve(__dirname, 'admin/attendance.html'),
          admin_notifications: path.resolve(__dirname, 'admin/notifications.html'),
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
          admin_investigation: path.resolve(__dirname, 'admin/investigation.html'),
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
