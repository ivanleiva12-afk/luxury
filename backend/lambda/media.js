const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3 = new S3Client({ region: 'us-east-1' });

const BUCKET_NAME = 'salaoscura-media';
const REGION = 'us-east-1';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
};

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path;

  try {
    if (method === 'OPTIONS') {
      return { statusCode: 200, headers, body: '' };
    }

    // POST /media/upload - Generar URL pre-firmada para subir archivo
    // Body: { userId, fileName, fileType, folder? }
    // folder: "photos" (default), "videos", "instantes"
    if (method === 'POST' && path === '/media/upload') {
      const body = JSON.parse(event.body);
      const { userId, fileName, fileType, folder } = body;

      if (!userId || !fileName || !fileType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'userId, fileName y fileType son requeridos' })
        };
      }

      const mediaFolder = folder || 'photos';
      const timestamp = Date.now();
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const key = `${mediaFolder}/${userId}/${timestamp}-${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: fileType
      });

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
      const publicUrl = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ uploadUrl, publicUrl, key })
      };
    }

    // DELETE /media/user/{userId} - Eliminar TODOS los archivos de un usuario
    if (method === 'DELETE' && path.startsWith('/media/user/')) {
      const userId = decodeURIComponent(path.split('/')[3]);
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId requerido' }) };
      }

      // Buscar archivos en todas las carpetas del usuario
      const folders = ['photos', 'videos', 'instantes'];
      let totalDeleted = 0;

      for (const folder of folders) {
        const listResult = await s3.send(new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `${folder}/${userId}/`
        }));

        if (listResult.Contents && listResult.Contents.length > 0) {
          for (const item of listResult.Contents) {
            await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: item.Key }));
            totalDeleted++;
          }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: `${totalDeleted} archivos eliminados para usuario ${userId}` })
      };
    }

    // GET /media/{userId} - Listar archivos de un usuario
    if (method === 'GET' && path.startsWith('/media/') && path !== '/media/upload') {
      const userId = decodeURIComponent(path.split('/')[2]);

      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId requerido' }) };
      }

      // Listar archivos de todas las carpetas
      const folders = ['photos', 'videos', 'instantes'];
      const allFiles = [];

      for (const folder of folders) {
        const result = await s3.send(new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: `${folder}/${userId}/`
        }));

        (result.Contents || []).forEach(item => {
          allFiles.push({
            key: item.Key,
            url: `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${item.Key}`,
            size: item.Size,
            lastModified: item.LastModified,
            folder: folder
          });
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify(allFiles) };
    }

    // DELETE /media - Eliminar un archivo específico
    if (method === 'DELETE' && path === '/media') {
      const body = JSON.parse(event.body);
      const { key } = body;

      if (!key) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'key requerido' }) };
      }

      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));

      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Archivo eliminado' }) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Ruta no encontrada' }) };

  } catch (error) {
    console.error('Error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
