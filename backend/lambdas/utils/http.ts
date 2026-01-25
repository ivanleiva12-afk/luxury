/**
 * 🛠️ HTTP Utilities - Sala Oscura API
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Create standardized API response
 */
export function response(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    body: JSON.stringify(body)
  };
}

/**
 * Parse request body safely
 */
export function parseBody<T = any>(body: string | null): T {
  if (!body) return {} as T;
  
  try {
    return JSON.parse(body) as T;
  } catch (error) {
    console.error('Failed to parse body:', error);
    return {} as T;
  }
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

/**
 * Get query parameter with default value
 */
export function getQueryParam(
  event: APIGatewayProxyEvent, 
  name: string, 
  defaultValue: string = ''
): string {
  return event.queryStringParameters?.[name] || defaultValue;
}

/**
 * Get numeric query parameter
 */
export function getNumericQueryParam(
  event: APIGatewayProxyEvent, 
  name: string, 
  defaultValue: number,
  max?: number
): number {
  const value = parseInt(event.queryStringParameters?.[name] || '', 10);
  if (isNaN(value)) return defaultValue;
  if (max !== undefined && value > max) return max;
  return value;
}

/**
 * Get path parameter
 */
export function getPathParam(event: APIGatewayProxyEvent, name: string): string | undefined {
  return event.pathParameters?.[name];
}

/**
 * Validate required fields
 */
export function validateRequired(data: Record<string, any>, fields: string[]): string[] {
  const missing: string[] = [];
  
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missing.push(field);
    }
  }
  
  return missing;
}

/**
 * Create validation error response
 */
export function validationError(errors: Array<{ field: string; message: string }>): APIGatewayProxyResult {
  return response(422, {
    error: 'VALIDATION_ERROR',
    message: 'Datos inválidos',
    details: errors
  });
}

/**
 * Create not found error response
 */
export function notFoundError(message: string = 'Recurso no encontrado'): APIGatewayProxyResult {
  return response(404, {
    error: 'NOT_FOUND',
    message
  });
}

/**
 * Create unauthorized error response
 */
export function unauthorizedError(message: string = 'No autorizado'): APIGatewayProxyResult {
  return response(401, {
    error: 'UNAUTHORIZED',
    message
  });
}

/**
 * Create forbidden error response
 */
export function forbiddenError(message: string = 'Acceso denegado'): APIGatewayProxyResult {
  return response(403, {
    error: 'FORBIDDEN',
    message
  });
}

/**
 * CORS preflight response
 */
export function corsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Requested-With',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Max-Age': '86400'
    },
    body: ''
  };
}
