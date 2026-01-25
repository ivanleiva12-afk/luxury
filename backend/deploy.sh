#!/bin/bash

# Script de despliegue para Sala Oscura Backend
# Ejecutar desde la carpeta backend/

set -e

PROFILE="salaoscura"
REGION="us-east-1"
ROLE_NAME="salaoscura-lambda-role"
API_NAME="salaoscura-api"

echo "🚀 Iniciando despliegue de Sala Oscura Backend..."

# 1. Crear rol de ejecución para Lambda
echo "📋 Creando rol IAM para Lambda..."

TRUST_POLICY='{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}'

# Verificar si el rol ya existe
if ! aws iam get-role --role-name $ROLE_NAME --profile $PROFILE 2>/dev/null; then
    aws iam create-role \
        --role-name $ROLE_NAME \
        --assume-role-policy-document "$TRUST_POLICY" \
        --profile $PROFILE
    
    # Adjuntar políticas necesarias
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess \
        --profile $PROFILE
    
    aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
        --profile $PROFILE
    
    echo "✅ Rol creado. Esperando propagación (10 segundos)..."
    sleep 10
else
    echo "✅ Rol ya existe"
fi

# Obtener ARN del rol
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --profile $PROFILE --query 'Role.Arn' --output text)
echo "📌 Role ARN: $ROLE_ARN"

# 2. Crear paquete de despliegue
echo "📦 Creando paquete de despliegue..."
cd lambda
mkdir -p ../deploy
rm -f ../deploy/*.zip

# Crear archivo de dependencias
echo '{ "dependencies": { "aws-sdk": "^2.1472.0" } }' > package.json

# Zip cada función Lambda
for file in *.js; do
    name="${file%.js}"
    echo "  📦 Empaquetando $name..."
    zip -j ../deploy/${name}.zip $file
done

cd ..

# 3. Crear o actualizar funciones Lambda
echo "⚡ Desplegando funciones Lambda..."

FUNCTIONS=("profiles" "users" "registros" "foro" "messages")

for func in "${FUNCTIONS[@]}"; do
    FUNCTION_NAME="salaoscura-${func}"
    ZIP_FILE="fileb://deploy/${func}.zip"
    
    # Verificar si la función existe
    if aws lambda get-function --function-name $FUNCTION_NAME --profile $PROFILE 2>/dev/null; then
        echo "  🔄 Actualizando $FUNCTION_NAME..."
        aws lambda update-function-code \
            --function-name $FUNCTION_NAME \
            --zip-file $ZIP_FILE \
            --profile $PROFILE \
            --region $REGION \
            > /dev/null
    else
        echo "  ✨ Creando $FUNCTION_NAME..."
        aws lambda create-function \
            --function-name $FUNCTION_NAME \
            --runtime nodejs18.x \
            --handler "${func}.handler" \
            --role $ROLE_ARN \
            --zip-file $ZIP_FILE \
            --timeout 30 \
            --memory-size 256 \
            --profile $PROFILE \
            --region $REGION \
            > /dev/null
    fi
done

echo "✅ Funciones Lambda desplegadas"

# 4. Crear API Gateway
echo "🌐 Configurando API Gateway..."

# Verificar si la API ya existe
API_ID=$(aws apigateway get-rest-apis --profile $PROFILE --region $REGION \
    --query "items[?name=='$API_NAME'].id" --output text)

if [ -z "$API_ID" ]; then
    echo "  ✨ Creando nueva API..."
    API_ID=$(aws apigateway create-rest-api \
        --name $API_NAME \
        --description "API para Sala Oscura" \
        --profile $PROFILE \
        --region $REGION \
        --query 'id' --output text)
else
    echo "  ✅ API ya existe: $API_ID"
fi

# Obtener el ID del recurso raíz
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --profile $PROFILE --region $REGION \
    --query 'items[?path==`/`].id' --output text)

echo "📌 API ID: $API_ID, Root ID: $ROOT_ID"

# Función helper para crear recurso y método
create_resource_and_method() {
    local RESOURCE_PATH=$1
    local LAMBDA_NAME=$2
    
    echo "  📍 Configurando /$RESOURCE_PATH..."
    
    # Verificar si el recurso existe
    RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --profile $PROFILE --region $REGION \
        --query "items[?pathPart=='$RESOURCE_PATH'].id" --output text)
    
    if [ -z "$RESOURCE_ID" ]; then
        RESOURCE_ID=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $ROOT_ID \
            --path-part $RESOURCE_PATH \
            --profile $PROFILE \
            --region $REGION \
            --query 'id' --output text)
    fi
    
    # Crear proxy resource {proxy+}
    PROXY_ID=$(aws apigateway get-resources --rest-api-id $API_ID --profile $PROFILE --region $REGION \
        --query "items[?path=='/$RESOURCE_PATH/{proxy+}'].id" --output text)
    
    if [ -z "$PROXY_ID" ]; then
        PROXY_ID=$(aws apigateway create-resource \
            --rest-api-id $API_ID \
            --parent-id $RESOURCE_ID \
            --path-part "{proxy+}" \
            --profile $PROFILE \
            --region $REGION \
            --query 'id' --output text 2>/dev/null) || true
    fi
    
    # Obtener ARN de la Lambda
    ACCOUNT_ID=$(aws sts get-caller-identity --profile $PROFILE --query 'Account' --output text)
    LAMBDA_ARN="arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$LAMBDA_NAME"
    
    # Configurar método ANY en el recurso base
    aws apigateway put-method \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method ANY \
        --authorization-type NONE \
        --profile $PROFILE \
        --region $REGION 2>/dev/null || true
    
    # Integración Lambda
    aws apigateway put-integration \
        --rest-api-id $API_ID \
        --resource-id $RESOURCE_ID \
        --http-method ANY \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
        --profile $PROFILE \
        --region $REGION 2>/dev/null || true
    
    # Dar permiso a API Gateway para invocar Lambda
    aws lambda add-permission \
        --function-name $LAMBDA_NAME \
        --statement-id "apigateway-$RESOURCE_PATH" \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/*" \
        --profile $PROFILE \
        --region $REGION 2>/dev/null || true
}

# Crear recursos para cada endpoint
create_resource_and_method "profiles" "salaoscura-profiles"
create_resource_and_method "users" "salaoscura-users"
create_resource_and_method "registros" "salaoscura-registros"
create_resource_and_method "threads" "salaoscura-foro"
create_resource_and_method "messages" "salaoscura-messages"

# 5. Desplegar API
echo "🚀 Desplegando API Gateway..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --profile $PROFILE \
    --region $REGION \
    > /dev/null

# URL final
API_URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ ¡DESPLIEGUE COMPLETADO!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🌐 URL de la API: $API_URL"
echo ""
echo "📝 Actualiza tu config.js con esta URL:"
echo ""
echo "   API_URL_PROD: '$API_URL'"
echo ""
echo "Para probar:"
echo "   curl $API_URL/profiles"
echo ""
echo "═══════════════════════════════════════════════════════════════"
