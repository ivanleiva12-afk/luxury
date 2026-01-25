const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'salaoscura-foro';

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
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // GET /threads - Obtener todos los threads de Sala Oscura
    if (method === 'GET' && path === '/threads') {
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: 'forumType = :type',
        ExpressionAttributeValues: { ':type': 'salaoscura' }
      }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // GET /threads/{id} - Obtener un thread específico
    if (method === 'GET' && path.startsWith('/threads/')) {
      const id = path.split('/')[2];
      const result = await dynamodb.get({ TableName: TABLE_NAME, Key: { id } }).promise();
      
      if (!result.Item) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Thread no encontrado' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(result.Item) };
    }
    
    // POST /threads - Crear nuevo thread
    if (method === 'POST' && path === '/threads') {
      const body = JSON.parse(event.body);
      const id = `thread-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const item = {
        id,
        ...body,
        forumType: 'salaoscura',
        comments: [],
        createdAt: new Date().toISOString(),
        viewCount: 0
      };
      
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    
    // PUT /threads/{id} - Actualizar thread (agregar comentario, etc)
    if (method === 'PUT' && path.startsWith('/threads/')) {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body);
      const item = { ...body, id, updatedAt: new Date().toISOString() };
      
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }
    
    // PUT /threads - Actualizar todos los threads
    if (method === 'PUT' && path === '/threads') {
      const threads = JSON.parse(event.body);
      
      for (const thread of threads) {
        await dynamodb.put({ TableName: TABLE_NAME, Item: thread }).promise();
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(threads) };
    }
    
    // DELETE /threads/{id} - Eliminar thread
    if (method === 'DELETE' && path.startsWith('/threads/')) {
      const id = path.split('/')[2];
      await dynamodb.delete({ TableName: TABLE_NAME, Key: { id } }).promise();
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Thread eliminado' }) };
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
