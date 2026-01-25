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
  const CONFIG = {
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