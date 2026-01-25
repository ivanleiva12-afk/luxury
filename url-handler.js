// Manejador de URLs amigables para GitHub Pages
(function() {
  'use strict';

  // Mapa de URLs amigables a archivos reales
  const urlMap = {
    'home': 'index.html',
    'inicio': 'index.html',
    'services': 'servicios.html',
    'about': 'nosotros.html',
    'profile': 'perfil-clienta.html',
    'perfil': 'perfil-clienta.html',
    'register': 'registro.html',
    'admin-panel': 'admin.html',
    'dashboard': 'admin.html',
    'salon': 'salaoscura.html',
    'room': 'salaoscura.html',
    'reset': 'reset-password.html',
    'password': 'reset-password.html'
  };

  // Función para manejar navegación
  function handleNavigation() {
    const path = window.location.pathname;
    const cleanPath = path.replace(/^\/+|\/+$/g, ''); // Remover barras al inicio y final
    
    // Si ya estamos en una página con .html, no hacer nada
    if (path.includes('.html')) {
      return;
    }
    
    // Si la ruta limpia coincide con nuestro mapa
    if (cleanPath && urlMap[cleanPath]) {
      const targetFile = urlMap[cleanPath];
      const search = window.location.search;
      const hash = window.location.hash;
      
      // Redirigir al archivo real manteniendo query params y hash
      window.location.replace(targetFile + search + hash);
      return;
    }
    
    // Si es la raíz, ir a index.html
    if (cleanPath === '' || cleanPath === '/') {
      if (window.location.pathname !== '/index.html') {
        window.location.replace('index.html' + window.location.search + window.location.hash);
      }
      return;
    }
  }

  // Interceptar clicks en enlaces internos
  function interceptLinks() {
    document.addEventListener('click', function(e) {
      const link = e.target.closest('a');
      if (!link) return;
      
      const href = link.getAttribute('href');
      if (!href) return;
      
      // Solo manejar enlaces internos (no externos)
      if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      
      // Si es un enlace a una URL amigable
      if (urlMap[href]) {
        e.preventDefault();
        const targetFile = urlMap[href];
        
        // Usar pushState para cambiar la URL sin recargar
        history.pushState(null, '', '/' + href);
        
        // Cargar el contenido del archivo
        window.location.href = targetFile;
      }
    });
  }

  // Función para actualizar la URL mostrada
  function updateDisplayedURL() {
    const currentFile = window.location.pathname.split('/').pop();
    
    // Encontrar la URL amigable correspondiente
    for (const [friendlyUrl, actualFile] of Object.entries(urlMap)) {
      if (actualFile === currentFile) {
        // Solo cambiar si no estamos ya en la URL amigable
        if (window.location.pathname !== '/' + friendlyUrl) {
          history.replaceState(null, '', '/' + friendlyUrl + window.location.search + window.location.hash);
        }
        break;
      }
    }
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      handleNavigation();
      interceptLinks();
      updateDisplayedURL();
    });
  } else {
    handleNavigation();
    interceptLinks();
    updateDisplayedURL();
  }

  // Manejar navegación del browser (back/forward)
  window.addEventListener('popstate', function() {
    handleNavigation();
  });

})();