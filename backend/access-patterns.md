# 🔍 DynamoDB Access Patterns - Sala Oscura

## Resumen de Queries por Funcionalidad

Este documento detalla los patrones de acceso necesarios para cada funcionalidad del sistema.

---

## 🔐 AUTENTICACIÓN

### Login por Email
```javascript
// Query GSI1
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :email',
  ExpressionAttributeValues: {
    ':email': 'EMAIL#user@email.com'
  }
}
```

### Login por Username
```javascript
// Query GSI2
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :username',
  ExpressionAttributeValues: {
    ':username': 'USERNAME#camila_vip'
  }
}
```

### Obtener Usuario por ID
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'USER#uuid-123',
    SK: 'PROFILE'
  }
}
```

### Crear Sesión
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'SESSION#token-uuid',
    SK: 'METADATA',
    GSI1PK: 'USER#user-uuid',
    GSI1SK: 'SESSION',
    userId: 'user-uuid',
    createdAt: '2026-01-15T10:00:00Z',
    TTL: 1737100800  // 24 horas después
  }
}
```

### Invalidar Todas las Sesiones de Usuario
```javascript
// Query para obtener todas las sesiones
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :user AND GSI1SK = :type',
  ExpressionAttributeValues: {
    ':user': 'USER#user-uuid',
    ':type': 'SESSION'
  }
}
// Luego BatchDelete de cada sesión
```

---

## 📸 PERFILES (Carruseles)

### Obtener Perfil por ID
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'USER#user-uuid',
    SK: 'PUBLIC_PROFILE'
  }
}
```

### Listar Perfiles por Plan (para carruseles)
```javascript
// Query GSI1 - Ordenados por fecha (más recientes primero)
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :plan',
  ExpressionAttributeValues: {
    ':plan': 'PLAN#luxury'
  },
  FilterExpression: 'profileVisible = :visible',
  ExpressionAttributeValues: {
    ':visible': true
  },
  ScanIndexForward: false,  // DESC order
  Limit: 20
}
```

### Listar Perfiles por Ciudad
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :city',
  ExpressionAttributeValues: {
    ':city': 'CITY#Santiago'
  },
  FilterExpression: 'profileVisible = :visible',
  ExpressionAttributeValues: {
    ':visible': true
  }
}
```

### Actualizar Stats del Perfil (Views, Likes)
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'USER#user-uuid',
    SK: 'PUBLIC_PROFILE'
  },
  UpdateExpression: 'SET stats.#stat = stats.#stat + :inc',
  ExpressionAttributeNames: {
    '#stat': 'views'  // o 'likes'
  },
  ExpressionAttributeValues: {
    ':inc': 1
  }
}
```

### Toggle Like (Add/Remove)
```javascript
// Agregar like
{
  UpdateExpression: 'SET stats.likes = stats.likes + :inc ADD likedBy :userId',
  ExpressionAttributeValues: {
    ':inc': 1,
    ':userId': SS(['user-who-liked'])
  }
}

// Quitar like
{
  UpdateExpression: 'SET stats.likes = stats.likes - :dec DELETE likedBy :userId',
  ExpressionAttributeValues: {
    ':dec': 1,
    ':userId': SS(['user-who-liked'])
  }
}
```

---

## 📷 MEDIA (Fotos y Videos)

### Obtener Media de un Usuario
```javascript
{
  TableName: 'SalaOscura-Main',
  KeyConditionExpression: 'PK = :pk AND begins_with(SK, :media)',
  ExpressionAttributeValues: {
    ':pk': 'USER#user-uuid',
    ':media': 'MEDIA#'
  },
  FilterExpression: 'category = :cat',
  ExpressionAttributeValues: {
    ':cat': 'profile'
  }
}
```

### Agregar Media
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'USER#user-uuid',
    SK: 'MEDIA#media-uuid',
    mediaId: 'media-uuid',
    mediaType: 'photo',
    category: 'profile',
    s3Key: 'photos/user-uuid/photo-1.jpg',
    s3Bucket: 'salaoscura-media',
    isPublic: true,
    order: 1,
    uploadedAt: '2026-01-15T10:00:00Z'
  }
}
```

