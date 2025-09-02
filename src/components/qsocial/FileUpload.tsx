/**
 * File Upload Component for Qsocial
 * 
 * Allows uploading files to Storj with IPFS CID generation and Filecoin preparation
 */

import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Upload, 
  File, 
  Image, 
  Video, 
  Music, 
  FileText,
  X,
  Check,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Link,
  Globe
} from 'lucide-react';
import { 
  uploadFile, 
  uploadMultipleFiles, 
  formatFileSize, 
  getFileTypeIcon, 
  validateFile,
  FileUploadResult,
  MultipleFileUploadResult
} from '../../api/qsocial-files';

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFiles?: number;
  maxFileSize?: number;
  allowMultiple?: boolean;
  showIPFSInfo?: boolean;
}

interface UploadedFile {
  fileId: string;
  originalName: string;
  storjUrl: string;
  storjKey: string;
  ipfsCid?: string;
  filecoinCid?: string;
  fileSize: number;
  contentType: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

interface FilePreview {
  file: File;
  id: string;
  preview?: string;
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  error?: string;
  result?: UploadedFile;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onError,
  maxFiles = 5,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  allowMultiple = true,
  showIPFSInfo = true
}) => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get file icon component
  const getFileIcon = (contentType: string) => {
    const iconType = getFileTypeIcon(contentType);
    const iconProps = { className: "h-8 w-8" };
    
    switch (iconType) {
      case 'image': return <Image {...iconProps} />;
      case 'video': return <Video {...iconProps} />;
      case 'music': return <Music {...iconProps} />;
      case 'file-text': return <FileText {...iconProps} />;
      default: return <File {...iconProps} />;
    }
  };

  // Create file preview
  const createFilePreview = (file: File): FilePreview => {
    const id = Math.random().toString(36).substring(7);
    const preview: FilePreview = {
      file,
      id,
      uploading: false,
      progress: 0,
      uploaded: false
    };

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFiles(prev => prev.map(f => 
          f.id === id ? { ...f, preview: e.target?.result as string } : f
        ));
      };
      reader.readAsDataURL(file);
    }

    return preview;
  };

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    if (!allowMultiple && fileArray.length > 1) {
      onError?.('Solo se permite un archivo');
      return;
    }
    
    if (files.length + fileArray.length > maxFiles) {
      onError?.(`Máximo ${maxFiles} archivos permitidos`);
      return;
    }

    const newFiles: FilePreview[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      const validation = validateFile(file, maxFileSize);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
      } else {
        newFiles.push(createFilePreview(file));
      }
    });

    if (errors.length > 0) {
      onError?.(errors.join('\\n'));
    }

    if (newFiles.length > 0) {
      setFiles(prev => allowMultiple ? [...prev, ...newFiles] : newFiles);
    }
  }, [files.length, maxFiles, maxFileSize, allowMultiple, onError]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFileSelect(droppedFiles);
    }
  }, [handleFileSelect]);

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Upload files
  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    
    try {
      // Update progress to show uploading state
      setFiles(prev => prev.map(f => ({ ...f, uploading: true, progress: 0 })));

      if (allowMultiple && files.length > 1) {
        // Upload multiple files
        const fileArray = files.map(f => f.file);
        
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          setFiles(prev => prev.map(f => ({ ...f, progress: i })));
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result: MultipleFileUploadResult = await uploadMultipleFiles(fileArray);
        
        if (result.success && result.files) {
          // Update files with results
          setFiles(prev => prev.map((f, index) => {
            const uploadResult = result.files![index];
            return {
              ...f,
              uploading: false,
              uploaded: uploadResult.success,
              progress: 100,
              error: uploadResult.error,
              result: uploadResult.success ? {
                fileId: uploadResult.fileId!,
                originalName: uploadResult.originalName,
                storjUrl: uploadResult.storjUrl!,
                storjKey: uploadResult.storjKey!,
                ipfsCid: uploadResult.ipfsCid,
                filecoinCid: uploadResult.filecoinCid,
                fileSize: uploadResult.fileSize!,
                contentType: uploadResult.contentType!,
                thumbnailUrl: uploadResult.thumbnailUrl,
                uploadedAt: new Date().toISOString()
              } : undefined
            };
          }));

          const successfulUploads = result.files.filter(f => f.success).map(f => ({
            fileId: f.fileId!,
            originalName: f.originalName,
            storjUrl: f.storjUrl!,
            storjKey: f.storjKey!,
            ipfsCid: f.ipfsCid,
            filecoinCid: f.filecoinCid,
            fileSize: f.fileSize!,
            contentType: f.contentType!,
            thumbnailUrl: f.thumbnailUrl,
            uploadedAt: new Date().toISOString()
          }));

          onUploadComplete?.(successfulUploads);
        } else {
          throw new Error(result.error || 'Error subiendo archivos');
        }
      } else {
        // Upload single file
        const filePreview = files[0];
        
        // Simulate progress
        for (let i = 0; i <= 100; i += 10) {
          setFiles(prev => prev.map(f => ({ ...f, progress: i })));
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const result: FileUploadResult = await uploadFile(filePreview.file);
        
        if (result.success && result.file) {
          setFiles(prev => prev.map(f => ({
            ...f,
            uploading: false,
            uploaded: true,
            progress: 100,
            result: result.file
          })));

          onUploadComplete?.([result.file]);
        } else {
          throw new Error(result.error || 'Error subiendo archivo');
        }
      }

    } catch (error) {
      console.error('Upload error:', error);
      
      setFiles(prev => prev.map(f => ({
        ...f,
        uploading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      })));

      onError?.(error instanceof Error ? error.message : 'Error subiendo archivos');
    } finally {
      setUploading(false);
    }
  };

  // Copy IPFS link
  const copyIPFSLink = (cid: string) => {
    const url = `https://ipfs.io/ipfs/${cid}`;
    navigator.clipboard.writeText(url);
    // You could show a toast notification here
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Subir Archivos
          </CardTitle>
          <CardDescription>
            Sube archivos a Storj con generación automática de IPFS CID y preparación para Filecoin
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Arrastra archivos aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {allowMultiple ? `Máximo ${maxFiles} archivos` : 'Un archivo'}, {formatFileSize(maxFileSize)} por archivo
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              Seleccionar Archivos
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple={allowMultiple}
              accept="image/*,video/*,audio/*,application/pdf,text/plain"
              onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-4">
              <h4 className="font-medium">Archivos Seleccionados</h4>
              {files.map((filePreview) => (
                <div key={filePreview.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    {/* File Icon/Preview */}
                    <div className="flex-shrink-0">
                      {filePreview.preview ? (
                        <img 
                          src={filePreview.preview} 
                          alt={filePreview.file.name}
                          className="h-16 w-16 object-cover rounded"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gray-100 rounded flex items-center justify-center">
                          {getFileIcon(filePreview.file.type)}
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium truncate">{filePreview.file.name}</h5>
                        {!filePreview.uploaded && !filePreview.uploading && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(filePreview.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-500">
                        {formatFileSize(filePreview.file.size)} • {filePreview.file.type}
                      </p>

                      {/* Progress Bar */}
                      {filePreview.uploading && (
                        <div className="mt-2">
                          <Progress value={filePreview.progress} className="h-2" />
                          <p className="text-xs text-gray-500 mt-1">
                            Subiendo... {filePreview.progress}%
                          </p>
                        </div>
                      )}

                      {/* Success State */}
                      {filePreview.uploaded && filePreview.result && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-green-600">Subido exitosamente</span>
                          </div>
                          
                          {/* IPFS Info */}
                          {showIPFSInfo && filePreview.result.ipfsCid && (
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-blue-500" />
                              <span className="text-xs text-gray-600">IPFS CID:</span>
                              <code className="text-xs bg-gray-100 px-1 rounded">
                                {filePreview.result.ipfsCid.substring(0, 20)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyIPFSLink(filePreview.result!.ipfsCid!)}
                              >
                                <Link className="h-3 w-3" />
                              </Button>
                            </div>
                          )}

                          {/* Filecoin Info */}
                          {filePreview.result.filecoinCid && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                Preparado para Filecoin
                              </Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Error State */}
                      {filePreview.error && (
                        <Alert className="mt-2">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-sm">
                            {filePreview.error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Upload Button */}
              {files.some(f => !f.uploaded && !f.uploading) && (
                <Button 
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="w-full"
                >
                  {uploading ? 'Subiendo...' : `Subir ${files.length} archivo(s)`}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FileUpload;