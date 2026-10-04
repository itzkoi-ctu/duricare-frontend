# React + TypeScript + Vite

## DuriCare local development

The checked-in `.env.development` targets the Oracle backend at `https://duricare.koictu.id.vn/api`. To use a backend on your own machine, start it first and set `VITE_API_BASE_URL` to its actual host and `SERVER_PORT`, including the `/api` suffix (for example `http://localhost:8386/api`).

Run `npm run dev`. After changing the environment file, restart Vite if it has not restarted automatically. The backend must allow the frontend origin through `CORS_ALLOWED_ORIGINS` (normally `http://localhost:5173`).

To check the connection, append `/auth/csrf` to the configured API base URL (currently `https://duricare.koictu.id.vn/api/auth/csrf`): it should return JSON containing a token. `ERR_CONNECTION_REFUSED` means the configured host/port is not accepting connections; check the backend process and port. The session screen offers retry after connectivity is restored.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
