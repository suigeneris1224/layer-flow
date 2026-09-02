// Stub for the `import "server-only"` guard used throughout lib/.
//
// Next.js resolves the real `server-only` package to an internal no-op
// automatically, even though it is never listed in package.json -- Vite/
// Vitest have no such special case, so any test that transitively imports a
// server-only-tagged module fails to resolve it. Aliased in vitest.config.ts.
export {};