### Reordenar Media
```javascript
// Transaction para actualizar múltiples items
{
  TransactItems: [
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'USER#uuid', SK: 'MEDIA#photo1' },
        UpdateExpression: 'SET #order = :order',
        ExpressionAttributeNames: { '#order': 'order' },
        ExpressionAttributeValues: { ':order': 1 }
      }
    },
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'USER#uuid', SK: 'MEDIA#photo2' },
        UpdateExpression: 'SET #order = :order',
        ExpressionAttributeNames: { '#order': 'order' },
        ExpressionAttributeValues: { ':order': 2 }
      }
    }
  ]
}
```

---

## 💳 SUSCRIPCIONES

### Obtener Suscripción Activa
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'USER#user-uuid',
    SK: 'SUBSCRIPTION#CURRENT'
  }
}
```

### Crear/Renovar Suscripción
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'USER#user-uuid',
    SK: 'SUBSCRIPTION#CURRENT',
    GSI1PK: 'PLAN#vip',
    GSI1SK: '2026-02-15',  // expiryDate
    planType: 'vip',
    status: 'active',
    startDate: '2026-01-15',
    expiryDate: '2026-02-15',
    duration: 30,
    price: 79990,
    currency: 'CLP',
    limits: { photos: 10, videos: 2, stories: 2, instants: 3 },
    usage: { photosUsed: 0, videosUsed: 0, storiesUsed: 0, instantsUsed: 0 }
  }
}
```

### Registrar Pago en Historial
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'USER#user-uuid',
    SK: 'PAYMENT#2026-01-15T10:00:00Z',
    paymentId: 'pay-uuid',
    planType: 'vip',
    amount: 79990,
    currency: 'CLP',
    method: 'transfer',
    status: 'completed',
    createdAt: '2026-01-15T10:00:00Z'
  }
}
```

### Listar Suscripciones por Vencer (Admin)
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :plan AND GSI1SK <= :date',
  ExpressionAttributeValues: {
    ':plan': 'PLAN#vip',
    ':date': '2026-01-20'  // próximos 5 días
  }
}
```

### Incrementar Uso de Límites
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'USER#user-uuid',
    SK: 'SUBSCRIPTION#CURRENT'
  },
  UpdateExpression: 'SET usage.photosUsed = usage.photosUsed + :inc',
  ConditionExpression: 'usage.photosUsed < limits.photos OR limits.photos = :zero',
  ExpressionAttributeValues: {
    ':inc': 1,
    ':zero': 0
  }
}
```

---

## 💬 FORO (SALA OSCURA)

### Crear Post
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'POST#post-uuid',
    SK: 'METADATA',
    GSI1PK: 'CATEGORY#general',
    GSI1SK: '2026-01-15T10:00:00Z',
    GSI2PK: 'AUTHOR#user-uuid',
    GSI2SK: '2026-01-15T10:00:00Z',
    postId: 'post-uuid',
    authorId: 'user-uuid',
    authorName: 'Cliente Anónimo',
    category: 'general',
    content: 'Contenido del post...',
    mentions: ['@camila_vip'],
    likes: 0,
    repliesCount: 0,
    isAnonymous: true,
    createdAt: '2026-01-15T10:00:00Z'
  }
}
```

### Listar Posts por Categoría
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :cat',
  ExpressionAttributeValues: {
    ':cat': 'CATEGORY#zona-clientas'
  },
  ScanIndexForward: false,  // Más recientes primero
  Limit: 20
}
```

### Listar Posts de un Autor
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI2',
  KeyConditionExpression: 'GSI2PK = :author',
  ExpressionAttributeValues: {
    ':author': 'AUTHOR#user-uuid'
  },
  ScanIndexForward: false
}
```

### Agregar Respuesta
```javascript
{
  TransactItems: [
    // Agregar respuesta
    {
      Put: {
        TableName: 'SalaOscura-Main',
        Item: {
          PK: 'POST#post-uuid',
          SK: 'REPLY#2026-01-15T11:00:00Z#reply-uuid',
          replyId: 'reply-uuid',
          postId: 'post-uuid',
          authorId: 'user-uuid',
          authorName: 'Camila VIP',
          content: 'Respuesta...',
          likes: 0,
          createdAt: '2026-01-15T11:00:00Z'
        }
      }
    },
    // Incrementar contador de respuestas
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'POST#post-uuid', SK: 'METADATA' },
        UpdateExpression: 'SET repliesCount = repliesCount + :inc',
        ExpressionAttributeValues: { ':inc': 1 }
      }
    }
  ]
}
```

