# Security Specification: Market Tracker Firestore Rules

## 1. Data Invariants
1. A `UserProfile` at `/users/{userId}` can only be read, created, or updated by the verified user whose `request.auth.uid == userId`. User listing across `/users` is strictly denied (`allow list: if false`).
2. A `WatchlistItem` at `/users/{userId}/watchlist/{itemId}` cannot exist without an active parent `/users/{userId}` document (`exists(...)` Master Gate), and its `userId` field must match both `{userId}` and `request.auth.uid`.
3. A `PerformanceLog` at `/users/{userId}/performanceLogs/{logId}` cannot exist without an active parent `/users/{userId}` document, must enforce valid `exchange` (`NSE` | `BSE`), `signal` (`Buy` | `Sell` | `Hold`), `source` (`auto` | `import`), positive `closingPrice`, and server timestamps (`request.time`) for `createdAt` and `updatedAt`.
4. All document IDs (`userId`, `itemId`, `logId`) must pass `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars).
5. All `allow list` rules evaluate `resource.data.userId == request.auth.uid` directly without `get()`/`exists()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Read/Write**: `auth = null` attempting `get(/users/u1/watchlist/NSE_RELIANCE)` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: `auth = { uid: 'u1', token: { email_verified: false } }` attempting to create watchlist item -> `PERMISSION_DENIED`.
3. **Cross-User Watchlist Read**: `auth = { uid: 'u2', token: { email_verified: true } }` listing `/users/u1/watchlist` -> `PERMISSION_DENIED`.
4. **Cross-User Profile PII Read**: `auth = { uid: 'u2', token: { email_verified: true } }` reading `/users/u1` -> `PERMISSION_DENIED`.
5. **User Collection Enumeration**: `auth = { uid: 'u1', token: { email_verified: true } }` listing `/users` -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Watchlist**: `{ userId: 'u1', symbol: 'TCS', name: 'TCS', exchange: 'NSE', sector: 'IT', addedAt: serverTime, isAdmin: true }` -> `PERMISSION_DENIED` (`hasOnly` rejects `isAdmin`).
7. **Identity Spoofing on Watchlist**: Authenticated as `u1`, writing `{ userId: 'u2', ... }` under `/users/u1/watchlist/NSE_TCS` -> `PERMISSION_DENIED`.
8. **Invalid Exchange Enum**: Writing `exchange: 'NASDAQ'` to watchlist or performance log -> `PERMISSION_DENIED`.
9. **Client Timestamp Forgery**: Writing `createdAt: new Date('2020-01-01')` instead of `request.time` -> `PERMISSION_DENIED`.
10. **Negative or Extreme Price Poisoning**: Writing `closingPrice: -500` or `closingPrice: 999999999` to `performanceLogs` -> `PERMISSION_DENIED`.
11. **Path ID Poisoning**: Creating `/users/u1/watchlist/bad$id!@#` -> `PERMISSION_DENIED` (`isValidId` rejects special characters).
12. **Immutable Field Mutation**: Updating `PerformanceLog` and attempting to alter `createdAt`, `symbol`, `exchange`, `date`, or `userId` -> `PERMISSION_DENIED`.
