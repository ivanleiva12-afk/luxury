# 🗂️ S3 Bucket Structure - Sala Oscura

## Arquitectura de Almacenamiento

### Buckets Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    AWS S3 BUCKETS                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🌐 salaoscura-media-public                                 │
│  ├── Fotos de perfil                                        │
│  ├── Videos promocionales                                   │
│  ├── Stories/Instantes                                      │
│  └── CloudFront Distribution                                │
│                                                             │
│  🔒 salaoscura-media-private                                │
│  ├── Selfies de verificación                                │
│  ├── Documentos de identidad                                │
│  ├── Comprobantes de pago                                   │
│  └── Solo acceso via signed URLs                            │
│                                                             │
│  📦 salaoscura-backups                                      │
│  ├── DynamoDB exports                                       │
│  └── Logs de auditoría                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📂 Bucket 1: `salaoscura-media-public`

**Propósito**: Media público visible en la plataforma

### Estructura de Carpetas

```
salaoscura-media-public/
│
├── profiles/
│   └── {userId}/
│       ├── avatar/
│       │   ├── original.jpg          # Foto original
│       │   ├── large.jpg             # 800x800
│       │   ├── medium.jpg            # 400x400
│       │   └── thumbnail.jpg         # 150x150
│       │
│       ├── gallery/
│       │   ├── photo-001/
│       │   │   ├── original.jpg
│       │   │   ├── large.jpg         # 1200x1200
│       │   │   ├── medium.jpg        # 600x600
│       │   │   └── thumbnail.jpg     # 300x300
│       │   ├── photo-002/
│       │   └── ...
│       │
│       └── videos/
│           ├── video-001/
│           │   ├── original.mp4
│           │   ├── compressed.mp4    # 720p
│           │   ├── thumbnail.jpg     # Frame preview
│           │   └── poster.jpg        # Poster image
│           └── ...
│
├── stories/
│   └── {userId}/
│       └── {storyId}/
│           ├── media.jpg             # o .mp4
│           └── thumbnail.jpg
│
├── instants/
│   └── {userId}/
│       └── {instantId}/
│           ├── media.jpg
│           └── thumbnail.jpg
│
└── assets/
    ├── logos/
    │   ├── logo-main.png
    │   ├── logo-white.png
    │   └── favicon.ico
    ├── badges/
    │   ├── verified.svg
    │   ├── luxury.svg
    │   ├── vip.svg
    │   └── premium.svg
    └── placeholders/
        ├── avatar-default.jpg
        └── no-image.jpg
```

### Configuración del Bucket

```json
{
  "BucketName": "salaoscura-media-public",
  "Region": "sa-east-1",
  "PublicAccessBlock": {
    "BlockPublicAcls": false,
    "IgnorePublicAcls": false,
    "BlockPublicPolicy": false,
    "RestrictPublicBuckets": false
  },
  "BucketPolicy": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadGetObject",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::salaoscura-media-public/*"
      }
    ]
  },
  "CorsConfiguration": {
    "CORSRules": [
      {
        "AllowedOrigins": [
          "https://salaoscura.cl",
          "https://www.salaoscura.cl",
          "http://localhost:*"
        ],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
      }
    ]
  },
  "LifecycleRules": [
    {
      "ID": "DeleteExpiredStories",
      "Prefix": "stories/",
      "Status": "Enabled",
      "Expiration": {
        "Days": 2
      }
    },
    {
      "ID": "DeleteExpiredInstants",
      "Prefix": "instants/",
      "Status": "Enabled",
      "Expiration": {
        "Days": 1
      }
    },
    {
      "ID": "MoveOldToIA",
      "Prefix": "profiles/",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
```

---

## 🔒 Bucket 2: `salaoscura-media-private`

**Propósito**: Documentos sensibles (NUNCA públicos)

### Estructura de Carpetas

