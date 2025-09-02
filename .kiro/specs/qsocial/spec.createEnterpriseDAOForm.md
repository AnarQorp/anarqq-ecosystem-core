📌 Nombre del Componente
CreateEnterpriseDAOForm.tsx

🎯 Objetivo
Permitir a cualquier usuario del ecosistema con una subidentidad empresarial válida crear su propia Empresa DAO, asociada a una DAO empresarial madre (según el sector), con parámetros avanzados de gobernanza, acceso, privacidad y verificación.

📁 Archivos a crear
src/components/dao/CreateEnterpriseDAOForm.tsx

src/components/dao/CreateEnterpriseDAOForm.test.tsx

src/components/dao/CreateEnterpriseDAOForm.md

Exportar en src/components/dao/index.ts

🧩 Pestañas del Formulario
Metadata

Empresa Name (3–100 caracteres)

Description (máx. 2000 caracteres)

Sector (selector con categorías predefinidas)

Tags (máx. 10)

Logo Upload (SVG/JPG/PNG, máx. 2MB)

Website URL (opcional)

Governance

DAO Madre (dropdown dinámico por sector)

Voting Method: 1-user-1-vote | NFT-weighted | Token-weighted

Quorum (% entre 1–100)

Roles iniciales: CEO / CTO / Validator / Legal / Moderator (con asignación por wallet o DID)

Voto delegado (activable)

Access & Tokens

Requiere KYC interno para empleados: sí/no

Acceso limitado por token/NFT: sí/no

Mint de Token Empresarial (nombre, símbolo, decimal opcional)

Emisión inicial: cantidad (editable)

NFT empresarial (opcional, con metadatos)

Precio de acceso a la empresa (si aplica)

Permissions & Privacy

Visibilidad: pública / solo DAO madre / privada

Qonsent Profile automático por sector (editable)

Qlock Level: público / cifrado simétrico / cifrado asimétrico

DAO Propietaria firma (MI-B valida consistencia entre DAO madre, subidentidad y sector)

Files & Compliance

Constitución empresarial (PDF, firmado)

Documentación legal adicional (multi-upload, máx. 10MB)

Certificados (opcional, drag & drop)

Acuerdo de términos del ecosistema (checkbox obligatorio)

⚙️ Integraciones de Ecosistema
Módulo Función
sQuid Validación de subidentidad empresarial como creador autorizado
Qonsent Generación automática de perfil de privacidad empresarial
Qlock Cifrado de archivos legales y metadatos críticos
Qwallet Mint de tokens empresariales y verificación de saldo para acceso
Qindex Registro de empresa DAO y su sector, DAO madre, permisos y archivos
Qerberos Validación de integridad, prevención de fraude, firma del registro DAO

✅ Validaciones
Subidentidad válida y verificada como empresa

Asociación obligatoria a DAO madre según el sector

Nombre de empresa único

Token/NFT naming conflict check

Validación de quorum y método de votación

Todos los archivos requeridos adjuntados

Verificación de wallet con fondos si se requiere fee

Firma automática por MI-B y Qerberos tras validación final

🧪 Test Cases Requeridos
Formulario completo con campos válidos

Errores de validación por sección

Subidentidad no válida (bloqueo)

Firma DAO inválida (rechazo)

Mint de token duplicado (error)

Envío exitoso con feedback visual

Carga de archivos y preview

Desacople de tabs con validación intermedia

🔗 Hooks Soportados
useEnterpriseDAO.ts (nuevo)

useSessionContext.ts (sQuid)

useQwallet.ts, useQonsent.ts, useQlock.ts, useQindex.ts, useQerberos.ts

🎨 UI/UX
Responsive 100%

TailwindCSS

Tooltips explicativos por campo complejo

Indicación clara de errores por tab

Barra de progreso visual

Mensaje de confirmación con ID empresarial y token
