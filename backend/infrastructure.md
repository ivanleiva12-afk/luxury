# 🚀 Infrastructure as Code - Sala Oscura

## AWS SAM Template

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Sala Oscura Backend Infrastructure

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - prod
  DomainName:
    Type: String
    Default: salaoscura.cl

Globals:
  Function:
    Timeout: 30
    MemorySize: 256
    Runtime: nodejs18.x
    Environment:
      Variables:
        ENVIRONMENT: !Ref Environment
        DYNAMODB_TABLE: !Ref MainTable
        COGNITO_USER_POOL_ID: !Ref UserPool
        COGNITO_CLIENT_ID: !Ref UserPoolClient
        S3_PUBLIC_BUCKET: !Ref PublicMediaBucket
        S3_PRIVATE_BUCKET: !Ref PrivateMediaBucket
        CLOUDFRONT_URL: !Sub 'https://media.${DomainName}'

Resources:
  # ==========================================
  # 🗄️ DYNAMODB
  # ==========================================
  
  MainTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub 'SalaOscura-${Environment}'
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: GSI1PK
          AttributeType: S
        - AttributeName: GSI1SK
          AttributeType: S
        - AttributeName: GSI2PK
          AttributeType: S
        - AttributeName: GSI2SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1PK
              KeyType: HASH
            - AttributeName: GSI1SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
        - IndexName: GSI2
          KeySchema:
            - AttributeName: GSI2PK
              KeyType: HASH
            - AttributeName: GSI2SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: TTL
        Enabled: true
      PointInTimeRecoverySpecification:
        PointInTimeRecoveryEnabled: true
      Tags:
        - Key: Environment
          Value: !Ref Environment

  # ==========================================
  # 🔐 COGNITO
  # ==========================================
  
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub 'SalaOscura-${Environment}'
      UsernameAttributes:
        - email
      AutoVerifiedAttributes:
        - email
      Policies:
        PasswordPolicy:
          MinimumLength: 8
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: false
          RequireUppercase: true
      Schema:
        - Name: email
          AttributeDataType: String
          Required: true
          Mutable: true
        - Name: userId
          AttributeDataType: String
          Mutable: true
        - Name: userType
          AttributeDataType: String
          Mutable: true
      UserPoolTags:
        Environment: !Ref Environment

  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      ClientName: !Sub 'SalaOscura-Client-${Environment}'
      UserPoolId: !Ref UserPool
      ExplicitAuthFlows:
        - ALLOW_USER_PASSWORD_AUTH
        - ALLOW_REFRESH_TOKEN_AUTH
        - ALLOW_USER_SRP_AUTH
      GenerateSecret: false
      PreventUserExistenceErrors: ENABLED
      AccessTokenValidity: 1
      IdTokenValidity: 1
      RefreshTokenValidity: 30
      TokenValidityUnits:
        AccessToken: hours
        IdToken: hours
        RefreshToken: days

  # ==========================================
  # 📦 S3 BUCKETS
  # ==========================================
  
  PublicMediaBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'salaoscura-media-public-${Environment}'
      CorsConfiguration:
        CorsRules:
          - AllowedHeaders:
              - '*'
            AllowedMethods:
              - GET
              - HEAD
              - PUT
            AllowedOrigins:
              - !Sub 'https://${DomainName}'
              - !Sub 'https://www.${DomainName}'
              - 'http://localhost:*'
            MaxAge: 3600
      LifecycleConfiguration:
        Rules:
          - Id: DeleteExpiredStories
            Prefix: stories/
            Status: Enabled
            ExpirationInDays: 2
          - Id: DeleteExpiredInstants
            Prefix: instants/
            Status: Enabled
            ExpirationInDays: 1
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false

  PublicMediaBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref PublicMediaBucket
      PolicyDocument:
        Statement:
          - Sid: PublicReadGetObject
            Effect: Allow
            Principal: '*'
            Action: s3:GetObject
            Resource: !Sub '${PublicMediaBucket.Arn}/*'

  PrivateMediaBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'salaoscura-media-private-${Environment}'
      BucketEncryption:
        ServerSideEncryptionConfiguration:
          - ServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
      PublicAccessBlockConfiguration:
        BlockPublicAcls: true
        BlockPublicPolicy: true
        IgnorePublicAcls: true
        RestrictPublicBuckets: true
      VersioningConfiguration:
        Status: Enabled
      LifecycleConfiguration:
        Rules:
          - Id: DeleteOldVerifications
            Prefix: verification/
            Status: Enabled
            ExpirationInDays: 365
            NoncurrentVersionExpiration:
              NoncurrentDays: 30

  # ==========================================
  # 🌐 API GATEWAY
  # ==========================================
  
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub 'SalaOscura-API-${Environment}'
      StageName: !Ref Environment
      Cors:
        AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization,X-Requested-With'"
        AllowOrigin: "'*'"
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn
      GatewayResponses:
        UNAUTHORIZED:
          StatusCode: 401
          ResponseParameters:
            Headers:
              Access-Control-Allow-Origin: "'*'"
          ResponseTemplates:
            application/json: '{"error": "UNAUTHORIZED", "message": "No autorizado"}'

  # ==========================================
  # ⚡ LAMBDA FUNCTIONS
  # ==========================================
  
  AuthFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'SalaOscura-Auth-${Environment}'
      CodeUri: lambdas/
      Handler: auth-handler.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - Version: '2012-10-17'
          Statement:
            - Effect: Allow
              Action:
                - cognito-idp:SignUp
                - cognito-idp:InitiateAuth
                - cognito-idp:GlobalSignOut
                - cognito-idp:ForgotPassword
                - cognito-idp:ConfirmForgotPassword
                - cognito-idp:AdminGetUser
              Resource: !GetAtt UserPool.Arn
      Events:
        Register:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/register
            Method: POST
            Auth:
              Authorizer: NONE
        Login:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/login
            Method: POST
            Auth:
              Authorizer: NONE
        Refresh:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/refresh
            Method: POST
            Auth:
              Authorizer: NONE
        Logout:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/logout
            Method: POST
        ForgotPassword:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/forgot-password
            Method: POST
            Auth:
              Authorizer: NONE
        ResetPassword:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /auth/reset-password
            Method: POST
            Auth:
              Authorizer: NONE

  ProfilesFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'SalaOscura-Profiles-${Environment}'
      CodeUri: lambdas/
      Handler: profiles-handler.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
      Events:
        ListProfiles:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles
            Method: GET
            Auth:
              Authorizer: NONE
        GetProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles/{userId}
            Method: GET
            Auth:
              Authorizer: NONE
        UpdateProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles/{userId}
            Method: PUT
        ViewProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles/{userId}/view
            Method: POST
            Auth:
              Authorizer: NONE
        LikeProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles/{userId}/like
            Method: POST
        RecommendProfile:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /profiles/{userId}/recommend
            Method: POST

  MediaFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'SalaOscura-Media-${Environment}'
      CodeUri: lambdas/
      Handler: media-handler.handler
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - S3CrudPolicy:
            BucketName: !Ref PublicMediaBucket
        - S3CrudPolicy:
            BucketName: !Ref PrivateMediaBucket
      Events:
        UploadUrl:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /media/upload-url
            Method: POST
        DeleteMedia:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /media/{mediaId}
            Method: DELETE
        ReorderMedia:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /media/reorder
            Method: PUT

  ImageProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub 'SalaOscura-ImageProcessor-${Environment}'
      CodeUri: lambdas/
      Handler: image-processor.handler
      Timeout: 60
      MemorySize: 1024
      Policies:
        - S3CrudPolicy:
            BucketName: !Ref PublicMediaBucket
        - S3ReadPolicy:
            BucketName: !Ref PrivateMediaBucket
      Events:
        S3Event:
          Type: S3
          Properties:
            Bucket: !Ref PublicMediaBucket
            Events: s3:ObjectCreated:*
            Filter:
              S3Key:
                Rules:
                  - Name: suffix
                    Value: original.jpg
                  - Name: suffix
                    Value: original.png

  # ==========================================
  # 📊 CLOUDWATCH
  # ==========================================
  
  ApiLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/apigateway/SalaOscura-${Environment}'
      RetentionInDays: 30

