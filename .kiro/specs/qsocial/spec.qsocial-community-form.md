🧩 Component Name
CreateCommunityForm.tsx

🎯 Purpose
Allow authenticated users to create new DAO-backed communities in Qsocial with privacy settings, initial metadata, governance parameters, and optional token/NFT configuration.

✅ Features to Implement

1. Community Metadata
   name: Required, 3–100 characters

description: Optional, max 2000 characters

tags: Optional list of hashtags (e.g., #crypto, #art)

imageUpload: Optional logo/avatar (max 2MB, JPG/PNG)

2. Governance Settings
   visibility: public | dao-only | private

quorum: % of members required for valid proposals (default 20%)

votingMethod: token-weighted | 1-person-1-vote | NFT-holders-only

3. Access Configuration (Optional)
   Require $QToken or NFT to join? (yes/no)

Minimum token amount or NFT ID list

4. Initial Roles Setup
   Add moderators (sQuid DID list)

Enable proposal creation for: everyone | mods-only

5. File Attachments
   Logo/avatar file (goes to Qdrive/Qpic pipeline)

Rules or constitution (PDF, optional)

🔐 Ecosystem Integrations
Module Functionality
sQuid User must be authenticated and KYC-verified (if community is dao-only or private)
Qonsent Auto-generates qonsent_out based on form settings
Qwallet If token/NFT required, check user balance and allow minting NFT
Qlock Encrypts metadata and files before sending to Qdrive/IPFS
Qindex Registers the community metadata, ownership, and creation timestamp
Qerberos Logs the creation event, checks against spam and abuse patterns

🧠 Logic Overview (Q∞ Style)
Entry:
User opens form → Completes all fields → Presses “Create Community”

Process:

Validate inputs

Authenticate with sQuid

Encrypt metadata with Qlock

Generate Qonsent profile

Upload files to Qpic/Qdrive

Register community in Qindex

Mint NFT for community (optional, via Qwallet)

Log event in Qerberos

Output:
→ Return community ID + redirect to CommunityDashboard

📐 Props Interface (TypeScript)
ts
Copiar
Editar
interface CreateCommunityFormProps {
embedded?: boolean;
onSuccess?: (communityId: string) => void;
onCancel?: () => void;
}
🧪 Validation Rules
Community name is required, unique

Visibility and voting config must be valid

If access requires token/NFT, validate ownership

Uploaded files must be < 2MB (avatar), <10MB (PDF)

🖼️ UX/UI Features
Drag-and-drop file upload

Live preview of community avatar

Dynamic form sections (e.g., token gating appears only if enabled)

Real-time validation with feedback

Progress indicator during creation

Success modal + redirect button

🔄 Next Steps
Una vez creado este spec, los siguientes serán:

CommunityExplorer.tsx → Ver y explorar comunidades DAO

CommunityDashboard.tsx → Gestión de comunidad y propuestas

CommunityPermissions.tsx (opcional) → Panel de roles, permisos y acceso DAO
