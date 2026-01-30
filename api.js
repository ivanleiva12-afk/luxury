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
  var DataService = {
  
  // ═══════════════════════════════════════════════════════════
  // FUNCIONES AUXILIARES
  // ═══════════════════════════════════════════════════════════
  
  /**
   * Hacer petición HTTP a la API
   */
  async fetchApi(endpoint, options = {}) {
    const url = CONFIG.getApiUrl();
    if (!url) {
      console.error('API URL no configurada');
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
      return await this.fetchApi('/profiles') || [];
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
      return await this.fetchApi('/profiles', {
        method: 'POST',
        body: JSON.stringify(profile)
      });
    } catch (error) {
      console.error('Error agregando perfil:', error);
      throw error;
    }
  },
  
  async updateProfile(profileId, updatedData) {
    try {
      return await this.fetchApi(`/profiles/${profileId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...updatedData, id: profileId })
      });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  },
  
  async deleteProfile(profileId) {
    try {
      return await this.fetchApi(`/profiles/${profileId}`, {
        method: 'DELETE'
      });
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
      return await this.fetchApi('/registros') || [];
    } catch (error) {
      console.error('Error obteniendo registros:', error);
      return [];
    }
  },
  
  async addPendingRegistro(registro) {
    try {
      return await this.fetchApi('/registros', {
        method: 'POST',
        body: JSON.stringify(registro)
      });
    } catch (error) {
      console.error('Error agregando registro:', error);
      throw error;
    }
  },
  
  async updateRegistro(registroId, data) {
    try {
      return await this.fetchApi(`/registros/${registroId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id: registroId })
      });
    } catch (error) {
      console.error('Error actualizando registro:', error);
      throw error;
    }
  },
  
  async deleteRegistro(registroId) {
    try {
      return await this.fetchApi(`/registros/${registroId}`, {
        method: 'DELETE'
      });
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
      return await this.fetchApi('/users') || [];
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  },
  
  async addApprovedUser(user) {
    try {
      return await this.fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(user)
      });
    } catch (error) {
      console.error('Error agregando usuario:', error);
      throw error;
    }
  },
  
  async updateUser(userId, data) {
    try {
      return await this.fetchApi(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, id: userId })
      });
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      throw error;
    }
  },
  
  async deleteUser(userId) {
    try {
      return await this.fetchApi(`/users/${userId}`, {
        method: 'DELETE'
      });
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
    try {
      // Intentar primero el endpoint específico
      const result = await this.fetchApi('/messages');
      if (result && Array.isArray(result)) {
        return result;
      }
      // Si falla, usar configuración genérica
      return await this.getConfig('contactMessages') || [];
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      // Fallback a configuración genérica
      return await this.getConfig('contactMessages') || [];
    }
  },
  
  async addContactMessage(message) {
    try {
      // Intentar primero el endpoint específico
      const result = await this.fetchApi('/messages', {
        method: 'POST',
        body: JSON.stringify(message)
      });
      return result;
    } catch (error) {
      console.error('Error enviando mensaje, usando fallback:', error);
      // Fallback: usar configuración genérica
      const messages = await this.getConfig('contactMessages') || [];
      messages.unshift(message);
      return await this.setConfig('contactMessages', messages);
    }
  },
  
  async deleteMessage(messageId) {
    try {
      return await this.fetchApi(`/messages/${messageId}`, {
        method: 'DELETE'
      });
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
      const result = await this.fetchApi(`/config/${key}`);
      return result?.value || null;
    } catch (error) {
      console.error('Error obteniendo config:', error);
      return null;
    }
  },
  
  async setConfig(key, value) {
    try {
      return await this.fetchApi(`/config/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ key, value })
      });
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
  
  /**
   * Obtiene una URL firmada para subir un archivo a S3
   */
  async getUploadUrl(fileName, fileType, userId) {
    try {
      return await this.fetchApi('/media/upload-url', {
        method: 'POST',
        body: JSON.stringify({ fileName, fileType, userId })
      });
    } catch (error) {
      console.error('Error obteniendo URL de subida:', error);
      throw error;
    }
  },
  
  /**
   * Sube un archivo a S3 usando la URL firmada
   */
  async uploadFile(file, userId) {
    try {
      // 1. Obtener URL firmada
      const { uploadUrl, publicUrl, key } = await this.getUploadUrl(
        file.name, 
        file.type, 
        userId
      );
      
      // 2. Subir archivo directamente a S3
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Error subiendo archivo a S3');
      }
      
      // 3. Guardar metadata en DynamoDB
      await this.fetchApi('/media', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          key,
          url: publicUrl,
          type: file.type.startsWith('video/') ? 'video' : 'photo',
          fileName: file.name,
          size: file.size
        })
      });
      
      return { url: publicUrl, key };
    } catch (error) {
      console.error('Error en uploadFile:', error);
      throw error;
    }
  },
  
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
    for (const profile of profiles) {
      if (profile.id) {
        await this.updateProfile(profile.id, profile);
      } else {
        await this.addApprovedProfile(profile);
      }
    }
    return profiles;
  },
  
  async savePendingRegistros(registros) {
    for (const registro of registros) {
      if (registro.id) {
        await this.updateRegistro(registro.id, registro);
      } else {
        await this.addPendingRegistro(registro);
      }
    }
    return registros;
  },
  
  async saveApprovedUsers(users) {
    for (const user of users) {
      if (user.id) {
        await this.updateUser(user.id, user);
      } else {
        await this.addApprovedUser(user);
      }
    }
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
    return await this.setConfig('planRequests', requests);
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
      return await this.fetchApi(endpoint) || [];
    } catch (error) {
      console.error('Error obteniendo stories:', error);
      return [];
    }
  },
  
  async addStory(story) {
    try {
      return await this.fetchApi('/stories', {
        method: 'POST',
        body: JSON.stringify(story)
      });
    } catch (error) {
      console.error('Error creando story:', error);
      throw error;
    }
  },
  
  async deleteStory(storyId) {
    try {
      return await this.fetchApi(`/stories/${storyId}`, {
        method: 'DELETE'
      });
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