# ==========================================
# 📤 OUTPUTS
# ==========================================

Outputs:
  ApiUrl:
    Description: API Gateway URL
    Value: !Sub 'https://${ApiGateway}.execute-api.${AWS::Region}.amazonaws.com/${Environment}'
  
  UserPoolId:
    Description: Cognito User Pool ID
    Value: !Ref UserPool
  
  UserPoolClientId:
    Description: Cognito User Pool Client ID
    Value: !Ref UserPoolClient
  
  DynamoDBTable:
    Description: DynamoDB Table Name
    Value: !Ref MainTable
  
  PublicBucket:
    Description: Public Media Bucket
    Value: !Ref PublicMediaBucket
  
  PrivateBucket:
    Description: Private Media Bucket
    Value: !Ref PrivateMediaBucket
```

---

## 📦 package.json

```json
{
  "name": "salaoscura-backend",
  "version": "1.0.0",
  "description": "Sala Oscura Backend API",
  "scripts": {
    "build": "tsc",
    "deploy:dev": "sam deploy --config-env dev",
    "deploy:staging": "sam deploy --config-env staging",
    "deploy:prod": "sam deploy --config-env prod",
    "local": "sam local start-api",
    "test": "jest"
  },
  "dependencies": {
    "@aws-sdk/client-cognito-identity-provider": "^3.x",
    "@aws-sdk/client-dynamodb": "^3.x",
    "@aws-sdk/client-s3": "^3.x",
    "@aws-sdk/lib-dynamodb": "^3.x",
    "@aws-sdk/s3-request-presigner": "^3.x",
    "aws-jwt-verify": "^4.x",
    "bcryptjs": "^2.x",
    "sharp": "^0.33.x",
    "uuid": "^9.x"
  },
  "devDependencies": {
    "@types/aws-lambda": "^8.x",
    "@types/bcryptjs": "^2.x",
    "@types/node": "^20.x",
    "@types/uuid": "^9.x",
    "typescript": "^5.x",
    "jest": "^29.x"
  }
}
```

---

## 🔧 samconfig.toml

```toml
version = 0.1

[default.deploy.parameters]
stack_name = "salaoscura-backend"
resolve_s3 = true
capabilities = "CAPABILITY_IAM"
confirm_changeset = true

[dev.deploy.parameters]
stack_name = "salaoscura-backend-dev"
parameter_overrides = "Environment=dev DomainName=dev.salaoscura.cl"

[staging.deploy.parameters]
stack_name = "salaoscura-backend-staging"
parameter_overrides = "Environment=staging DomainName=staging.salaoscura.cl"

[prod.deploy.parameters]
stack_name = "salaoscura-backend-prod"
parameter_overrides = "Environment=prod DomainName=salaoscura.cl"
```

---

## 🚀 Deployment Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy to dev
sam build && sam deploy --config-env dev

# Deploy to production
sam build && sam deploy --config-env prod

# Run locally
sam local start-api
```
