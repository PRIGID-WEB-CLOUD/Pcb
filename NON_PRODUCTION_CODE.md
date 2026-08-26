# Luxe Boutique — Non-Production Code Directory

This document details all modules, packages, files, endpoints, and helpers in this codebase that are designed for sandbox, mocking, helper, or development purposes and are not part of the active production-facing code.

---

## 1. Workspaces / Packages

### Mockup Sandbox (`@workspace/mockup-sandbox`)
- **Path**: `artifacts/mockup-sandbox/`
- **Port**: `8082`
- **Purpose**: An isolated UI component previewer. It loads various component mockups in a separate Vite-powered application to facilitate development and testing of individual elements before integration.
- **Key Files**:
  - `artifacts/mockup-sandbox/src/index.html`
  - `artifacts/mockup-sandbox/mockupPreviewPlugin.ts`
  - `artifacts/mockup-sandbox/src/.generated/mockup-components.ts`

### Scripts Workspace (`@workspace/scripts`)
- **Path**: `scripts/`
- **Purpose**: Developer utility tooling.
- **Key Files**:
  - `scripts/src/hello.ts` — A simple "Hello World" TypeScript execution stub.
  - `scripts/post-merge.sh` — Local git hook run after merging code.

---

## 2. API Stubs & Development Endpoints

### Google OAuth Stub
- **Path**: `artifacts/api-server/src/routes/auth.ts`
- **Endpoint**: `GET /api/auth/google`
- **Behavior**: Redirects with a placeholder error query string: `/?auth_error=google_not_configured`.
- **Purpose**: Acts as a route-level placeholder for future OAuth integration.

### Dev-Only OTP Bypass (Admin Login)
- **Path**: `artifacts/api-server/src/routes/auth.ts`
- **Endpoint**: `POST /api/auth/admin/request-otp`
- **Behavior**: When `NODE_ENV` is not `production` **and** `AUTH_DEV_BYPASS=true`, the response body exposes the generated OTP:
  ```typescript
  res.json({ ok: true, ...(isDev ? { devCode: code } : {}) });
  ```
- **Purpose**: Allows automated tests or dev flows to login bypass SMTP or SMS configurations.

### Dev-Only Forgot Password Token Leak
- **Path**: `artifacts/api-server/src/routes/auth.ts`
- **Endpoint**: `POST /api/auth/forgot-password`
- **Behavior**: When `NODE_ENV` is not `production` **and** `AUTH_DEV_BYPASS=true`, leaks the `devToken` directly to the response body:
  ```typescript
  res.json({ ...ok, ...(isDev ? { devToken: token } : {}) });
  ```
- **Purpose**: Bypasses the need for email integration to verify reset password links in dev environments.
