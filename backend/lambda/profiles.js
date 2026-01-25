const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({});
const dynamodb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'salaoscura-profiles';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event));
  
  const method = event.httpMethod;
  const path = event.path;
  
  try {
    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // GET /profiles - Obtener todos los perfiles
    if (method === 'GET' && path === '/profiles') {
      const result = await dynamodb.send(new ScanCommand({ TableName: TABLE_NAME }));
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.Items || [])
      };
    }
    
    // GET /profiles/{id} - Obtener perfil por ID
    if (method === 'GET' && path.startsWith('/profiles/')) {
      const id = path.split('/')[2];
      const result = await dynamodb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { id }
      }));
      
      if (!result.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Perfil no encontrado' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
    }
    
    // POST /profiles - Crear perfil
    if (method === 'POST' && path === '/profiles') {
      const body = JSON.parse(event.body);
      const id = body.id || `profile-${Date.now()}`;
      const item = { ...body, id, createdAt: new Date().toISOString() };
      
      await dynamodb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    
    // PUT /profiles/{id} - Actualizar perfil
    if (method === 'PUT' && path.startsWith('/profiles/')) {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body);
      const item = { ...body, id, updatedAt: new Date().toISOString() };
      
      await dynamodb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      }));
      
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }
    
    // DELETE /profiles/{id} - Eliminar perfil
    if (method === 'DELETE' && path.startsWith('/profiles/')) {
      const id = path.split('/')[2];
      
      await dynamodb.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id }
      }));
      
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Perfil eliminado' }) };
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