```
salaoscura-media-private/
│
├── verification/
│   └── {userId}/
│       ├── selfie/
│       │   ├── original.jpg
│       │   └── processed.jpg         # Resized
│       ├── document/
│       │   ├── front.jpg             # Carnet frontal
│       │   └── back.jpg              # Carnet reverso
│       └── metadata.json             # Info de verificación
│
├── payments/
│   └── {userId}/
│       └── {paymentId}/
│           ├── receipt.jpg           # Comprobante
│           └── metadata.json
│
├── reports/
│   └── {reportId}/
│       ├── evidence/
│       │   ├── screenshot-001.jpg
│       │   └── screenshot-002.jpg
│       └── metadata.json
│
└── admin/
    └── exports/
        └── {date}/
            └── user-data-export.json
```

### Configuración del Bucket

```json
{
  "BucketName": "salaoscura-media-private",
  "Region": "sa-east-1",
  "PublicAccessBlock": {
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  },
  "Encryption": {
    "ServerSideEncryptionConfiguration": {
      "Rules": [
        {
          "ApplyServerSideEncryptionByDefault": {
            "SSEAlgorithm": "aws:kms",
            "KMSMasterKeyID": "alias/salaoscura-private-key"
          },
          "BucketKeyEnabled": true
        }
      ]
    }
  },
  "VersioningConfiguration": {
    "Status": "Enabled"
  },
  "LifecycleRules": [
    {
      "ID": "DeleteOldVerifications",
      "Prefix": "verification/",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      },
      "Expiration": {
        "Days": 365
      }
    },
    {
      "ID": "ArchiveOldPayments",
      "Prefix": "payments/",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

---

## 📦 Bucket 3: `salaoscura-backups`

**Propósito**: Backups y logs de auditoría

### Estructura

```
salaoscura-backups/
│
├── dynamodb/
│   └── {table-name}/
│       └── {date}/
│           └── export.json.gz
│
├── logs/
│   ├── api/
│   │   └── {year}/{month}/{day}/
│   │       └── api-logs.json.gz
│   ├── auth/
│   │   └── {year}/{month}/{day}/
│   │       └── auth-logs.json.gz
│   └── admin/
│       └── {year}/{month}/{day}/
│           └── admin-actions.json.gz
│
└── migrations/
    └── {date}/
        └── localStorage-export.json
```

### Configuración

```json
{
  "BucketName": "salaoscura-backups",
  "Region": "sa-east-1",
  "PublicAccessBlock": {
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  },
  "VersioningConfiguration": {
    "Status": "Enabled"
  },
  "LifecycleRules": [
    {
      "ID": "ArchiveOldBackups",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        }
      ],
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 7
      }
    }
  ]
}
```

---

## 🌐 CloudFront Distribution

### Configuración para Media Público

```json
{
  "DistributionConfig": {
    "Origins": [
      {
        "DomainName": "salaoscura-media-public.s3.sa-east-1.amazonaws.com",
        "Id": "S3-salaoscura-media-public",
        "S3OriginConfig": {
          "OriginAccessIdentity": ""
        }
      }
    ],
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3-salaoscura-media-public",
      "ViewerProtocolPolicy": "redirect-to-https",
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true,
      "AllowedMethods": ["GET", "HEAD"],
      "CachedMethods": ["GET", "HEAD"]
    },
    "CacheBehaviors": [
      {
        "PathPattern": "/stories/*",
        "TTL": {
          "DefaultTTL": 3600,
          "MaxTTL": 86400
        }
      },
      {
        "PathPattern": "/instants/*",
        "TTL": {
          "DefaultTTL": 1800,
          "MaxTTL": 3600
        }
      }
    ],
    "PriceClass": "PriceClass_100",
    "Enabled": true,
    "HttpVersion": "http2",
    "Aliases": ["media.salaoscura.cl"],
    "ViewerCertificate": {
      "ACMCertificateArn": "arn:aws:acm:us-east-1:ACCOUNT:certificate/CERT-ID",
      "SSLSupportMethod": "sni-only",
      "MinimumProtocolVersion": "TLSv1.2_2021"
    }
  }
}
```

### URLs Resultantes

```
# Producción (CloudFront)
https://media.salaoscura.cl/profiles/{userId}/avatar/medium.jpg
https://media.salaoscura.cl/profiles/{userId}/gallery/photo-001/large.jpg
https://media.salaoscura.cl/stories/{userId}/{storyId}/media.jpg

