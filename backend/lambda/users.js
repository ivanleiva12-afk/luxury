const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'salaoscura-users';

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
    
    // GET /users - Obtener todos los usuarios
    if (method === 'GET' && path === '/users') {
      const result = await dynamodb.scan({ TableName: TABLE_NAME }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // POST /users - Crear usuario
    if (method === 'POST' && path === '/users') {
      const body = JSON.parse(event.body);
      const id = body.email || `user-${Date.now()}`;
      const item = { ...body, id, createdAt: new Date().toISOString() };
      
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    
    // PUT /users - Actualizar usuarios
    if (method === 'PUT' && path === '/users') {
      const users = JSON.parse(event.body);
      
      for (const user of users) {
        await dynamodb.put({ TableName: TABLE_NAME, Item: user }).promise();
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(users) };
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
