---
title: "bigint-buffer buffer overflow in toBigIntLE() — no fix available"
level: high
file_ranges: []
---
bigint-buffer@1.1.5 (CVE-2025-3194): Buffer overflow in `toBigIntLE()` can crash the application. This is a transitive dependency of `@solana/web3.js` and has no patched version available. Risk is low in practice since `toBigIntLE()` is only called with blockchain-validated numeric data, not user-controlled input. Will resolve automatically when @solana/web3.js releases an update.
