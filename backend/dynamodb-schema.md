# 📊 DynamoDB Schema Design - Sala Oscura Backend

## Principios de Diseño

- **Single Table Design**: Minimizar tablas para reducir costos y latencia
- **Access Patterns First**: Diseño basado en queries necesarias
- **GSI para flexibilidad**: Índices secundarios para consultas alternativas
- **TTL para datos temporales**: Stories, sesiones, tokens

---

## 🗄️ TABLAS PRINCIPALES

### 1. `SalaOscura-Main` (Single Table Design)

Esta tabla almacena múltiples entidades usando partition key (PK) y sort key (SK).

```
Table: SalaOscura-Main
├── PK (Partition Key): String
├── SK (Sort Key): String
├── GSI1PK / GSI1SK: Para queries alternativas
├── GSI2PK / GSI2SK: Para búsquedas por email/username
├── TTL: Number (epoch timestamp para expiración automática)
```

---

## 📋 ENTIDADES Y ACCESS PATTERNS

### 👤 USERS (Autenticación)

**Propósito**: Credenciales y sesiones de login

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `USER#<userId>` | ID único del usuario |
| SK | `PROFILE` | Datos del perfil |
| GSI1PK | `EMAIL#<email>` | Para login por email |
| GSI1SK | `USER` | |
| GSI2PK | `USERNAME#<username>` | Para búsqueda por username |
| GSI2SK | `USER` | |
| email | String | Email único |
| passwordHash | String | Password hasheado (bcrypt) |
| username | String | Username único |
| displayName | String | Nombre público |
| userType | String | `escort` \| `cliente` \| `admin` |
| status | String | `pending` \| `approved` \| `rejected` \| `suspended` |
| createdAt | String | ISO timestamp |
| updatedAt | String | ISO timestamp |
| lastLoginAt | String | ISO timestamp |

**Access Patterns**:
- `GetUserById`: PK = `USER#123`, SK = `PROFILE`
- `GetUserByEmail`: GSI1PK = `EMAIL#user@email.com`
- `GetUserByUsername`: GSI2PK = `USERNAME#camila_vip`

---

### 📸 PROFILES (Perfiles Públicos de Escorts)

**Propósito**: Información pública visible en carruseles

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `USER#<userId>` | ID del usuario |
| SK | `PUBLIC_PROFILE` | Perfil público |
| GSI1PK | `PLAN#<planType>` | Para filtrar por plan |
| GSI1SK | `<createdAt>` | Ordenado por fecha |
| GSI2PK | `CITY#<city>` | Para filtrar por ciudad |
| GSI2SK | `<commune>` | Comuna |
| displayName | String | Nombre artístico |
| bio | String | Descripción |
| verified | Boolean | Verificada |
| profileVisible | Boolean | Perfil activo/visible |
| planType | String | `luxury` \| `vip` \| `premium` |
| carouselType | String | `luxury` \| `vip-black` \| `premium-select` |
| city | String | Ciudad |
| commune | String | Comuna |
| whatsapp | String | Número WhatsApp |
| profilePhotoUrl | String | URL foto principal (S3) |
| stats | Map | `{likes, views, recommendations, experiences, rating}` |

**Datos Físicos** (Map `physicalInfo`):
```json
{
  "age": 25,
  "height": 168,
  "weight": 58,
  "ethnicity": "Brasileña",
  "skinTone": "Trigueña",
  "measurements": {"bust": 95, "waist": 62, "hips": 98}
}
```

**Atributos** (Map `attributes`):
```json
{
  "hairColor": "Castaño",
  "eyeColor": "Café",
  "bodyType": "Atlética",
  "tattoos": true,
  "piercings": false
}
```

**Servicios** (List `services`):
```json
["oral", "americana", "masajes", "fantasias", "girlfriend"]
```

**Precios** (Map `prices`):
```json
{
  "hour": {"CLP": 180000, "USD": 215},
  "twoHours": {"CLP": 330000, "USD": 395},
  "overnight": {"CLP": 950000, "USD": 1150}
}
```

