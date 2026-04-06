---
title: "lodash vulnerable to Prototype Pollution and Code Injection"
level: high
file_ranges: []
---
lodash@4.17.23 is vulnerable to:
- CVE-2026-2950: Prototype Pollution via array path bypass in `_.unset` and `_.omit`
- CVE-2026-4800: Code Injection in `_.template` via imports key names

Fixed by adding `pnpm.overrides` in root `package.json` forcing lodash to `^4.18.0` across all transitive dependencies.
