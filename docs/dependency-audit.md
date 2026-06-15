# Dependency Audit

Date: 2026-06-15

## Current Policy

This alpha keeps `bun audit` green without adding gameplay features or auth changes. Unused direct dependencies were removed, and vulnerable transitive packages used by the toolchain are pinned with package overrides.

## Removed Direct Dependencies

- `@mdxeditor/editor`
- `@reactuses/core`
- `next-auth`
- `next-intl`
- `react-markdown`
- `react-syntax-highlighter`
- `recharts`
- `uuid`

`src/components/ui/chart.tsx` was removed with `recharts` because no app code imported it.

## Overrides

The following transitive packages are pinned in `package.json` because the direct parent packages have not yet released dependency ranges that select the patched versions automatically:

- `@babel/core`
- `brace-expansion`
- `defu`
- `effect`
- `flatted`
- `js-yaml`
- `minimatch`
- `picomatch`
- `postcss`

`ajv` was not overridden to a new major because it breaks ESLint's `@eslint/eslintrc` runtime. The current resolved `ajv@6.15.0` is not reported by `bun audit`.

## Verification

Run:

```bash
bun audit
```

Expected result: no vulnerabilities found.