**Access Patterns**:
- `GetProfileByUserId`: PK = `USER#123`, SK = `PUBLIC_PROFILE`
- `ListProfilesByPlan`: GSI1PK = `PLAN#luxury`, SK begins_with ``
- `ListProfilesByCity`: GSI2PK = `CITY#Santiago`

---

### 📷 MEDIA (Referencias a S3)

**Propósito**: Metadatos de fotos/videos (los archivos están en S3)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `USER#<userId>` | ID del usuario |
| SK | `MEDIA#<mediaId>` | ID único del archivo |
| mediaType | String | `photo` \| `video` \| `story` \| `instant` |
| category | String | `profile` \| `verification` \| `document` \| `receipt` |
| s3Key | String | Path en S3: `photos/user123/photo1.jpg` |
| s3Bucket | String | Nombre del bucket |
| thumbnailKey | String | Path del thumbnail |
| mimeType | String | `image/jpeg`, `video/mp4` |
| size | Number | Tamaño en bytes |
| width | Number | Ancho en px |
| height | Number | Alto en px |
| isPublic | Boolean | Visible públicamente |
| order | Number | Orden de visualización |
| uploadedAt | String | ISO timestamp |
| TTL | Number | Para stories/instantes temporales |

**Access Patterns**:
- `GetMediaByUser`: PK = `USER#123`, SK begins_with `MEDIA#`
- `GetProfilePhotos`: PK = `USER#123`, SK begins_with `MEDIA#`, filter: category = `profile`

---

### 🔐 VERIFICATION (Documentos Privados)

**Propósito**: Selfies, documentos ID (NUNCA públicos)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `USER#<userId>` | ID del usuario |
| SK | `VERIFICATION#<type>` | `selfie` \| `document` \| `receipt` |
| s3Key | String | Path en S3 privado |
| verifiedAt | String | Fecha de verificación |
| verifiedBy | String | Admin que verificó |
| status | String | `pending` \| `approved` \| `rejected` |
| notes | String | Notas del admin |

---

### 💳 SUBSCRIPTIONS (Planes y Pagos)

**Propósito**: Suscripciones activas y historial

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `USER#<userId>` | ID del usuario |
| SK | `SUBSCRIPTION#CURRENT` | Suscripción activa |
| GSI1PK | `PLAN#<planType>` | Para listar por plan |
| GSI1SK | `<expiryDate>` | Ordenado por vencimiento |
| planType | String | `luxury` \| `vip` \| `premium` |
| status | String | `active` \| `expired` \| `cancelled` |
| startDate | String | Fecha inicio |
| expiryDate | String | Fecha vencimiento |
| duration | Number | Días de duración |
| price | Number | Precio pagado |
| currency | String | `CLP` \| `USD` |
| paymentMethod | String | `transfer` \| `card` |
| receiptS3Key | String | Comprobante en S3 |
| limits | Map | `{photos, videos, stories, instants}` |

**Historial de Pagos** (SK diferente):
| PK | `USER#<userId>` |
| SK | `PAYMENT#<timestamp>` |

**Access Patterns**:
- `GetActiveSubscription`: PK = `USER#123`, SK = `SUBSCRIPTION#CURRENT`
- `GetPaymentHistory`: PK = `USER#123`, SK begins_with `PAYMENT#`
- `ListExpiringSubscriptions`: GSI1PK = `PLAN#vip`, GSI1SK < `2026-01-20`

---

### 💬 FORUM - POSTS (Sala Oscura)

