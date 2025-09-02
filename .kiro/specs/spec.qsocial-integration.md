# Qsocial Integration Spec – AnarQ&Q Ecosystem

This document defines the required ecosystem integrations that have now been fully implemented within the Qsocial module, achieving full compliance with the Q∞ modular architecture of AnarQ&Q.

---

## ✅ Modular Architecture (Q∞ Logic)

**Flow:**  
`sQuid` → `Qonsent` → `Qlock` → `Storj Upload` → `IPFS CID` → `Qindex` → `Qerberos` → `QNET Routing`

All ecosystem services are now encapsulated within a clean entry-process-output pipeline for file uploads and post attachments in Qsocial.

---

## 🔐 Qonsent Integration – Privacy & Visibility Profiles

- Files include dynamic privacy profiles (`qonsent_out`) before upload.
- Profiles define visibility (`public`, `dao-only`, `private`), data type, and owner (sQuid).
- These profiles are stored with the file and used by other modules (Qmarket, Qdrive).

```ts
const qonsentProfile = await QonsentService.generateProfile(...);
🔒 Qlock Integration – Client-Side Encryption
Files are encrypted before upload using ecosystem-compatible encryption.

The encryption level is driven by the visibility profile from Qonsent.

AES-256 used with future-ready upgrade path for quantum integration.

ts
Copiar
Editar
const encryptedBuffer = await QlockService.encrypt(fileBuffer, qonsentProfile.encryptionLevel);
🧭 Qindex Integration – Metadata Indexing
Every file is registered in Qindex after upload.

Indexed fields: ipfsCid, squidId, visibility, timestamp, contentType, storjUrl.

ts
Copiar
Editar
await QindexService.registerFile(...);
🧿 Qerberos Integration – Monitoring & Audit
All upload events are logged via Qerberos hooks:

upload_start, upload_success, anomaly_detected

Event logs enable future AI validation and decentralized moderation.

ts
Copiar
Editar
await QerberosService.logEvent(...);
🛰️ QNET Routing – Ecosystem-Aware Access Control
Final file URLs are returned using QNETService.routeFile().

Supports future DAO-based routing, signed gateway links, or hybrid mesh relays.

ts
Copiar
Editar
const routedUrl = await QNETService.routeFile(...);
🧱 Backend Integration Structure
All services live in:

bash
Copiar
Editar
/backend/ecosystem/
  ├── QonsentService.mjs
  ├── QlockService.mjs
  ├── QindexService.mjs
  ├── QerberosService.mjs
  └── QNETService.mjs
🎨 Frontend Ecosystem Integration
useEcosystemFiles and useQsocialPosts provide seamless logic.

CreatePostForm integrates FileUpload → Hooks → Attachment logic.

PostCard + EcosystemFileDisplay render full file metadata (IPFS, Qonsent, Qlock, etc).

All components are reusable across modules (Qmarket, QpiC, etc).

🧾 Final State
Component	Status
Qonsent Integration	✅ Complete
Qlock Encryption	✅ Complete
Qindex Registration	✅ Complete
Qerberos Event Hooks	✅ Complete
QNET Routing	✅ Complete
IPFS CID Generation	✅ Complete
Filecoin Metadata Prep	✅ Ready
TypeScript Types	✅ Updated
Hook Architecture	✅ Modular

🎯 Ecosystem Compliance: 100%

This spec confirms that the Qsocial module is now fully ecosystem-aware and ready for production.

For future contributors: Any new module handling files must follow this exact Q∞ structure.
```
