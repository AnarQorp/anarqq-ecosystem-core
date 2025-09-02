/**
 * Tipos para el módulo Qmarket
 */

export interface QmarketItem {
  // Identificador único del ítem (CID del contenido en IPFS)
  cid: string;
  
  // Información del publicador
  publisher: {
    cid_profile: string;  // CID del perfil del publicador
    did: string;          // DID del publicador
    name?: string;        // Nombre del publicador (opcional)
  };
  
  // Metadatos del contenido
  metadata: {
    title: string;        // Título del contenido (requerido)
    description?: string; // Descripción (opcional)
    tags?: string[];     // Etiquetas para búsqueda
    license: string;     // Tipo de licencia
    price: number;       // Precio en tokens del ecosistema (0 para gratuito)
    createdAt: string;   // Fecha de creación en ISO format
    updatedAt?: string;  // Fecha de actualización (opcional)
  };
  
  // Información técnica
  content: {
    type: string;        // Tipo MIME del contenido
    size: number;        // Tamaño en bytes
    source: 'qdrive' | 'qpic' | 'external'; // Origen del contenido
  };
}

// Opciones de licencia disponibles
export const LICENSE_OPTIONS = [
  { value: 'all-rights-reserved', label: 'Todos los derechos reservados' },
  { value: 'cc-by', label: 'Creative Commons Atribución (CC BY)' },
  { value: 'cc-by-sa', label: 'Creative Commons Atribución-CompartirIgual (CC BY-SA)' },
  { value: 'cc-by-nc', label: 'Creative Commons Atribución-NoComercial (CC BY-NC)' },
  { value: 'cc-by-nc-sa', label: 'Creative Commons Atribución-NoComercial-CompartirIgual (CC BY-NC-SA)' },
  { value: 'cc0', label: 'Creative Commons Zero (CC0) - Dominio Público' },
  { value: 'mit', label: 'Licencia MIT' },
  { value: 'gpl-3.0', label: 'GNU General Public License v3.0' },
  { value: 'apache-2.0', label: 'Apache License 2.0' },
  { value: 'proprietary', label: 'Propietaria' },
];

// Tipo para el formulario de publicación
export interface PublishFormData {
  cid: string;
  title: string;
  description: string;
  tags: string;
  price: number | '';
  license: string;
}