**Propósito**: Publicaciones del foro

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `POST#<postId>` | ID del post |
| SK | `METADATA` | Datos del post |
| GSI1PK | `CATEGORY#<category>` | Para filtrar |
| GSI1SK | `<createdAt>` | Ordenado por fecha |
| GSI2PK | `AUTHOR#<userId>` | Posts por autor |
| GSI2SK | `<createdAt>` | |
| authorId | String | ID del autor |
| authorName | String | Nombre visible |
| authorType | String | `escort` \| `cliente` |
| category | String | `general` \| `zona-clientas` \| `rating` \| `recommendation` |
| title | String | Título (opcional) |
| content | String | Contenido |
| mentions | List | `["@camila_vip", "@sofia_premium"]` |
| likes | Number | Contador de likes |
| repliesCount | Number | Número de respuestas |
| isAnonymous | Boolean | Post anónimo |
| createdAt | String | ISO timestamp |
| updatedAt | String | ISO timestamp |

**Access Patterns**:
- `GetPostById`: PK = `POST#abc123`, SK = `METADATA`
- `ListPostsByCategory`: GSI1PK = `CATEGORY#zona-clientas`, ordered by GSI1SK
- `ListPostsByAuthor`: GSI2PK = `AUTHOR#user123`

---

### 💬 FORUM - REPLIES (Respuestas)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `POST#<postId>` | ID del post padre |
| SK | `REPLY#<timestamp>#<replyId>` | Respuesta ordenada |
| authorId | String | ID del autor |
| authorName | String | Nombre visible |
| content | String | Contenido |
| likes | Number | Likes de la respuesta |
| createdAt | String | ISO timestamp |

**Access Patterns**:
- `GetRepliesByPost`: PK = `POST#abc123`, SK begins_with `REPLY#`

---

### ⭐ RATINGS (Calificaciones)

**Propósito**: Calificaciones de escorts

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `RATING#<escortId>` | Escort calificada |
| SK | `<timestamp>#<ratingId>` | Rating ordenado |
| GSI1PK | `RATER#<userId>` | Quien calificó |
| GSI1SK | `<escortId>` | |
| raterId | String | ID del calificador |
| raterName | String | Nombre (puede ser anónimo) |
| score | Number | 1-5 estrellas |
| comment | String | Comentario |
| categories | Map | `{attention: 5, hygiene: 4, punctuality: 5}` |
| verified | Boolean | Calificación verificada |
| createdAt | String | ISO timestamp |

**Access Patterns**:
- `GetRatingsForEscort`: PK = `RATING#escort123`, ordered by SK
- `GetRatingsByUser`: GSI1PK = `RATER#user456`

---

### 📩 MENTIONS (Menciones @)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `MENTION#<userId>` | Usuario mencionado |
| SK | `<timestamp>#<postId>` | Orden cronológico |
| postId | String | ID del post |
| mentionedBy | String | Quien mencionó |
| mentionedByName | String | Nombre |
| preview | String | Preview del contenido |
| read | Boolean | Leída o no |
| createdAt | String | ISO timestamp |

**Access Patterns**:
- `GetUnreadMentions`: PK = `MENTION#user123`, filter: read = false

---

### 🔥 STORIES/INSTANTES (Contenido Temporal)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `STORY#<userId>` | Usuario |
| SK | `<timestamp>#<storyId>` | Orden cronológico |
| GSI1PK | `ACTIVE_STORIES` | Para listar todas activas |
| GSI1SK | `<expiryTime>` | |
| type | String | `story` \| `instant` |
| mediaType | String | `image` \| `video` |
| s3Key | String | Path en S3 |
| caption | String | Texto opcional |
| viewCount | Number | Vistas |
| createdAt | String | ISO timestamp |
| expiresAt | String | ISO timestamp |
| TTL | Number | Epoch para auto-delete |

**Access Patterns**:
- `GetStoriesByUser`: PK = `STORY#user123`
- `ListActiveStories`: GSI1PK = `ACTIVE_STORIES`, filter by TTL

---

### ⚙️ CONFIG (Configuración del Sistema)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `CONFIG` | Partición fija |
| SK | `<configType>` | Tipo de config |
| data | Map | Datos de configuración |
| updatedAt | String | Última actualización |
| updatedBy | String | Admin que actualizó |

