# 🔌 API REST Design - Sala Oscura

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Static)                          │
│                   CloudFront + S3 Static                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (REST)                          │
│                  https://api.salaoscura.cl                      │
├─────────────────────────────────────────────────────────────────┤
│  /auth/*        │  /profiles/*   │  /media/*     │  /admin/*   │
│  /forum/*       │  /ratings/*    │  /config/*    │  /contact/* │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Lambda Functions                           │
├──────────┬──────────┬──────────┬──────────┬────────────────────┤
│  Auth    │ Profiles │  Media   │  Forum   │   Admin            │
│ Handler  │ Handler  │ Handler  │ Handler  │  Handler           │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬───────────┘
     │          │          │          │              │
     ▼          ▼          ▼          ▼              ▼
┌─────────┐ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌───────────────┐
│ Cognito │ │DynamoDB│ │   S3   │ │DynamoDB │ │   DynamoDB    │
│  Pool   │ │       │ │ Buckets│ │         │ │   + SES       │
└─────────┘ └───────┘ └─────────┘ └─────────┘ └───────────────┘
```

---

## 📋 API Endpoints

### Base URL
- **Production**: `https://api.salaoscura.cl/v1`
- **Staging**: `https://api-staging.salaoscura.cl/v1`
- **Local**: `http://localhost:3000/v1`

---

## 🔐 AUTH API (`/auth`)

### POST `/auth/register`
Registrar nuevo usuario (escort o cliente)

**Request:**
```json
{
  "email": "camila@email.com",
  "password": "SecurePass123!",
  "username": "camila_vip",
  "displayName": "Camila",
  "userType": "escort",
  "phone": "+56912345678"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Usuario registrado. Pendiente de aprobación.",
  "userId": "usr_abc123"
}
```

---

### POST `/auth/login`
Iniciar sesión

**Request:**
```json
{
  "email": "camila@email.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "user": {
    "userId": "usr_abc123",
    "email": "camila@email.com",
    "username": "camila_vip",
    "displayName": "Camila",
    "userType": "escort",
    "status": "approved"
  }
}
```

---

### POST `/auth/refresh`
Renovar access token

**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600
}
```

---

### POST `/auth/logout`
Cerrar sesión (invalidar tokens)

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Sesión cerrada"
}
```

---

### POST `/auth/forgot-password`
Solicitar reset de password

**Request:**
```json
{
  "email": "camila@email.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Email de recuperación enviado"
}
```

---

### POST `/auth/reset-password`
Cambiar password con token

**Request:**
```json
{
  "token": "reset_token_here",
  "newPassword": "NewSecurePass123!"
}
```

---

## 📸 PROFILES API (`/profiles`)

### GET `/profiles`
Listar perfiles públicos (para carruseles)

**Query Params:**
- `plan`: `luxury` | `vip` | `premium` (opcional)
- `city`: String (opcional)
- `commune`: String (opcional)
- `limit`: Number (default: 20, max: 50)
- `cursor`: String (paginación)

**Response:** `200 OK`
```json
{
  "profiles": [
    {
      "userId": "usr_abc123",
      "displayName": "Camila VIP",
      "bio": "Brasileña de 25 años...",
      "verified": true,
      "planType": "luxury",
      "carouselType": "luxury",
      "city": "Santiago",
      "commune": "Las Condes",
      "profilePhotoUrl": "https://media.salaoscura.cl/profiles/usr_abc123/avatar/medium.jpg",
      "stats": {
        "likes": 245,
        "views": 1520,
        "rating": 4.8
      },
      "physicalInfo": {
        "age": 25,
        "height": 168,
        "ethnicity": "Brasileña"
      }
    }
  ],
  "nextCursor": "eyJsYXN0S2V5Ijo...",
  "hasMore": true
}
```

---

### GET `/profiles/:userId`
Obtener perfil completo

**Response:** `200 OK`
```json
{
  "userId": "usr_abc123",
  "displayName": "Camila VIP",
  "bio": "Brasileña de 25 años, amante del buen trato...",
  "slogan": "Tu fantasía hecha realidad",
  "verified": true,
  "planType": "luxury",
  "city": "Santiago",
  "commune": "Las Condes",
  "whatsapp": "+56912345678",
  "profilePhotoUrl": "https://media.salaoscura.cl/...",
  "gallery": [
    "https://media.salaoscura.cl/profiles/usr_abc123/gallery/photo-001/medium.jpg",
    "https://media.salaoscura.cl/profiles/usr_abc123/gallery/photo-002/medium.jpg"
  ],
  "videos": [
    {
      "url": "https://media.salaoscura.cl/profiles/usr_abc123/videos/video-001/compressed.mp4",
      "thumbnail": "https://media.salaoscura.cl/profiles/usr_abc123/videos/video-001/thumbnail.jpg"
    }
  ],
  "physicalInfo": {
    "age": 25,
    "height": 168,
    "weight": 58,
    "ethnicity": "Brasileña",
    "skinTone": "Trigueña",
    "measurements": { "bust": 95, "waist": 62, "hips": 98 }
  },
  "attributes": {
    "hairColor": "Castaño",
    "eyeColor": "Café",
    "bodyType": "Atlética",
    "tattoos": true,
    "piercings": false
  },
  "services": ["oral", "americana", "masajes", "fantasias"],
  "prices": {
    "hour": { "CLP": 180000 },
    "twoHours": { "CLP": 330000 },
    "overnight": { "CLP": 950000 }
  },
  "schedule": {
    "monday": { "available": true, "hours": "10:00 - 22:00" },
    "tuesday": { "available": true, "hours": "10:00 - 22:00" }
  },
  "stats": {
    "likes": 245,
    "views": 1520,
    "recommendations": 89,
    "rating": 4.8,
    "ratingCount": 42
  }
}
```

---

### PUT `/profiles/:userId`
Actualizar mi perfil (autenticado)

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "bio": "Nueva descripción...",
  "whatsapp": "+56987654321",
  "prices": {
    "hour": { "CLP": 200000 }
  }
}
```

---

### POST `/profiles/:userId/view`
Registrar una vista (público)

**Response:** `200 OK`
```json
{
  "views": 1521
}
```

---

### POST `/profiles/:userId/like`
Toggle like (autenticado)

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "liked": true,
  "likes": 246
}
```

---

### POST `/profiles/:userId/recommend`
Incrementar recomendación

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "recommendations": 90
}
```

---

## 📷 MEDIA API (`/media`)

### POST `/media/upload-url`
Obtener URL presigned para subir

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "category": "gallery",
  "fileName": "photo.jpg",
  "contentType": "image/jpeg",
  "fileSize": 2048576
}
```

**Response:** `200 OK`
```json
{
  "uploadUrl": "https://salaoscura-media-public.s3.amazonaws.com/...",
  "fileUrl": "https://media.salaoscura.cl/profiles/usr_abc123/gallery/photo-xxx/original.jpg",
  "s3Key": "profiles/usr_abc123/gallery/photo-xxx/original.jpg",
  "expiresIn": 900
}
```

---

### DELETE `/media/:mediaId`
Eliminar archivo

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Archivo eliminado"
}
```

---

### PUT `/media/reorder`
Reordenar galería

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "order": [
    { "mediaId": "media_001", "position": 1 },
    { "mediaId": "media_003", "position": 2 },
    { "mediaId": "media_002", "position": 3 }
  ]
}
```

---

## 🔥 STORIES API (`/stories`)

### GET `/stories`
Listar stories activas

**Response:** `200 OK`
```json
{
  "stories": [
    {
      "userId": "usr_abc123",
      "displayName": "Camila VIP",
      "avatarUrl": "https://media.salaoscura.cl/.../thumbnail.jpg",
      "hasUnviewed": true,
      "items": [
        {
          "storyId": "story_001",
          "mediaUrl": "https://media.salaoscura.cl/stories/...",
          "mediaType": "image",
          "caption": "Disponible hoy!",
          "createdAt": "2026-01-17T10:00:00Z",
          "expiresAt": "2026-01-18T10:00:00Z"
        }
      ]
    }
  ]
}
```

---

### POST `/stories`
Crear story

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "s3Key": "stories/usr_abc123/story-xxx/media.jpg",
  "mediaType": "image",
  "caption": "Disponible hoy!"
}
```

---

### POST `/stories/:storyId/view`
Registrar vista de story

**Headers:** `Authorization: Bearer <token>`

---

## 💬 FORUM API (`/forum`)

### GET `/forum/posts`
Listar posts del foro

**Query Params:**
- `category`: `general` | `zona-clientas` | `rating` (opcional)
- `limit`: Number (default: 20)
- `cursor`: String

**Response:** `200 OK`
```json
{
  "posts": [
    {
      "postId": "post_abc123",
      "authorName": "Cliente Anónimo",
      "authorType": "cliente",
      "category": "general",
      "content": "Alguien conoce a @camila_vip?",
      "mentions": ["@camila_vip"],
      "likes": 5,
      "repliesCount": 3,
      "isAnonymous": true,
      "createdAt": "2026-01-17T10:00:00Z"
    }
  ],
  "nextCursor": "eyJsYXN0S2V5Ijo..."
}
```

---

### GET `/forum/posts/:postId`
Obtener post con respuestas

**Response:** `200 OK`
```json
{
  "post": {
    "postId": "post_abc123",
    "authorName": "Cliente Anónimo",
    "content": "Contenido...",
    "likes": 5,
    "createdAt": "2026-01-17T10:00:00Z"
  },
  "replies": [
    {
      "replyId": "reply_001",
      "authorName": "Camila VIP",
      "authorType": "escort",
      "content": "Hola! Sí, soy yo...",
      "likes": 2,
      "createdAt": "2026-01-17T11:00:00Z"
    }
  ]
}
```

---

### POST `/forum/posts`
Crear post

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "category": "general",
  "content": "Contenido del post...",
  "isAnonymous": true
}
```

---

### POST `/forum/posts/:postId/replies`
Responder a un post

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "content": "Mi respuesta...",
  "isAnonymous": false
}
```

---

### POST `/forum/posts/:postId/like`
Like a post o reply

**Headers:** `Authorization: Bearer <token>`

---

## ⭐ RATINGS API (`/ratings`)

### GET `/ratings/:escortId`
Obtener calificaciones de una escort

**Response:** `200 OK`
```json
{
  "averageRating": 4.8,
  "totalRatings": 42,
  "breakdown": {
    "attention": 4.9,
    "hygiene": 4.8,
    "punctuality": 4.7
  },
  "ratings": [
    {
      "ratingId": "rating_001",
      "raterName": "Cliente verificado",
      "score": 5,
      "comment": "Excelente experiencia",
      "categories": { "attention": 5, "hygiene": 5, "punctuality": 5 },
      "verified": true,
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ]
}
```

---

### POST `/ratings/:escortId`
Crear calificación

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "score": 5,
  "comment": "Excelente experiencia",
  "categories": {
    "attention": 5,
    "hygiene": 5,
    "punctuality": 5
  },
  "isAnonymous": true
}
```

---

## 📩 MENTIONS API (`/mentions`)

### GET `/mentions`
Obtener mis menciones

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "unreadCount": 3,
  "mentions": [
    {
      "mentionId": "mention_001",
      "mentionedBy": "Cliente Anónimo",
      "postId": "post_abc123",
      "preview": "Alguien conoce a @camila_vip?",
      "read": false,
      "createdAt": "2026-01-17T10:00:00Z"
    }
  ]
}
```

---

### PUT `/mentions/:mentionId/read`
Marcar mención como leída

**Headers:** `Authorization: Bearer <token>`

---

## 💳 SUBSCRIPTIONS API (`/subscriptions`)

### GET `/subscriptions/plans`
Obtener planes disponibles

**Response:** `200 OK`
```json
{
  "plans": [
    {
      "planType": "luxury",
      "name": "Luxury & Exclusive",
      "price": 149990,
      "currency": "CLP",
      "duration": 30,
      "features": [
        "Posición destacada en carrusel",
        "Fotos ilimitadas",
        "Videos ilimitados"
      ],
      "limits": {
        "photos": 0,
        "videos": 0,
        "stories": 0,
        "instants": 0
      }
    }
  ]
}
```

---

### GET `/subscriptions/current`
Obtener mi suscripción actual

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "subscription": {
    "planType": "vip",
    "status": "active",
    "startDate": "2026-01-01",
    "expiryDate": "2026-01-31",
    "daysRemaining": 14,
    "limits": { "photos": 10, "videos": 2, "stories": 2, "instants": 3 },
    "usage": { "photosUsed": 5, "videosUsed": 1, "storiesUsed": 0, "instantsUsed": 2 }
  }
}
```

---

### POST `/subscriptions/request`
Solicitar suscripción/renovación

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "planType": "vip",
  "duration": 30,
  "discountCode": "PROMO2026"
}
```

**Response:** `200 OK`
```json
{
  "requestId": "req_abc123",
  "planType": "vip",
  "originalPrice": 79990,
  "discount": 10000,
  "finalPrice": 69990,
  "bankInfo": {
    "bank": "Banco Estado",
    "accountType": "Cuenta Vista",
    "accountNumber": "12345678",
    "rut": "12.345.678-9",
    "name": "Sala Oscura SpA",
    "email": "pagos@salaoscura.cl"
  },
  "message": "Transfiere y sube tu comprobante"
}
```

---

### POST `/subscriptions/upload-receipt`
Subir comprobante de pago

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "requestId": "req_abc123",
  "receiptS3Key": "payments/usr_abc123/receipt-xxx/receipt.jpg"
}
```

---

## 🛡️ ADMIN API (`/admin`)

> Requiere rol `admin`

### GET `/admin/pending-users`
Usuarios pendientes de aprobación

### POST `/admin/users/:userId/approve`
Aprobar usuario

### POST `/admin/users/:userId/reject`
Rechazar usuario

**Request:**
```json
{
  "reason": "Documentos ilegibles"
}
```

### GET `/admin/pending-payments`
Pagos pendientes de verificación

### POST `/admin/payments/:requestId/approve`
Aprobar pago

### POST `/admin/payments/:requestId/reject`
Rechazar pago

### GET `/admin/verification/:userId`
Ver documentos de verificación

### PUT `/admin/config/:configType`
Actualizar configuración (plans, discounts, bank, etc.)

---

## 📧 CONTACT API (`/contact`)

### POST `/contact`
Enviar mensaje de contacto

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@email.com",
  "phone": "+56912345678",
  "subject": "Consulta sobre planes",
  "message": "Hola, quisiera saber..."
}
```

---

## 🔒 Autenticación

### Headers
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Respuestas de Error

**401 Unauthorized**
```json
{
  "error": "UNAUTHORIZED",
  "message": "Token inválido o expirado"
}
```

**403 Forbidden**
```json
{
  "error": "FORBIDDEN",
  "message": "No tienes permisos para esta acción"
}
```

**404 Not Found**
```json
{
  "error": "NOT_FOUND",
  "message": "Recurso no encontrado"
}
```

**422 Validation Error**
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Datos inválidos",
  "details": [
    { "field": "email", "message": "Email inválido" }
  ]
}
```

**429 Rate Limit**
```json
{
  "error": "RATE_LIMIT",
  "message": "Demasiadas solicitudes",
  "retryAfter": 60
}
```

---

## 📊 Rate Limiting

| Endpoint | Límite |
|----------|--------|
| `/auth/login` | 5/min |
| `/auth/register` | 3/min |
| `/profiles` (GET) | 100/min |
| `/profiles/:id/view` | 30/min |
| `/media/upload-url` | 20/min |
| `/forum/posts` (POST) | 10/min |
| Otros | 60/min |

---

## 🏷️ Versionamiento

La API usa versionamiento en URL:
- `v1`: Versión actual
- `v2`: Futuras mejoras (GraphQL, etc.)

Deprecation headers:
```
Deprecation: true
Sunset: Sat, 01 Jan 2027 00:00:00 GMT
Link: <https://api.salaoscura.cl/v2>; rel="successor-version"
```
