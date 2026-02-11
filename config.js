/**
 * CONFIGURACIÓN CENTRAL DE LA APLICACIÓN
 * ========================================
 * 
 * INSTRUCCIONES:
 * 1. Durante desarrollo: USE_BACKEND = false (usa localStorage)
 * 2. Cuando AWS esté listo: USE_BACKEND = true y cambiar API_URL
 */

// Proteger contra re-declaración
if (typeof CONFIG === 'undefined') {
  var CONFIG = {
    // ═══════════════════════════════════════════════════════════
    // MODO DE OPERACIÓN
    // ═══════════════════════════════════════════════════════════
    
    // false = usa localStorage (desarrollo local)
    // true = usa API de AWS (producción)
    USE_BACKEND: true,
  
  // ═══════════════════════════════════════════════════════════
  // URLs DE API
  // ═══════════════════════════════════════════════════════════
  
  // URL para desarrollo local (cuando pruebes backend en tu máquina)
  API_URL_DEV: 'http://localhost:3000/api',
  
  // URL de producción AWS - Sala Oscura API Gateway
  API_URL_PROD: 'https://1bvqqc0sn0.execute-api.us-east-1.amazonaws.com/prod',
  
  // ═══════════════════════════════════════════════════════════
  // ENTORNO
  // ═══════════════════════════════════════════════════════════
  
  // 'development' o 'production'
  ENVIRONMENT: 'production',

  // ═══════════════════════════════════════════════════════════
  // MODERADOR DEL FORO
  // ═══════════════════════════════════════════════════════════

  MODERATOR_EMAIL: 'moderador_salanegra@salaoscura.com',
  // Hash SHA-256 de la contraseña del moderador
  MODERATOR_PASSWORD_HASH: '26f625bef98de754c81d99214cbf9ade0195fef50b18eb5e9d04326f9d761876',

  // Función para verificar credenciales del moderador
  verifyModerator: async function(email, password) {
    if (email.toLowerCase() !== this.MODERATOR_EMAIL.toLowerCase()) {
      return false;
    }

    // Generar hash del password ingresado
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === this.MODERATOR_PASSWORD_HASH;
  },

  // ═══════════════════════════════════════════════════════════
  // FUNCIÓN HELPER PARA OBTENER LA URL CORRECTA
  // ═══════════════════════════════════════════════════════════

  getApiUrl: function() {
    if (!this.USE_BACKEND) {
      return null; // Usa localStorage
    }
    return this.ENVIRONMENT === 'production' 
      ? this.API_URL_PROD 
      : this.API_URL_DEV;
  }
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;

} // Cerrar if de protección contra re-declaración