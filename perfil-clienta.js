// ========================================
// PERFIL CLIENTA - Panel de Control JS
// ========================================

document.addEventListener('DOMContentLoaded', async () => {
  // Verificar autenticación
  let currentUser = await DataService.getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }
  
  // ============================================
  // VERIFICAR ESTADO ACTUAL DEL REGISTRO
  // (El estado puede haber cambiado desde que se guardó currentUser)
  // ============================================
  const pendingRegistros = await DataService.getPendingRegistros() || [];
  const approvedUsers = await DataService.getApprovedUsers() || [];
  
  // Buscar el estado más reciente del usuario
  let latestUserData = approvedUsers.find(u => u.id === currentUser.id || u.email === currentUser.email);
  
  if (!latestUserData) {
    latestUserData = pendingRegistros.find(r => r.id === currentUser.id || r.email === currentUser.email);
  }
  
  if (latestUserData) {
    // Actualizar el status del currentUser con el más reciente
    currentUser.status = latestUserData.status;
    
    // Si está aprobado, actualizar todos los datos
    if (latestUserData.status === 'aprobado') {
      currentUser = {
        ...currentUser,
        status: 'aprobado',
        approvedAt: latestUserData.approvedAt,
        profileVisible: latestUserData.profileVisible || currentUser.profileVisible || false,
        // Sincronizar fecha de vencimiento si fue actualizada por renovación
        planExpiry: latestUserData.planExpiry || currentUser.planExpiry,
        lastRenewalDate: latestUserData.lastRenewalDate || currentUser.lastRenewalDate
      };
      await DataService.setCurrentUser(currentUser);
    }
  }
  
  // ============================================
  // VERIFICAR SI HAY RENOVACIONES APROBADAS
  // ============================================
  async function checkApprovedRenewals() {
    const requests = await DataService.getPlanRequests() || [];
    const approvedRenewal = requests.find(r => 
      r.userId === currentUser.id && 
      r.status === 'approved' && 
      r.type === 'renewal' &&
      !r.appliedToUser
    );
    
    if (approvedRenewal) {
      // Aplicar la renovación al usuario
      currentUser.planExpiry = approvedRenewal.newExpiry;
      currentUser.lastRenewalDate = approvedRenewal.approvedAt;
      await DataService.setCurrentUser(currentUser);
      
      // Marcar como aplicada
      approvedRenewal.appliedToUser = true;
      await DataService.savePlanRequests(requests);
      
      // Mostrar notificación
      setTimeout(() => {
        showNotification(`🎉 ¡Tu renovación ha sido aprobada! Tu plan ahora vence el ${new Date(approvedRenewal.newExpiry).toLocaleDateString('es-CL')}`, 'success');
      }, 1000);
    }
  }
  
  await checkApprovedRenewals();
  
  // Verificar que el perfil esté aprobado
  if (currentUser.status === 'rechazado') {
    showRejectedMessage(latestUserData?.rejectionReason);
    return;
  }
  
  if (currentUser.status !== 'aprobado') {
    showPendingApprovalMessage();
    return;
  }
  
  // Función para mostrar mensaje de rechazado
  function showRejectedMessage(reason) {
    document.body.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0A0A0A; color: #fff; text-align: center; padding: 24px;">
        <div style="font-size: 64px; margin-bottom: 24px;">❌</div>
        <h1 style="color: #DC2626; font-size: 28px; margin-bottom: 16px;">Perfil Rechazado</h1>
        <p style="color: #A0A0A0; max-width: 500px; line-height: 1.6; margin-bottom: 24px;">
          Lamentamos informarte que tu solicitud de registro ha sido rechazada.
        </p>
        ${reason ? `
        <div style="background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.3); padding: 16px 24px; border-radius: 12px; margin-bottom: 24px; max-width: 500px;">
          <p style="color: #DC2626; font-size: 14px;"><strong>Motivo:</strong> ${reason}</p>
        </div>
        ` : ''}
        <p style="color: #A0A0A0; font-size: 14px; margin-bottom: 24px;">
          Si crees que esto es un error o deseas más información, contáctanos por WhatsApp.
        </p>
        <div style="display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;">
          <a href="home" style="background: linear-gradient(135deg, #D4AF37, #B8860B); color: #0A0A0A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">← Volver al Inicio</a>
          <button onclick="DataService.removeCurrentUser().then(() => window.location.href='home');" style="background: rgba(255,255,255,0.1); color: #fff; padding: 14px 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); cursor: pointer; font-weight: 600;">Cerrar Sesión</button>
        </div>
      </div>
    `;
  }
  
  // Función para mostrar mensaje de pendiente
  function showPendingApprovalMessage() {
    document.body.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0A0A0A; color: #fff; text-align: center; padding: 24px;">
        <div style="font-size: 64px; margin-bottom: 24px;">⏳</div>
        <h1 style="color: #D4AF37; font-size: 28px; margin-bottom: 16px;">Perfil Pendiente de Aprobación</h1>
        <p style="color: #A0A0A0; max-width: 500px; line-height: 1.6; margin-bottom: 24px;">
          Tu registro ha sido recibido y está siendo revisado por nuestro equipo.<br><br>
          Te notificaremos por WhatsApp o email cuando tu perfil sea aprobado.
        </p>
        <div style="background: rgba(139,92,246,0.2); border: 1px solid rgba(139,92,246,0.5); padding: 16px 24px; border-radius: 12px; margin-bottom: 24px;">
          <p style="color: #8B5CF6; font-size: 14px;">📅 Tu entrevista está programada. Mantente atenta a tu WhatsApp.</p>
        </div>
        <a href="index.html" style="background: linear-gradient(135deg, #D4AF37, #B8860B); color: #0A0A0A; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">← Volver al Inicio</a>
      </div>
    `;
  }

  // Cargar datos del usuario
  await loadUserData(currentUser);
  
  // Inicializar toggle de visibilidad del perfil
  initProfileVisibilityToggle();

  // Año en footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  
  // ========== TOGGLE DE VISIBILIDAD DEL PERFIL ==========
  function initProfileVisibilityToggle() {
    const toggle = document.getElementById('profile-visibility-toggle');
    const visibilityIcon = document.getElementById('visibility-icon');
    const visibilityText = document.getElementById('visibility-text');
    const visibilityLabel = document.getElementById('visibility-label');
    
    if (!toggle) return;
    
    // Cargar estado actual
    const isVisible = currentUser.profileVisible || false;
    toggle.checked = isVisible;
    updateVisibilityUI(isVisible);
    
    // Event listener para el toggle
    toggle.addEventListener('change', async () => {
      const newState = toggle.checked;
      
      // Actualizar currentUser
      currentUser.profileVisible = newState;
      await DataService.setCurrentUser(currentUser);
      
      // Actualizar en approvedUsers
      const approvedUsers = await DataService.getApprovedUsers() || [];
      const userIndex = approvedUsers.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        approvedUsers[userIndex].profileVisible = newState;
        await DataService.saveApprovedUsers(approvedUsers);
      }
      
      // Actualizar en approvedProfiles (para los carruseles)
      const approvedProfiles = await DataService.getApprovedProfiles() || [];
      const profileIndex = approvedProfiles.findIndex(p => p.id === `profile-${currentUser.id}`);
      if (profileIndex !== -1) {
        approvedProfiles[profileIndex].profileVisible = newState;
        approvedProfiles[profileIndex].isActive = newState; // Activar/desactivar perfil en carruseles
        await DataService.saveApprovedProfiles(approvedProfiles);
      }
      
      // Actualizar en pendingRegistros
      const pendingRegistros = await DataService.getPendingRegistros() || [];
      const regIndex = pendingRegistros.findIndex(r => r.id === currentUser.id);
      if (regIndex !== -1) {
        pendingRegistros[regIndex].profileVisible = newState;
        await DataService.savePendingRegistros(pendingRegistros);
      }
      
      updateVisibilityUI(newState);
      
      // Mostrar confirmación
      if (newState) {
        showNotification('✨ ¡Tu perfil ahora es visible en la página principal!', 'success');
      } else {
        showNotification('🔒 Tu perfil está oculto. No aparecerá en la página principal.', 'info');
      }
    });
    
    function updateVisibilityUI(isVisible) {
      if (isVisible) {
        visibilityIcon.textContent = '🟢';
        visibilityText.textContent = 'Perfil Visible';
        visibilityText.classList.add('active');
        visibilityLabel.textContent = 'Perfil Activo';
        visibilityLabel.classList.add('active');
      } else {
        visibilityIcon.textContent = '🔴';
        visibilityText.textContent = 'Perfil Oculto';
        visibilityText.classList.remove('active');
        visibilityLabel.textContent = 'Activar Perfil';
        visibilityLabel.classList.remove('active');
      }
    }
  }
  
  // Función para mostrar notificaciones
  function showNotification(message, type = 'info') {
    const existing = document.querySelector('.profile-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'profile-notification';
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      right: 24px;
      padding: 16px 24px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      z-index: 9999;
      animation: slideIn 300ms ease;
      ${type === 'success' ? 'background: rgba(16,185,129,0.9); color: white;' : type === 'error' ? 'background: rgba(239,68,68,0.9); color: white;' : 'background: rgba(59,130,246,0.9); color: white;'}
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 300ms ease forwards';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // ========== CARGAR CONFIGURACIÓN DE PLANES ==========
  // Obtener restricciones del plan actual
  async function getPlanRestrictions() {
    const userPlan = currentUser.selectedPlan || 'premium';

    // Defaults por plan (usados solo si no hay config del admin)
    const defaults = {
      premium: { photos: 15, videos: 4, instantes: 5, instantesDuracion: 24, estados: 5, estadosDuracion: 12 },
      vip:     { photos: 10, videos: 2, instantes: 3, instantesDuracion: 12, estados: 2, estadosDuracion: 6 },
      luxury:  { photos: 0,  videos: 0, instantes: 0, instantesDuracion: 48, estados: 0, estadosDuracion: 24 }
    };
    const fallback = defaults[userPlan] || defaults.premium;

    // Siempre consultar la config fresca del admin para valores dinámicos
    const plansConfig = await DataService.getPlansConfig() || {};
    const adminConfig = plansConfig[userPlan] || {};

    return {
      photos: adminConfig.photos ?? fallback.photos,
      videos: adminConfig.videos ?? fallback.videos,
      instantes: adminConfig.instantes ?? fallback.instantes,
      instantesDuracion: adminConfig.instantesDuracion ?? fallback.instantesDuracion,
      estados: adminConfig.estados ?? fallback.estados,
      estadosDuracion: adminConfig.estadosDuracion ?? fallback.estadosDuracion,
      planName: userPlan.charAt(0).toUpperCase() + userPlan.slice(1)
    };
  }

  // ========== SISTEMA DE CONTADOR 24H PARA INSTANTES Y ESTADOS ==========
  // Este contador persiste aunque se eliminen los instantes/estados
  // Se resetea a medianoche del día siguiente

  function getDailyCounter(type) {
    const key = `dailyCounter_${type}_${currentUser.id}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const today = new Date().toDateString();
    
    // Si es un nuevo día, resetear el contador
    if (data.date !== today) {
      return { count: 0, date: today };
    }
    
    return data;
  }

  function incrementDailyCounter(type) {
    const key = `dailyCounter_${type}_${currentUser.id}`;
    const counter = getDailyCounter(type);
    counter.count += 1;
    counter.date = new Date().toDateString();
    localStorage.setItem(key, JSON.stringify(counter));
    return counter;
  }

  async function canPublish(type) {
    const restrictions = await getPlanRestrictions();
    const counter = getDailyCounter(type);
    const maxAllowed = type === 'instantes' ? restrictions.instantes : restrictions.estados;
    
    // Si el plan no permite este tipo
    if (maxAllowed === 0) {
      return { allowed: false, reason: `Tu plan ${restrictions.planName} no permite publicar ${type}.`, remaining: 0 };
    }
    
    // Verificar si se alcanzó el límite diario
    if (counter.count >= maxAllowed) {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      const hoursRemaining = Math.ceil((tomorrow - now) / (1000 * 60 * 60));
      
      return { 
        allowed: false, 
        reason: `Has alcanzado tu límite de ${maxAllowed} ${type}/día. Se reinicia en ~${hoursRemaining}h.`,
        remaining: 0,
        hoursUntilReset: hoursRemaining
      };
    }
    
    return { allowed: true, remaining: maxAllowed - counter.count };
  }

  async function updatePlanInfoTexts() {
    const restrictions = await getPlanRestrictions();
    const instantesInfo = document.getElementById('instantes-plan-info');
    const estadosInfo = document.getElementById('estados-plan-info');
    
    const instantesCounter = getDailyCounter('instantes');
    const estadosCounter = getDailyCounter('estados');
    
    if (instantesInfo) {
      if (restrictions.instantes === 0) {
        instantesInfo.innerHTML = '<strong style="color:#D4AF37;">Tu plan no permite instantes.</strong>';
      } else {
        const instantesRemaining = Math.max(0, restrictions.instantes - instantesCounter.count);
        instantesInfo.innerHTML = `<strong>Duración: ${restrictions.instantesDuracion}h</strong> • Límite: <strong>${instantesCounter.count}/${restrictions.instantes}</strong> por día • Restantes: <strong>${instantesRemaining}</strong>`;
      }
    }
    
    if (estadosInfo) {
      if (restrictions.estados === 0) {
        estadosInfo.innerHTML = '<strong style="color:#D4AF37;">Tu plan no permite estados.</strong>';
      } else {
        const estadosRemaining = Math.max(0, restrictions.estados - estadosCounter.count);
        estadosInfo.innerHTML = `<strong>Duración máx: ${restrictions.estadosDuracion}h</strong> • Límite: <strong>${estadosCounter.count}/${restrictions.estados}</strong> por día • Restantes: <strong>${estadosRemaining}</strong>`;
      }
    }
  }

  // Actualizar opciones de duración según restricciones del plan
  async function updateDurationOptions() {
    const restrictions = await getPlanRestrictions();
    const estadoDuracionSelect = document.getElementById('estado-duracion');
    const duracionPlanInfo = document.getElementById('duracion-plan-info');
    
    if (estadoDuracionSelect) {
      // Limpiar opciones existentes
      estadoDuracionSelect.innerHTML = '';
      
      // Obtener duración máxima del plan
      const maxDuration = restrictions.estadosDuracion;
      
      // Mostrar info del plan
      if (duracionPlanInfo) {
        duracionPlanInfo.textContent = `(máx. ${maxDuration}h - Plan ${restrictions.planName})`;
      }
      
      // Generar opciones dinámicamente hasta el máximo permitido
      const allOptions = [
        { value: 1, text: '1 hora' },
        { value: 2, text: '2 horas' },
        { value: 3, text: '3 horas' },
        { value: 4, text: '4 horas' },
        { value: 6, text: '6 horas' },
        { value: 8, text: '8 horas' },
        { value: 12, text: '12 horas' },
        { value: 24, text: '24 horas' },
        { value: 48, text: '48 horas' }
      ];
      
      // Filtrar opciones que estén dentro del límite del plan
      const availableOptions = allOptions.filter(opt => opt.value <= maxDuration);
      
      // Si el máximo no está en las opciones predefinidas, agregarlo
      if (maxDuration > 0 && !availableOptions.find(opt => opt.value === maxDuration)) {
        availableOptions.push({ 
          value: maxDuration, 
          text: `${maxDuration} hora${maxDuration > 1 ? 's' : ''}` 
        });
        availableOptions.sort((a, b) => a.value - b.value);
      }
      
      // Crear las opciones del select
      availableOptions.forEach((option, index) => {
        const optionElement = document.createElement('option');
        optionElement.value = option.value;
        optionElement.textContent = option.text;
        
        // Seleccionar la opción del medio o la más alta si hay pocas
        const middleIndex = Math.floor(availableOptions.length / 2);
        if (index === middleIndex) {
          optionElement.selected = true;
        }
        
        estadoDuracionSelect.appendChild(optionElement);
      });
      
      // Si no hay opciones válidas, agregar al menos 1 hora
      if (estadoDuracionSelect.children.length === 0) {
        const optionElement = document.createElement('option');
        optionElement.value = 1;
        optionElement.textContent = '1 hora';
        optionElement.selected = true;
        estadoDuracionSelect.appendChild(optionElement);
      }
    }
  }

  // Llamar al actualizar el DOM
  await updateDurationOptions();

  // ========== TABS ==========
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`tab-${tabId}`).classList.add('active');
    });
  });

  // ========== LOGOUT ==========
  document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (confirm('¿Segura que quieres cerrar sesión?')) {
      await DataService.removeCurrentUser();
      window.location.href = 'home';
    }
  });

  // ========== CARGAR DATOS DEL USUARIO ==========
  async function loadUserData(user) {
    // Nombre
    const displayName = document.getElementById('user-display-name');
    if (displayName) displayName.textContent = user.displayName || 'Usuario';
    
    // Username (para menciones en el foro)
    const usernameDisplay = document.getElementById('user-username-display');
    if (usernameDisplay) {
      usernameDisplay.textContent = user.username ? `@${user.username}` : '@usuario';
    }
    
    // Avatar - priorizar fotos locales (más rápido), luego S3, luego AWS
    const avatar = document.getElementById('user-avatar');
    if (avatar) {
      const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSI3NSIgcj0iMzAiIGZpbGw9IiMzMzMzNGQiLz48cGF0aCBkPSJNNTAgMTc1QzUwIDE0MCA3MCAxMTUgMTAwIDExNUMxMzAgMTE1IDE1MCAxNDAgMTUwIDE3NSIgZmlsbD0iIzMzMzM0ZCIvPjwvc3ZnPg==';

      // 1. Intentar desde localStorage (más rápido - sin API call)
      const localPhotos = JSON.parse(localStorage.getItem(`photos_${user.id}`) || '[]');
      const firstLocalPhoto = localPhotos[0];

      if (firstLocalPhoto?.url) {
        avatar.src = firstLocalPhoto.url;
      } else if (firstLocalPhoto?.data) {
        avatar.src = firstLocalPhoto.data;
      } else if (user.avatar && !user.avatar.includes('unsplash') && user.avatar !== 'null') {
        avatar.src = user.avatar;
      } else {
        avatar.src = defaultAvatar;
        // Cargar desde perfil aprobado en background
        DataService.getProfileById(`profile-${user.id}`).then(profile => {
          if (profile?.profilePhotosData?.[0]) {
            const photoSrc = profile.profilePhotosData[0].url || profile.profilePhotosData[0].base64;
            if (photoSrc) avatar.src = photoSrc;
          }
        }).catch(() => {});
      }
    }
    
    // Email
    const emailField = document.getElementById('edit-email');
    if (emailField) emailField.value = user.email || '';
    
    // Campos editables
    document.getElementById('edit-display-name').value = user.displayName || '';
    
    // Fecha de nacimiento y edad (solo lectura)
    const birthdateField = document.getElementById('edit-birthdate');
    if (birthdateField && user.birthdate) {
      const date = new Date(user.birthdate);
      const formattedDate = date.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
      birthdateField.value = formattedDate;
      // Calcular edad real desde fecha de nacimiento
      const today = new Date();
      let calculatedAge = today.getFullYear() - date.getFullYear();
      const monthDiff = today.getMonth() - date.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
        calculatedAge--;
      }
      user.age = calculatedAge.toString();
    }
    document.getElementById('edit-age').value = user.age ? `${user.age} años` : '';

    const taglineEl = document.getElementById('edit-tagline');
    if (taglineEl) taglineEl.value = user.tagline || '';
    document.getElementById('edit-bio').value = user.bio || '';
    document.getElementById('edit-city').value = user.city || '';
    document.getElementById('edit-commune').value = user.commune || '';
    document.getElementById('edit-whatsapp').value = user.whatsapp || '';
    document.getElementById('edit-telegram').value = user.telegram || '';

    // Precios
    document.getElementById('price-1h').value = user.priceHour || '';
    document.getElementById('price-2h').value = user.priceTwoHours || '';
    document.getElementById('price-night').value = user.priceOvernight || '';
    
    // Cargar servicios
    loadServices(user);
    
    // Cargar disponibilidad
    loadAvailability(user);
    
    // Plan
    loadPlanInfo(user);
    
    // Payment History
    loadPaymentHistory(user);
    
    // Stats
    loadStats(user);
    
    // Cargar instantes y estados
    loadInstantes(user.id);
    loadEstados(user.id);
  }

  // ========== PLAN INFO ==========
  async function loadPlanInfo(user) {
    const planName = document.getElementById('current-plan-name');
    const planIcon = document.getElementById('plan-icon');
    const planStatus = document.getElementById('plan-status');
    const planExpiry = document.getElementById('plan-expiry');
    const planDays = document.getElementById('plan-days');
    const planFeaturesList = document.getElementById('plan-features-list');

    const planIcons = {
      'premium': { name: 'Premium', icon: '⭐' },
      'vip': { name: 'VIP', icon: '👑' },
      'luxury': { name: 'Luxury & Exclusive', icon: '💎' },
      'luxury-exclusive': { name: 'Luxury & Exclusive', icon: '💎' }
    };

    const userPlan = user.selectedPlan || 'premium';
    const planMeta = planIcons[userPlan] || planIcons.premium;

    if (planName) planName.textContent = planMeta.name;
    if (planIcon) planIcon.textContent = planMeta.icon;
    
    // Calcular fecha de vencimiento - Prioridad: planExpiry > planInfo.expiryDate > calculado
    let expiryDate;
    
    if (user.planExpiry) {
      // Si hay planExpiry directo (por renovación aprobada)
      expiryDate = new Date(user.planExpiry);
    } else if (user.planInfo?.expiryDate) {
      // Si hay fecha de expiración en planInfo
      expiryDate = new Date(user.planInfo.expiryDate);
    } else {
      // Fallback: calcular desde fecha de aprobación o registro
      const startDate = user.approvedAt ? new Date(user.approvedAt) : new Date(user.registrationDate || Date.now());
      const planDuration = user.planInfo?.duration || { luxury: 30, vip: 30, premium: 30 }[userPlan] || 30;
      expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + planDuration);
    }
    
    // Validar que sea una fecha válida
    if (isNaN(expiryDate.getTime())) {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);
    }
    
    const today = new Date();
    const daysLeft = Math.max(0, Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)));
    
    if (planExpiry) planExpiry.textContent = expiryDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
    if (planDays) {
      planDays.textContent = `${daysLeft} días`;
      // Colorear según urgencia
      if (daysLeft <= 7) {
        planDays.style.color = '#EF4444';
      } else if (daysLeft <= 15) {
        planDays.style.color = '#F59E0B';
      } else {
        planDays.style.color = '#10B981';
      }
    }
    if (planStatus) {
      planStatus.textContent = daysLeft > 0 ? 'Activo' : 'Vencido';
      planStatus.className = `detail-value ${daysLeft > 0 ? 'active' : 'expired'}`;
    }
    
    if (planFeaturesList) {
      // Obtener restricciones dinámicas del plan configurado en admin
      const restrictions = await getPlanRestrictions();
      const features = [];
      features.push(`Hasta ${restrictions.photos === 0 ? 'ilimitadas' : restrictions.photos} fotos`);
      features.push(`Hasta ${restrictions.videos === 0 ? 'ilimitados' : restrictions.videos} videos`);
      features.push(`${restrictions.estados === 0 ? 'Estados ilimitados' : restrictions.estados + ' estados/día'}`);
      features.push(`Duración estados ${restrictions.estadosDuracion}h`);
      features.push(`${restrictions.instantes === 0 ? 'Instantes ilimitados' : restrictions.instantes + ' instantes/día'}`);
      features.push(`Duración instantes ${restrictions.instantesDuracion}h`);
      features.push(`Badge ${planMeta.name}`);
      planFeaturesList.innerHTML = features.map(f => `<li>✓ ${f}</li>`).join('');
    }
  }

  // ========== SERVICIOS ==========
  function loadServices(user) {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    const userServices = user.services || [];
    
    // Marcar los checkboxes según los servicios del usuario
    const checkboxes = servicesGrid.querySelectorAll('input[name="services"]');
    checkboxes.forEach(checkbox => {
      checkbox.checked = userServices.includes(checkbox.value);
      
      // Actualizar estilo visual
      const label = checkbox.closest('label');
      if (label) {
        if (checkbox.checked) {
          label.style.borderColor = 'var(--gold)';
          label.style.background = 'rgba(212,175,55,0.1)';
        } else {
          label.style.borderColor = 'rgba(255,255,255,0.1)';
          label.style.background = 'rgba(255,255,255,0.05)';
        }
        
        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            label.style.borderColor = 'var(--gold)';
            label.style.background = 'rgba(212,175,55,0.1)';
          } else {
            label.style.borderColor = 'rgba(255,255,255,0.1)';
            label.style.background = 'rgba(255,255,255,0.05)';
          }
        });
      }
    });
  }
  
  // ========== DISPONIBILIDAD ==========
  function loadAvailability(user) {
    const incallCheckbox = document.getElementById('incall-option');
    const outcallCheckbox = document.getElementById('outcall-option');
    const travelCheckbox = document.getElementById('travel-option');
    if (incallCheckbox) incallCheckbox.checked = user.incall === 'true' || user.incall === true;
    if (outcallCheckbox) outcallCheckbox.checked = user.outcall === 'true' || user.outcall === true;
    if (travelCheckbox) travelCheckbox.checked = user.travel === 'true' || user.travel === true;
    // Cargar horario como radio button
    const scheduleValue = user.availability || user.schedule || '';
    const scheduleRadio = document.querySelector(`input[name="schedule"][value="${scheduleValue}"]`);
    if (scheduleRadio) scheduleRadio.checked = true;
  }

  // ========== STATS ==========
  async function loadStats(user) {
    // Buscar el perfil en approvedProfiles para obtener stats reales
    const approvedProfiles = await DataService.getApprovedProfiles() || [];
    const userProfile = approvedProfiles.find(p => p.userId === user.id || p.id === `profile-${user.id}`);
    
    let stats;
    if (userProfile && userProfile.stats) {
      stats = userProfile.stats;
    } else {
      stats = user.stats || { views: 0, likes: 0, recommendations: 0, experiences: 0 };
    }
    
    // Actualizar visualización de stats
    document.getElementById('stat-views').textContent = (stats.views || 0).toLocaleString();
    document.getElementById('stat-likes').textContent = (stats.likes || 0).toLocaleString();
    document.getElementById('stat-contacts').textContent = (stats.recommendations || 0).toLocaleString();
    
    // Contar instantes activos
    const instantes = await DataService.getStories(user.id, 'instante') || [];
    const activeInstantes = instantes.filter(i => {
      const createdAt = new Date(i.createdAt);
      const now = new Date();
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
      return hoursAgo < 24;
    });
    document.getElementById('stat-stories').textContent = activeInstantes.length;
    
    // Actualizar stats en currentUser también
    currentUser.stats = stats;
    await DataService.setCurrentUser(currentUser);
  }

  // ========== INSTANTES ==========
  async function loadInstantes(userId) {
    const instantes = await DataService.getStories(userId, 'instante') || [];
    const grid = document.getElementById('instantes-grid');
    const activeStatusesList = document.getElementById('active-statuses-list');
    
    // Filtrar instantes activos (menos de 24h)
    const now = new Date();
    const activeInstantes = instantes.filter(i => {
      const createdAt = new Date(i.createdAt);
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
      return hoursAgo < 24;
    });
    
    if (grid) {
      if (activeInstantes.length === 0) {
        grid.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"></circle>
              <polygon points="10 8 16 12 10 16 10 8"></polygon>
            </svg>
            <p>No tienes instantes activos</p>
            <p style="font-size: 13px; margin-top: 8px;">Sube tu primer instante para aparecer en el carrusel</p>
          </div>
        `;
      } else {
        grid.innerHTML = activeInstantes.map((instante, index) => {
          const createdDate = new Date(instante.createdAt);
          const hoursAgo = Math.max(1, Math.floor((now - createdDate) / (1000 * 60 * 60)));
          const timeText = hoursAgo < 24 ? `Hace ${hoursAgo}h` : 'Hace 24h+';
          const isVideo = instante.mediaType === 'video';
          const mediaSrc = instante.image || instante.media || instante.src || '';
          const mediaHTML = isVideo
            ? `<video src="${mediaSrc}" muted preload="metadata" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onloadeddata="this.currentTime=0.5"></video>
               <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:36px;height:36px;background:rgba(0,0,0,0.6);border-radius:50%;display:flex;align-items:center;justify-content:center;pointer-events:none;">
                 <span style="color:white;font-size:16px;margin-left:2px;">▶</span>
               </div>`
            : `<img src="${mediaSrc}" alt="Instante" />`;
          return `
            <div class="instante-card" data-id="${instante.id}" style="position:relative;">
              ${mediaHTML}
              <div class="instante-overlay">
                <span class="instante-caption">${instante.caption || ''}</span>
                <span class="instante-time">${timeText}</span>
              </div>
              <button class="instante-delete" onclick="deleteInstante('${instante.id}')">×</button>
            </div>
          `;
        }).join('');
      }
    }
  }

  // ========== ESTADOS ==========
  async function loadEstados(userId) {
    const estados = await DataService.getStories(userId, 'estado') || [];
    const estadosList = document.getElementById('estados-list');
    const activeStatusesList = document.getElementById('active-statuses-list');
    
    // Filtrar estados activos
    const now = new Date();
    const activeEstados = estados.filter(e => {
      const createdAt = new Date(e.createdAt);
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
      return hoursAgo < e.duration;
    });
    
    const statusColors = {
      'disponible': 'green',
      'novedad': 'purple',
      'promo': 'orange',
      'ocupada': 'red'
    };
    
    const statusIcons = {
      'disponible': '❤️',
      'novedad': '✨',
      'promo': '🔥',
      'ocupada': '⏸️'
    };
    
    const renderEstados = (list, showDelete = true) => {
      if (!list) return;
      
      if (activeEstados.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <p>No tienes estados activos</p>
          </div>
        `;
      } else {
        list.innerHTML = activeEstados.map(estado => {
          const hoursLeft = Math.max(0, estado.duration - Math.floor((now - new Date(estado.createdAt)) / (1000 * 60 * 60)));
          return `
            <div class="status-item">
              <div class="status-item-left">
                <span class="status-icon">${statusIcons[estado.type] || '💬'}</span>
                <div>
                  <div class="status-message">${estado.message}</div>
                  <div class="status-time">${hoursLeft}h restantes</div>
                </div>
              </div>
              ${showDelete ? `<button class="status-delete" onclick="deleteEstado('${estado.id}')">×</button>` : ''}
            </div>
          `;
        }).join('');
      }
    };
    
    renderEstados(estadosList);
    renderEstados(activeStatusesList, false);
  }

  // ========== MODAL INSTANTE ==========
  const modalInstante = document.getElementById('modal-instante');
  const btnNuevoInstante = document.getElementById('btn-nuevo-instante');
  const closeModalInstante = document.getElementById('close-modal-instante');
  const cancelInstante = document.getElementById('cancel-instante');
  const formInstante = document.getElementById('form-instante');
  const instanteUploadArea = document.getElementById('instante-upload-area');
  const instanteFile = document.getElementById('instante-file');
  const instantePreview = document.getElementById('instante-preview');
  
  let selectedInstanteImage = null;

  btnNuevoInstante?.addEventListener('click', async () => {
    // Verificar límite antes de abrir modal
    const canPublishResult = await canPublish('instantes');
    if (!canPublishResult.allowed) {
      showToast(canPublishResult.reason);
      return;
    }
    modalInstante.style.display = 'flex';
  });

  closeModalInstante?.addEventListener('click', () => {
    modalInstante.style.display = 'none';
    resetInstanteForm();
  });

  cancelInstante?.addEventListener('click', () => {
    modalInstante.style.display = 'none';
    resetInstanteForm();
  });

  instanteUploadArea?.addEventListener('click', () => {
    instanteFile.click();
  });

  let selectedInstanteFile = null; // Archivo original para subir a S3

  instanteFile?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      selectedInstanteFile = file;
      // Preview local con base64 (solo para mostrar, no se guarda)
      const reader = new FileReader();
      reader.onload = (ev) => {
        selectedInstanteImage = ev.target.result;
        instantePreview.src = selectedInstanteImage;
        instantePreview.style.display = 'block';
        instanteUploadArea.querySelector('.upload-placeholder').style.display = 'none';
      };
      reader.readAsDataURL(file);
    }
  });

  formInstante?.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!selectedInstanteFile) {
      alert('Por favor selecciona una imagen');
      return;
    }

    const canPublishResult = await canPublish('instantes');
    if (!canPublishResult.allowed) {
      showToast(canPublishResult.reason);
      return;
    }

    showUploadOverlay('Subiendo instante...');

    try {
      const restrictions = await getPlanRestrictions();
      const caption = document.getElementById('instante-caption').value;
      const instanteId = Date.now().toString();
      const ext = selectedInstanteFile.name.split('.').pop() || 'jpg';

      // Aplicar marca de agua si es imagen, luego subir a S3
      const isImage = selectedInstanteFile.type?.startsWith('image/');
      const fileToUpload = isImage ? await applyWatermarkToFile(selectedInstanteFile) : selectedInstanteFile;
      const uploadType = isImage ? 'image/jpeg' : (selectedInstanteFile.type || 'video/mp4');
      const uploadExt = isImage ? 'jpg' : ext;

      const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
        currentUser.id, `${instanteId}.${uploadExt}`, uploadType, 'instantes'
      );
      await DataService.uploadFileToS3(uploadUrl, fileToUpload, uploadType);

      // Obtener avatar actual del usuario (S3 URL preferida)
      const localPhotosForAvatar = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
      const currentAvatar = localPhotosForAvatar[0]?.url || currentUser.avatar || null;

      // Guardar instante en DynamoDB con URL de S3 (no base64)
      await DataService.addStory({
        id: instanteId,
        image: publicUrl,
        s3Key: key,
        caption: caption,
        createdAt: new Date().toISOString(),
        userId: currentUser.id,
        duration: restrictions.instantesDuracion,
        type: 'instante',
        mediaType: isImage ? 'image' : 'video',
        userName: currentUser.displayName,
        userAvatar: currentAvatar,
        whatsapp: currentUser.whatsapp,
        userBadge: currentUser.profileType || currentUser.selectedPlan || 'premium'
      });

      const newCounter = incrementDailyCounter('instantes');

      modalInstante.style.display = 'none';
      resetInstanteForm();
      await loadInstantes(currentUser.id);
      await loadStats(currentUser);
      await updatePlanInfoTexts();
      await loadMediaLimits();
      const remaining = restrictions.instantes - newCounter.count;
      showToast(`¡Instante publicado! (${newCounter.count}/${restrictions.instantes} hoy, dura ${restrictions.instantesDuracion}h) - Restantes: ${remaining}`);
    } catch (err) {
      showToast('Error al publicar instante.');
    } finally {
      hideUploadOverlay();
    }
  });

  function resetInstanteForm() {
    formInstante?.reset();
    selectedInstanteImage = null;
    selectedInstanteFile = null;
    if (instantePreview) {
      instantePreview.style.display = 'none';
      instantePreview.src = '';
    }
    if (instanteUploadArea) {
      instanteUploadArea.querySelector('.upload-placeholder').style.display = 'flex';
    }
  }

  // ========== MODAL ESTADO ==========
  const modalEstado = document.getElementById('modal-estado');
  const btnNuevoEstado = document.getElementById('btn-nuevo-estado');
  const closeModalEstado = document.getElementById('close-modal-estado');
  const cancelEstado = document.getElementById('cancel-estado');
  const formEstado = document.getElementById('form-estado');
  const estadoMensaje = document.getElementById('estado-mensaje');
  const estadoChars = document.getElementById('estado-chars');

  btnNuevoEstado?.addEventListener('click', async () => {
    // Verificar límite antes de abrir modal
    const canPublishResult = await canPublish('estados');
    if (!canPublishResult.allowed) {
      showToast(canPublishResult.reason);
      return;
    }
    await updateDurationOptions(); // Actualizar opciones según plan
    modalEstado.style.display = 'flex';
  });

  closeModalEstado?.addEventListener('click', () => {
    modalEstado.style.display = 'none';
    formEstado?.reset();
  });

  cancelEstado?.addEventListener('click', () => {
    modalEstado.style.display = 'none';
    formEstado?.reset();
  });

  estadoMensaje?.addEventListener('input', () => {
    estadoChars.textContent = estadoMensaje.value.length;
  });

  // Quick status buttons - verificar límite antes de abrir modal
  document.querySelectorAll('.status-quick-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Verificar si puede publicar usando el sistema de contador 24h
      const canPublishResult = await canPublish('estados');
      if (!canPublishResult.allowed) {
        showToast(canPublishResult.reason);
        return;
      }
      
      const statusType = btn.dataset.status;
      document.querySelector(`input[name="status-type"][value="${statusType}"]`).checked = true;
      await updateDurationOptions(); // Actualizar opciones según plan
      modalEstado.style.display = 'flex';
    });
  });

  // Función para actualizar estado de botones de estado rápido
  async function updateQuickStatusButtons() {
    const canPublishResult = await canPublish('estados');
    document.querySelectorAll('.status-quick-btn').forEach(btn => {
      btn.classList.toggle('disabled', !canPublishResult.allowed);
      btn.title = !canPublishResult.allowed ? canPublishResult.reason : '';
    });
  }
  
  // Ejecutar al cargar
  updateQuickStatusButtons();

  formEstado?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const statusType = document.querySelector('input[name="status-type"]:checked').value;
    const message = estadoMensaje.value || getDefaultMessage(statusType);
    const duration = parseInt(document.getElementById('estado-duracion').value);
    
    const estado = {
      id: Date.now().toString(),
      type: statusType,
      message: message,
      duration: duration,
      createdAt: new Date().toISOString(),
      userId: currentUser.id
    };
    
    await saveEstado(estado);
    
    modalEstado.style.display = 'none';
    formEstado.reset();
    estadoChars.textContent = '0';
  });

  function getDefaultMessage(type) {
    const messages = {
      'disponible': '¡Disponible ahora! 💋',
      'novedad': '✨ Nueva novedad',
      'promo': '🔥 Promoción especial',
      'ocupada': 'Ocupada por el momento'
    };
    return messages[type] || 'Estado actualizado';
  }

  async function saveEstado(estado) {
    // Verificar si puede publicar usando el sistema de contador 24h
    const canPublishResult = await canPublish('estados');
    if (!canPublishResult.allowed) {
      showToast(canPublishResult.reason);
      return;
    }
    
    const restrictions = await getPlanRestrictions();
    
    // Validar duración máxima
    if (estado.duration > restrictions.estadosDuracion) {
      estado.duration = restrictions.estadosDuracion;
      showToast(`Duración limitada a ${restrictions.estadosDuracion}h por tu plan ${restrictions.planName}`);
    }
    
    // Obtener avatar actual (S3 URL preferida)
    const estadoLocalPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const estadoAvatar = estadoLocalPhotos[0]?.url || currentUser.avatar || null;

    // Guardar estado en AWS
    await DataService.addStory({
      ...estado,
      type: 'estado',
      userId: currentUser.id,
      userName: currentUser.displayName,
      userAvatar: estadoAvatar,
      whatsapp: currentUser.whatsapp,
      city: currentUser.city,
      commune: currentUser.commune,
      username: currentUser.username
    });
    
    // Incrementar el contador diario (persiste aunque se elimine)
    const newCounter = incrementDailyCounter('estados');
    
    await loadEstados(currentUser.id);
    await updatePlanInfoTexts(); // Actualizar contadores en UI
    await updateQuickStatusButtons(); // Actualizar botones de estado rápido
    await loadMediaLimits(); // Actualizar información general
    const remaining = restrictions.estados - newCounter.count;
    showToast(`¡Estado publicado! (${newCounter.count}/${restrictions.estados} hoy) - Restantes: ${remaining}`);
  }

  // ========== DELETE FUNCTIONS ==========
  window.deleteInstante = async (id) => {
    if (!confirm('¿Eliminar este instante?')) return;

    // Obtener el instante para encontrar la key de S3
    const instantes = await DataService.getStories(currentUser.id, 'instante') || [];
    const instante = instantes.find(i => i.id === id);

    await DataService.deleteStory(id);

    // Eliminar de S3 en background
    if (instante?.s3Key) {
      DataService.deleteMedia(instante.s3Key).catch(() => {});
    }

    await loadInstantes(currentUser.id);
    await loadStats(currentUser);
    showToast('Instante eliminado');
  };

  window.deleteEstado = async (id) => {
    if (!confirm('¿Eliminar este estado?')) return;
    
    await DataService.deleteStory(id);
    
    await loadEstados(currentUser.id);
    showToast('Estado eliminado');
  };

  // ========== PROFILE EDIT ==========
  const profileEditForm = document.getElementById('profile-edit-form');
  
  profileEditForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Actualizar datos del usuario
    currentUser.displayName = document.getElementById('edit-display-name').value;
    currentUser.age = document.getElementById('edit-age').value;
    currentUser.tagline = document.getElementById('edit-tagline')?.value || '';
    currentUser.bio = document.getElementById('edit-bio').value;
    currentUser.city = document.getElementById('edit-city').value;
    currentUser.commune = document.getElementById('edit-commune').value;
    currentUser.whatsapp = document.getElementById('edit-whatsapp').value;
    currentUser.telegram = document.getElementById('edit-telegram').value;
    currentUser.priceHour = document.getElementById('price-1h').value;
    currentUser.priceTwoHours = document.getElementById('price-2h').value;
    currentUser.priceOvernight = document.getElementById('price-night').value;

    // Guardar en localStorage inmediatamente (instantáneo)
    await DataService.setCurrentUser(currentUser);

    // Actualizar header inmediatamente
    document.getElementById('user-display-name').textContent = currentUser.displayName;
    const usernameDisplay = document.getElementById('user-username-display');
    if (usernameDisplay && currentUser.username) {
      usernameDisplay.textContent = `@${currentUser.username}`;
    }
    showToast('¡Perfil actualizado!');

    // Cargar approvedUsers y approvedProfiles EN PARALELO
    const [approvedUsers, approvedProfiles] = await Promise.all([
      DataService.getApprovedUsers() || [],
      DataService.getApprovedProfiles() || []
    ]);

    // Preparar actualizaciones
    const savePromises = [];

    const userIndex = (approvedUsers || []).findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      approvedUsers[userIndex] = { ...approvedUsers[userIndex], ...currentUser };
      savePromises.push(DataService.saveApprovedUsers(approvedUsers));
    }

    const profileIndex = (approvedProfiles || []).findIndex(p => p.id === `profile-${currentUser.id}`);
    if (profileIndex !== -1) {
      approvedProfiles[profileIndex] = {
        ...approvedProfiles[profileIndex],
        displayName: currentUser.displayName,
        title: currentUser.displayName,
        physicalInfo: {
          ...approvedProfiles[profileIndex].physicalInfo,
          age: parseInt(currentUser.age) || approvedProfiles[profileIndex].physicalInfo?.age || 25,
        },
        bio: currentUser.bio,
        commune: currentUser.commune,
        city: currentUser.city,
        whatsapp: currentUser.whatsapp,
        prices: {
          hour: { CLP: parseInt(currentUser.priceHour) || 150000, USD: Math.round((parseInt(currentUser.priceHour) || 150000) / 830) },
          twoHours: { CLP: parseInt(currentUser.priceTwoHours) || 0, USD: Math.round((parseInt(currentUser.priceTwoHours) || 0) / 830) },
          overnight: { CLP: parseInt(currentUser.priceOvernight) || 0, USD: Math.round((parseInt(currentUser.priceOvernight) || 0) / 830) }
        }
      };
      savePromises.push(DataService.saveApprovedProfiles(approvedProfiles));
    }

    // Guardar ambos EN PARALELO en background (no bloquea UI)
    if (savePromises.length > 0) {
      Promise.all(savePromises).catch(err => console.error('Error guardando perfil:', err));
    }
  });

  // ========== GUARDAR TARIFAS ==========
  const saveTarifasBtn = document.getElementById('save-tarifas-btn');
  saveTarifasBtn?.addEventListener('click', async () => {
    currentUser.priceHour = document.getElementById('price-1h').value;
    currentUser.priceTwoHours = document.getElementById('price-2h').value;
    currentUser.priceOvernight = document.getElementById('price-night').value;

    await DataService.setCurrentUser(currentUser);
    showToast('¡Tarifas actualizadas!');

    // Actualizar en AWS en paralelo (background)
    const [approvedUsers, approvedProfiles] = await Promise.all([
      DataService.getApprovedUsers(),
      DataService.getApprovedProfiles()
    ]);

    const savePromises = [];
    const userIndex = (approvedUsers || []).findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      approvedUsers[userIndex] = { ...approvedUsers[userIndex], ...currentUser };
      savePromises.push(DataService.saveApprovedUsers(approvedUsers));
    }

    const profileIndex = (approvedProfiles || []).findIndex(p => p.id === `profile-${currentUser.id}`);
    if (profileIndex !== -1) {
      const priceHourCLP = parseInt(currentUser.priceHour) || 150000;
      const priceTwoHoursCLP = parseInt(currentUser.priceTwoHours) || 0;
      const priceOvernightCLP = parseInt(currentUser.priceOvernight) || 0;

      approvedProfiles[profileIndex].price = {
        CLP: priceHourCLP,
        USD: Math.round(priceHourCLP / 830)
      };
      approvedProfiles[profileIndex].prices = {
        hour: { CLP: priceHourCLP, USD: Math.round(priceHourCLP / 830) },
        twoHours: { CLP: priceTwoHoursCLP, USD: Math.round(priceTwoHoursCLP / 830) },
        overnight: { CLP: priceOvernightCLP, USD: Math.round(priceOvernightCLP / 830) }
      };
      savePromises.push(DataService.saveApprovedProfiles(approvedProfiles));
    }

    Promise.all(savePromises).catch(err => console.error('Error guardando tarifas:', err));
  });

  // ========== GUARDAR SERVICIOS ==========
  const saveServicesBtn = document.getElementById('save-services-btn');
  saveServicesBtn?.addEventListener('click', async () => {
    const servicesGrid = document.getElementById('services-grid');
    const checkboxes = servicesGrid.querySelectorAll('input[name="services"]:checked');
    const services = Array.from(checkboxes).map(cb => cb.value);

    currentUser.services = services;
    await DataService.setCurrentUser(currentUser);
    showToast('¡Servicios actualizados!');

    // Actualizar en AWS en paralelo (background)
    const [approvedUsers, approvedProfiles] = await Promise.all([
      DataService.getApprovedUsers(),
      DataService.getApprovedProfiles()
    ]);

    const savePromises = [];
    const userIndex = (approvedUsers || []).findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      approvedUsers[userIndex] = { ...approvedUsers[userIndex], services };
      savePromises.push(DataService.saveApprovedUsers(approvedUsers));
    }

    const profileIndex = (approvedProfiles || []).findIndex(p => p.userId === currentUser.id || p.id === `profile-${currentUser.id}`);
    if (profileIndex !== -1) {
      approvedProfiles[profileIndex].services = services;
      savePromises.push(DataService.saveApprovedProfiles(approvedProfiles));
    }

    Promise.all(savePromises).catch(err => console.error('Error guardando servicios:', err));
  });

  // ========== GUARDAR DISPONIBILIDAD ==========
  const saveAvailabilityBtn = document.getElementById('save-availability-btn');
  saveAvailabilityBtn?.addEventListener('click', async () => {
    const incall = document.getElementById('incall-option')?.checked || false;
    const outcall = document.getElementById('outcall-option')?.checked || false;
    const travel = document.getElementById('travel-option')?.checked || false;
    const scheduleRadio = document.querySelector('input[name="schedule"]:checked');
    const schedule = scheduleRadio?.value?.trim() || '';

    currentUser.incall = incall;
    currentUser.outcall = outcall;
    currentUser.travel = travel;
    currentUser.availability = schedule;

    await DataService.setCurrentUser(currentUser);
    showToast('¡Disponibilidad actualizada!');

    // Actualizar en AWS en paralelo (background)
    const [approvedUsers, approvedProfiles] = await Promise.all([
      DataService.getApprovedUsers(),
      DataService.getApprovedProfiles()
    ]);

    const savePromises = [];
    const userIndex = (approvedUsers || []).findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
      approvedUsers[userIndex] = { ...approvedUsers[userIndex], incall, outcall, travel, availability: schedule };
      savePromises.push(DataService.saveApprovedUsers(approvedUsers));
    }

    const profileIndex = (approvedProfiles || []).findIndex(p => p.id === `profile-${currentUser.id}`);
    if (profileIndex !== -1) {
      approvedProfiles[profileIndex].incall = incall;
      approvedProfiles[profileIndex].outcall = outcall;
      approvedProfiles[profileIndex].travel = travel;
      approvedProfiles[profileIndex].availability = schedule;
      approvedProfiles[profileIndex].availabilityDetails = { incall, outcall, travel };
      approvedProfiles[profileIndex].horario = schedule;
      savePromises.push(DataService.saveApprovedProfiles(approvedProfiles));
    }

    Promise.all(savePromises).catch(err => console.error('Error guardando disponibilidad:', err));
  });

  // ========== PHOTO UPLOAD ==========
  const addPhotoBtn = document.getElementById('add-photo-btn');
  const photoUpload = document.getElementById('photo-upload');
  const photosGrid = document.getElementById('profile-photos-grid');
  const addVideoBtn = document.getElementById('add-video-btn');
  const videoUpload = document.getElementById('video-upload');
  const videosGrid = document.getElementById('profile-videos-grid');
  
  // Variables para el editor
  let currentEditingImage = null;
  let currentEditingPhotoId = null;
  let editorCanvas = null;
  let editorCtx = null;
  let originalImageData = null;
  let isBlurToolActive = false;
  let blurAreas = [];
  let isDrawing = false;

  // Cargar fotos/videos existentes y límites
  let mediaAlreadyLoaded = false;
  await loadMediaLimits();
  loadSavedMedia();
  await updateDurationOptions(); // Actualizar opciones de duración según el plan
  await updatePlanInfoTexts(); // Actualizar info de plan en instantes y estados
  
  // Tabs de fotos/videos
  document.querySelectorAll('.media-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.media-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.media-grid-container').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      const mediaType = tab.dataset.media;
      document.getElementById(`${mediaType}-container`).classList.add('active');
    });
  });

  async function loadMediaLimits() {
    const restrictions = await getPlanRestrictions();
    const userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');
    
    // Usar contadores diarios que persisten aunque se eliminen
    const instantesCounter = getDailyCounter('instantes');
    const estadosCounterData = getDailyCounter('estados');
    
    // Actualizar contadores de fotos/videos
    document.getElementById('photos-count').textContent = userPhotos.length;
    document.getElementById('photos-max').textContent = restrictions.photos === 0 ? '∞' : restrictions.photos;
    document.getElementById('videos-count').textContent = userVideos.length;
    document.getElementById('videos-max').textContent = restrictions.videos === 0 ? '✗' : restrictions.videos;
    
    // Actualizar contadores de instantes y estados si existen
    const instantesCounterEl = document.getElementById('instantes-count');
    if (instantesCounterEl) {
      instantesCounterEl.textContent = `${instantesCounter.count}/${restrictions.instantes === 0 ? '✗' : restrictions.instantes}`;
    }
    
    const estadosCounterEl = document.getElementById('estados-count');
    if (estadosCounterEl) {
      estadosCounterEl.textContent = `${estadosCounterData.count}/${restrictions.estados}`;
    }
    
    // Actualizar badge del plan
    const planBadge = document.getElementById('plan-badge-info');
    const planIcons = { vip: '👑', premium: '💫', luxury: '💎' };
    const userPlan = currentUser.selectedPlan || 'vip';
    if (planBadge) {
      planBadge.innerHTML = `
        <span class="plan-icon-small">${planIcons[userPlan] || '⭐'}</span>
        <span>Plan ${restrictions.planName}</span>
        <small>
          Fotos: ${restrictions.photos === 0 ? '∞' : `${userPhotos.length}/${restrictions.photos}`} | 
          Videos: ${restrictions.videos === 0 ? '✗' : `${userVideos.length}/${restrictions.videos}`} | 
          Estados: ${estadosCounterData.count}/${restrictions.estados}/día (${restrictions.estadosDuracion}h) | 
          Instantes: ${restrictions.instantes === 0 ? '✗' : `${instantesCounter.count}/${restrictions.instantes}/día (${restrictions.instantesDuracion}h)`}
        </small>
      `;
    }
    
    // Deshabilitar botones si se alcanzó el límite (usa contador 24h)
    const photosAtLimit = restrictions.photos !== 0 && userPhotos.length >= restrictions.photos;
    const videosAtLimit = restrictions.videos === 0 || userVideos.length >= restrictions.videos;
    const instantesAtLimit = restrictions.instantes === 0 || instantesCounter.count >= restrictions.instantes;
    const estadosAtLimit = estadosCounterData.count >= restrictions.estados;
    
    if (addPhotoBtn) {
      addPhotoBtn.classList.toggle('disabled', photosAtLimit);
      if (photosAtLimit) {
        addPhotoBtn.title = 'Límite de fotos alcanzado. Mejora tu plan para más fotos.';
      }
    }
    if (addVideoBtn) {
      addVideoBtn.classList.toggle('disabled', videosAtLimit);
      if (videosAtLimit) {
        addVideoBtn.title = restrictions.videos === 0 ? 
          'Tu plan no permite videos. Mejora tu plan.' : 
          'Límite de videos alcanzado. Mejora tu plan para más videos.';
      }
    }
    
    // Deshabilitar botones de instantes y estados
    const addInstanteBtn = document.querySelector('[onclick="showModal(\'modal-instante\')"]');
    if (addInstanteBtn) {
      addInstanteBtn.classList.toggle('disabled', instantesAtLimit);
      addInstanteBtn.title = instantesAtLimit ? 
        (restrictions.instantes === 0 ? 'Tu plan no permite instantes' : 'Límite diario de instantes alcanzado') : 
        'Agregar instante';
    }
    
    // También el botón principal de nuevo instante
    const btnNuevoInstanteMain = document.getElementById('btn-nuevo-instante');
    if (btnNuevoInstanteMain) {
      btnNuevoInstanteMain.classList.toggle('disabled', instantesAtLimit);
      btnNuevoInstanteMain.title = instantesAtLimit ? 
        (restrictions.instantes === 0 ? 'Tu plan no permite instantes' : `Límite diario alcanzado. Se reinicia a medianoche.`) : 
        '';
    }
    
    const addEstadoBtn = document.querySelector('[onclick="showModal(\'modal-estado\')"]');
    if (addEstadoBtn) {
      addEstadoBtn.classList.toggle('disabled', estadosAtLimit);
      addEstadoBtn.title = estadosAtLimit ? 'Límite diario de estados alcanzado' : 'Agregar estado';
    }
    
    // También el botón principal de nuevo estado
    const btnNuevoEstadoMain = document.getElementById('btn-nuevo-estado');
    if (btnNuevoEstadoMain) {
      btnNuevoEstadoMain.classList.toggle('disabled', estadosAtLimit);
      btnNuevoEstadoMain.title = estadosAtLimit ? 
        `Límite diario alcanzado. Se reinicia a medianoche.` : '';
    }
  }

  async function loadSavedMedia() {
    // Evitar cargar fotos dos veces
    if (mediaAlreadyLoaded) return;
    mediaAlreadyLoaded = true;

    // Limpiar grid antes de cargar (excepto el botón de agregar)
    if (photosGrid) {
      Array.from(photosGrid.children).forEach(child => {
        if (child.id !== 'add-photo-btn') child.remove();
      });
    }

    let userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');

    // Si no hay fotos en localStorage, cargar desde perfil aprobado o registro inicial
    if (userPhotos.length === 0) {
      let photosSource = currentUser.profilePhotosData || [];

      // Si currentUser no tiene fotos, intentar desde el perfil aprobado en AWS
      if (photosSource.length === 0) {
        try {
          const profileData = await DataService.getProfileById(`profile-${currentUser.id}`);
          if (profileData?.profilePhotosData?.length > 0) {
            photosSource = profileData.profilePhotosData;
          }
        } catch (e) { /* ignore */ }
      }

      if (photosSource.length > 0) {
        const uniquePhotos = [];
        const seen = new Set();
        photosSource.forEach((photo, index) => {
          // Soportar tanto URLs de S3 como base64 legacy
          const src = photo.url || photo.base64;
          // Usar index como parte del key para evitar deduplicación incorrecta
          const photoKey = photo.key || photo.url || `photo_${index}_${photo.base64?.substring(0, 50)}`;
          if (src && !seen.has(photoKey)) {
            seen.add(photoKey);
            uniquePhotos.push({
              id: `verification_photo_${index}_${Date.now() + index}`,
              url: photo.url || null,
              key: photo.key || null,
              data: photo.base64 || null,
              createdAt: new Date().toISOString(),
              isVerificationPhoto: true,
              watermarked: false
            });
          }
        });
        userPhotos = uniquePhotos;
        localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));
      }
    }

    // Aplicar marca de agua a fotos de verificación que no la tienen
    let photosUpdated = false;
    for (let i = 0; i < userPhotos.length; i++) {
      const photo = userPhotos[i];
      if (photo.isVerificationPhoto && !photo.watermarked) {
        try {
          const imgSrc = photo.url || photo.data;
          if (!imgSrc) continue;
          const watermarkedBlob = await applyWatermarkToUrl(imgSrc);
          if (watermarkedBlob) {
            const photoId = photo.id || Date.now().toString() + Math.random().toString(36).slice(2, 6);
            const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
              currentUser.id, `${photoId}_wm.jpg`, 'image/jpeg'
            );
            await DataService.uploadFileToS3(uploadUrl, watermarkedBlob, 'image/jpeg');
            userPhotos[i] = { ...photo, url: publicUrl, key: key, watermarked: true };
            photosUpdated = true;
          }
        } catch (e) {
          console.warn('Error aplicando marca de agua a foto de verificación:', e);
        }
      }
    }
    if (photosUpdated) {
      localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));
      // Sincronizar URLs actualizadas al perfil público
      syncPhotoToProfiles().catch(() => {});
    }

    // Cargar fotos (usar URL de S3 si existe, sino base64 legacy)
    for (const photo of userPhotos) {
      const src = photo.url || photo.data;
      if (src) {
        await addPhotoToGrid(src, photo.id, false, photo.isVerificationPhoto || false);
      }
    }

    // Cargar videos (URL de S3 o base64 legacy)
    userVideos.forEach(video => {
      const src = video.url || video.data;
      if (src) {
        addVideoToGrid(src, video.id, false);
      }
    });
  }

  // Función compartida para aplicar marca de agua a una imagen antes de subir
  function applyWatermarkToFile(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;

        // Marca de agua diagonal repetitiva
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.font = `bold ${Math.max(20, Math.round(w / 22))}px "Playfair Display", serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 6);
        const spacing = Math.max(80, Math.round(w / 6));
        for (let y = -h; y < h * 2; y += spacing) {
          for (let x = -w; x < w * 2; x += spacing * 1.8) {
            ctx.fillText('SalaOscura', x, y);
            ctx.strokeText('SalaOscura', x, y);
          }
        }
        ctx.restore();

        // Marca de agua esquina inferior derecha
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.font = `italic ${Math.max(14, Math.round(w / 35))}px "Playfair Display", serif`;
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText('SalaOscura', w - 15, h - 15);
        ctx.restore();

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Error generando imagen con marca de agua'));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  // Aplicar marca de agua a una imagen desde URL (para fotos de verificación existentes)
  function applyWatermarkToUrl(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const w = canvas.width;
        const h = canvas.height;

        // Marca de agua diagonal repetitiva
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.font = `bold ${Math.max(20, Math.round(w / 22))}px "Playfair Display", serif`;
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 6);
        const spacing = Math.max(80, Math.round(w / 6));
        for (let y = -h; y < h * 2; y += spacing) {
          for (let x = -w; x < w * 2; x += spacing * 1.8) {
            ctx.fillText('SalaOscura', x, y);
            ctx.strokeText('SalaOscura', x, y);
          }
        }
        ctx.restore();

        // Marca de agua esquina inferior derecha
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.font = `italic ${Math.max(14, Math.round(w / 35))}px "Playfair Display", serif`;
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText('SalaOscura', w - 15, h - 15);
        ctx.restore();

        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else reject(new Error('Error generando imagen con marca de agua'));
        }, 'image/jpeg', 0.92);
      };
      img.onerror = () => resolve(null); // No fallar si la imagen no carga
      img.src = imageUrl;
    });
  }

  addPhotoBtn?.addEventListener('click', async () => {
    const restrictions = await getPlanRestrictions();
    const userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    
    if (restrictions.photos !== 0 && userPhotos.length >= restrictions.photos) {
      showToast(`Límite de ${restrictions.photos} fotos alcanzado. Mejora tu plan.`);
      return;
    }
    photoUpload.click();
  });

  addVideoBtn?.addEventListener('click', async () => {
    console.log('Click en agregar video');
    const restrictions = await getPlanRestrictions();
    const userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');
    
    if (restrictions.videos === 0) {
      showToast(`Tu plan ${restrictions.planName} no permite videos. Mejora tu plan.`);
      return;
    }
    
    if (userVideos.length >= restrictions.videos) {
      showToast(`Límite de ${restrictions.videos} videos alcanzado. Mejora tu plan.`);
      return;
    }
    if (videoUpload) {
      videoUpload.click();
    } else {
      console.error('videoUpload no encontrado');
    }
  });

  photoUpload?.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const restrictions = await getPlanRestrictions();
    let userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    let remaining = restrictions.photos === 0 ? files.length : restrictions.photos - userPhotos.length;

    if (remaining <= 0) {
      showToast(`Límite de fotos alcanzado. Mejora tu plan.`);
      photoUpload.value = '';
      return;
    }

    const filesToProcess = files.slice(0, remaining);
    if (files.length > remaining) {
      showToast(`Solo se pueden subir ${remaining} foto(s) más según tu plan.`);
    }

    // Subir fotos a S3 con marca de agua
    showUploadOverlay(`Subiendo ${filesToProcess.length} foto(s)...`);
    let uploaded = 0;
    for (const file of filesToProcess) {
      if (file.size > 15 * 1024 * 1024) {
        showToast(`${file.name}: Archivo muy grande. Máximo 15MB.`);
        continue;
      }

      try {
        const photoId = Date.now().toString() + Math.random().toString(36).slice(2, 6);

        // 1. Aplicar marca de agua a la imagen
        const watermarkedBlob = await applyWatermarkToFile(file);

        // 2. Obtener URL pre-firmada de S3
        const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
          currentUser.id,
          `${photoId}.jpg`,
          'image/jpeg'
        );

        // 3. Subir imagen con marca de agua a S3
        await DataService.uploadFileToS3(uploadUrl, watermarkedBlob, 'image/jpeg');

        // 4. Guardar referencia (URL, no base64) en localStorage
        userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
        userPhotos.push({
          id: photoId,
          url: publicUrl,
          key: key,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));

        // 5. Mostrar en el grid
        await addPhotoToGrid(publicUrl, photoId, true);
        uploaded++;
      } catch (err) {
        showToast(`Error al subir foto: ${file.name}`);
      }
    }

    hideUploadOverlay();
    await loadMediaLimits();
    if (uploaded > 0) {
      showToast(`${uploaded} foto(s) subida(s)`);
      // Sincronizar URLs al perfil público en background
      syncPhotoToProfiles().catch(() => {});
    }
    photoUpload.value = '';
  });

  videoUpload?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const restrictions = await getPlanRestrictions();
    const userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');

    if (restrictions.videos !== 0 && userVideos.length >= restrictions.videos) {
      showToast(`Límite de ${restrictions.videos} videos alcanzado.`);
      videoUpload.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      showToast('Video muy grande. Máximo 50MB.');
      videoUpload.value = '';
      return;
    }

    const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
      showToast('Formato no válido. Usa MP4, WebM o MOV.');
      videoUpload.value = '';
      return;
    }

    showUploadOverlay('Subiendo video...');

    try {
      const videoId = Date.now().toString();
      const ext = file.name.split('.').pop() || 'mp4';

      // Subir a S3
      const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
        currentUser.id, `${videoId}.${ext}`, file.type || 'video/mp4', 'videos'
      );
      await DataService.uploadFileToS3(uploadUrl, file, file.type || 'video/mp4');

      // Guardar referencia en localStorage
      const updatedVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');
      updatedVideos.push({ id: videoId, url: publicUrl, key, createdAt: new Date().toISOString() });
      localStorage.setItem(`videos_${currentUser.id}`, JSON.stringify(updatedVideos));

      addVideoToGrid(publicUrl, videoId, true);
      await loadMediaLimits();
      showToast('¡Video subido!');
      // Sincronizar videos al perfil público
      syncPhotoToProfiles().catch(() => {});
    } catch (err) {
      showToast('Error al subir el video.');
    } finally {
      hideUploadOverlay();
    }

    videoUpload.value = '';
  });

  // ========== EDITOR DE IMAGEN ==========
  const modalEditor = document.getElementById('modal-editor');
  const closeModalEditor = document.getElementById('close-modal-editor');
  const resetEditorBtn = document.getElementById('reset-editor');
  const saveEditorBtn = document.getElementById('save-editor');
  const blurToolBtn = document.getElementById('blur-tool');
  const blurSizeInput = document.getElementById('blur-size');
  const blurIntensityInput = document.getElementById('blur-intensity');
  const previewWatermarkCheckbox = document.getElementById('preview-watermark');

  function openImageEditor(imageData, photoId = null) {
    currentEditingImage = imageData;
    currentEditingPhotoId = photoId;
    blurAreas = [];
    isBlurToolActive = false;
    
    if (!modalEditor) {
      console.error('Modal del editor de imágenes no encontrado');
      return;
    }
    
    modalEditor.style.display = 'flex';
    
    // Inicializar canvas
    editorCanvas = document.getElementById('editor-canvas');
    if (!editorCanvas) {
      console.error('Canvas del editor no encontrado');
      return;
    }
    
    editorCtx = editorCanvas.getContext('2d');
    
    // Agregar event listeners de canvas para blur drawing
    const handleMouseDown = (e) => {
      if (!isBlurToolActive) return;
      isDrawing = true;
      applyBlurAt(e);
    };

    const handleMouseMove = (e) => {
      if (!isDrawing || !isBlurToolActive) return;
      applyBlurAt(e);
    };

    const handleMouseUp = () => {
      isDrawing = false;
    };

    // Remover listeners previos si existen
    editorCanvas.removeEventListener('mousedown', handleMouseDown);
    editorCanvas.removeEventListener('mousemove', handleMouseMove);
    editorCanvas.removeEventListener('mouseup', handleMouseUp);
    editorCanvas.removeEventListener('mouseleave', handleMouseUp);

    // Agregar nuevos listeners
    editorCanvas.addEventListener('mousedown', handleMouseDown);
    editorCanvas.addEventListener('mousemove', handleMouseMove);
    editorCanvas.addEventListener('mouseup', handleMouseUp);
    editorCanvas.addEventListener('mouseleave', handleMouseUp);
    
    const img = new Image();
    img.onload = () => {
      // Ajustar tamaño del canvas
      const maxWidth = 600;
      const maxHeight = 500;
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width;
        height = maxHeight;
      }
      
      editorCanvas.width = width;
      editorCanvas.height = height;
      
      // Dibujar imagen
      editorCtx.drawImage(img, 0, 0, width, height);
      originalImageData = editorCtx.getImageData(0, 0, width, height);
      
      // Aplicar marca de agua si está activada
      const previewWatermarkCheckbox = document.getElementById('preview-watermark');
      if (previewWatermarkCheckbox?.checked) {
        drawWatermark();
      }
    };
    
    img.onerror = () => {
      console.error('Error al cargar la imagen en el editor');
      showToast('Error al cargar la imagen');
      modalEditor.style.display = 'none';
    };
    
    img.src = imageData;
  }

  closeModalEditor?.addEventListener('click', () => {
    modalEditor.style.display = 'none';
    currentEditingImage = null;
    currentEditingPhotoId = null;
    blurAreas = [];
    isBlurToolActive = false;
    if (blurToolBtn) blurToolBtn.classList.remove('active');
  });

  resetEditorBtn?.addEventListener('click', () => {
    if (originalImageData && editorCtx) {
      editorCtx.putImageData(originalImageData, 0, 0);
      blurAreas = [];
      if (previewWatermarkCheckbox?.checked) {
        drawWatermark();
      }
      showToast('Imagen reiniciada');
    }
  });

  blurToolBtn?.addEventListener('click', () => {
    isBlurToolActive = !isBlurToolActive;
    blurToolBtn.classList.toggle('active', isBlurToolActive);
    editorCanvas.style.cursor = isBlurToolActive ? 'crosshair' : 'default';
  });

  blurSizeInput?.addEventListener('input', () => {
    document.getElementById('blur-size-value').textContent = blurSizeInput.value + 'px';
  });

  blurIntensityInput?.addEventListener('input', () => {
    document.getElementById('blur-intensity-value').textContent = blurIntensityInput.value;
  });

  previewWatermarkCheckbox?.addEventListener('change', () => {
    redrawCanvas();
  });

  function applyBlurAt(e) {
    if (!editorCanvas) return;
    const rect = editorCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = parseInt(blurSizeInput?.value || 50);
    const intensity = parseInt(blurIntensityInput?.value || 15);
    
    blurAreas.push({ x, y, size, intensity });
    redrawCanvas();
  }

  function redrawCanvas() {
    if (!editorCtx || !originalImageData) return;
    
    // Restaurar imagen original
    editorCtx.putImageData(originalImageData, 0, 0);
    
    // Aplicar blur a las áreas marcadas
    blurAreas.forEach(area => {
      applyBlurEffect(area.x, area.y, area.size, area.intensity);
    });
    
    // Aplicar marca de agua si está activada
    if (previewWatermarkCheckbox?.checked) {
      drawWatermark();
    }
  }

  function applyBlurEffect(centerX, centerY, size, intensity) {
    if (!editorCtx || !editorCanvas) return;
    
    const radius = size / 2;
    
    // Obtener el área que vamos a difuminar
    const startX = Math.max(0, Math.floor(centerX - radius));
    const startY = Math.max(0, Math.floor(centerY - radius));
    const endX = Math.min(editorCanvas.width, Math.ceil(centerX + radius));
    const endY = Math.min(editorCanvas.height, Math.ceil(centerY + radius));
    const areaWidth = endX - startX;
    const areaHeight = endY - startY;
    
    if (areaWidth <= 0 || areaHeight <= 0) return;
    
    // Crear canvas temporal para el blur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = areaWidth;
    tempCanvas.height = areaHeight;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Copiar el área al canvas temporal
    tempCtx.drawImage(editorCanvas, startX, startY, areaWidth, areaHeight, 0, 0, areaWidth, areaHeight);
    
    // Aplicar blur al canvas temporal
    tempCtx.filter = `blur(${intensity}px)`;
    tempCtx.drawImage(tempCanvas, 0, 0);
    tempCtx.filter = 'none';
    
    // Obtener los datos de imagen difuminados
    const blurredData = tempCtx.getImageData(0, 0, areaWidth, areaHeight);
    const originalData = editorCtx.getImageData(startX, startY, areaWidth, areaHeight);
    
    // Mezclar con máscara circular
    for (let y = 0; y < areaHeight; y++) {
      for (let x = 0; x < areaWidth; x++) {
        const globalX = startX + x;
        const globalY = startY + y;
        
        // Calcular distancia al centro
        const dx = globalX - centerX;
        const dy = globalY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < radius) {
          // Dentro del círculo - aplicar blur con gradiente suave
          const factor = 1 - (distance / radius) * 0.3; // Gradiente suave
          const i = (y * areaWidth + x) * 4;
          
          originalData.data[i] = blurredData.data[i];     // R
          originalData.data[i + 1] = blurredData.data[i + 1]; // G
          originalData.data[i + 2] = blurredData.data[i + 2]; // B
          // Mantener alpha original
        }
      }
    }
    
    // Poner los datos de vuelta
    editorCtx.putImageData(originalData, startX, startY);
  }

  function drawWatermark() {
    if (!editorCtx || !editorCanvas) return;
    
    const width = editorCanvas.width;
    const height = editorCanvas.height;
    
    editorCtx.save();
    
    // Marca de agua más visible con sombra
    editorCtx.globalAlpha = 0.18; // Más visible
    editorCtx.font = 'bold 28px "Playfair Display", serif';
    editorCtx.fillStyle = '#FFFFFF';
    editorCtx.strokeStyle = 'rgba(0,0,0,0.3)';
    editorCtx.lineWidth = 1;
    editorCtx.textAlign = 'center';
    editorCtx.textBaseline = 'middle';
    editorCtx.shadowColor = 'rgba(0,0,0,0.4)';
    editorCtx.shadowBlur = 3;
    editorCtx.shadowOffsetX = 1;
    editorCtx.shadowOffsetY = 1;
    
    // Rotación diagonal
    editorCtx.translate(width / 2, height / 2);
    editorCtx.rotate(-Math.PI / 6); // -30 grados
    
    // Patrón repetitivo más visible
    const text = 'SalaOscura';
    const spacing = 100;
    
    for (let y = -height; y < height * 2; y += spacing) {
      for (let x = -width; x < width * 2; x += spacing * 1.8) {
        editorCtx.fillText(text, x, y);
        editorCtx.strokeText(text, x, y);
      }
    }
    
    editorCtx.restore();
    
    // Marca de agua en esquina (más visible y elegante)
    editorCtx.save();
    editorCtx.globalAlpha = 0.35;
    editorCtx.font = 'italic 18px "Playfair Display", serif';
    editorCtx.fillStyle = '#D4AF37';
    editorCtx.textAlign = 'right';
    editorCtx.textBaseline = 'bottom';
    editorCtx.shadowColor = 'rgba(0,0,0,0.7)';
    editorCtx.shadowBlur = 6;
    editorCtx.shadowOffsetX = 2;
    editorCtx.shadowOffsetY = 2;
    editorCtx.fillText('SalaOscura', width - 15, height - 15);
    editorCtx.restore();
  }

  saveEditorBtn?.addEventListener('click', async () => {
    if (!editorCanvas) return;

    // Asegurar que la marca de agua esté aplicada
    if (!previewWatermarkCheckbox?.checked) {
      drawWatermark();
    }

    // Mostrar indicador de carga
    showUploadOverlay('Guardando imagen...');

    try {
      // Convertir canvas a blob para subir a S3
      const blob = await new Promise(resolve => editorCanvas.toBlob(resolve, 'image/jpeg', 0.92));

      const userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');

      // Si estamos editando una foto existente
      if (currentEditingPhotoId) {
        const existingPhotoIndex = userPhotos.findIndex(p => p.id === currentEditingPhotoId);
        if (existingPhotoIndex !== -1) {
          // Eliminar versión anterior de S3
          if (userPhotos[existingPhotoIndex].key) {
            DataService.deleteMedia(userPhotos[existingPhotoIndex].key).catch(() => {});
          }

          // Subir nueva versión a S3
          const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
            currentUser.id, `${currentEditingPhotoId}.jpg`, 'image/jpeg'
          );
          await DataService.uploadFileToS3(uploadUrl, blob, 'image/jpeg');

          // Actualizar referencia
          userPhotos[existingPhotoIndex].url = publicUrl;
          userPhotos[existingPhotoIndex].key = key;
          userPhotos[existingPhotoIndex].editedAt = new Date().toISOString();
          delete userPhotos[existingPhotoIndex].data; // Eliminar base64 legacy
          localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));

          // Actualizar imagen en el grid
          const photoSlot = document.querySelector(`.photo-slot[data-id="${currentEditingPhotoId}"]`);
          if (photoSlot) {
            photoSlot.querySelector('img').src = publicUrl;
          }

          // Sincronizar cambios
          await syncPhotoToProfiles();

          showToast('¡Foto actualizada con éxito!');
        }
      } else {
        // Guardar como foto nueva
        const photoId = Date.now().toString();

        // Subir a S3
        const { uploadUrl, publicUrl, key } = await DataService.getUploadUrl(
          currentUser.id, `${photoId}.jpg`, 'image/jpeg'
        );
        await DataService.uploadFileToS3(uploadUrl, blob, 'image/jpeg');

        userPhotos.push({ id: photoId, url: publicUrl, key, createdAt: new Date().toISOString() });
        localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));

        // Añadir al grid
        await addPhotoToGrid(publicUrl, photoId, true);

        // Actualizar límites
        await loadMediaLimits();

        showToast('¡Foto guardada con marca de agua!');
      }
    } catch (err) {
      console.error('Error guardando foto editada:', err);
      showToast('Error al guardar la foto.');
    } finally {
      hideUploadOverlay();
    }

    // Cerrar modal
    modalEditor.style.display = 'none';
    currentEditingImage = null;
    currentEditingPhotoId = null;
    blurAreas = [];
  });

  async function addPhotoToGrid(imageData, photoId, _unused, isVerificationPhoto = false) {
    const photoSlot = document.createElement('div');
    photoSlot.className = 'photo-slot';
    photoSlot.dataset.id = photoId;
    if (isVerificationPhoto) {
      photoSlot.dataset.verification = 'true';
    }
    
    // Verificar si es la foto de perfil actual
    const isProfilePhoto = currentUser.avatar === imageData;
    
    // Las fotos de verificación no pueden eliminarse, solo editarse
    const deleteButtonHTML = isVerificationPhoto 
      ? '' // No mostrar botón de eliminar para fotos de verificación
      : '<button class="photo-delete" title="Eliminar">×</button>';
    
    const verificationBadgeHTML = isVerificationPhoto 
      ? '<div class="verification-photo-badge" style="position: absolute; top: 4px; right: 4px; background: rgba(139,92,246,0.9); color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600;">🔒 Verificación</div>'
      : '';
    
    photoSlot.innerHTML = `
      <img src="${imageData}" alt="Foto" />
      <div class="photo-overlay">
        <button class="photo-edit" title="Editar (difuminar)">✏️</button>
        ${deleteButtonHTML}
      </div>
      <div class="photo-overlay-center">
        <button class="photo-profile" title="Establecer como foto de perfil">${isProfilePhoto ? '⭐' : '👤'}</button>
      </div>
      ${verificationBadgeHTML}
      ${isProfilePhoto ? '<div class="profile-photo-badge">Foto de perfil</div>' : ''}
    `;
    
    // Eventos
    const deleteBtn = photoSlot.querySelector('.photo-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        await deletePhoto(photoId);
        photoSlot.remove();
      });
    }
    
    photoSlot.querySelector('.photo-edit').addEventListener('click', () => {
      openImageEditor(imageData, photoId);
    });
    
    photoSlot.querySelector('.photo-profile').addEventListener('click', async () => {
      await setAsProfilePhoto(imageData, photoId);
    });
    
    photosGrid.insertBefore(photoSlot, addPhotoBtn);
  }

  async function setAsProfilePhoto(imageData, photoId) {
    // imageData ahora puede ser URL de S3 o base64 legacy
    currentUser.avatar = imageData;
    await DataService.setCurrentUser(currentUser);

    // Actualizar en approvedProfiles (solo el perfil individual)
    try {
      const profileId = `profile-${currentUser.id}`;
      const existingProfile = await DataService.getProfileById(profileId);
      if (existingProfile) {
        // Guardar URL como avatar (sin base64 enorme en DynamoDB)
        existingProfile.avatar = imageData;
        // Reorganizar profilePhotosData para que la foto de perfil sea la primera
        if (existingProfile.profilePhotosData && existingProfile.profilePhotosData.length > 0) {
          const photos = existingProfile.profilePhotosData;
          const idx = photos.findIndex(p => p.name === `photo_${photoId}` || p.name === `photo_profile_${photoId}`);
          if (idx > 0) {
            const [profilePhoto] = photos.splice(idx, 1);
            photos.unshift(profilePhoto);
          }
          existingProfile.profilePhotosData = photos;
        }
        await DataService.updateProfile(profileId, existingProfile);
      }
    } catch (err) {
      console.error('Error actualizando avatar en profiles:', err.message);
    }
    
    // También actualizar photos_userId para mantener consistencia
    const userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const photoIndex = userPhotos.findIndex(p => p.id === photoId);
    if (photoIndex > 0) {
      const [photo] = userPhotos.splice(photoIndex, 1);
      userPhotos.unshift(photo);
      localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));
    }
    
    // Actualizar avatar en el header
    const avatarImg = document.getElementById('user-avatar');
    if (avatarImg) {
      avatarImg.src = imageData;
    }
    
    // Recargar grid de fotos para mostrar la nueva foto de perfil marcada
    const photosGrid = document.getElementById('profile-photos-grid');
    const addPhotoBtn = document.getElementById('add-photo-btn');
    if (photosGrid && addPhotoBtn) {
      // Limpiar grid excepto el botón de agregar
      Array.from(photosGrid.children).forEach(child => {
        if (child.id !== 'add-photo-btn') child.remove();
      });
      // Recargar fotos
      mediaAlreadyLoaded = false;
      await loadSavedMedia();
    }

    showToast('✨ Foto de perfil actualizada');
  }

  async function syncPhotoToProfiles() {
    const userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');

    // Construir array de fotos con URLs de S3 (no base64)
    const photosData = userPhotos.slice(0, 15).map(photo => ({
      url: photo.url || photo.data, // URL de S3 o base64 legacy
      key: photo.key || null,
      name: `photo_${photo.id}`
    }));

    // Construir array de videos con URLs de S3
    const videosData = userVideos.slice(0, 10).map(video => ({
      url: video.url || video.data,
      key: video.key || null,
      name: `video_${video.id}`
    }));

    // Actualizar SOLO el perfil del carrusel
    try {
      const profileId = `profile-${currentUser.id}`;
      const existingProfile = await DataService.getProfileById(profileId);
      if (existingProfile) {
        existingProfile.profilePhotosData = photosData;
        existingProfile.photos = userPhotos.length;
        existingProfile.profileVideosData = videosData;
        existingProfile.videos = userVideos.length;
        await DataService.updateProfile(profileId, existingProfile);
      }
    } catch (err) {
      console.error('Error sincronizando media:', err.message);
    }
  }

  async function deletePhoto(photoId) {
    let userPhotos = JSON.parse(localStorage.getItem(`photos_${currentUser.id}`) || '[]');
    const photoToDelete = userPhotos.find(p => p.id === photoId);
    userPhotos = userPhotos.filter(p => p.id !== photoId);
    localStorage.setItem(`photos_${currentUser.id}`, JSON.stringify(userPhotos));
    loadMediaLimits();
    showToast('Foto eliminada');

    // Eliminar de S3 y sincronizar perfil en background
    if (photoToDelete?.key) {
      DataService.deleteMedia(photoToDelete.key).catch(() => {});
    }
    syncPhotoToProfiles().catch(() => {});
  }

  function addVideoToGrid(videoData, videoId, isNew) {
    const videoSlot = document.createElement('div');
    videoSlot.className = 'video-slot';
    videoSlot.dataset.id = videoId;
    videoSlot.innerHTML = `
      <video src="${videoData}" muted></video>
      <div class="video-play-icon">▶</div>
      <div class="video-watermark">SalaOscura</div>
      <div class="video-overlay">
        <button class="video-delete" title="Eliminar">×</button>
      </div>
    `;
    
    // Preview al hover
    const video = videoSlot.querySelector('video');
    videoSlot.addEventListener('mouseenter', () => {
      video.play().catch(() => {});
    });
    videoSlot.addEventListener('mouseleave', () => {
      video.pause();
      video.currentTime = 0;
    });
    
    // Click para ver completo
    videoSlot.addEventListener('click', (e) => {
      if (e.target.classList.contains('video-delete')) return;
      openVideoModal(videoData);
    });
    
    videoSlot.querySelector('.video-delete').addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteVideo(videoId);
      videoSlot.remove();
    });
    
    videosGrid.insertBefore(videoSlot, addVideoBtn);
  }

  async function deleteVideo(videoId) {
    let userVideos = JSON.parse(localStorage.getItem(`videos_${currentUser.id}`) || '[]');
    const videoToDelete = userVideos.find(v => v.id === videoId);
    userVideos = userVideos.filter(v => v.id !== videoId);
    localStorage.setItem(`videos_${currentUser.id}`, JSON.stringify(userVideos));
    await loadMediaLimits();
    showToast('Video eliminado');

    // Eliminar de S3 en background
    if (videoToDelete?.key) {
      DataService.deleteMedia(videoToDelete.key).catch(() => {});
    }
  }

  function openVideoModal(videoData) {
    const modal = document.createElement('div');
    modal.className = 'video-fullscreen-modal';
    modal.innerHTML = `
      <div class="video-modal-content">
        <button class="video-modal-close">&times;</button>
        <video src="${videoData}" controls autoplay></video>
        <div class="video-watermark-overlay">SalaOscura</div>
      </div>
    `;
    
    modal.querySelector('.video-modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
    
    document.body.appendChild(modal);
  }

  // ========== PAYMENT HISTORY ==========
  function loadPaymentHistory(user) {
    const paymentHistoryContainer = document.getElementById('payment-history');
    if (!paymentHistoryContainer) return;

    // Usar historial real si existe, sino crear uno basado en la aprobación
    let paymentHistory = user.paymentHistory || [];
    
    if (paymentHistory.length === 0 && user.approvedAt) {
      // Crear historial basado en la fecha de aprobación
      paymentHistory = [{
        date: user.approvedAt,
        amount: user.planInfo?.price || 0,
        plan: user.selectedPlan || 'premium',
        duration: user.planInfo?.duration || 30,
        receiptData: null
      }];
    }

    if (paymentHistory.length === 0) {
      paymentHistoryContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 20px; color: var(--muted);">
          <p>No hay historial de pagos disponible</p>
        </div>
      `;
      return;
    }

    const planNames = {
      'premium': 'Premium Select',
      'vip': 'VIP Black', 
      'luxury': 'Luxury & Exclusive'
    };

    paymentHistoryContainer.innerHTML = paymentHistory.map(payment => `
      <div class="history-item">
        <div class="history-info">
          <span class="history-plan">${planNames[payment.plan] || payment.plan}</span>
          <span class="history-date">${new Date(payment.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <span class="history-duration">${payment.duration} días</span>
        </div>
        <span class="history-amount">$${parseInt(payment.amount || 0).toLocaleString('es-CL')} CLP</span>
      </div>
    `).join('');
  }

  // ========== TOAST ==========
  function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      padding: 12px 24px;
      background: linear-gradient(135deg, #D4AF37, #F4D03F);
      color: #0A0A0A;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      z-index: 9999;
      animation: toastIn 300ms ease;
      box-shadow: 0 8px 24px rgba(212, 175, 55, 0.4);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastOut 300ms ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ========== OVERLAY DE CARGA PARA UPLOADS ==========
  function showUploadOverlay(message = 'Subiendo...') {
    let overlay = document.getElementById('upload-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'upload-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); display: flex; flex-direction: column;
        align-items: center; justify-content: center; z-index: 99999;
      `;
      overlay.innerHTML = `
        <div style="width:50px;height:50px;border:4px solid rgba(212,175,55,0.3);border-top:4px solid #D4AF37;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        <p id="upload-overlay-text" style="color:#D4AF37;font-size:16px;font-weight:600;margin-top:16px;font-family:'Playfair Display',serif;"></p>
      `;
      const style = document.createElement('style');
      style.textContent = '@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}';
      overlay.appendChild(style);
      document.body.appendChild(overlay);
    }
    overlay.querySelector('#upload-overlay-text').textContent = message;
    overlay.style.display = 'flex';
  }

  function hideUploadOverlay() {
    const overlay = document.getElementById('upload-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  // ========== MODAL RENOVAR PLAN ==========
  const btnRenew = document.getElementById('btn-renew');
  const modalRenewPlan = document.getElementById('modal-renew-plan');
  const closeModalRenew = document.getElementById('close-modal-renew');
  const formRenewPlan = document.getElementById('form-renew-plan');

  // Obtener precios de los planes desde localStorage (configurados en admin)
  async function getPlanPrices() {
    const stored = await DataService.getConfig('luxuryPlans');
    if (stored) {
      const plans = JSON.parse(stored);
      return {
        'premium': plans.premium?.prices || { 7: 29990, 15: 54990, 30: 79990 },
        'vip': plans.vip?.prices || { 7: 19990, 15: 34990, 30: 49990 },
        'luxury': plans.luxury?.prices || { 7: 59990, 15: 99990, 30: 149990 }
      };
    }
    // Precios por defecto si no hay configuración
    return {
      'premium': { 7: 29990, 15: 54990, 30: 79990 },
      'vip': { 7: 19990, 15: 34990, 30: 49990 },
      'luxury': { 7: 59990, 15: 99990, 30: 149990 }
    };
  }

  async function updateRenewPlanInfo() {
    const planNames = {
      'premium': 'Premium Select',
      'vip': 'VIP Black',
      'luxury': 'Luxury & Exclusive'
    };
    
    // Obtener precios dinámicos desde admin
    const planPrices = await getPlanPrices();

    document.getElementById('renew-plan-name').textContent = planNames[currentUser.selectedPlan] || currentUser.selectedPlan;
    
    // Calcular fecha de vencimiento actual
    let currentExpiry;
    
    // Verificar si hay una fecha de vencimiento válida
    if (currentUser.planExpiry) {
      currentExpiry = new Date(currentUser.planExpiry);
    } else if (currentUser.approvedAt) {
      // Si no hay fecha de vencimiento, calcular desde fecha de aprobación + duración del plan
      const approvedDate = new Date(currentUser.approvedAt);
      const planDuration = currentUser.planInfo?.duration || 30;
      currentExpiry = new Date(approvedDate);
      currentExpiry.setDate(currentExpiry.getDate() + planDuration);
    } else if (currentUser.registrationDate) {
      // Fallback a fecha de registro + 30 días
      const regDate = new Date(currentUser.registrationDate);
      currentExpiry = new Date(regDate);
      currentExpiry.setDate(currentExpiry.getDate() + 30);
    } else {
      // Si no hay ninguna fecha, usar 30 días desde hoy
      currentExpiry = new Date();
      currentExpiry.setDate(currentExpiry.getDate() + 30);
    }
    
    // Validar que sea una fecha válida
    if (isNaN(currentExpiry.getTime())) {
      currentExpiry = new Date();
      currentExpiry.setDate(currentExpiry.getDate() + 30);
    }
    
    // Calcular días restantes
    const now = new Date();
    const daysRemaining = Math.ceil((currentExpiry - now) / (1000 * 60 * 60 * 24));
    
    // Mostrar fecha de vencimiento actual con días restantes
    const expiryText = currentExpiry.toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const daysText = daysRemaining > 0 ? ` (${daysRemaining} días restantes)` : ' (Vencido)';
    document.getElementById('renew-current-expiry').textContent = expiryText + daysText;
    document.getElementById('renew-current-expiry').style.color = daysRemaining <= 7 ? '#EF4444' : daysRemaining <= 15 ? '#F59E0B' : '#10B981';

    // Calcular nueva fecha basado en duración seleccionada
    const updateNewExpiry = () => {
      const selectedDuration = parseInt(document.querySelector('input[name="renew-duration"]:checked')?.value || 30);
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + selectedDuration);
      
      // Calcular días totales desde hoy
      const totalDaysFromNow = Math.ceil((newExpiry - now) / (1000 * 60 * 60 * 24));
      
      document.getElementById('renew-new-expiry').textContent = newExpiry.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }) + ` (+${selectedDuration} días = ${totalDaysFromNow} días desde hoy)`;

      // Actualizar precio dinámico desde admin
      const price = planPrices[currentUser.selectedPlan]?.[selectedDuration] || 0;
      document.getElementById('renew-plan-price').textContent = `$${price.toLocaleString('es-CL')} CLP`;
    };

    // Agregar listeners a los radio buttons
    document.querySelectorAll('input[name="renew-duration"]').forEach(radio => {
      radio.addEventListener('change', updateNewExpiry);
    });

    // Calcular inicial
    updateNewExpiry();
  }

  btnRenew?.addEventListener('click', async () => {
    modalRenewPlan.style.display = 'flex';
    await updateRenewPlanInfo();
  });

  closeModalRenew?.addEventListener('click', () => {
    modalRenewPlan.style.display = 'none';
    formRenewPlan?.reset();
  });

  modalRenewPlan?.addEventListener('click', (e) => {
    if (e.target === modalRenewPlan) {
      modalRenewPlan.style.display = 'none';
      formRenewPlan?.reset();
    }
  });

  formRenewPlan?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const receiptInput = document.getElementById('renew-receipt');
    const receiptFile = receiptInput?.files[0];
    const selectedDuration = parseInt(document.querySelector('input[name="renew-duration"]:checked')?.value || 30);
    
    if (!receiptFile) {
      showNotification('Por favor adjunta el comprobante de pago', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      // Calcular fecha de vencimiento actual (misma lógica que updateRenewPlanInfo)
      let currentExpiry;
      if (currentUser.planExpiry) {
        currentExpiry = new Date(currentUser.planExpiry);
      } else if (currentUser.approvedAt) {
        const approvedDate = new Date(currentUser.approvedAt);
        const planDuration = currentUser.planInfo?.duration || 30;
        currentExpiry = new Date(approvedDate);
        currentExpiry.setDate(currentExpiry.getDate() + planDuration);
      } else {
        currentExpiry = new Date();
        currentExpiry.setDate(currentExpiry.getDate() + 30);
      }
      
      if (isNaN(currentExpiry.getTime())) {
        currentExpiry = new Date();
        currentExpiry.setDate(currentExpiry.getDate() + 30);
      }
      
      const newExpiry = new Date(currentExpiry);
      newExpiry.setDate(newExpiry.getDate() + selectedDuration);
      
      // Obtener precio dinámico
      const planPrices = await getPlanPrices();
      const price = planPrices[currentUser.selectedPlan]?.[selectedDuration] || 0;

      const renewalRequest = {
        id: Date.now().toString(),
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName,
        email: currentUser.email,
        currentPlan: currentUser.selectedPlan,
        currentExpiry: currentExpiry.toISOString(),
        newExpiry: newExpiry.toISOString(),
        duration: selectedDuration,
        price: price,
        receiptData: e.target.result,
        receiptName: receiptFile.name,
        requestDate: new Date().toISOString(),
        status: 'pending',
        type: 'renewal'
      };

      // Guardar solicitud pendiente
      const pendingRequests = await DataService.getPlanRequests() || [];
      pendingRequests.push(renewalRequest);
      await DataService.savePlanRequests(pendingRequests);

      showNotification('✅ Solicitud de renovación enviada. Te notificaremos cuando sea aprobada.', 'success');
      modalRenewPlan.style.display = 'none';
      formRenewPlan.reset();
    };
    
    reader.readAsDataURL(receiptFile);
  });

  // ========== MODAL MEJORA DE PLAN ==========
  const btnUpgrade = document.getElementById('btn-upgrade');
  const modalUpgradePlan = document.getElementById('modal-upgrade-plan');
  const closeModalUpgrade = document.getElementById('close-modal-upgrade');
  const upgradeStep1 = document.getElementById('upgrade-plan-step1');
  const upgradeStep2 = document.getElementById('upgrade-plan-step2');
  const formUpgradePlan = document.getElementById('form-upgrade-plan');
  let selectedUpgradePlan = null;
  let upgradePlanPrices = {};

  // Función para obtener precios de planes
  async function getUpgradePlanPrices() {
    const luxuryPlans = await DataService.getConfig('luxuryPlans') || {};
    return {
      premium: luxuryPlans.premium?.prices || { 7: 12990, 15: 22990, 30: 29990 },
      vip: luxuryPlans.vip?.prices || { 7: 24990, 15: 44990, 30: 59990 },
      'luxury-exclusive': luxuryPlans.luxury?.prices || { 7: 39990, 15: 69990, 30: 89990 }
    };
  }

  // Función para obtener features de los planes
  async function getUpgradePlanFeatures() {
    const luxuryPlans = await DataService.getConfig('luxuryPlans') || {};
    return {
      premium: luxuryPlans.premium?.features || ['Perfil destacado', 'Hasta 10 fotos', '2 videos', '5 estados por día', 'Badge Premium', 'Instantes destacados'],
      vip: luxuryPlans.vip?.features || ['Todo de Premium', 'Hasta 15 fotos', '4 videos', '7 estados por día', 'Badge VIP exclusivo', 'Prioridad en búsquedas', 'Duración estados 12h'],
      'luxury-exclusive': luxuryPlans.luxury?.features || ['Todo de VIP', 'Hasta 25 fotos', '6 videos', '10 estados por día', 'Badge Diamond', 'Máxima visibilidad', 'Duración estados 24h', 'Soporte prioritario']
    };
  }

  // Nombres y configuración de planes
  const upgradeplanConfig = {
    'premium': { name: 'Premium Select', icon: '⭐' },
    'vip': { name: 'VIP Black', icon: '👑', featured: true },
    'luxury-exclusive': { name: 'Luxury & Exclusive', icon: '💎' }
  };

  // Función para renderizar las tarjetas de planes
  async function renderUpgradePlanCards() {
    const container = document.getElementById('plans-comparison-container');
    if (!container) return;

    upgradePlanPrices = await getUpgradePlanPrices();
    const planFeatures = await getUpgradePlanFeatures();
    const planHierarchy = { 'premium': 1, 'vip': 2, 'luxury': 3, 'luxury-exclusive': 3 };
    const currentLevel = planHierarchy[currentUser.selectedPlan] || 1;

    const plansOrder = ['premium', 'vip', 'luxury-exclusive'];
    let html = '<div class="plans-comparison">';

    plansOrder.forEach(planKey => {
      const config = upgradeplanConfig[planKey];
      const prices = upgradePlanPrices[planKey];
      const features = planFeatures[planKey];
      const planLevel = planHierarchy[planKey];
      const isDisabled = planLevel <= currentLevel;
      const isFeatured = config.featured;
      const isCurrentPlan = currentUser.selectedPlan === planKey || 
                           (currentUser.selectedPlan === 'luxury' && planKey === 'luxury-exclusive');
      
      // Mostrar solo 4 features inicialmente
      const visibleFeatures = features.slice(0, 4);
      const hiddenFeatures = features.slice(4);
      const hasMoreFeatures = hiddenFeatures.length > 0;

      html += `
        <div class="plan-option ${isFeatured ? 'featured' : ''} ${isDisabled ? 'disabled' : ''}" data-plan="${planKey}">
          ${isFeatured ? '<div class="plan-badge">Más Popular</div>' : ''}
          ${isCurrentPlan ? '<div class="plan-badge" style="background: linear-gradient(135deg, #10B981, #059669);">Actual</div>' : ''}
          <div class="plan-header">
            <span class="plan-icon">${config.icon}</span>
            <h4>${config.name}</h4>
            <div class="plan-price">$${prices[30].toLocaleString('es-CL')} <span>CLP/mes</span></div>
          </div>
          <ul class="plan-features-list" id="features-${planKey}">
            ${visibleFeatures.map(f => `<li>✓ ${f}</li>`).join('')}
            ${hiddenFeatures.map(f => `<li class="hidden-feature">✓ ${f}</li>`).join('')}
          </ul>
          ${hasMoreFeatures ? `<button type="button" class="btn-ver-mas" data-plan="${planKey}">Ver más (+${hiddenFeatures.length})</button>` : ''}
          <button class="btn-select-plan ${isFeatured ? 'featured' : ''}" data-plan="${planKey}" ${isDisabled ? 'disabled' : ''}>
            ${isCurrentPlan ? 'Plan Actual' : isDisabled ? 'No disponible' : 'Seleccionar'}
          </button>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Añadir listeners a los nuevos botones
    container.querySelectorAll('.btn-select-plan:not([disabled])').forEach(btn => {
      btn.addEventListener('click', handleUpgradePlanSelect);
    });
    
    // Añadir listeners a los botones "Ver más"
    container.querySelectorAll('.btn-ver-mas').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const planKey = e.target.dataset.plan;
        const featuresList = document.getElementById(`features-${planKey}`);
        if (featuresList) {
          featuresList.classList.toggle('expanded');
          e.target.textContent = featuresList.classList.contains('expanded') ? 'Ver menos' : `Ver más (+${featuresList.querySelectorAll('.hidden-feature').length})`;
        }
      });
    });
  }

  // Handler para selección de plan
  function handleUpgradePlanSelect(e) {
    selectedUpgradePlan = e.target.dataset.plan;
    
    // Validar que sea un upgrade válido
    const planHierarchy = { 'premium': 1, 'vip': 2, 'luxury': 3, 'luxury-exclusive': 3 };
    const currentLevel = planHierarchy[currentUser.selectedPlan] || 1;
    const newLevel = planHierarchy[selectedUpgradePlan] || 1;
    
    if (newLevel <= currentLevel) {
      showNotification('Debes seleccionar un plan superior al actual', 'error');
      return;
    }

    // Mostrar step 2
    upgradeStep1.style.display = 'none';
    upgradeStep2.style.display = 'block';
    
    const config = upgradeplanConfig[selectedUpgradePlan];
    document.getElementById('selected-plan-name').textContent = config.name;
    document.getElementById('upgrade-plan-name').textContent = config.name;

    // Calcular fechas
    updateUpgradeInfo();
  }

  // Función para actualizar la información de la mejora
  function updateUpgradeInfo() {
    if (!selectedUpgradePlan) return;

    const durationRadio = document.querySelector('input[name="upgrade-duration"]:checked');
    const duration = parseInt(durationRadio?.value || 30);
    const prices = upgradePlanPrices[selectedUpgradePlan];
    const price = prices[duration] || prices[30];

    // Actualizar texto de duración
    document.getElementById('upgrade-duration-text').textContent = `${duration} días`;

    // Actualizar precio
    document.getElementById('upgrade-plan-price').textContent = `$${price.toLocaleString('es-CL')} CLP`;

    // Calcular fechas
    const currentExpiry = currentUser.planExpiry ? new Date(currentUser.planExpiry) : new Date();
    const now = new Date();
    
    // Formatear fecha de vencimiento actual
    const expiryFormatted = currentExpiry.toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    document.getElementById('upgrade-current-expiry-step2').textContent = expiryFormatted;

    // Calcular nueva fecha de vencimiento (desde el vencimiento actual + duración)
    const startDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + duration);
    
    const newExpiryFormatted = newExpiry.toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    document.getElementById('upgrade-new-expiry').textContent = newExpiryFormatted;
  }

  // Abrir modal
  btnUpgrade?.addEventListener('click', async () => {
    await renderUpgradePlanCards();
    
    // Mostrar info del plan actual
    const planConfig = upgradeplanConfig[currentUser.selectedPlan] || 
                       (currentUser.selectedPlan === 'luxury' ? upgradeplanConfig['luxury-exclusive'] : null);
    const currentPlanName = planConfig?.name || 'Básico';
    document.getElementById('upgrade-current-plan-name').textContent = currentPlanName;
    
    // Fecha de vencimiento actual
    let expiryFormatted;
    if (currentUser.planExpiry) {
      const currentExpiry = new Date(currentUser.planExpiry);
      if (!isNaN(currentExpiry.getTime())) {
        expiryFormatted = currentExpiry.toLocaleDateString('es-CL', {
          day: '2-digit', month: 'short', year: 'numeric'
        });
      } else {
        expiryFormatted = 'No definido';
      }
    } else {
      expiryFormatted = 'No definido';
    }
    document.getElementById('upgrade-current-expiry').textContent = expiryFormatted;
    
    modalUpgradePlan.style.display = 'flex';
    upgradeStep1.style.display = 'block';
    upgradeStep2.style.display = 'none';
    selectedUpgradePlan = null;
  });

  closeModalUpgrade?.addEventListener('click', () => {
    modalUpgradePlan.style.display = 'none';
    upgradeStep1.style.display = 'block';
    upgradeStep2.style.display = 'none';
    formUpgradePlan?.reset();
  });

  modalUpgradePlan?.addEventListener('click', (e) => {
    if (e.target === modalUpgradePlan) {
      modalUpgradePlan.style.display = 'none';
      upgradeStep1.style.display = 'block';
      upgradeStep2.style.display = 'none';
      formUpgradePlan?.reset();
    }
  });

  // Listeners para cambio de duración
  document.querySelectorAll('input[name="upgrade-duration"]').forEach(radio => {
    radio.addEventListener('change', updateUpgradeInfo);
  });

  // Botón volver en step 2
  const btnBackToPlans = document.getElementById('btn-back-to-plans');
  btnBackToPlans?.addEventListener('click', () => {
    upgradeStep1.style.display = 'block';
    upgradeStep2.style.display = 'none';
    selectedUpgradePlan = null;
  });

  formUpgradePlan?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const receiptInput = document.getElementById('upgrade-receipt');
    const receiptFile = receiptInput?.files[0];
    
    if (!receiptFile) {
      showNotification('Por favor adjunta el comprobante de pago', 'error');
      return;
    }

    const durationRadio = document.querySelector('input[name="upgrade-duration"]:checked');
    const duration = parseInt(durationRadio?.value || 30);
    const prices = upgradePlanPrices[selectedUpgradePlan];
    const price = prices[duration] || prices[30];

    // Calcular nueva fecha de vencimiento
    const currentExpiry = currentUser.planExpiry ? new Date(currentUser.planExpiry) : new Date();
    const now = new Date();
    const startDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(startDate);
    newExpiry.setDate(newExpiry.getDate() + duration);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const upgradeRequest = {
        id: `upgrade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.id,
        username: currentUser.username,
        displayName: currentUser.displayName || currentUser.username,
        email: currentUser.email || '',
        currentPlan: currentUser.selectedPlan,
        newPlan: selectedUpgradePlan,
        currentExpiry: currentUser.planExpiry,
        duration: duration,
        price: price,
        newExpiry: newExpiry.toISOString(),
        receiptData: e.target.result,
        receiptName: receiptFile.name,
        requestDate: new Date().toISOString(),
        status: 'pending',
        type: 'upgrade'
      };

      // Guardar solicitud pendiente
      const pendingRequests = await DataService.getPlanRequests() || [];
      pendingRequests.push(upgradeRequest);
      await DataService.savePlanRequests(pendingRequests);

      showNotification('Solicitud de mejora enviada. Pendiente de aprobación', 'success');
      modalUpgradePlan.style.display = 'none';
      upgradeStep1.style.display = 'block';
      upgradeStep2.style.display = 'none';
      formUpgradePlan.reset();
      selectedUpgradePlan = null;
    };
    
    reader.readAsDataURL(receiptFile);
  });

  // ========== MENCIONES DEL FORO ==========
  async function loadMenciones() {
    const mencionesList = document.getElementById('menciones-list');
    if (!mencionesList) return;

    // Obtener menciones del localStorage (integración con foro Sala Oscura)
    const allMentions = await DataService.getConfig('salaOscuraMentions') || {};
    
    // Buscar menciones para el usuario actual por email
    const userEmail = currentUser.email || '';
    const userMentions = allMentions[userEmail] || [];

    if (userMentions.length === 0) {
      mencionesList.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <p>No tienes menciones todavía</p>
          <p style="font-size: 13px; margin-top: 8px;">Cuando alguien te mencione con @ en Sala Oscura aparecerá aquí</p>
        </div>
      `;
      return;
    }

    // Contar menciones no leídas
    const unreadCount = userMentions.filter(m => !m.read).length;
    
    mencionesList.innerHTML = `
      ${unreadCount > 0 ? `<div class="menciones-unread-badge" style="background: #D4AF37; color: #000; padding: 8px 16px; border-radius: 8px; margin-bottom: 16px; font-weight: 600;">📬 ${unreadCount} mención${unreadCount > 1 ? 'es' : ''} nueva${unreadCount > 1 ? 's' : ''}</div>` : ''}
      ${userMentions.map((mention, index) => {
        const timeAgo = getTimeAgo(new Date(mention.fecha));
        return `
          <div class="mencion-item ${!mention.read ? 'unread' : ''}" style="background: ${!mention.read ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${!mention.read ? 'rgba(212,175,55,0.3)' : 'rgba(255,255,255,0.1)'}; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div class="mencion-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
              <div class="mencion-author" style="display: flex; align-items: center; gap: 12px;">
                <div class="mencion-avatar" style="width: 40px; height: 40px; border-radius: 50%; background: rgba(212,175,55,0.2); border: 2px solid #D4AF37; display: flex; align-items: center; justify-content: center; font-weight: 700; color: #D4AF37;">
                  ${(mention.mentionedBy || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div class="mencion-name" style="color: #fff; font-weight: 600;">${mention.mentionedBy || 'Usuario'}</div>
                  <div class="mencion-time" style="color: #888; font-size: 12px;">${timeAgo}</div>
                </div>
              </div>
              ${!mention.read ? '<span style="background: #D4AF37; color: #000; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700;">NUEVO</span>' : ''}
            </div>
            <div class="mencion-content" style="color: #ccc; font-size: 14px; margin-bottom: 12px;">
              Te mencionaron en: <strong style="color: #D4AF37;">"${mention.postTitle || 'Publicación'}"</strong>
            </div>
            <div style="display: flex; gap: 8px;">
              <a href="salon?post=${mention.postId}" class="mencion-thread" style="display: inline-flex; align-items: center; gap: 6px; color: #D4AF37; text-decoration: none; font-size: 13px; font-weight: 600;" onclick="markMentionAsRead('${userEmail}', ${index})">
                <span>Ver hilo completo</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        `;
      }).join('')}
    `;
  }

  // Marcar mención como leída
  window.markMentionAsRead = async function(email, index) {
    const allMentions = await DataService.getConfig('salaOscuraMentions') || {};
    if (allMentions[email] && allMentions[email][index]) {
      allMentions[email][index].read = true;
      await DataService.setConfig('salaOscuraMentions', allMentions);
    }
  };

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' años';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' meses';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' días';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' horas';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutos';
    
    return 'Hace un momento';
  }

  // Cargar menciones al iniciar
  loadMenciones();

  // Agregar keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toastIn {
      from { opacity: 0; transform: translateX(-50%) translateY(20px); }
      to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
      from { opacity: 1; transform: translateX(-50%) translateY(0); }
      to { opacity: 0; transform: translateX(-50%) translateY(20px); }
    }
    .photo-delete {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      background: rgba(0,0,0,0.7);
      border: none;
      border-radius: 50%;
      color: white;
      cursor: pointer;
      display: none;
    }
    .photo-slot:hover .photo-delete {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;
  document.head.appendChild(style);

  // ========== NAVEGACIÓN MÓVIL ==========
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.querySelector('.site-nav');
  
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
  }
});
