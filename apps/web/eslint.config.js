import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**', '*.config.*'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        // public/sw.js runs in the ServiceWorker global scope, not the
        // regular browser/DOM scope the rest of this config assumes -
        // self, caches, fetch, etc. are real globals there, not undefined.
        files: ['public/sw.js'],
        languageOptions: {
            globals: {
                self: 'readonly',
                caches: 'readonly',
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                URL: 'readonly',
            },
        },
    }
);