# Desarrollo (S3 directo)
https://salaoscura-media-public.s3.sa-east-1.amazonaws.com/profiles/...
```

---

## 🔐 Presigned URLs (Para Media Privado)

### Generar URL para Subir Archivo

```typescript
// Lambda: generateUploadUrl

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: 'sa-east-1' });

interface UploadUrlRequest {
  userId: string;
  fileType: 'photo' | 'video' | 'document' | 'selfie' | 'receipt';
  contentType: string;
  fileName: string;
}

export async function generateUploadUrl(request: UploadUrlRequest): Promise<string> {
  const { userId, fileType, contentType, fileName } = request;
  
  // Determinar bucket y path
  const isPrivate = ['document', 'selfie', 'receipt'].includes(fileType);
  const bucket = isPrivate ? 'salaoscura-media-private' : 'salaoscura-media-public';
  
  const key = getS3Key(userId, fileType, fileName);
  
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    // Metadata para tracking
    Metadata: {
      'uploaded-by': userId,
      'upload-timestamp': new Date().toISOString()
    }
  });
  
  // URL válida por 15 minutos
  const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
  
  return signedUrl;
}

function getS3Key(userId: string, fileType: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  
  switch (fileType) {
    case 'photo':
      return `profiles/${userId}/gallery/photo-${timestamp}/${sanitizedName}`;
    case 'video':
      return `profiles/${userId}/videos/video-${timestamp}/${sanitizedName}`;
    case 'selfie':
      return `verification/${userId}/selfie/${sanitizedName}`;
    case 'document':
      return `verification/${userId}/document/${sanitizedName}`;
    case 'receipt':
      return `payments/${userId}/receipt-${timestamp}/${sanitizedName}`;
    default:
      return `temp/${userId}/${timestamp}-${sanitizedName}`;
  }
}
```

### Generar URL para Ver Archivo Privado

```typescript
// Lambda: generateViewUrl

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export async function generateViewUrl(
  bucket: string,
  key: string,
  expiresIn: number = 300  // 5 minutos por defecto
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Uso en admin para ver documentos de verificación
export async function getVerificationDocuments(userId: string) {
  const bucket = 'salaoscura-media-private';
  
  return {
    selfieUrl: await generateViewUrl(bucket, `verification/${userId}/selfie/original.jpg`),
    documentFrontUrl: await generateViewUrl(bucket, `verification/${userId}/document/front.jpg`),
    documentBackUrl: await generateViewUrl(bucket, `verification/${userId}/document/back.jpg`)
  };
}
```

---

## 🖼️ Image Processing Lambda

### Trigger: Cuando se sube una imagen

```typescript
// Lambda: processUploadedImage
// Trigger: S3 ObjectCreated event

import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const SIZES = {
  avatar: [
    { name: 'large', width: 800, height: 800 },
    { name: 'medium', width: 400, height: 400 },
    { name: 'thumbnail', width: 150, height: 150 }
  ],
  gallery: [
    { name: 'large', width: 1200, height: 1200 },
    { name: 'medium', width: 600, height: 600 },
    { name: 'thumbnail', width: 300, height: 300 }
  ],
  story: [
    { name: 'display', width: 1080, height: 1920 },
    { name: 'thumbnail', width: 200, height: 356 }
  ]
};

export async function handler(event: S3Event) {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key);
    
    // Solo procesar archivos "original"
    if (!key.includes('/original.')) continue;
    
    // Determinar tipo de imagen
    const imageType = getImageType(key);
    const sizes = SIZES[imageType] || SIZES.gallery;
    
    // Obtener imagen original
    const { Body } = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const imageBuffer = await streamToBuffer(Body);
    
    // Generar versiones redimensionadas
    for (const size of sizes) {
      const resized = await sharp(imageBuffer)
        .resize(size.width, size.height, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();
      
      const newKey = key.replace('original.', `${size.name}.`);
      
      await s3Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: newKey,
        Body: resized,
        ContentType: 'image/jpeg'
      }));
    }
  }
}