### Obtener Post con Respuestas
```javascript
{
  TableName: 'SalaOscura-Main',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: {
    ':pk': 'POST#post-uuid'
  }
}
// Retorna METADATA y todas las REPLY#
```

---

## ⭐ RATINGS

### Crear Rating
```javascript
{
  TransactItems: [
    // Agregar rating
    {
      Put: {
        TableName: 'SalaOscura-Main',
        Item: {
          PK: 'RATING#escort-uuid',
          SK: '2026-01-15T10:00:00Z#rating-uuid',
          GSI1PK: 'RATER#client-uuid',
          GSI1SK: 'escort-uuid',
          ratingId: 'rating-uuid',
          escortId: 'escort-uuid',
          raterId: 'client-uuid',
          score: 5,
          categories: { attention: 5, hygiene: 5, punctuality: 5 },
          comment: 'Excelente experiencia',
          createdAt: '2026-01-15T10:00:00Z'
        }
      }
    },
    // Actualizar rating promedio del perfil
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'USER#escort-uuid', SK: 'PUBLIC_PROFILE' },
        UpdateExpression: 'SET stats.ratingCount = stats.ratingCount + :one, stats.rating = :newRating',
        ExpressionAttributeValues: {
          ':one': 1,
          ':newRating': 4.8  // Calculado previamente
        }
      }
    }
  ]
}
```

### Obtener Ratings de una Escort
```javascript
{
  TableName: 'SalaOscura-Main',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: {
    ':pk': 'RATING#escort-uuid'
  },
  ScanIndexForward: false,
  Limit: 50
}
```

### Verificar si Usuario ya Calificó
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :rater AND GSI1SK = :escort',
  ExpressionAttributeValues: {
    ':rater': 'RATER#client-uuid',
    ':escort': 'escort-uuid'
  }
}
```

---

## 📩 MENCIONES

### Crear Mención (cuando alguien es @mencionado)
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'MENTION#mentioned-user-uuid',
    SK: '2026-01-15T10:00:00Z#post-uuid',
    mentionedUserId: 'mentioned-user-uuid',
    mentionedBy: 'author-uuid',
    mentionedByName: 'Cliente Anónimo',
    postId: 'post-uuid',
    postType: 'post',
    preview: 'Hola @camila_vip, quería preguntar...',
    read: false,
    createdAt: '2026-01-15T10:00:00Z'
  }
}
```

### Obtener Menciones No Leídas
```javascript
{
  TableName: 'SalaOscura-Main',
  KeyConditionExpression: 'PK = :pk',
  FilterExpression: '#read = :false',
  ExpressionAttributeNames: { '#read': 'read' },
  ExpressionAttributeValues: {
    ':pk': 'MENTION#user-uuid',
    ':false': false
  },
  ScanIndexForward: false
}
```

### Marcar Mención como Leída
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'MENTION#user-uuid',
    SK: '2026-01-15T10:00:00Z#post-uuid'
  },
  UpdateExpression: 'SET #read = :true, readAt = :now',
  ExpressionAttributeNames: { '#read': 'read' },
  ExpressionAttributeValues: {
    ':true': true,
    ':now': '2026-01-15T12:00:00Z'
  }
}
```

---

## 🔥 STORIES

### Crear Story
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'STORY#user-uuid',
    SK: '2026-01-15T10:00:00Z#story-uuid',
    GSI1PK: 'ACTIVE_STORIES',
    GSI1SK: '2026-01-16T10:00:00Z',  // expiresAt (24h después)
    storyId: 'story-uuid',
    userId: 'user-uuid',
    type: 'story',
    mediaType: 'image',
    s3Key: 'photos/user-uuid/stories/story-uuid.jpg',
    caption: 'Hoy disponible!',
    viewCount: 0,
    createdAt: '2026-01-15T10:00:00Z',
    expiresAt: '2026-01-16T10:00:00Z',
    TTL: 1737100800  // epoch
  }
}
```

