---
title: "Express session cookie missing security attributes"
level: medium
file_ranges:
  - filepath: "artifacts/api-server/src/app.ts"
    range_start: 80
    range_end: 100
---
Session cookie was missing `name` (allowing server fingerprinting), `path`, and `expires` attributes. Fixed by adding a custom name `__pwife_sid`, setting `path: "/"`, adding explicit `expires`, and enabling `trust proxy` in production so the `secure` flag works correctly behind Replit's reverse proxy.
