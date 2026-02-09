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

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

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

## Running the mock WebSocket server (for testing)

This project includes a small mock WebSocket server used to emit test messages the app consumes via a web-worker data processor.

Start the mock server (requires dependencies installed):

```bash
# Start the Node mock WebSocket server
npm run start-mock-ws
```

The mock server listens by default on `ws://localhost:8080` and will print connections and emitted messages to the terminal.

In a second terminal window start the Vite dev server:

```bash
npm run dev
```

Open the app (usually at http://localhost:5173). The app subscribes to the `scores` topic and will display live updates from the mock server.

### Previewing Figma wireframes locally

You can preview the Figma embed provided by the design team using the built-in preview page while the dev server is running.

1. Start the dev server:

```bash
npm run dev
```

2. Open the local preview page:

```
http://localhost:5173/figma-embed.html
```

This page contains an embedded iframe of the design. If the Figma file is private you may need to sign in to Figma or use a public share link.
```
