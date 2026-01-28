const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'salaoscura-registros';

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
    
    // GET /registros/pending - Obtener registros pendientes
    if (method === 'GET' && path === '/registros/pending') {
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':status': 'pending' }
      }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // GET /registros - Obtener todos los registros
    if (method === 'GET' && path === '/registros') {
      const result = await dynamodb.scan({ TableName: TABLE_NAME }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // POST /registros - Crear registro
    if (method === 'POST' && path === '/registros') {
      const body = JSON.parse(event.body);
      // IMPORTANTE: Usar el ID que viene del frontend, no generar uno nuevo
      // Esto evita que se pierda la referencia del ID original
      const id = body.id || body.email || `reg-${Date.now()}`;
      // Respetar el status que viene del frontend ('pendiente' en español)
      const status = body.status || 'pendiente';
      const item = { ...body, id, status, createdAt: new Date().toISOString() };

      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    
    // PUT /registros/pending - Actualizar registros pendientes
    if (method === 'PUT' && path === '/registros/pending') {
      const registros = JSON.parse(event.body);
      
      for (const reg of registros) {
        await dynamodb.put({ TableName: TABLE_NAME, Item: reg }).promise();
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(registros) };
    }
    
    // PUT /registros/{id} - Actualizar un registro
    if (method === 'PUT' && path.startsWith('/registros/') && path !== '/registros/pending') {
      const id = path.split('/')[2];
      const body = JSON.parse(event.body);
      const item = { ...body, id, updatedAt: new Date().toISOString() };
      
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(item) };
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