**Tipos de Config**:
- `SK = PLANS`: Configuración de planes y precios
- `SK = DISCOUNTS`: Códigos de descuento activos
- `SK = BANK`: Datos bancarios para pagos
- `SK = EMAIL`: Configuración SMTP/SES
- `SK = BUSINESS`: Info de contacto del negocio
- `SK = SCHEDULES`: Horarios de atención

**Ejemplo Plans**:
```json
{
  "PK": "CONFIG",
  "SK": "PLANS",
  "data": {
    "luxury": {
      "name": "Luxury & Exclusive",
      "price": 149990,
      "duration": 30,
      "photos": 0,
      "videos": 0,
      "stories": 0,
      "instants": 0
    },
    "vip": {
      "name": "VIP Black",
      "price": 79990,
      "duration": 30,
      "photos": 10,
      "videos": 2,
      "stories": 2,
      "instants": 3
    }
  }
}
```

---

### 📧 MESSAGES (Mensajes de Contacto)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `MESSAGE#<messageId>` | ID del mensaje |
| SK | `METADATA` | Datos |
| GSI1PK | `MESSAGES` | Para listar todos |
| GSI1SK | `<createdAt>` | Orden cronológico |
| name | String | Nombre del remitente |
| email | String | Email |
| phone | String | Teléfono (opcional) |
| subject | String | Asunto |
| message | String | Contenido |
| read | Boolean | Leído por admin |
| repliedAt | String | Fecha de respuesta |
| createdAt | String | ISO timestamp |

---

### 🔑 SESSIONS (Sesiones Activas)

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| PK | `SESSION#<sessionId>` | Token de sesión |
| SK | `METADATA` | |
| GSI1PK | `USER#<userId>` | Para invalidar sesiones |
| GSI1SK | `SESSION` | |
| userId | String | Usuario |
| deviceInfo | String | Info del dispositivo |
| ipAddress | String | IP |
| createdAt | String | ISO timestamp |
| TTL | Number | Expiración automática |

---

## 📊 ÍNDICES GSI

### GSI1 (Global Secondary Index 1)
- **Uso**: Queries por plan, categoría, listados
- **PK**: GSI1PK
- **SK**: GSI1SK
- **Proyección**: ALL

### GSI2 (Global Secondary Index 2)
- **Uso**: Búsqueda por email, username, ciudad
- **PK**: GSI2PK
- **SK**: GSI2SK
- **Proyección**: ALL

---

## 🗂️ ESTRUCTURA DE CARPETAS S3

```
s3://salaoscura-media/
├── photos/
│   └── {userId}/
│       ├── profile/
│       │   ├── photo-1.jpg
│       │   ├── photo-2.jpg
│       │   └── thumbnails/
│       └── stories/
│           └── story-123.jpg
├── videos/
│   └── {userId}/
│       ├── promo-video.mp4
│       └── thumbnails/
├── verification/  (PRIVADO - sin acceso público)
│   └── {userId}/
│       ├── selfie.jpg
│       └── document.jpg
└── receipts/  (PRIVADO)
    └── {userId}/
        └── receipt-2026-01.jpg
```

---

## 💰 ESTIMACIÓN DE COSTOS

### DynamoDB On-Demand
- **Escrituras**: $1.25 por millón de WCU
- **Lecturas**: $0.25 por millón de RCU
- **Almacenamiento**: $0.25 por GB/mes

### S3
- **Almacenamiento**: $0.023 por GB/mes
- **Requests**: $0.0004 por 1000 GET

### Para 1000 perfiles activos:
- DynamoDB: ~$5-15/mes
- S3 (50GB media): ~$2/mes
- CloudFront: ~$10/mes
- **Total estimado**: ~$20-30/mes inicial

---

## 🔐 POLÍTICAS DE SEGURIDAD

1. **Datos de verificación**: Bucket S3 privado, sin acceso público
2. **Passwords**: Siempre hasheados con bcrypt (nunca texto plano)
3. **Sesiones**: TTL de 24h, invalidación en logout
4. **Media público**: CloudFront con signed URLs opcionales
5. **Admin**: IAM roles separados con mínimo privilegio
