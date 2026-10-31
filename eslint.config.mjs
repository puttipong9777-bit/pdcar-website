import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    files: ["app/admin/dashboard-client.tsx", "components/catalog-browser.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off"
    }
  },
  globalIgnores([".next/**", ".open-next/**", ".wrangler/**", ".vercel/**", "node_modules/**", "next-env.d.ts"])
]);

export default config;
