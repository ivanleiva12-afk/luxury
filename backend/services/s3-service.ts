/**
 * 📤 S3 Upload Service - Sala Oscura
 * 
 * Funciones para subir y gestionar archivos en S3
 */

import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Configuración
const REGION = process.env.AWS_REGION || 'sa-east-1';
const PUBLIC_BUCKET = process.env.S3_PUBLIC_BUCKET || 'salaoscura-media-public';
const PRIVATE_BUCKET = process.env.S3_PRIVATE_BUCKET || 'salaoscura-media-private';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://media.salaoscura.cl';

const s3Client = new S3Client({ region: REGION });

// ==========================================
// 📂 TIPOS Y CONSTANTES
// ==========================================

export type MediaCategory = 
  | 'avatar' 
  | 'gallery' 
  | 'video' 
  | 'story' 
  | 'instant'
  | 'selfie' 
  | 'document' 
  | 'receipt';

export interface UploadConfig {
  maxSizeBytes: number;
  allowedTypes: string[];
  isPrivate: boolean;
  path: (userId: string, fileName: string) => string;
}

const UPLOAD_CONFIGS: Record<MediaCategory, UploadConfig> = {
  avatar: {
    maxSizeBytes: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPrivate: false,
    path: (userId, fileName) => `profiles/${userId}/avatar/${fileName}`
  },
  gallery: {
    maxSizeBytes: 10 * 1024 * 1024,  // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    isPrivate: false,
    path: (userId, fileName) => `profiles/${userId}/gallery/photo-${Date.now()}/${fileName}`
  },
  video: {
    maxSizeBytes: 100 * 1024 * 1024,  // 100MB
    allowedTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    isPrivate: false,
    path: (userId, fileName) => `profiles/${userId}/videos/video-${Date.now()}/${fileName}`
  },
  story: {
    maxSizeBytes: 15 * 1024 * 1024,  // 15MB
    allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    isPrivate: false,
    path: (userId, fileName) => `stories/${userId}/story-${Date.now()}/${fileName}`
  },
  instant: {
    maxSizeBytes: 15 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
    isPrivate: false,
    path: (userId, fileName) => `instants/${userId}/instant-${Date.now()}/${fileName}`
  },
  selfie: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png'],
    isPrivate: true,
    path: (userId, fileName) => `verification/${userId}/selfie/${fileName}`
  },
  document: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    isPrivate: true,
    path: (userId, fileName) => `verification/${userId}/document/${fileName}`
  },
  receipt: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    isPrivate: true,
    path: (userId, fileName) => `payments/${userId}/receipt-${Date.now()}/${fileName}`
  }
};

// ==========================================
// 🔗 GENERAR URLs PRESIGNED
// ==========================================

export interface PresignedUrlRequest {
  userId: string;
  category: MediaCategory;
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  fileUrl: string;
  s3Key: string;
  expiresIn: number;
}

/**
 * Genera una URL presigned para subir un archivo
 */
export async function generateUploadUrl(
  request: PresignedUrlRequest
): Promise<PresignedUrlResponse> {
  const { userId, category, fileName, contentType, fileSize } = request;
  const config = UPLOAD_CONFIGS[category];
  
  // Validaciones
  if (fileSize > config.maxSizeBytes) {
    throw new Error(`File size exceeds maximum of ${config.maxSizeBytes / 1024 / 1024}MB`);
  }
  
  if (!config.allowedTypes.includes(contentType)) {
    throw new Error(`File type ${contentType} not allowed. Allowed: ${config.allowedTypes.join(', ')}`);
  }
  
  // Sanitizar nombre de archivo
  const sanitizedFileName = sanitizeFileName(fileName);
  const s3Key = config.path(userId, sanitizedFileName);
  const bucket = config.isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    ContentType: contentType,
    ContentLength: fileSize,
    Metadata: {
      'uploaded-by': userId,
      'category': category,
      'original-name': fileName,
      'upload-time': new Date().toISOString()
    }
  });
  
  const expiresIn = 900; // 15 minutos
  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  
  // URL pública (para archivos públicos después de subir)
  const fileUrl = config.isPrivate 
    ? '' // Private files need signed URLs to view
    : `${CLOUDFRONT_URL}/${s3Key}`;
  
  return {
    uploadUrl,
    fileUrl,
    s3Key,
    expiresIn
  };
}

/**
 * Genera una URL presigned para ver un archivo privado
 */
export async function generateViewUrl(
  s3Key: string,
  expiresIn: number = 300  // 5 minutos por defecto
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: PRIVATE_BUCKET,
    Key: s3Key
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

// ==========================================
// 📤 UPLOAD DIRECTO (Server-side)
// ==========================================

/**
 * Sube un archivo directamente al bucket (desde Lambda/Server)
 */
export async function uploadFile(
  userId: string,
  category: MediaCategory,
  fileName: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<{ s3Key: string; url: string }> {
  const config = UPLOAD_CONFIGS[category];
  const sanitizedFileName = sanitizeFileName(fileName);
  const s3Key = config.path(userId, sanitizedFileName);
  const bucket = config.isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
    Metadata: {
      'uploaded-by': userId,
      'category': category,
      'upload-time': new Date().toISOString()
    }
  }));
  
  const url = config.isPrivate 
    ? await generateViewUrl(s3Key)
    : `${CLOUDFRONT_URL}/${s3Key}`;
  
  return { s3Key, url };
}

// ==========================================
// 🗑️ DELETE FILES
// ==========================================

/**
 * Elimina un archivo de S3
 */
export async function deleteFile(s3Key: string, isPrivate: boolean = false): Promise<void> {
  const bucket = isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: s3Key
  }));
}

/**
 * Elimina todos los archivos de un usuario
 */
