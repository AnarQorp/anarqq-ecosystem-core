export interface QpicFileMetadata {
  /** IPFS hash of the file */
  cid: string;
  
  /** Original file name */
  name: string;
  
  /** File type (MIME type) */
  type: string;
  
  /** File size in bytes */
  size?: number;
  
  /** Upload timestamp */
  timestamp?: string;
  
  /** CID profile of the uploader */
  cid_profile?: string;
  
  /** Additional metadata */
  metadata?: {
    isEncrypted?: boolean;
    fileHash?: string;
    source?: string;
    [key: string]: any;
  };
}

/** Unified type for both FileMetadata and QpicUpload */
export type UnifiedFile = {
  cid: string;
  name: string;
  type: string;
  size?: number;
  timestamp?: string;
  cid_profile?: string;
  metadata?: {
    isEncrypted?: boolean;
    fileHash?: string;
    source?: string;
    cid_profile?: string;
    [key: string]: any;
  };
};

export interface QpicPreviewModalProps {
  open: boolean;
  onClose: () => void;
  file: UnifiedFile;
  onDownload: (file: UnifiedFile) => Promise<void>;
  onCopyLink: (file: UnifiedFile) => void;
}
