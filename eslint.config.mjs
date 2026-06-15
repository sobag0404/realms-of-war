import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const generatedIgnores = [
  "node_modules/**",
  ".next/**",
  ".next-desktop/**",
  ".desktop-static-smoke-*/**",
  "out/**",
  "build/**",
  "src-tauri/target/**",
  "next-env.d.ts",
  "examples/**",
  "skills/**",
];

const eslintConfig = [{
  ignores: generatedIgnores,
}, ...nextCoreWebVitals, ...nextTypescript, {
  languageOptions: {
    globals: {
      React: "readonly",
      Bun: "readonly",
      OscillatorType: "readonly",
    },
  },
  rules: {
    // TypeScript rules — Stage 2: progressively tighten
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",
    
    // React rules
    "react-hooks/exhaustive-deps": "warn",
    "react-hooks/purity": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",
    
    // Next.js rules
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",
    
    // General JavaScript rules — Stage 1: critical safety rules ON
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "error",
    "no-empty": "error",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "error",
    "no-unreachable": "error",
    "no-useless-escape": "off",
  },
}];

export default eslintConfig;
