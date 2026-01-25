/**
 * 🖼️ Image Processing Lambda - Sala Oscura
 * 
 * Triggered by S3 ObjectCreated events
 * Generates thumbnails and optimized versions
 */

import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { Readable } from 'stream';

const s3Client = new S3Client({});

// ==========================================
// 📐 CONFIGURACIÓN DE TAMAÑOS
// ==========================================

interface ImageSize {
  name: string;
  width: number;
  height: number;
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  quality: number;
}

const SIZE_CONFIGS: Record<string, ImageSize[]> = {
  avatar: [
    { name: 'large', width: 800, height: 800, fit: 'cover', quality: 85 },
    { name: 'medium', width: 400, height: 400, fit: 'cover', quality: 85 },
    { name: 'thumbnail', width: 150, height: 150, fit: 'cover', quality: 80 }
  ],
  gallery: [
    { name: 'large', width: 1200, height: 1600, fit: 'inside', quality: 85 },
    { name: 'medium', width: 600, height: 800, fit: 'inside', quality: 85 },
    { name: 'thumbnail', width: 300, height: 400, fit: 'cover', quality: 80 }
  ],
  story: [
    { name: 'display', width: 1080, height: 1920, fit: 'cover', quality: 85 },
    { name: 'thumbnail', width: 200, height: 356, fit: 'cover', quality: 75 }
  ],
  instant: [
    { name: 'display', width: 1080, height: 1920, fit: 'cover', quality: 85 },
    { name: 'thumbnail', width: 200, height: 356, fit: 'cover', quality: 75 }
  ],
  verification: [
    { name: 'processed', width: 1200, height: 1200, fit: 'inside', quality: 90 }
  ]
};

// ==========================================
// 🎯 HANDLER PRINCIPAL
// ==========================================

export const handler: S3Handler = async (event: S3Event): Promise<void> => {
  console.log('Processing S3 event:', JSON.stringify(event, null, 2));
  
  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('Error processing record:', error);
      // No re-throw para que otros records se procesen
    }
  }
};

async function processRecord(record: S3Event['Records'][0]): Promise<void> {
  const bucket = record.s3.bucket.name;
  const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
  
  console.log(`Processing: ${bucket}/${key}`);
  
  // Solo procesar archivos "original"
  if (!key.includes('original.') && !key.includes('_original.')) {
    console.log('Skipping: not an original file');
    return;
  }
  
  // Solo procesar imágenes
  const ext = key.split('.').pop()?.toLowerCase();
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
    console.log('Skipping: not an image file');
    return;
  }
  
  // Determinar tipo de imagen
  const imageType = getImageType(key);
  const sizes = SIZE_CONFIGS[imageType];
  
  if (!sizes) {
    console.log(`No size config for type: ${imageType}`);
    return;
  }
  
  // Obtener imagen original
  const imageBuffer = await getImageFromS3(bucket, key);
  
  // Generar versiones
  for (const size of sizes) {
    await generateVersion(bucket, key, imageBuffer, size);
  }
  
  console.log(`Successfully processed ${key} - generated ${sizes.length} versions`);
}

// ==========================================
// 🖼️ PROCESAMIENTO DE IMAGEN
// ==========================================

async function getImageFromS3(bucket: string, key: string): Promise<Buffer> {
  const response = await s3Client.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key
  }));
  
  if (!response.Body) {
    throw new Error('No body in S3 response');
  }
  
  return await streamToBuffer(response.Body as Readable);
}

async function generateVersion(
  bucket: string,
  originalKey: string,
  imageBuffer: Buffer,
  size: ImageSize
): Promise<void> {
  // Construir nuevo key
  const newKey = originalKey
    .replace('original.', `${size.name}.`)
    .replace('_original.', `_${size.name}.`);
  
  console.log(`Generating ${size.name} version: ${newKey}`);
  
  // Procesar imagen
  let processor = sharp(imageBuffer)
    .resize(size.width, size.height, {
      fit: size.fit,
      withoutEnlargement: true
    });
  
  // Determinar formato de salida
  const ext = originalKey.split('.').pop()?.toLowerCase();
  
  if (ext === 'png') {
    processor = processor.png({ quality: size.quality });
  } else if (ext === 'webp') {
    processor = processor.webp({ quality: size.quality });
  } else {
    // Default to JPEG
    processor = processor.jpeg({ quality: size.quality, progressive: true });
  }
  
  const processedBuffer = await processor.toBuffer();
  
  // Subir versión procesada
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: newKey,
    Body: processedBuffer,
    ContentType: getContentType(newKey),
    CacheControl: 'public, max-age=31536000', // 1 año
    Metadata: {
      'generated-from': originalKey,
      'size-name': size.name,
      'processed-at': new Date().toISOString()
    }
  }));
}

// ==========================================
// 🛠️ UTILIDADES
// ==========================================

function getImageType(key: string): string {
  if (key.includes('/avatar/')) return 'avatar';
  if (key.includes('/gallery/')) return 'gallery';
  if (key.includes('/stories/') || key.includes('story-')) return 'story';
  if (key.includes('/instants/') || key.includes('instant-')) return 'instant';
  if (key.includes('/verification/')) return 'verification';
  return 'gallery'; // default
}

function getContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp'
  };
  return mimeTypes[ext || ''] || 'image/jpeg';
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// ==========================================
// 🎬 VIDEO THUMBNAIL (Placeholder)
// ==========================================

/**
 * Para videos, usamos MediaConvert o ffmpeg en Lambda Layer
 * Esta es una función placeholder
 */
export async function generateVideoThumbnail(
  bucket: string,
  videoKey: string
): Promise<string> {
  // En producción, esto llamaría a MediaConvert
  // o usaría ffmpeg via Lambda Layer
  
  console.log(`Video thumbnail generation for ${videoKey} - not implemented`);
  
  // Retornar placeholder
  return `${bucket}/assets/placeholders/video-thumb.jpg`;
}
