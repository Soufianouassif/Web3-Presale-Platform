---
title: "brace-expansion vulnerable to ReDoS via zero-step sequence"
level: medium
file_ranges: []
---
brace-expansion@2.0.2 (CVE-2026-33750): A zero-step value like `{1..2..0}` causes the sequence generation loop to run indefinitely, hanging the process and exhausting memory (~1.9 GB). Fixed by adding `pnpm.overrides` in root `package.json` forcing brace-expansion to `^2.0.3`.
