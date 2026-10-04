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
  overrides: [
    {
      // Chat effects are change-trigger driven (scroll to the newest
      // message, reset the draft on thread switch). Their trigger-only
      // deps are intentional; missing-dep detection stays on everywhere
      // else.
      files: ["**/routes/_auth/u/messages.tsx"],
      rules: {
        "react-hooks/exhaustive-effect-dependencies": "off",
      },
    },
    {
      // Fourthwall merchant HTML, sanitized with DOMPurify before
      // injection. no-danger stays on everywhere else so raw
      // dangerouslySetInnerHTML cannot creep back in unnoticed.
      files: ["**/routes/shop.$slug.tsx"],
      rules: {
        "react/no-danger": "off",
      },
    },
  ],
  rules: {
    "eslint/func-style": "off",
    "eslint/no-use-before-define": "off",
    // Fire-and-forget `void expr;` is the intentional idiom for event
    // handlers that call async functions.
    "eslint/no-void": "off",
    // node/callback-return assumes Express middleware, where `return next()`
    // is correct. In Hono the documented pattern is `await next()`, and
    // returning it would skip the post-next logic this server relies on.
    "node/callback-return": "off",
    "oxc/no-barrel-file": "off",
    "react-hooks/set-state-in-effect": "off",
    "react/function-component-definition": "off",
    // The React Compiler is not enabled in the vite build; its todo
    // findings (unsupported syntax markers) are informational only until
    // the compiler ships.
    "react/todo": "off",
  },
});