function getImageType(key: string): string {
  if (key.includes('/avatar/')) return 'avatar';
  if (key.includes('/gallery/')) return 'gallery';
  if (key.includes('/stories/')) return 'story';
  return 'gallery';
}
```

---

## 🎬 Video Processing (MediaConvert)

### Configuración de Job Template

```json
{
  "Name": "SalaOscura-VideoProcessing",
  "Settings": {
    "OutputGroups": [
      {
        "Name": "File Group",
        "OutputGroupSettings": {
          "Type": "FILE_GROUP_SETTINGS",
          "FileGroupSettings": {
            "Destination": "s3://salaoscura-media-public/profiles/"
          }
        },
        "Outputs": [
          {
            "NameModifier": "_720p",
            "VideoDescription": {
              "Width": 1280,
              "Height": 720,
              "CodecSettings": {
                "Codec": "H_264",
                "H264Settings": {
                  "RateControlMode": "QVBR",
                  "MaxBitrate": 3000000
                }
              }
            },
            "AudioDescriptions": [
              {
                "CodecSettings": {
                  "Codec": "AAC",
                  "AacSettings": {
                    "Bitrate": 128000
                  }
                }
              }
            ],
            "ContainerSettings": {
              "Container": "MP4"
            }
          }
        ]
      },
      {
        "Name": "Thumbnail Group",
        "OutputGroupSettings": {
          "Type": "FILE_GROUP_SETTINGS",
          "FileGroupSettings": {
            "Destination": "s3://salaoscura-media-public/profiles/"
          }
        },
        "Outputs": [
          {
            "NameModifier": "_thumb",
            "VideoDescription": {
              "Width": 640,
              "Height": 360,
              "CodecSettings": {
                "Codec": "FRAME_CAPTURE",
                "FrameCaptureSettings": {
                  "FramerateNumerator": 1,
                  "FramerateDenominator": 5,
                  "MaxCaptures": 1,
                  "Quality": 80
                }
              }
            },
            "ContainerSettings": {
              "Container": "RAW"
            }
          }
        ]
      }
    ]
  }
}
```

---

## 💰 Estimación de Costos S3

### Para 1000 perfiles activos

| Concepto | Cantidad | Costo/Mes |
|----------|----------|-----------|
| **Storage (Standard)** | ~50GB | $1.15 |
| **Storage (IA)** | ~20GB | $0.25 |
| **PUT requests** | ~10,000 | $0.05 |
| **GET requests** | ~500,000 | $0.20 |
| **Data Transfer** | ~100GB | $8.50 |
| **CloudFront** | ~100GB | $8.50 |
| **Lambda (processing)** | ~50,000 inv | $0.10 |
| | | |
| **TOTAL** | | **~$19/mes** |

### Optimizaciones

1. **Lifecycle rules** para mover contenido antiguo a IA/Glacier
2. **CloudFront caching** para reducir transferencia S3
3. **Comprimir imágenes** con sharp (85% quality)
4. **Lazy loading** en frontend
5. **WebP format** cuando el browser lo soporte

---

## 🔧 IAM Policies

### Policy para Lambda de Upload

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:PutObjectAcl"
      ],
      "Resource": [
        "arn:aws:s3:::salaoscura-media-public/profiles/*",
        "arn:aws:s3:::salaoscura-media-public/stories/*",
        "arn:aws:s3:::salaoscura-media-private/verification/*",
        "arn:aws:s3:::salaoscura-media-private/payments/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject"
      ],
      "Resource": [
        "arn:aws:s3:::salaoscura-media-public/*"
      ]
    }
  ]
}
```

### Policy para Admin (Ver documentos privados)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::salaoscura-media-private",
        "arn:aws:s3:::salaoscura-media-private/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:PrincipalTag/Role": "admin"
        }
      }
    }
  ]
}
```

---

## 📋 Checklist de Implementación

- [ ] Crear bucket `salaoscura-media-public`
- [ ] Crear bucket `salaoscura-media-private`
- [ ] Crear bucket `salaoscura-backups`
- [ ] Configurar CORS en bucket público
- [ ] Configurar encryption en bucket privado
- [ ] Configurar lifecycle rules
- [ ] Crear CloudFront distribution
- [ ] Configurar certificado SSL para media.salaoscura.cl
- [ ] Crear Lambda para image processing
- [ ] Configurar S3 trigger para Lambda
- [ ] Crear IAM roles y policies
- [ ] Configurar MediaConvert para videos
- [ ] Subir assets iniciales (logos, badges, placeholders)
