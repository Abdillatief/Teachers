import { auth, db } from '../../config/firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { protectRoute, getCurrentUserSession } from '../auth/authService.js';
import {
  ROLES,
  PERMISSIONS,
  hasPermissionFromSession
} from '../rbac/rbacService.js';
import { renderSidebar } from '../../shared/components/sidebar.js';
import { renderNavbar } from '../../shared/components/navbar.js';
import { dataStore } from '../../shared/data/dataStore.js';
import { Toast } from '../../shared/utils/toast.js';

export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getTodayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

export function formatDateTimeAr(val) {
  if (!val) return '-';
  try {
    const d = val?.seconds ? new Date(val.seconds * 1000) : new Date(val);
    if (Number.isNaN(d.getTime())) return String(val);
    return d.toLocaleString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

export function badgeHtml(text, tone = 'neutral') {
  const toneClass = ['success', 'warning', 'danger', 'info', 'primary', 'neutral'].includes(tone)
    ? `badge-${tone}`
    : 'badge-neutral';
  return `<span class="badge ${toneClass}">${escapeHtml(text)}</span>`;
}

/**
 * Unified bootstrap for all /supervisor/*.html pages.
 * Applies RBAC route protection, live permission change hooks, kick-out notice,
 * dynamic sidebar, notification-free navbar, and non-financial dataStore preloading.
 */
export function initSupervisorPage({
  pageId,
  pageTitle,
  requiredPermission = null,
  onReady = null,
  onPermissionsUpdated = null
}) {
  protectRoute(ROLES.SUPERVISOR, requiredPermission);

  const cached = getCurrentUserSession();
  const initialName = cached?.name || 'المشرف';
  const initialTitle = cached?.supervisorTitle || 'مشرف تشغيلي';

  renderSidebar(pageId, ROLES.SUPERVISOR);
  renderNavbar(pageTitle, { name: initialName, roleName: initialTitle });

  try {
    const kickReason = sessionStorage.getItem('sabeel_kick_reason');
    if (kickReason) {
      sessionStorage.removeItem('sabeel_kick_reason');
      setTimeout(() => Toast.warning(kickReason), 250);
    }
  } catch {}

  let hasBootstrapped = false;

  const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
    if (!user || hasBootstrapped) return;
    hasBootstrapped = true;

    let session = getCurrentUserSession();
    let userData = null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        userData = snap.data();
      }
    } catch (e) {
      console.warn('Supervisor user profile fetch warning:', e);
    }

    const displayName = userData?.name || session?.name || user.displayName || 'المشرف';
    const roleLabel = userData?.supervisorTitle || session?.supervisorTitle || 'مشرف تشغيلي';

    renderSidebar(pageId, ROLES.SUPERVISOR);
    renderNavbar(pageTitle, {
      name: displayName,
      roleName: roleLabel,
      photoURL: userData?.photoURL || userData?.avatar || ''
    });

    await dataStore.preloadEssentials(ROLES.SUPERVISOR, getCurrentUserSession()?.permissions || {});

    const ctx = {
      uid: user.uid,
      email: user.email || userData?.email || '',
      name: displayName,
      phone: userData?.phone || '',
      department: userData?.department || '',
      supervisorTitle: roleLabel,
      permissions: getCurrentUserSession()?.permissions || {},
      hasPerm: (permKey) => hasPermissionFromSession(permKey)
    };

    if (typeof onReady === 'function') {
      onReady(ctx);
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  if (typeof onPermissionsUpdated === 'function') {
    window.addEventListener('sabeel-permissions-updated', (ev) => {
      const detail = ev.detail || {};
      onPermissionsUpdated({
        permissions: detail.permissions || getCurrentUserSession()?.permissions || {},
        hasPerm: (permKey) => {
          if (!permKey) return true;
          const p = detail.permissions || getCurrentUserSession()?.permissions || {};
          return p[permKey] === true;
        },
        userData: detail
      });
    });
  }

  return unsubscribeAuth;
}

export { PERMISSIONS, hasPermissionFromSession };
