/**
 * Community Dashboard Widget (Safe Fallback Component)
 */
export function initCommunityDashboardWidget(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  // Graceful placeholder or hidden container if community module is deactivated
  container.style.display = 'none';
}

export default {
  initCommunityDashboardWidget
};
