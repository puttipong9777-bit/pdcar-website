import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import ts from "typescript";

const nativeRequire = createRequire(import.meta.url);
const root = resolve(import.meta.dirname, "../..");
// Run real TS modules with explicitly injected boundaries; never load .env.local.
export function loadTs(file, mocks = {}, globals = {}) {
  const cache = new Map();
  function load(path) {
    if (cache.has(path)) return cache.get(path).exports;
    const loadedModule = { exports: {} }; cache.set(path, loadedModule);
    const code = ts.transpileModule(readFileSync(path, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    const localRequire = (name) => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name === "server-only") return {};
      if (name.endsWith(".css")) return {};
      const local = name.startsWith(".") ? resolve(dirname(path), name) : name.startsWith("@/") ? resolve(root, name.slice(2)) : null;
      if (local) return load(existsSync(`${local}.ts`) ? `${local}.ts` : `${local}.tsx`);
      return nativeRequire(name);
    };
    const run = new Function("require", "module", "exports", ...Object.keys(globals), code);
    run(localRequire, loadedModule, loadedModule.exports, ...Object.values(globals));
    return loadedModule.exports;
  }
  return load(resolve(root, file));
}
