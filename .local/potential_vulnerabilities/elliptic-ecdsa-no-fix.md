---
title: "elliptic ECDSA incorrect signatures — no fix available"
level: medium
file_ranges: []
---
elliptic@6.6.1 (CVE-2025-14505): Incorrect ECDSA signatures generated when interim value `k` has leading zeros, potentially allowing secret key exposure. This is a transitive dependency of `@solana/web3.js` with no patched version yet. The application does not perform direct ECDSA signing — signing is delegated to the user's wallet (Phantom/Solflare), so practical impact is minimal.
