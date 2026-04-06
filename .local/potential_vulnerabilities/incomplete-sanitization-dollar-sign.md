---
title: "Incomplete sanitization using string argument in .replace()"
level: medium
file_ranges:
  - filepath: "artifacts/pepewife/src/pages/home.tsx"
    range_start: 156
    range_end: 192
  - filepath: "artifacts/pepewife/src/pages/dashboard.tsx"
    range_start: 173
    range_end: 205
---
`.replace("$", "")` only removes the first occurrence of `$` when a string argument is used. Changed to `.replace(/\$/g, "")` with a global regex flag to remove all occurrences, preventing potential bypass in input sanitization.
