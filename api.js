/**
 * CAPA DE ABSTRACCIÓN DE DATOS - TODO EN LA NUBE
 * ========================================
 * 
 * Este archivo maneja TODOS los datos de la aplicación usando AWS:
 * - DynamoDB para datos estructurados
 * - S3 para fotos y videos
 * - NO usa localStorage (excepto para sesión temporal)
 */

// Proteger contra re-declaración
if (typeof DataService === 'undefined') {
  // Cache en memoria para evitar llamadas repetidas a la API
  var _apiCache = {};
  var _apiCacheTTL = 30000; // 30 segundos de cache

  var DataService = {

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES AUXILIARES
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtener datos con caché en memoria
   */
  async cachedFetch(endpoint, ttl) {
    const now = Date.now();
    const cached = _apiCache[endpoint];
    if (cached && (now - cached.time) < (ttl || _apiCacheTTL)) {
      return cached.data;
    }
    const data = await this.fetchApi(endpoint);
    _apiCache[endpoint] = { data, time: now };
    return data;
  },

  /**
   * Invalidar caché para un endpoint (después de save/update/delete)
   */
  invalidateCache(endpoint) {
    if (endpoint) {
      delete _apiCache[endpoint];
    } else {
      _apiCache = {};
    }
  },

  /**
   * Hacer petición HTTP a la API
   */
  async fetchApi(endpoint, options = {}) {
    const url = CONFIG.getApiUrl();
    if (!url) {
      return null;
    }
    
    try {
      const response = await fetch(`${url}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error en API ${endpoint}:`, error.message);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // PERFILES APROBADOS (escorts visibles en la página)
  // ═══════════════════════════════════════════════════════════
  
  async getApprovedProfiles() {
    try {
      return await this.cachedFetch('/profiles') || [];
    } catch (error) {
      console.error('Error obteniendo perfiles:', error);
      return [];
    }
  },
  
  async getProfileById(profileId) {
    try {
      return await this.fetchApi(`/profiles/${profileId}`);
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      return null;
    }
  },
  
  async addApprovedProfile(profile) {
    try {
      const result = await this.fetchApi('/profiles', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
      this.invalidateCache('/profiles');
      return result;
    } catch (error) {
      console.error('Error agregando perfil:', error);
      throw error;
    }
  },

  async updateProfile(profileId, updatedData) {
    try {
      const result = await this.fetchApi(`/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updatedData, id: profileId })
      });
      this.invalidateCache('/profiles');
      return result;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  },

  async deleteProfile(profileId) {
    try {
      const result = await this.fetchApi(`/profiles/${profileId}`, {
        method: 'DELETE'
      });
      this.invalidateCache('/profiles');
      return result;
    } catch (error) {
      console.error('Error eliminando perfil:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // REGISTROS PENDIENTES (escorts esperando aprobación)
  // ═══════════════════════════════════════════════════════════
  
  async getPendingRegistros() {
    try {
      return await this.cachedFetch('/registros') || [];
    } catch (error) {
      console.error('Error obteniendo registros:', error);
      return [];
    }
  },
  
  async addPendingRegistro(registro) {
    try {
      const result = await this.fetchApi('/registros', {
        method: 'POST',
        body: JSON.stringify(registro)
      });
      this.invalidateCache('/registros');
      return result;
    } catch (error) {
      console.error('Error agregando registro:', error);
      throw error;
    }
  },

  async updateRegistro(registroId, data) {
    try {
      const result = await this.fetchApi(`/registros/${registroId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id: registroId })
      });
      this.invalidateCache('/registros');
      return result;
    } catch (error) {
      console.error('Error actualizando registro:', error);
      throw error;
    }
  },

  async deleteRegistro(registroId) {
    try {
      const result = await this.fetchApi(`/registros/${registroId}`, {
        method: 'DELETE'
      });
      this.invalidateCache('/registros');
      return result;
    } catch (error) {
      console.error('Error eliminando registro:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // USUARIOS (para login de escorts aprobadas)
  // ═══════════════════════════════════════════════════════════
  
  async getApprovedUsers() {
    try {
      return await this.cachedFetch('/users') || [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  },
  
  async addApprovedUser(user) {
    try {
      const result = await this.fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(user)
      });
      this.invalidateCache('/users');
      return result;
    } catch (error) {
      console.error('Error agregando usuario:', error);
      throw error;
    }
  },

  async updateUser(userId, data) {
    try {
      const result = await this.fetchApi(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id: userId })
      });
      this.invalidateCache('/users');
      return result;
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const result = await this.fetchApi(`/users/${userId}`, {
        method: 'DELETE'
      });
      this.invalidateCache('/users');
      return result;
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      throw error;
    }
  },
  
  async login(email, password) {
    try {
      return await this.fetchApi('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
    } catch (error) {
      console.error('Error en login:', error);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // SESIÓN DE USUARIO - localStorage (temporal, solo en navegador)
  // ═══════════════════════════════════════════════════════════
  
  async getCurrentUser() {
    return JSON.parse(localStorage.getItem('currentUser') || 'null');
  },
  
  async setCurrentUser(user) {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      localStorage.removeItem('currentUser');
    }
    return user;
  },
  
  async logout() {
    localStorage.removeItem('currentUser');
  },
  
  async removeCurrentUser() {
    localStorage.removeItem('currentUser');
  },

  // ═══════════════════════════════════════════════════════════
  // MENSAJES DE CONTACTO
  // ═══════════════════════════════════════════════════════════
  
  async getContactMessages() {
    // Usar SOLO la configuración genérica para consistencia
    // El endpoint /messages puede no estar sincronizado con las eliminaciones
    try {
      // Invalidar cache para obtener datos frescos
      delete _apiCache['/config/contactMessages'];
      return await this.getConfig('contactMessages') || [];
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      return [];
    }
  },
  
  async addContactMessage(message) {
    // Usar SOLO la configuración genérica para consistencia
    try {
      // Invalidar cache primero para obtener datos frescos
      delete _apiCache['/config/contactMessages'];
      const cachedMessages = await this.getConfig('contactMessages') || [];
      // CLONAR el array para no mutar el caché
      const messages = JSON.parse(JSON.stringify(cachedMessages));
      messages.unshift(message);
      const result = await this.setConfig('contactMessages', messages);
      return result;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  },

  async updateContactMessage(messageId, updatedMessage) {
    // Actualizar un mensaje existente en el array
    try {
      // Invalidar cache primero para obtener datos frescos
      delete _apiCache['/config/contactMessages'];
      const cachedMessages = await this.getConfig('contactMessages') || [];
      // CLONAR el array para no mutar el caché
      const messages = JSON.parse(JSON.stringify(cachedMessages));
      const index = messages.findIndex(m => m.id === messageId);

      if (index !== -1) {
        messages[index] = { ...messages[index], ...updatedMessage };
        await this.setConfig('contactMessages', messages);
        return { success: true };
      }

      throw new Error('Mensaje no encontrado');
    } catch (error) {
      console.error('Error actualizando mensaje:', error);
      throw error;
    }
  },

  async deleteMessage(messageId) {
    // Usar SOLO la configuración genérica para consistencia
    try {
      // Invalidar cache primero para obtener datos frescos
      delete _apiCache['/config/contactMessages'];
      const cachedMessages = await this.getConfig('contactMessages') || [];
      // CLONAR el array para no mutar el caché
      const messages = JSON.parse(JSON.stringify(cachedMessages));
      const originalLength = messages.length;
      const filteredMessages = messages.filter(m => m.id !== messageId);

      if (filteredMessages.length === originalLength) {
        console.warn('Mensaje no encontrado con ID:', messageId);
        // Intentar buscar por otros campos
        const filteredByDate = messages.filter(m => m.date !== messageId && m.timestamp !== messageId);
        if (filteredByDate.length < originalLength) {
          await this.setConfig('contactMessages', filteredByDate);
          delete _apiCache['/config/contactMessages'];
          return { success: true };
        }
      } else {
        await this.setConfig('contactMessages', filteredMessages);
        delete _apiCache['/config/contactMessages'];
        return { success: true };
      }

      throw new Error('Mensaje no encontrado');
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      throw error;
    }
  },
  
  async saveContactMessages(messages) {
    // Batch save de mensajes
    for (const msg of messages) {
      if (!msg.id) {
        await this.addContactMessage(msg);
      }
    }
    return messages;
  },

  // ═══════════════════════════════════════════════════════════
  // CONFIGURACIÓN DEL SITIO
  // ═══════════════════════════════════════════════════════════
  
  async getConfig(key) {
    try {
      const result = await this.cachedFetch(`/config/${key}`, 60000);
      return result?.value || null;
    } catch (error) {
      console.error('Error obteniendo config:', error);
      return null;
    }
  },
  
  async setConfig(key, value) {
    try {
      const result = await this.fetchApi(`/config/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ key, value })
      });
      // Invalidar cache de esta configuración
      delete _apiCache[`/config/${key}`];
      return result;
    } catch (error) {
      console.error('Error guardando config:', error);
      throw error;
    }
  },
  
  async getServiciosConfig() {
    return await this.getConfig('servicios') || { active: false };
  },
  
  async setServiciosConfig(config) {
    return await this.setConfig('servicios', config);
  },
  
  async getNosotrosConfig() {
    return await this.getConfig('nosotros') || { active: false };
  },
  
  async setNosotrosConfig(config) {
    return await this.setConfig('nosotros', config);
  },
  
  async getPlansConfig() {
    return await this.getConfig('plansConfig') || {};
  },
  
  async getEmailConfig() {
    return await this.getConfig('emailConfig') || {};
  },
  
  async setEmailConfig(config) {
    return await this.setConfig('emailConfig', config);
  },
  
  async getTestimonials() {
    return await this.getConfig('testimonials') || [];
  },
  
  async saveTestimonials(testimonials) {
    return await this.setConfig('testimonials', testimonials);
  },
  
  async getUserLikes() {
    return await this.getConfig('userLikes') || [];
  },
  
  async saveUserLikes(likes) {
    return await this.setConfig('userLikes', likes);
  },

  // ═══════════════════════════════════════════════════════════
  // MEDIA - Subida de fotos y videos a S3
  // ═══════════════════════════════════════════════════════════
  
  // ═══════════════════════════════════════════════════════════
  // MEDIA - Fotos y Videos en S3
  // ═══════════════════════════════════════════════════════════

  /**
   * Obtiene URL pre-firmada para subir archivo a S3
   */
  async getUploadUrl(userId, fileName, fileType, folder = 'photos') {
    try {
      return await this.fetchApi('/media/upload', {
        method: 'POST',
        body: JSON.stringify({ userId, fileName, fileType, folder })
      });
    } catch (error) {
      console.error('Error obteniendo URL de upload:', error);
      throw error;
    }
  },

  /**
   * Sube un archivo a S3 usando URL pre-firmada
   */
  async uploadFileToS3(uploadUrl, file, fileType) {
    try {
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: file
      });
    } catch (error) {
      console.error('Error subiendo archivo a S3:', error);
      throw error;
    }
  },

  /**
   * Lista los archivos media de un usuario desde S3
   */
  async getUserMedia(userId) {
    try {
      return await this.fetchApi(`/media/${encodeURIComponent(userId)}`) || [];
    } catch (error) {
      console.error('Error obteniendo media:', error);
      return [];
    }
  },

  /**
   * Elimina un archivo de S3
   */
  async deleteMedia(key) {
    try {
      return await this.fetchApi('/media', {
        method: 'DELETE',
        body: JSON.stringify({ key })
      });
    } catch (error) {
      console.error('Error eliminando media:', error);
      throw error;
    }
  },

  /**
   * Elimina TODOS los archivos de un usuario en S3 (fotos, videos, instantes)
   */
  async deleteAllUserMedia(userId) {
    try {
      return await this.fetchApi(`/media/user/${encodeURIComponent(userId)}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error eliminando media del usuario:', error);
      throw error;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // FUNCIONES DE COMPATIBILIDAD (para código existente)
  // ═══════════════════════════════════════════════════════════
  
  async saveApprovedProfiles(profiles) {
    // Enviar todas las actualizaciones en paralelo para mayor velocidad
    await Promise.all(profiles.map(profile => {
      if (profile.id) {
        return this.fetchApi(`/profiles/${profile.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...profile, id: profile.id })
        });
      } else {
        return this.fetchApi('/profiles', {
          method: 'POST',
          body: JSON.stringify(profile)
        });
      }
    }));
    this.invalidateCache('/profiles');
    return profiles;
  },

  async savePendingRegistros(registros) {
    await Promise.all(registros.map(registro => {
      if (registro.id) {
        return this.fetchApi(`/registros/${registro.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...registro, id: registro.id })
        });
      } else {
        return this.fetchApi('/registros', {
          method: 'POST',
          body: JSON.stringify(registro)
        });
      }
    }));
    this.invalidateCache('/registros');
    return registros;
  },

  async saveApprovedUsers(users) {
    await Promise.all(users.map(user => {
      if (user.id) {
        return this.fetchApi(`/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...user, id: user.id })
        });
      } else {
        return this.fetchApi('/users', {
          method: 'POST',
          body: JSON.stringify(user)
        });
      }
    }));
    this.invalidateCache('/users');
    return users;
  },

  async getPublicaciones() {
    return await this.getConfig('publicaciones') || [];
  },
  
  async savePublicaciones(publicaciones) {
    return await this.setConfig('publicaciones', publicaciones);
  },
  
  async getPlanRequests() {
    return await this.getConfig('planRequests') || [];
  },
  
  async savePlanRequests(requests) {
    // Limpiar base64 de receiptData para evitar exceder límite de DynamoDB (400KB)
    const cleanRequests = requests.map(req => {
      if (req.receiptData && req.receiptData.startsWith('data:')) {
        const { receiptData, ...rest } = req;
        return rest;
      }
      return req;
    });
    return await this.setConfig('planRequests', cleanRequests);
  },
  
  async getSalaOscuraThreads() {
    return await this.getConfig('salaOscuraThreads') || [];
  },
  
  async saveSalaOscuraThreads(threads) {
    return await this.setConfig('salaOscuraThreads', threads);
  },

  // ═══════════════════════════════════════════════════════════
  // USUARIOS DEL FORO
  // ═══════════════════════════════════════════════════════════
  
  async getForumUsers() {
    return await this.getConfig('forumUsers') || [];
  },
  
  async saveForumUsers(users) {
    return await this.setConfig('forumUsers', users);
  },
  
  async addForumUser(user) {
    const users = await this.getForumUsers();
    users.push(user);
    return await this.saveForumUsers(users);
  },

  // ═══════════════════════════════════════════════════════════
  // MENCIONES DEL FORO
  // ═══════════════════════════════════════════════════════════
  
  async getForumMentions() {
    return await this.getConfig('forumMentions') || {};
  },
  
  async saveForumMentions(mentions) {
    return await this.setConfig('forumMentions', mentions);
  },

  async getPasswordRecoveryRequests() {
    return await this.getConfig('passwordRecoveryRequests') || [];
  },
  
  async addPasswordRecoveryRequest(request) {
    const requests = await this.getPasswordRecoveryRequests();
    requests.push(request);
    await this.setConfig('passwordRecoveryRequests', requests);
    return request;
  },
  
  async savePasswordRecoveryRequests(requests) {
    return await this.setConfig('passwordRecoveryRequests', requests);
  },
  
  // Alias para getApprovedProfiles (compatibilidad con código existente)
  async getProfiles() {
    return await this.getApprovedProfiles();
  },
  
  async saveProfiles(profiles) {
    return await this.saveApprovedProfiles(profiles);
  },

  // ═══════════════════════════════════════════════════════════
  // FORO - Sala Oscura
  // ═══════════════════════════════════════════════════════════
  
  async getForoPosts() {
    try {
      return await this.fetchApi('/foro/posts') || [];
    } catch (error) {
      console.error('Error obteniendo posts del foro:', error);
      return [];
    }
  },
  
  async getForoPost(postId) {
    try {
      return await this.fetchApi(`/foro/posts/${postId}`);
    } catch (error) {
      console.error('Error obteniendo post:', error);
      return null;
    }
  },
  
  async addForoPost(post) {
    try {
      return await this.fetchApi('/foro/posts', {
        method: 'POST',
        body: JSON.stringify(post)
      });
    } catch (error) {
      console.error('Error creando post:', error);
      throw error;
    }
  },
  
  async updateForoPost(postId, data) {
    try {
      return await this.fetchApi(`/foro/posts/${postId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id: postId })
      });
    } catch (error) {
      console.error('Error actualizando post:', error);
      throw error;
    }
  },
  
  async deleteForoPost(postId) {
    try {
      return await this.fetchApi(`/foro/posts/${postId}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error eliminando post:', error);
      throw error;
    }
  },
  
  // Usuarios del foro
  async getForoUsers() {
    try {
      return await this.fetchApi('/foro/users') || [];
    } catch (error) {
      console.error('Error obteniendo usuarios del foro:', error);
      return [];
    }
  },
  
  async addForoUser(user) {
    try {
      return await this.fetchApi('/foro/users', {
        method: 'POST',
        body: JSON.stringify(user)
      });
    } catch (error) {
      console.error('Error creando usuario del foro:', error);
      throw error;
    }
  },
  
  async loginForo(username, password) {
    try {
      return await this.fetchApi('/foro/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
    } catch (error) {
      console.error('Error en login del foro:', error);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════
  // STORIES - Instantes y Estados
  // ═══════════════════════════════════════════════════════════
  
  async getStories(userId = null, type = null) {
    try {
      let endpoint = '/stories';
      const params = [];
      if (userId) params.push(`userId=${userId}`);
      if (type) params.push(`type=${type}`);
      if (params.length > 0) endpoint += '?' + params.join('&');
      return await this.cachedFetch(endpoint, 15000) || [];
    } catch (error) {
      console.error('Error obteniendo stories:', error);
      return [];
    }
  },
  
  async addStory(story) {
    try {
      const result = await this.fetchApi('/stories', {
        method: 'POST',
        body: JSON.stringify(story)
      });
      // Invalidar todas las cachés de stories
      Object.keys(_apiCache).forEach(k => { if (k.startsWith('/stories')) delete _apiCache[k]; });
      return result;
    } catch (error) {
      console.error('Error creando story:', error);
      throw error;
    }
  },

  async deleteStory(storyId) {
    try {
      const result = await this.fetchApi(`/stories/${storyId}`, {
        method: 'DELETE'
      });
      Object.keys(_apiCache).forEach(k => { if (k.startsWith('/stories')) delete _apiCache[k]; });
      return result;
    } catch (error) {
      console.error('Error eliminando story:', error);
      throw error;
    }
  },
  
  // Instantes (stories de fotos)
  async getInstantes(userId = null) {
    return await this.getStories(userId, 'instante');
  },
  
  async addInstante(instante) {
    return await this.addStory({ ...instante, type: 'instante' });
  },
  
  // Estados (stories de texto)
  async getEstados(userId = null) {
    return await this.getStories(userId, 'estado');
  },
  
  async addEstado(estado) {
    return await this.addStory({ ...estado, type: 'estado' });
  },
  
  // Global stories (todos los usuarios)
  async getGlobalInstantes() {
    return await this.getStories(null, 'instante');
  },
  
  async getGlobalEstados() {
    return await this.getStories(null, 'estado');
  },

  // ═══════════════════════════════════════════════════════════
  // EMAIL - Envío de correos
  // ═══════════════════════════════════════════════════════════
  
  async sendEmail(to, subject, message, html = null) {
    try {
      return await this.fetchApi('/email/send', {
        method: 'POST',
        body: JSON.stringify({ to, subject, message, html })
      });
    } catch (error) {
      console.error('Error enviando email:', error);
      throw error;
    }
  },
  
  async sendContactMessage(name, email, phone, message) {
    try {
      return await this.fetchApi('/email/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, phone, message })
      });
    } catch (error) {
      console.error('Error enviando mensaje de contacto:', error);
      throw error;
    }
  }
};

// Hacer disponible globalmente
window.DataService = DataService;

} // Cerrar if de protección contra re-declaración
