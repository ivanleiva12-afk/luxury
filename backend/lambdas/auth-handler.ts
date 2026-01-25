/**
 * 🔐 Auth Handler - Sala Oscura API
 * 
 * Lambda handler for authentication endpoints
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  AdminGetUserCommand,
  AdminUpdateUserAttributesCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Clients
const cognitoClient = new CognitoIdentityProviderClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Config
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;
const TABLE_NAME = process.env.DYNAMODB_TABLE || 'SalaOscura-Main';

// ==========================================
// 🎯 MAIN HANDLER
// ==========================================

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, body } = event;
  
  console.log(`Auth Handler: ${httpMethod} ${path}`);
  
  try {
    // Route to appropriate handler
    if (path === '/auth/register' && httpMethod === 'POST') {
      return await handleRegister(JSON.parse(body || '{}'));
    }
    
    if (path === '/auth/login' && httpMethod === 'POST') {
      return await handleLogin(JSON.parse(body || '{}'));
    }
    
    if (path === '/auth/refresh' && httpMethod === 'POST') {
      return await handleRefreshToken(JSON.parse(body || '{}'));
    }
    
    if (path === '/auth/logout' && httpMethod === 'POST') {
      const token = extractToken(event);
      return await handleLogout(token);
    }
    
    if (path === '/auth/forgot-password' && httpMethod === 'POST') {
      return await handleForgotPassword(JSON.parse(body || '{}'));
    }
    
    if (path === '/auth/reset-password' && httpMethod === 'POST') {
      return await handleResetPassword(JSON.parse(body || '{}'));
    }
    
    if (path === '/auth/me' && httpMethod === 'GET') {
      const token = extractToken(event);
      return await handleGetCurrentUser(token);
    }
    
    return response(404, { error: 'NOT_FOUND', message: 'Endpoint no encontrado' });
    
  } catch (error) {
    console.error('Auth error:', error);
    return response(500, { error: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
}

// ==========================================
// 📝 REGISTER
// ==========================================

interface RegisterRequest {
  email: string;
  password: string;
  username: string;
  displayName: string;
  userType: 'escort' | 'cliente';
  phone?: string;
}

async function handleRegister(data: RegisterRequest): Promise<APIGatewayProxyResult> {
  // Validate
  const errors = validateRegister(data);
  if (errors.length > 0) {
    return response(422, { error: 'VALIDATION_ERROR', details: errors });
  }
  
  const { email, password, username, displayName, userType, phone } = data;
  const userId = `usr_${uuidv4().slice(0, 12)}`;
  
  try {
    // Check if email exists
    const existingEmail = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EMAIL#${email.toLowerCase()}`, SK: 'USER' }
    }));
    
    if (existingEmail.Item) {
      return response(409, { error: 'EMAIL_EXISTS', message: 'Email ya registrado' });
    }
    
    // Check if username exists
    const existingUsername = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USERNAME#${username.toLowerCase()}`, SK: 'USER' }
    }));
    
    if (existingUsername.Item) {
      return response(409, { error: 'USERNAME_EXISTS', message: 'Username ya existe' });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user in Cognito
    await cognitoClient.send(new SignUpCommand({
      ClientId: CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'custom:userId', Value: userId },
        { Name: 'custom:userType', Value: userType }
      ]
    }));
    
    const now = new Date().toISOString();
    
    // Create user in DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: 'PROFILE',
        GSI1PK: `EMAIL#${email.toLowerCase()}`,
        GSI1SK: 'USER',
        GSI2PK: `USERNAME#${username.toLowerCase()}`,
        GSI2SK: 'USER',
        userId,
        email: email.toLowerCase(),
        passwordHash,
        username: username.toLowerCase(),
        displayName,
        userType,
        phone,
        status: 'pending', // Requires admin approval
        createdAt: now,
        updatedAt: now
      }
    }));
    
    // Create email index
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `EMAIL#${email.toLowerCase()}`,
        SK: 'USER',
        userId
      }
    }));
    
    // Create username index
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USERNAME#${username.toLowerCase()}`,
        SK: 'USER',
        userId
      }
    }));
    
    // If escort, create empty public profile
    if (userType === 'escort') {
      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: 'PUBLIC_PROFILE',
          GSI1PK: 'PLAN#none',
          GSI1SK: now,
          GSI2PK: 'CITY#unknown',
          GSI2SK: 'unknown',
          userId,
          displayName,
          verified: false,
          profileVisible: false,
          planType: 'none',
          stats: { likes: 0, views: 0, recommendations: 0, rating: 0, ratingCount: 0 },
          createdAt: now,
          updatedAt: now
        }
      }));
    }
    
    return response(201, {
      success: true,
      message: 'Usuario registrado. Pendiente de aprobación.',
      userId
    });
    
  } catch (error: any) {
    console.error('Register error:', error);
    
    if (error.name === 'UsernameExistsException') {
      return response(409, { error: 'EMAIL_EXISTS', message: 'Email ya registrado' });
    }
    
    throw error;
  }
}

function validateRegister(data: RegisterRequest): Array<{ field: string; message: string }> {
  const errors: Array<{ field: string; message: string }> = [];
  
  if (!data.email || !isValidEmail(data.email)) {
    errors.push({ field: 'email', message: 'Email inválido' });
  }
  
  if (!data.password || data.password.length < 8) {
    errors.push({ field: 'password', message: 'Password debe tener al menos 8 caracteres' });
  }
  
  if (!data.username || data.username.length < 3 || data.username.length > 30) {
    errors.push({ field: 'username', message: 'Username debe tener entre 3 y 30 caracteres' });
  }
  
  if (!data.username || !/^[a-zA-Z0-9_]+$/.test(data.username)) {
    errors.push({ field: 'username', message: 'Username solo puede contener letras, números y guión bajo' });
  }
  
  if (!data.displayName || data.displayName.length < 2) {
    errors.push({ field: 'displayName', message: 'Nombre requerido' });
  }
  
  if (!['escort', 'cliente'].includes(data.userType)) {
    errors.push({ field: 'userType', message: 'Tipo de usuario inválido' });
  }
  
  return errors;
}

// ==========================================
// 🔑 LOGIN
// ==========================================

interface LoginRequest {
  email: string;
  password: string;
}

async function handleLogin(data: LoginRequest): Promise<APIGatewayProxyResult> {
  const { email, password } = data;
  
  if (!email || !password) {
    return response(422, { error: 'VALIDATION_ERROR', message: 'Email y password requeridos' });
  }
  
  try {
    // Authenticate with Cognito
    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }));
    
    if (!authResult.AuthenticationResult) {
      return response(401, { error: 'UNAUTHORIZED', message: 'Credenciales inválidas' });
    }
    
    // Get user data from DynamoDB
    const emailIndex = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EMAIL#${email.toLowerCase()}`, SK: 'USER' }
    }));
    
    if (!emailIndex.Item) {
      return response(401, { error: 'UNAUTHORIZED', message: 'Usuario no encontrado' });
    }
    
    const userData = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${emailIndex.Item.userId}`, SK: 'PROFILE' }
    }));
    
    if (!userData.Item) {
      return response(401, { error: 'UNAUTHORIZED', message: 'Usuario no encontrado' });
    }
    
    // Check status
    if (userData.Item.status === 'pending') {
      return response(403, { error: 'PENDING_APPROVAL', message: 'Tu cuenta está pendiente de aprobación' });
    }
    
    if (userData.Item.status === 'suspended') {
      return response(403, { error: 'SUSPENDED', message: 'Tu cuenta ha sido suspendida' });
    }
    
    // Update last login
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userData.Item.userId}`, SK: 'PROFILE' },
      UpdateExpression: 'SET lastLoginAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() }
    }));
    
    return response(200, {
      success: true,
      accessToken: authResult.AuthenticationResult.AccessToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      user: {
        userId: userData.Item.userId,
        email: userData.Item.email,
        username: userData.Item.username,
        displayName: userData.Item.displayName,
        userType: userData.Item.userType,
        status: userData.Item.status
      }
    });
    
  } catch (error: any) {
    console.error('Login error:', error);
    
    if (error.name === 'NotAuthorizedException' || error.name === 'UserNotFoundException') {
      return response(401, { error: 'UNAUTHORIZED', message: 'Credenciales inválidas' });
    }
    
    throw error;
  }
}

// ==========================================
// 🔄 REFRESH TOKEN
// ==========================================

interface RefreshRequest {
  refreshToken: string;
}

async function handleRefreshToken(data: RefreshRequest): Promise<APIGatewayProxyResult> {
  const { refreshToken } = data;
  
  if (!refreshToken) {
    return response(422, { error: 'VALIDATION_ERROR', message: 'Refresh token requerido' });
  }
  
  try {
    const authResult = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    }));
    
    if (!authResult.AuthenticationResult) {
      return response(401, { error: 'UNAUTHORIZED', message: 'Token inválido' });
    }
    
    return response(200, {
      accessToken: authResult.AuthenticationResult.AccessToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn
    });
    
  } catch (error: any) {
    console.error('Refresh error:', error);
    return response(401, { error: 'UNAUTHORIZED', message: 'Token inválido o expirado' });
  }
}

// ==========================================
// 🚪 LOGOUT
// ==========================================

async function handleLogout(token: string | null): Promise<APIGatewayProxyResult> {
  if (!token) {
    return response(401, { error: 'UNAUTHORIZED', message: 'Token requerido' });
  }
  
  try {
    await cognitoClient.send(new GlobalSignOutCommand({
      AccessToken: token
    }));
    
    return response(200, { success: true, message: 'Sesión cerrada' });
    
  } catch (error) {
    console.error('Logout error:', error);
    // Even if logout fails, return success (token might be already invalid)
    return response(200, { success: true, message: 'Sesión cerrada' });
  }
}

// ==========================================
// 🔐 FORGOT PASSWORD
// ==========================================

interface ForgotPasswordRequest {
  email: string;
}

async function handleForgotPassword(data: ForgotPasswordRequest): Promise<APIGatewayProxyResult> {
  const { email } = data;
  
  if (!email) {
    return response(422, { error: 'VALIDATION_ERROR', message: 'Email requerido' });
  }
  
  try {
    await cognitoClient.send(new ForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email
    }));
    
    // Always return success to prevent email enumeration
    return response(200, {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    // Return success anyway to prevent enumeration
    return response(200, {
      success: true,
      message: 'Si el email existe, recibirás instrucciones para restablecer tu contraseña'
    });
  }
}

// ==========================================
// 🔑 RESET PASSWORD
// ==========================================

interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

async function handleResetPassword(data: ResetPasswordRequest): Promise<APIGatewayProxyResult> {
  const { email, code, newPassword } = data;
  
  if (!email || !code || !newPassword) {
    return response(422, { error: 'VALIDATION_ERROR', message: 'Email, código y nueva contraseña requeridos' });
  }
  
  if (newPassword.length < 8) {
    return response(422, { error: 'VALIDATION_ERROR', message: 'La contraseña debe tener al menos 8 caracteres' });
  }
  
  try {
    await cognitoClient.send(new ConfirmForgotPasswordCommand({
      ClientId: CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    }));
    
    // Update password hash in DynamoDB
    const emailIndex = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `EMAIL#${email.toLowerCase()}`, SK: 'USER' }
    }));
    
    if (emailIndex.Item) {
      const passwordHash = await bcrypt.hash(newPassword, 12);
      await docClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${emailIndex.Item.userId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET passwordHash = :hash, updatedAt = :now',
        ExpressionAttributeValues: {
          ':hash': passwordHash,
          ':now': new Date().toISOString()
        }
      }));
    }
    
    return response(200, { success: true, message: 'Contraseña actualizada' });
    
  } catch (error: any) {
    console.error('Reset password error:', error);
    
    if (error.name === 'CodeMismatchException') {
      return response(400, { error: 'INVALID_CODE', message: 'Código inválido' });
    }
    
    if (error.name === 'ExpiredCodeException') {
      return response(400, { error: 'EXPIRED_CODE', message: 'Código expirado' });
    }
    
    throw error;
  }
}

// ==========================================
// 👤 GET CURRENT USER
// ==========================================

async function handleGetCurrentUser(token: string | null): Promise<APIGatewayProxyResult> {
  if (!token) {
    return response(401, { error: 'UNAUTHORIZED', message: 'Token requerido' });
  }
  
  try {
    // Get user from Cognito
    const cognitoUser = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: token // This should be the sub/username from decoded token
    }));
    
    // For now, decode token and get user from DynamoDB
    // In production, use a proper JWT verification
    
    return response(200, { user: cognitoUser });
    
  } catch (error) {
    console.error('Get current user error:', error);
    return response(401, { error: 'UNAUTHORIZED', message: 'Token inválido' });
  }
}

// ==========================================
// 🛠️ UTILITIES
// ==========================================

function extractToken(event: APIGatewayProxyEvent): string | null {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function response(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(body)
  };
}
