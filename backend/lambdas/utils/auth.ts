/**
 * 🔐 Auth Utilities - Sala Oscura API
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'SalaOscura-Main';

// Initialize verifier
const verifier = CognitoJwtVerifier.create({
  userPoolId: USER_POOL_ID,
  tokenUse: 'access',
  clientId: CLIENT_ID
});

// DynamoDB client
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export interface TokenPayload {
  sub: string;
  'cognito:username': string;
  'custom:userId': string;
  'custom:userType': string;
  email: string;
  token_use: string;
  auth_time: number;
  exp: number;
  iat: number;
}

/**
 * Verify JWT token and return payload
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verifier.verify(token);
    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Extract userId from token
 */
export async function extractUserId(token: string | null): Promise<string | null> {
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  return payload['custom:userId'] || null;
}

/**
 * Extract userType from token
 */
export async function extractUserType(token: string | null): Promise<string | null> {
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  return payload['custom:userType'] || null;
}

/**
 * Check if user is admin
 */
export async function isAdmin(token: string | null): Promise<boolean> {
  const userType = await extractUserType(token);
  return userType === 'admin';
}

/**
 * Check if user is escort
 */
export async function isEscort(token: string | null): Promise<boolean> {
  const userType = await extractUserType(token);
  return userType === 'escort';
}

/**
 * Get full user data from DynamoDB
 */
export async function getUserData(userId: string): Promise<any | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' }
    }));
    
    return result.Item || null;
  } catch (error) {
    console.error('Failed to get user data:', error);
    return null;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'SUBSCRIPTION#CURRENT' }
    }));
    
    if (!result.Item) return false;
    
    const subscription = result.Item;
    if (subscription.status !== 'active') return false;
    
    const expiryDate = new Date(subscription.expiryDate);
    return expiryDate > new Date();
  } catch (error) {
    console.error('Failed to check subscription:', error);
    return false;
  }
}

/**
 * Check subscription limits
 */
export async function checkSubscriptionLimit(
  userId: string, 
  limitType: 'photos' | 'videos' | 'stories' | 'instants'
): Promise<{ allowed: boolean; current: number; max: number }> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'SUBSCRIPTION#CURRENT' }
    }));
    
    if (!result.Item) {
      return { allowed: false, current: 0, max: 0 };
    }
    
    const subscription = result.Item;
    const usageField = `${limitType}Used` as keyof typeof subscription.usage;
    const limitField = limitType as keyof typeof subscription.limits;
    
    const current = subscription.usage?.[usageField] || 0;
    const max = subscription.limits?.[limitField] || 0;
    
    // 0 means unlimited
    const allowed = max === 0 || current < max;
    
    return { allowed, current, max };
  } catch (error) {
    console.error('Failed to check subscription limit:', error);
    return { allowed: false, current: 0, max: 0 };
  }
}

/**
 * Middleware-style auth check
 */
export async function requireAuth(token: string | null): Promise<{ 
  authorized: boolean; 
  userId?: string; 
  userType?: string;
  error?: string;
}> {
  if (!token) {
    return { authorized: false, error: 'Token requerido' };
  }
  
  const payload = await verifyToken(token);
  if (!payload) {
    return { authorized: false, error: 'Token inválido o expirado' };
  }
  
  const userId = payload['custom:userId'];
  const userType = payload['custom:userType'];
  
  // Check if user still exists and is not suspended
  const userData = await getUserData(userId);
  if (!userData) {
    return { authorized: false, error: 'Usuario no encontrado' };
  }
  
  if (userData.status === 'suspended') {
    return { authorized: false, error: 'Cuenta suspendida' };
  }
  
  return { authorized: true, userId, userType };
}

/**
 * Require admin role
 */
export async function requireAdmin(token: string | null): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  const auth = await requireAuth(token);
  if (!auth.authorized) {
    return auth;
  }
  
  if (auth.userType !== 'admin') {
    return { authorized: false, error: 'Se requiere rol de administrador' };
  }
  
  return auth;
}

/**
 * Require escort role
 */
export async function requireEscort(token: string | null): Promise<{
  authorized: boolean;
  userId?: string;
  error?: string;
}> {
  const auth = await requireAuth(token);
  if (!auth.authorized) {
    return auth;
  }
  
  if (auth.userType !== 'escort') {
    return { authorized: false, error: 'Se requiere cuenta de escort' };
  }
  
  // Also check for active subscription
  const hasSubscription = await hasActiveSubscription(auth.userId!);
  if (!hasSubscription) {
    return { authorized: false, error: 'Suscripción requerida' };
  }
  
  return auth;
}
