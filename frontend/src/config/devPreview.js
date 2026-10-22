/**
 * Development-Only Super Admin Preview Configuration
 *
 * This configuration allows local frontend UI inspection and testing of the
 * Super Admin portal while the FastAPI backend and database are being integrated.
 *
 * SAFETY INVARIANTS:
 * 1. Strictly gated by `import.meta.env.DEV === true`. In production builds,
 *    Vite/esbuild statically replaces `import.meta.env.DEV` with `false`, and
 *    dead-code elimination purges this bypass from the production bundle.
 * 2. Can be toggled off at any time by setting `DEV_ADMIN_PREVIEW_ENABLED = false`
 *    or setting `VITE_ENABLE_DEV_ADMIN_PREVIEW=false` in frontend/.env.
 * 3. Does NOT store passwords, bypass production authorization, or alter backend APIs.
 */

export const DEV_ADMIN_PREVIEW_ENABLED = true;

export const DEV_PREVIEW_SUPER_ADMIN_USER = {
  id: 'dev-preview-super-admin',
  email: 'admin-preview@learnspace.local',
  full_name: 'Super Admin (Dev Preview)',
  role: 'super_admin',
  status: 'active',
  isDevPreview: true
};

/**
 * Returns true only when running in local development mode (import.meta.env.DEV)
 * and the feature has not been explicitly disabled.
 */
export function isDevPreviewAllowed() {
  if (!import.meta.env.DEV) {
    return false;
  }
  if (!DEV_ADMIN_PREVIEW_ENABLED) {
    return false;
  }
  if (import.meta.env.VITE_ENABLE_DEV_ADMIN_PREVIEW === 'false') {
    return false;
  }
  return true;
}
