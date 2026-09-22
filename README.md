# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

## Backend (VayuDrishti)

Quick start for the backend server used for report ingestion and verification.

- Install dependencies for backend:

```powershell
cd backend
npm install
cd ..
npm install
```

- Start backend from repo root (recommended):

```powershell
# starts the backend via the root entrypoint
npm run start:backend
```

- Or start directly from backend folder:

```powershell
cd backend
npm run dev
```

Environment variables
- Add a `.env` file in `backend/` for API keys and toggles.
- To allow permissive submissions when city/state geocoding fails, set:

```
RELAX_LOCATION_VALIDATION=1
```

When `RELAX_LOCATION_VALIDATION` is enabled, reports that fail location validation (invalid city/state, coordinate mismatch, or photo GPS mismatch) will still be accepted and saved, but will be marked with a location-warning so they can be reviewed manually.

Submitting reports
- Use multipart `POST` to `/api/reports` with form fields like `title`, `description`, `event_category`, `city`, `state`, `latitude`, `longitude`, `event_time` and optional `photo`/`video` files.
- Example (PowerShell):

```powershell
curl.exe -X POST http://localhost:5000/api/reports \
  -F "source_type=public" \
  -F "source_name=test" \
  -F "title=test report" \
  -F "description=test description" \
  -F "event_category=rain" \
  -F "city=TestCity" \
  -F "state=TestState" \
  -F "latitude=12.34" \
  -F "longitude=56.78" \
  -F "event_time=2026-09-14T00:00:00Z"
```

If the location is invalid, the API will return `400` with `code: "invalid_location"` unless `RELAX_LOCATION_VALIDATION` is enabled.
```