export async function deleteUserFiles(userId: string): Promise<number> {
  let deletedCount = 0;
  
  // Eliminar de bucket público
  const publicFiles = await listUserFiles(userId, false);
  for (const file of publicFiles) {
    await deleteFile(file, false);
    deletedCount++;
  }
  
  // Eliminar de bucket privado
  const privateFiles = await listUserFiles(userId, true);
  for (const file of privateFiles) {
    await deleteFile(file, true);
    deletedCount++;
  }
  
  return deletedCount;
}

/**
 * Lista archivos de un usuario
 */
export async function listUserFiles(userId: string, isPrivate: boolean = false): Promise<string[]> {
  const bucket = isPrivate ? PRIVATE_BUCKET : PUBLIC_BUCKET;
  const prefixes = isPrivate 
    ? [`verification/${userId}/`, `payments/${userId}/`]
    : [`profiles/${userId}/`, `stories/${userId}/`, `instants/${userId}/`];
  
  const files: string[] = [];
  
  for (const prefix of prefixes) {
    const response = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix
    }));
    
    if (response.Contents) {
      files.push(...response.Contents.map(obj => obj.Key!).filter(Boolean));
    }
  }
  
  return files;
}

// ==========================================
// 📋 FUNCIONES DE PERFIL
// ==========================================

/**
 * Obtiene todas las fotos de galería de un perfil
 */
export async function getProfileGallery(userId: string): Promise<string[]> {
  const prefix = `profiles/${userId}/gallery/`;
  
  const response = await s3Client.send(new ListObjectsV2Command({
    Bucket: PUBLIC_BUCKET,
    Prefix: prefix
  }));
  
  if (!response.Contents) return [];
  
  // Filtrar solo las versiones "medium" para galería
  return response.Contents
    .map(obj => obj.Key!)
    .filter(key => key.includes('/medium.'))
    .map(key => `${CLOUDFRONT_URL}/${key}`);
}

/**
 * Obtiene el avatar de un usuario
 */
export function getAvatarUrl(userId: string, size: 'large' | 'medium' | 'thumbnail' = 'medium'): string {
  return `${CLOUDFRONT_URL}/profiles/${userId}/avatar/${size}.jpg`;
}

/**
 * Reordena las fotos de galería
 */
export async function reorderGalleryPhotos(
  userId: string, 
  newOrder: { oldKey: string; newIndex: number }[]
): Promise<void> {
  // Implementar lógica de reordenamiento
  // Esto podría involucrar renombrar archivos o actualizar metadata en DynamoDB
  for (const item of newOrder) {
    // Copiar a nueva ubicación con índice en el nombre
    const newKey = item.oldKey.replace(/photo-\d+/, `photo-${String(item.newIndex).padStart(3, '0')}`);
    
    await s3Client.send(new CopyObjectCommand({
      Bucket: PUBLIC_BUCKET,
      CopySource: `${PUBLIC_BUCKET}/${item.oldKey}`,
      Key: newKey
    }));
  }
}

// ==========================================
// 🔐 VERIFICACIÓN (Admin)
// ==========================================

/**
 * Obtiene URLs para ver documentos de verificación (solo admin)
 */
export async function getVerificationDocuments(userId: string): Promise<{
  selfie?: string;
  documentFront?: string;
  documentBack?: string;
}> {
  const prefix = `verification/${userId}/`;
  
  const response = await s3Client.send(new ListObjectsV2Command({
    Bucket: PRIVATE_BUCKET,
    Prefix: prefix
  }));
  
  const result: Record<string, string> = {};
  
  if (response.Contents) {
    for (const obj of response.Contents) {
      const key = obj.Key!;
      const signedUrl = await generateViewUrl(key, 600); // 10 minutos para review
      
      if (key.includes('/selfie/')) {
        result.selfie = signedUrl;
      } else if (key.includes('front')) {
        result.documentFront = signedUrl;
      } else if (key.includes('back')) {
        result.documentBack = signedUrl;
      }
    }
  }
  
  return result;
}

// ==========================================
// 🔥 STORIES
// ==========================================

/**
 * Obtiene stories activas de un usuario
 */
export async function getUserStories(userId: string): Promise<string[]> {
  const prefix = `stories/${userId}/`;
  
  const response = await s3Client.send(new ListObjectsV2Command({
    Bucket: PUBLIC_BUCKET,
    Prefix: prefix
  }));
  
  if (!response.Contents) return [];
  
  // Filtrar por fecha (stories expiran en 24h)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  
  return response.Contents
    .filter(obj => {
      // Extraer timestamp del key: stories/{userId}/story-{timestamp}/
      const match = obj.Key?.match(/story-(\d+)/);
      if (match) {
        return parseInt(match[1]) > oneDayAgo;
      }
      return false;
    })
    .map(obj => `${CLOUDFRONT_URL}/${obj.Key}`);
}

// ==========================================
// 🛠️ UTILIDADES
// ==========================================

/**
 * Sanitiza el nombre de archivo
 */
function sanitizeFileName(fileName: string): string {
  // Extraer extensión
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  // Generar nombre único
  const baseName = fileName
    .replace(/\.[^/.]+$/, '')  // Quitar extensión
    .replace(/[^a-zA-Z0-9]/g, '_')  // Solo alfanuméricos
    .substring(0, 50);  // Limitar longitud
  
  return `${baseName}_${Date.now()}.${ext}`;
}

/**
 * Obtiene el Content-Type desde la extensión
 */
export function getContentType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'pdf': 'application/pdf'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

/**
 * Valida si el archivo es una imagen
 */
export function isImage(contentType: string): boolean {
  return contentType.startsWith('image/');
}

/**
 * Valida si el archivo es un video
 */
export function isVideo(contentType: string): boolean {
  return contentType.startsWith('video/');
}
