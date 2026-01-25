const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'salaoscura-messages';

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
  const queryParams = event.queryStringParameters || {};
  
  try {
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }
    
    // GET /messages?userId={userId} - Obtener mensajes de un usuario
    if (method === 'GET' && path === '/messages') {
      const userId = queryParams.userId;
      
      if (userId) {
        const result = await dynamodb.scan({
          TableName: TABLE_NAME,
          FilterExpression: 'userId = :userId OR recipientId = :userId',
          ExpressionAttributeValues: { ':userId': userId }
        }).promise();
        return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
      }
      
      const result = await dynamodb.scan({ TableName: TABLE_NAME }).promise();
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // GET /messages/conversation/{recipientId}?userId={userId}
    if (method === 'GET' && path.startsWith('/messages/conversation/')) {
      const recipientId = path.split('/')[3];
      const userId = queryParams.userId;
      
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId requerido' }) };
      }
      
      const conversationId = [userId, recipientId].sort().join('-');
      
      const result = await dynamodb.scan({
        TableName: TABLE_NAME,
        FilterExpression: 'conversationId = :convId',
        ExpressionAttributeValues: { ':convId': conversationId }
      }).promise();
      
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }
    
    // POST /messages - Enviar mensaje
    if (method === 'POST' && path === '/messages') {
      const body = JSON.parse(event.body);
      const { userId, recipientId, content, senderName } = body;
      
      const conversationId = [userId, recipientId].sort().join('-');
      const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const item = {
        id,
        conversationId,
        userId,
        recipientId,
        senderName,
        content,
        read: false,
        createdAt: new Date().toISOString()
      };
      
      await dynamodb.put({ TableName: TABLE_NAME, Item: item }).promise();
      return { statusCode: 201, headers, body: JSON.stringify(item) };
    }
    
    // PUT /messages/{id}/read - Marcar mensaje como leído
    if (method === 'PUT' && path.match(/\/messages\/[\w-]+\/read/)) {
      const id = path.split('/')[2];
      
      await dynamodb.update({
        TableName: TABLE_NAME,
        Key: { id },
        UpdateExpression: 'SET #read = :read',
        ExpressionAttributeNames: { '#read': 'read' },
        ExpressionAttributeValues: { ':read': true }
      }).promise();
      
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Mensaje marcado como leído' }) };
    }
    
    // PUT /messages - Guardar todos los mensajes (sync)
    if (method === 'PUT' && path === '/messages') {
      const messages = JSON.parse(event.body);
      
      for (const msg of messages) {
        await dynamodb.put({ TableName: TABLE_NAME, Item: msg }).promise();
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(messages) };
    }
    
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };
    
  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
