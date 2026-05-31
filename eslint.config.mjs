import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Framework / tooling / generated dirs — NOT project code, so they must
    // not be linted by the project. `.aiox-core` is the AIOX framework (L1,
    // never modified by the project), linted by the framework itself. The
    // hook scripts and istanbul coverage output legitimately use CommonJS
    // require()/.cjs and generated code. Keeping these in scope made CI
    // chronically red and masked real regressions in src/ tests/ scripts/.
    ".aiox-core/**",
    ".claude/hooks/**",
    ".gemini/hooks/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
