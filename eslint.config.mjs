import js from '@eslint/js';
import ts from 'typescript-eslint';
export default ts.config(
  { ignores: ['**/generated/**', '**/.next/**', '**/dist/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  { files: ['**/*.{js,mjs,ts,tsx}'], languageOptions: { globals: {
    process: 'readonly', console: 'readonly', fetch: 'readonly', AbortSignal: 'readonly',
    URL: 'readonly', URLSearchParams: 'readonly', Request: 'readonly', Response: 'readonly', Headers: 'readonly', structuredClone: 'readonly',
    Buffer: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly',
  } } },
);
