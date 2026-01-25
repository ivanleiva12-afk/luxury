const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);
const s3 = new S3Client({});
const ses = new SESClient({});

// Función para encriptar contraseñas con SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Tablas
const TABLES = {
  profiles: 'salaoscura-profiles',
  users: 'salaoscura-users',
  registros: 'salaoscura-registros',
  config: 'salaoscura-config',
  messages: 'salaoscura-messages',
  media: 'salaoscura-media',
  foroPosts: 'salaoscura-foro-posts',
  foroUsers: 'salaoscura-foro-users',
  stories: 'salaoscura-stories'
};

const S3_BUCKET = 'salaoscura-media';
const SES_FROM_EMAIL = 'noreply@salanegra.com';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const method = event.httpMethod;
  
  // Parsear path - siempre usar event.path para obtener la ruta completa
  // event.path contiene la ruta completa: /auth/login, /profiles/123, etc.
  const fullPath = event.path || '';
  const pathParts = fullPath.split('/').filter(p => p);
  
  // Para rutas como /prod/auth/login, eliminar "prod" si existe
  if (pathParts[0] === 'prod') {
    pathParts.shift();
  }
  
  const resource = pathParts[0]; // profiles, users, registros, auth, etc.
  const id = pathParts[1]; // id o sub-recurso como "login"
  
  try {
    // CORS preflight
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // ═══════════════════════════════════════════════════════════
    // PROFILES - Perfiles de escorts aprobados
    // ═══════════════════════════════════════════════════════════
    if (resource === 'profiles') {
      if (method === 'GET' && !id) {
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.profiles }));
        return success(result.Items || []);
      }
      if (method === 'GET' && id) {
        const result = await dynamodb.send(new GetCommand({ TableName: TABLES.profiles, Key: { id } }));
        return result.Item ? success(result.Item) : notFound('Perfil no encontrado');
      }
      if (method === 'POST') {
        const body = JSON.parse(event.body);
        const item = { ...body, id: body.id || `profile-${Date.now()}`, createdAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.profiles, Item: item }));
        return success(item, 201);
      }
      if (method === 'PUT' && id) {
        const body = JSON.parse(event.body);
        const item = { ...body, id, updatedAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.profiles, Item: item }));
        return success(item);
      }
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.profiles, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // USERS - Usuarios para login (escorts aprobadas)
    // ═══════════════════════════════════════════════════════════
    if (resource === 'users') {
      if (method === 'GET' && !id) {
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.users }));
        // No devolver passwords en listados
        const safeUsers = (result.Items || []).map(({ password, ...user }) => user);
        return success(safeUsers);
      }
      if (method === 'GET' && id) {
        const result = await dynamodb.send(new GetCommand({ TableName: TABLES.users, Key: { id } }));
        if (result.Item) {
          const { password, ...safeUser } = result.Item;
          return success(safeUser);
        }
        return notFound('Usuario no encontrado');
      }
      if (method === 'POST') {
        const body = JSON.parse(event.body);
        // Encriptar contraseña antes de guardar
        const item = { 
          ...body, 
          id: body.id || body.email || `user-${Date.now()}`, 
          password: body.password ? hashPassword(body.password) : undefined,
          createdAt: new Date().toISOString() 
        };
        await dynamodb.send(new PutCommand({ TableName: TABLES.users, Item: item }));
        const { password, ...safeItem } = item;
        return success(safeItem, 201);
      }
      if (method === 'PUT' && id) {
        const body = JSON.parse(event.body);
        // Si viene password, encriptarla
        const item = { 
          ...body, 
          id, 
          password: body.password ? hashPassword(body.password) : body.passwordHash,
          updatedAt: new Date().toISOString() 
        };
        await dynamodb.send(new PutCommand({ TableName: TABLES.users, Item: item }));
        const { password, ...safeItem } = item;
        return success(safeItem);
      }
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.users, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // REGISTROS - Registros pendientes de aprobación
    // ═══════════════════════════════════════════════════════════
    if (resource === 'registros') {
      if (method === 'GET' && !id) {
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.registros }));
        return success(result.Items || []);
      }
      if (method === 'GET' && id) {
        const result = await dynamodb.send(new GetCommand({ TableName: TABLES.registros, Key: { id } }));
        return result.Item ? success(result.Item) : notFound('Registro no encontrado');
      }
      if (method === 'POST') {
        const body = JSON.parse(event.body);
        const item = { ...body, id: body.id || `reg-${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.registros, Item: item }));
        return success(item, 201);
      }
      if (method === 'PUT' && id) {
        const body = JSON.parse(event.body);
        const item = { ...body, id, updatedAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.registros, Item: item }));
        return success(item);
      }
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.registros, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // CONFIG - Configuración del sitio
    // ═══════════════════════════════════════════════════════════
    if (resource === 'config') {
      if (method === 'GET' && !id) {
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.config }));
        return success(result.Items || []);
      }
      if (method === 'GET' && id) {
        const result = await dynamodb.send(new GetCommand({ TableName: TABLES.config, Key: { key: id } }));
        return result.Item ? success(result.Item) : success({ key: id, value: null });
      }
      if (method === 'POST' || method === 'PUT') {
        const body = JSON.parse(event.body);
        const key = id || body.key;
        const item = { key, ...body, updatedAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.config, Item: item }));
        return success(item);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MESSAGES - Mensajes de contacto
    // ═══════════════════════════════════════════════════════════
    if (resource === 'messages') {
      if (method === 'GET' && !id) {
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.messages }));
        return success(result.Items || []);
      }
      if (method === 'POST') {
        const body = JSON.parse(event.body);
        const item = { ...body, id: `msg-${Date.now()}`, createdAt: new Date().toISOString(), read: false };
        await dynamodb.send(new PutCommand({ TableName: TABLES.messages, Item: item }));
        return success(item, 201);
      }
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.messages, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // MEDIA - Fotos y videos (metadata + URLs firmadas para S3)
    // ═══════════════════════════════════════════════════════════
    if (resource === 'media') {
      // GET /media?userId=xxx - Obtener media de un usuario
      if (method === 'GET' && !id) {
        const userId = event.queryStringParameters?.userId;
        if (userId) {
          const result = await dynamodb.send(new ScanCommand({ 
            TableName: TABLES.media,
            FilterExpression: 'userId = :userId',
            ExpressionAttributeValues: { ':userId': userId }
          }));
          return success(result.Items || []);
        }
        const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.media }));
        return success(result.Items || []);
      }
      
      // POST /media/upload-url - Generar URL firmada para subir a S3
      if (method === 'POST' && id === 'upload-url') {
        const body = JSON.parse(event.body);
        const { fileName, fileType, userId } = body;
        const key = `${userId}/${Date.now()}-${fileName}`;
        
        const command = new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          ContentType: fileType
        });
        
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        const publicUrl = `https://${S3_BUCKET}.s3.amazonaws.com/${key}`;
        
        return success({ uploadUrl, publicUrl, key });
      }
      
      // POST /media - Guardar metadata del archivo subido
      if (method === 'POST' && !id) {
        const body = JSON.parse(event.body);
        const item = { 
          ...body, 
          id: `media-${Date.now()}`, 
          createdAt: new Date().toISOString() 
        };
        await dynamodb.send(new PutCommand({ TableName: TABLES.media, Item: item }));
        return success(item, 201);
      }
      
      // DELETE /media/{id}
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.media, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // AUTH - Autenticación simple
    // ═══════════════════════════════════════════════════════════
    if (resource === 'auth') {
      // POST /auth/login
      if (method === 'POST' && id === 'login') {
        const body = JSON.parse(event.body);
        const { email, password } = body;
        
        // Buscar usuario por email
        const result = await dynamodb.send(new ScanCommand({
          TableName: TABLES.users,
          FilterExpression: 'email = :email',
          ExpressionAttributeValues: { ':email': email }
        }));
        
        const user = result.Items?.[0];
        // Comparar password encriptado
        const hashedPassword = hashPassword(password);
        if (!user || user.password !== hashedPassword) {
          return error('Credenciales inválidas', 401);
        }
        
        // No devolver password
        const { password: _, ...safeUser } = user;
        return success({ user: safeUser, token: `token-${Date.now()}` });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // EMAIL - Envío de correos con AWS SES
    // ═══════════════════════════════════════════════════════════
    if (resource === 'email') {
      // POST /email/send
      if (method === 'POST' && id === 'send') {
        const body = JSON.parse(event.body);
        const { to, subject, message, html } = body;
        
        // Obtener email configurado desde config
        const configResult = await dynamodb.send(new GetCommand({ 
          TableName: TABLES.config, 
          Key: { key: 'sesFromEmail' } 
        }));
        const fromEmail = configResult.Item?.value || SES_FROM_EMAIL;
        
        const params = {
          Source: fromEmail,
          Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
          Message: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: message, Charset: 'UTF-8' },
              ...(html && { Html: { Data: html, Charset: 'UTF-8' } })
            }
          }
        };
        
        try {
          await ses.send(new SendEmailCommand(params));
          return success({ message: 'Email enviado correctamente' });
        } catch (sesError) {
          console.error('Error SES:', sesError);
          return error(`Error enviando email: ${sesError.message}`, 500);
        }
      }
      
      // POST /email/contact - Recibir mensaje de contacto y notificar admin
      if (method === 'POST' && id === 'contact') {
        const body = JSON.parse(event.body);
        const { name, email: senderEmail, phone, message } = body;
        
        // Guardar mensaje en DynamoDB
        const msgItem = {
          id: `msg-${Date.now()}`,
          name,
          email: senderEmail,
          phone,
          message,
          createdAt: new Date().toISOString(),
          read: false
        };
        await dynamodb.send(new PutCommand({ TableName: TABLES.messages, Item: msgItem }));
        
        // Obtener email admin para notificar
        const configResult = await dynamodb.send(new GetCommand({ 
          TableName: TABLES.config, 
          Key: { key: 'adminEmail' } 
        }));
        const adminEmail = configResult.Item?.value;
        
        if (adminEmail) {
          const fromEmailConfig = await dynamodb.send(new GetCommand({ 
            TableName: TABLES.config, 
            Key: { key: 'sesFromEmail' } 
          }));
          const fromEmail = fromEmailConfig.Item?.value || SES_FROM_EMAIL;
          
          try {
            await ses.send(new SendEmailCommand({
              Source: fromEmail,
              Destination: { ToAddresses: [adminEmail] },
              Message: {
                Subject: { Data: `Nuevo mensaje de contacto de ${name}`, Charset: 'UTF-8' },
                Body: {
                  Html: { 
                    Data: `
                      <h2>Nuevo mensaje de contacto</h2>
                      <p><strong>Nombre:</strong> ${name}</p>
                      <p><strong>Email:</strong> ${senderEmail}</p>
                      <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
                      <p><strong>Mensaje:</strong></p>
                      <p>${message}</p>
                    `, 
                    Charset: 'UTF-8' 
                  }
                }
              }
            }));
          } catch (sesError) {
            console.error('Error notificando admin:', sesError);
            // No fallar si el email no se envía
          }
        }
        
        return success({ message: 'Mensaje recibido correctamente', id: msgItem.id }, 201);
      }
    }

    // ═══════════════════════════════════════════════════════════
    // FORO - Posts del foro Sala Oscura
    // ═══════════════════════════════════════════════════════════
    if (resource === 'foro') {
      const subResource = pathParts[1]; // posts, users
      const subId = pathParts[2];
      
      // /foro/posts
      if (subResource === 'posts') {
        if (method === 'GET' && !subId) {
          const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.foroPosts }));
          return success(result.Items || []);
        }
        if (method === 'GET' && subId) {
          const result = await dynamodb.send(new GetCommand({ TableName: TABLES.foroPosts, Key: { id: subId } }));
          return result.Item ? success(result.Item) : notFound('Post no encontrado');
        }
        if (method === 'POST') {
          const body = JSON.parse(event.body);
          const item = { 
            ...body, 
            id: body.id || `post-${Date.now()}`, 
            createdAt: new Date().toISOString(),
            replies: body.replies || [],
            likes: body.likes || 0
          };
          await dynamodb.send(new PutCommand({ TableName: TABLES.foroPosts, Item: item }));
          return success(item, 201);
        }
        if (method === 'PUT' && subId) {
          const body = JSON.parse(event.body);
          const item = { ...body, id: subId, updatedAt: new Date().toISOString() };
          await dynamodb.send(new PutCommand({ TableName: TABLES.foroPosts, Item: item }));
          return success(item);
        }
        if (method === 'DELETE' && subId) {
          await dynamodb.send(new DeleteCommand({ TableName: TABLES.foroPosts, Key: { id: subId } }));
          return success({ message: 'Eliminado' });
        }
      }
      
      // /foro/users - Usuarios del foro (separados de escorts)
      if (subResource === 'users') {
        if (method === 'GET' && !subId) {
          const result = await dynamodb.send(new ScanCommand({ TableName: TABLES.foroUsers }));
          const safeUsers = (result.Items || []).map(({ password, ...user }) => user);
          return success(safeUsers);
        }
        if (method === 'GET' && subId) {
          const result = await dynamodb.send(new GetCommand({ TableName: TABLES.foroUsers, Key: { id: subId } }));
          if (result.Item) {
            const { password, ...safeUser } = result.Item;
            return success(safeUser);
          }
          return notFound('Usuario no encontrado');
        }
        if (method === 'POST') {
          const body = JSON.parse(event.body);
          const item = { 
            ...body, 
            id: body.id || body.username || `foro-user-${Date.now()}`,
            password: body.password ? hashPassword(body.password) : undefined,
            createdAt: new Date().toISOString() 
          };
          await dynamodb.send(new PutCommand({ TableName: TABLES.foroUsers, Item: item }));
          const { password, ...safeItem } = item;
          return success(safeItem, 201);
        }
        if (method === 'DELETE' && subId) {
          await dynamodb.send(new DeleteCommand({ TableName: TABLES.foroUsers, Key: { id: subId } }));
          return success({ message: 'Eliminado' });
        }
      }
      
      // /foro/login - Login de usuarios del foro
      if (subResource === 'login' && method === 'POST') {
        const body = JSON.parse(event.body);
        const { username, password } = body;
        
        const result = await dynamodb.send(new ScanCommand({
          TableName: TABLES.foroUsers,
          FilterExpression: 'username = :username',
          ExpressionAttributeValues: { ':username': username }
        }));
        
        const user = result.Items?.[0];
        const hashedPassword = hashPassword(password);
        if (!user || user.password !== hashedPassword) {
          return error('Credenciales inválidas', 401);
        }
        
        const { password: _, ...safeUser } = user;
        return success({ user: safeUser });
      }
    }

    // ═══════════════════════════════════════════════════════════
    // STORIES - Instantes y Estados (stories)
    // ═══════════════════════════════════════════════════════════
    if (resource === 'stories') {
      // GET /stories?userId=xxx o GET /stories (todos)
      if (method === 'GET' && !id) {
        const userId = event.queryStringParameters?.userId;
        const type = event.queryStringParameters?.type; // 'instante' o 'estado'
        
        let filterExpression = '';
        let expressionValues = {};
        
        if (userId) {
          filterExpression = 'userId = :userId';
          expressionValues[':userId'] = userId;
        }
        if (type) {
          filterExpression += filterExpression ? ' AND #type = :type' : '#type = :type';
          expressionValues[':type'] = type;
        }
        
        const scanParams = { TableName: TABLES.stories };
        if (filterExpression) {
          scanParams.FilterExpression = filterExpression;
          scanParams.ExpressionAttributeValues = expressionValues;
          if (type) {
            scanParams.ExpressionAttributeNames = { '#type': 'type' };
          }
        }
        
        const result = await dynamodb.send(new ScanCommand(scanParams));
        return success(result.Items || []);
      }
      
      // GET /stories/{id}
      if (method === 'GET' && id) {
        const result = await dynamodb.send(new GetCommand({ TableName: TABLES.stories, Key: { id } }));
        return result.Item ? success(result.Item) : notFound('Story no encontrada');
      }
      
      // POST /stories
      if (method === 'POST') {
        const body = JSON.parse(event.body);
        const item = { 
          ...body, 
          id: body.id || `story-${Date.now()}`,
          createdAt: new Date().toISOString(),
          expiresAt: body.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        };
        await dynamodb.send(new PutCommand({ TableName: TABLES.stories, Item: item }));
        return success(item, 201);
      }
      
      // PUT /stories/{id}
      if (method === 'PUT' && id) {
        const body = JSON.parse(event.body);
        const item = { ...body, id, updatedAt: new Date().toISOString() };
        await dynamodb.send(new PutCommand({ TableName: TABLES.stories, Item: item }));
        return success(item);
      }
      
      // DELETE /stories/{id}
      if (method === 'DELETE' && id) {
        await dynamodb.send(new DeleteCommand({ TableName: TABLES.stories, Key: { id } }));
        return success({ message: 'Eliminado' });
      }
    }

    return notFound('Ruta no encontrada');
    
  } catch (err) {
    console.error('Error:', err);
    return error(err.message, 500);
  }
};

// Helpers
function success(data, statusCode = 200) {
  return { statusCode, headers, body: JSON.stringify(data) };
}

function error(message, statusCode = 400) {
  return { statusCode, headers, body: JSON.stringify({ error: message }) };
}

function notFound(message) {
  return { statusCode: 404, headers, body: JSON.stringify({ error: message }) };
}
