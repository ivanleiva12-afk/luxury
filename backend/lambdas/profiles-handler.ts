/**
 * 📸 Profiles Handler - Sala Oscura API
 * 
 * Lambda handler for profile endpoints
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand,
  QueryCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { verifyToken, extractUserId } from './utils/auth';
import { response, parseBody, extractToken } from './utils/http';

// Clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'SalaOscura-Main';
const CLOUDFRONT_URL = process.env.CLOUDFRONT_URL || 'https://media.salaoscura.cl';

// ==========================================
// 🎯 MAIN HANDLER
// ==========================================

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, pathParameters, queryStringParameters } = event;
  
  console.log(`Profiles Handler: ${httpMethod} ${path}`);
  
  try {
    // GET /profiles - List profiles
    if (path === '/profiles' && httpMethod === 'GET') {
      return await handleListProfiles(queryStringParameters || {});
    }
    
    // GET /profiles/:userId - Get single profile
    const userIdMatch = path.match(/^\/profiles\/([^\/]+)$/);
    if (userIdMatch && httpMethod === 'GET') {
      return await handleGetProfile(userIdMatch[1]);
    }
    
    // PUT /profiles/:userId - Update profile (auth required)
    if (userIdMatch && httpMethod === 'PUT') {
      const token = extractToken(event);
      const currentUserId = await extractUserId(token);
      if (currentUserId !== userIdMatch[1]) {
        return response(403, { error: 'FORBIDDEN', message: 'No puedes editar este perfil' });
      }
      return await handleUpdateProfile(userIdMatch[1], parseBody(event.body));
    }
    
    // POST /profiles/:userId/view - Increment view
    const viewMatch = path.match(/^\/profiles\/([^\/]+)\/view$/);
    if (viewMatch && httpMethod === 'POST') {
      return await handleIncrementView(viewMatch[1]);
    }
    
    // POST /profiles/:userId/like - Toggle like
    const likeMatch = path.match(/^\/profiles\/([^\/]+)\/like$/);
    if (likeMatch && httpMethod === 'POST') {
      const token = extractToken(event);
      const currentUserId = await extractUserId(token);
      return await handleToggleLike(likeMatch[1], currentUserId);
    }
    
    // POST /profiles/:userId/recommend - Increment recommendation
    const recommendMatch = path.match(/^\/profiles\/([^\/]+)\/recommend$/);
    if (recommendMatch && httpMethod === 'POST') {
      const token = extractToken(event);
      const currentUserId = await extractUserId(token);
      return await handleRecommend(recommendMatch[1], currentUserId);
    }
    
    return response(404, { error: 'NOT_FOUND', message: 'Endpoint no encontrado' });
    
  } catch (error) {
    console.error('Profiles error:', error);
    return response(500, { error: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
  }
}

// ==========================================
// 📋 LIST PROFILES
// ==========================================

interface ListProfilesParams {
  plan?: string;
  city?: string;
  commune?: string;
  limit?: string;
  cursor?: string;
}

async function handleListProfiles(params: ListProfilesParams): Promise<APIGatewayProxyResult> {
  const limit = Math.min(parseInt(params.limit || '20'), 50);
  
  let queryParams: any = {
    TableName: TABLE_NAME,
    Limit: limit,
    FilterExpression: 'profileVisible = :visible',
    ExpressionAttributeValues: {
      ':visible': true
    }
  };
  
  // Filter by plan
  if (params.plan && ['luxury', 'vip', 'premium'].includes(params.plan)) {
    queryParams.IndexName = 'GSI1';
    queryParams.KeyConditionExpression = 'GSI1PK = :plan';
    queryParams.ExpressionAttributeValues[':plan'] = `PLAN#${params.plan}`;
    queryParams.ScanIndexForward = false; // Newest first
  }
  // Filter by city
  else if (params.city) {
    queryParams.IndexName = 'GSI2';
    queryParams.KeyConditionExpression = 'GSI2PK = :city';
    queryParams.ExpressionAttributeValues[':city'] = `CITY#${params.city}`;
    
    if (params.commune) {
      queryParams.KeyConditionExpression += ' AND GSI2SK = :commune';
      queryParams.ExpressionAttributeValues[':commune'] = params.commune;
    }
  }
  // Default: scan all visible profiles (not ideal, but works for small datasets)
  else {
    // For production, we'd need a different approach
    queryParams.IndexName = 'GSI1';
    queryParams.KeyConditionExpression = 'begins_with(GSI1PK, :planPrefix)';
    queryParams.ExpressionAttributeValues[':planPrefix'] = 'PLAN#';
  }
  
  // Pagination cursor
  if (params.cursor) {
    try {
      queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(params.cursor, 'base64').toString());
    } catch (e) {
      // Invalid cursor, ignore
    }
  }
  
  const result = await docClient.send(new QueryCommand(queryParams));
  
  // Map profiles to public format
  const profiles = (result.Items || []).map(item => ({
    userId: item.userId,
    displayName: item.displayName,
    bio: item.bio,
    slogan: item.slogan,
    verified: item.verified,
    planType: item.planType,
    carouselType: item.carouselType,
    city: item.city,
    commune: item.commune,
    profilePhotoUrl: item.profilePhotoUrl || `${CLOUDFRONT_URL}/profiles/${item.userId}/avatar/medium.jpg`,
    stats: {
      likes: item.stats?.likes || 0,
      views: item.stats?.views || 0,
      rating: item.stats?.rating || 0
    },
    physicalInfo: {
      age: item.physicalInfo?.age,
      height: item.physicalInfo?.height,
      ethnicity: item.physicalInfo?.ethnicity
    }
  }));
  
  // Build next cursor
  let nextCursor: string | undefined;
  if (result.LastEvaluatedKey) {
    nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }
  
  return response(200, {
    profiles,
    nextCursor,
    hasMore: !!result.LastEvaluatedKey
  });
}

// ==========================================
// 👤 GET SINGLE PROFILE
// ==========================================

async function handleGetProfile(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PUBLIC_PROFILE' }
  }));
  
  if (!result.Item || !result.Item.profileVisible) {
    return response(404, { error: 'NOT_FOUND', message: 'Perfil no encontrado' });
  }
  
  const item = result.Item;
  
  // Get gallery photos
  const galleryResult = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :media)',
    FilterExpression: 'category = :cat AND isPublic = :public',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':media': 'MEDIA#',
      ':cat': 'gallery',
      ':public': true
    }
  }));
  
  const gallery = (galleryResult.Items || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(media => `${CLOUDFRONT_URL}/${media.s3Key}`.replace('/original.', '/medium.'));
  
  // Get videos
  const videosResult = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :media)',
    FilterExpression: 'category = :cat AND isPublic = :public',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':media': 'MEDIA#',
      ':cat': 'video',
      ':public': true
    }
  }));
  
  const videos = (videosResult.Items || []).map(media => ({
    url: `${CLOUDFRONT_URL}/${media.s3Key}`.replace('/original.', '/compressed.'),
    thumbnail: `${CLOUDFRONT_URL}/${media.thumbnailKey || media.s3Key.replace('/original.', '/thumbnail.')}`
  }));
  
  return response(200, {
    userId: item.userId,
    displayName: item.displayName,
    bio: item.bio,
    slogan: item.slogan,
    verified: item.verified,
    planType: item.planType,
    carouselType: item.carouselType,
    city: item.city,
    commune: item.commune,
    neighborhood: item.neighborhood,
    whatsapp: item.whatsapp,
    telegram: item.telegram,
    onlyFans: item.onlyFans,
    profilePhotoUrl: item.profilePhotoUrl || `${CLOUDFRONT_URL}/profiles/${item.userId}/avatar/medium.jpg`,
    gallery,
    videos,
    physicalInfo: item.physicalInfo || {},
    attributes: item.attributes || {},
    services: item.services || [],
    prices: item.prices || {},
    schedule: item.schedule || {},
    stats: item.stats || { likes: 0, views: 0, recommendations: 0, rating: 0, ratingCount: 0 }
  });
}

// ==========================================
// ✏️ UPDATE PROFILE
// ==========================================

interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  slogan?: string;
  city?: string;
  commune?: string;
  neighborhood?: string;
  whatsapp?: string;
  telegram?: string;
  onlyFans?: string;
  physicalInfo?: Record<string, any>;
  attributes?: Record<string, any>;
  services?: string[];
  prices?: Record<string, any>;
  schedule?: Record<string, any>;
  profilePhotoUrl?: string;
}

async function handleUpdateProfile(userId: string, data: UpdateProfileData): Promise<APIGatewayProxyResult> {
  // Build update expression
  const updateParts: string[] = ['updatedAt = :now'];
  const expressionValues: Record<string, any> = { ':now': new Date().toISOString() };
  const expressionNames: Record<string, string> = {};
  
  const allowedFields = [
    'displayName', 'bio', 'slogan', 'city', 'commune', 'neighborhood',
    'whatsapp', 'telegram', 'onlyFans', 'physicalInfo', 'attributes',
    'services', 'prices', 'schedule', 'profilePhotoUrl'
  ];
  
  for (const field of allowedFields) {
    if (data[field as keyof UpdateProfileData] !== undefined) {
      updateParts.push(`#${field} = :${field}`);
      expressionValues[`:${field}`] = data[field as keyof UpdateProfileData];
      expressionNames[`#${field}`] = field;
    }
  }
  
  // Update GSI2 if city changed
  if (data.city) {
    updateParts.push('GSI2PK = :gsi2pk');
    expressionValues[':gsi2pk'] = `CITY#${data.city}`;
    
    if (data.commune) {
      updateParts.push('GSI2SK = :gsi2sk');
      expressionValues[':gsi2sk'] = data.commune;
    }
  }
  
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PUBLIC_PROFILE' },
    UpdateExpression: `SET ${updateParts.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
    ExpressionAttributeNames: Object.keys(expressionNames).length > 0 ? expressionNames : undefined
  }));
  
  return response(200, { success: true, message: 'Perfil actualizado' });
}

// ==========================================
// 👁️ INCREMENT VIEW
// ==========================================

async function handleIncrementView(userId: string): Promise<APIGatewayProxyResult> {
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${userId}`, SK: 'PUBLIC_PROFILE' },
    UpdateExpression: 'SET stats.#views = if_not_exists(stats.#views, :zero) + :inc',
    ExpressionAttributeNames: { '#views': 'views' },
    ExpressionAttributeValues: { ':inc': 1, ':zero': 0 },
    ReturnValues: 'UPDATED_NEW'
  }));
  
  return response(200, { views: result.Attributes?.stats?.views || 0 });
}

// ==========================================
// ❤️ TOGGLE LIKE
// ==========================================

async function handleToggleLike(profileUserId: string, currentUserId: string | null): Promise<APIGatewayProxyResult> {
  if (!currentUserId) {
    return response(401, { error: 'UNAUTHORIZED', message: 'Debes iniciar sesión para dar like' });
  }
  
  // Check if already liked
  const likeKey = { PK: `LIKE#${currentUserId}`, SK: `PROFILE#${profileUserId}` };
  const existingLike = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: likeKey
  }));
  
  let liked: boolean;
  let likesDelta: number;
  
  if (existingLike.Item) {
    // Remove like
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: likeKey
    }));
    liked = false;
    likesDelta = -1;
  } else {
    // Add like
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...likeKey,
        userId: currentUserId,
        profileUserId,
        createdAt: new Date().toISOString()
      }
    }));
    liked = true;
    likesDelta = 1;
  }
  
  // Update profile likes count
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${profileUserId}`, SK: 'PUBLIC_PROFILE' },
    UpdateExpression: 'SET stats.likes = if_not_exists(stats.likes, :zero) + :delta',
    ExpressionAttributeValues: { ':delta': likesDelta, ':zero': 0 },
    ReturnValues: 'UPDATED_NEW'
  }));
  
  return response(200, {
    liked,
    likes: Math.max(0, result.Attributes?.stats?.likes || 0)
  });
}

// ==========================================
// 👍 RECOMMEND
// ==========================================

async function handleRecommend(profileUserId: string, currentUserId: string | null): Promise<APIGatewayProxyResult> {
  if (!currentUserId) {
    return response(401, { error: 'UNAUTHORIZED', message: 'Debes iniciar sesión para recomendar' });
  }
  
  // Check if already recommended
  const recKey = { PK: `REC#${currentUserId}`, SK: `PROFILE#${profileUserId}` };
  const existingRec = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: recKey
  }));
  
  if (existingRec.Item) {
    return response(400, { error: 'ALREADY_RECOMMENDED', message: 'Ya recomendaste este perfil' });
  }
  
  // Add recommendation
  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: {
      ...recKey,
      userId: currentUserId,
      profileUserId,
      createdAt: new Date().toISOString()
    }
  }));
  
  // Update profile recommendations count
  const result = await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK: `USER#${profileUserId}`, SK: 'PUBLIC_PROFILE' },
    UpdateExpression: 'SET stats.recommendations = if_not_exists(stats.recommendations, :zero) + :inc',
    ExpressionAttributeValues: { ':inc': 1, ':zero': 0 },
    ReturnValues: 'UPDATED_NEW'
  }));
  
  return response(200, {
    recommendations: result.Attributes?.stats?.recommendations || 0
  });
}