### Listar Todas las Stories Activas
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :active AND GSI1SK > :now',
  ExpressionAttributeValues: {
    ':active': 'ACTIVE_STORIES',
    ':now': '2026-01-15T10:00:00Z'
  }
}
```

### Listar Stories de un Usuario
```javascript
{
  TableName: 'SalaOscura-Main',
  KeyConditionExpression: 'PK = :pk',
  ExpressionAttributeValues: {
    ':pk': 'STORY#user-uuid'
  },
  ScanIndexForward: false
}
```

### Incrementar Views de Story
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'STORY#user-uuid',
    SK: '2026-01-15T10:00:00Z#story-uuid'
  },
  UpdateExpression: 'SET viewCount = viewCount + :inc ADD viewedBy :viewer',
  ExpressionAttributeValues: {
    ':inc': 1,
    ':viewer': SS(['viewer-user-uuid'])
  }
}
```

---

## ⚙️ CONFIGURACIÓN

### Obtener Configuración de Planes
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'CONFIG',
    SK: 'PLANS'
  }
}
```

### Actualizar Precios de Plan
```javascript
{
  TableName: 'SalaOscura-Main',
  Key: {
    PK: 'CONFIG',
    SK: 'PLANS'
  },
  UpdateExpression: 'SET plans.#plan.price = :price, updatedAt = :now, updatedBy = :admin',
  ExpressionAttributeNames: { '#plan': 'vip' },
  ExpressionAttributeValues: {
    ':price': 89990,
    ':now': '2026-01-15T10:00:00Z',
    ':admin': 'admin-uuid'
  }
}
```

### Validar Código de Descuento
```javascript
// Primero obtener la configuración
{
  TableName: 'SalaOscura-Main',
  Key: { PK: 'CONFIG', SK: 'DISCOUNTS' }
}

// En la aplicación: verificar si el código existe, no ha expirado, y no excedió maxUses
```

---

## 📧 MENSAJES DE CONTACTO

### Crear Mensaje
```javascript
{
  TableName: 'SalaOscura-Main',
  Item: {
    PK: 'MESSAGE#msg-uuid',
    SK: 'METADATA',
    GSI1PK: 'MESSAGES',
    GSI1SK: '2026-01-15T10:00:00Z',
    messageId: 'msg-uuid',
    name: 'Juan Pérez',
    email: 'juan@email.com',
    subject: 'Consulta sobre planes',
    message: 'Hola, quisiera saber...',
    read: false,
    replied: false,
    createdAt: '2026-01-15T10:00:00Z'
  }
}
```

### Listar Mensajes (Admin)
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :messages',
  ExpressionAttributeValues: {
    ':messages': 'MESSAGES'
  },
  ScanIndexForward: false,
  Limit: 50
}
```

---

## 🛡️ ADMIN PATTERNS

### Listar Usuarios Pendientes de Aprobación
```javascript
{
  TableName: 'SalaOscura-Main',
  IndexName: 'GSI1',
  KeyConditionExpression: 'GSI1PK = :status',
  ExpressionAttributeValues: {
    ':status': 'STATUS#pending'
  }
}
// Nota: Requiere agregar GSI1PK = STATUS#<status> a los usuarios
```

### Aprobar Usuario
```javascript
{
  TransactItems: [
    // Actualizar status del usuario
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'USER#user-uuid', SK: 'PROFILE' },
        UpdateExpression: 'SET #status = :approved, approvedAt = :now, approvedBy = :admin',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':approved': 'approved',
          ':now': '2026-01-15T10:00:00Z',
          ':admin': 'admin-uuid'
        }
      }
    },
    // Hacer visible el perfil público
    {
      Update: {
        TableName: 'SalaOscura-Main',
        Key: { PK: 'USER#user-uuid', SK: 'PUBLIC_PROFILE' },
        UpdateExpression: 'SET profileVisible = :true',
        ExpressionAttributeValues: { ':true': true }
      }
    }
  ]
}
```

---

## 📊 RESUMEN DE ÍNDICES

| Índice | PK Pattern | SK Pattern | Uso Principal |
|--------|------------|------------|---------------|
| **Table** | Entidad#ID | Tipo | GetItem directo |
| **GSI1** | Plan/Category/Status | Timestamp | Listados filtrados |
| **GSI2** | Email/Username/City | Identifier | Búsqueda por atributos únicos |

---

## 💡 BEST PRACTICES

1. **Siempre usar TransactWrite** para operaciones que requieren consistencia
2. **Usar TTL** para datos temporales (sesiones, stories, tokens)
3. **Proyectar solo atributos necesarios** en queries de listado
4. **Implementar paginación** con `LastEvaluatedKey`
5. **Usar ConditionExpression** para evitar race conditions
