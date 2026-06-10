import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  ignorePatterns: [
    ...core.ignorePatterns,
    ".agents/**",
    ".playwright-mcp/**",
    "apps/caster/**",
    "apps/native/**",
    "rallycasts-*.png",
  ],
  rules: {
    "eslint/func-style": "off",
    "eslint/no-use-before-define": "off",
    "oxc/no-barrel-file": "off",
  },
});
