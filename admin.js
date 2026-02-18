// Admin Panel Logic
// La clave admin se obtiene desde AWS DynamoDB
let ADMIN_PASSWORD = null;

// Variables globales - se cargan desde AWS
let registros = [];

// Cargar clave admin desde AWS al inicio
async function loadAdminPassword() {
  try {
    const response = await fetch(`${CONFIG.getApiUrl()}/config/adminPassword`);
    const data = await response.json();
    ADMIN_PASSWORD = data.value || null;
    if (!ADMIN_PASSWORD) {
      console.error('Clave admin no configurada en AWS');
    }
  } catch (error) {
    console.error('Error cargando clave admin:', error);
    ADMIN_PASSWORD = null;
  }
}

// Cargar registros desde AWS
async function loadRegistrosFromAPI() {
  try {
    registros = await DataService.getPendingRegistros();
    console.log('✅ Registros cargados desde AWS:', registros.length);
  } catch (error) {
    console.error('❌ Error cargando registros desde AWS:', error);
    
    // Verificar si es un error de CORS
    if (error.message && error.message.includes('Failed to fetch')) {
      console.warn('🔧 Error de CORS detectado. Verifica la configuración del backend AWS.');
    }
    
    registros = [];
    console.log('⚠️ Continuando con 0 registros por error de conectividad');
  }
}

// Inicializar datos por defecto en AWS si no existen
async function initializeDefaultData() {
  try {
    // Verificar servicios
    const servicios = await DataService.getServiciosConfig();
    if (!servicios || !servicios.active) {
      const serviciosDefault = {
        active: true,
        servicios: [
          { nombre: 'Luxury & Exclusive', descripcion: 'Servicio de exclusividad total sin límites', duracion: '1-2 horas', precio: 149990, incluye: 'Atención personalizada\nExclusividad total\nFlexibilidad de horarios\nAmbiente privado' },
          { nombre: 'VIP Black', descripcion: 'Visibilidad premium para destacar', duracion: '1 hora', precio: 49990, incluye: 'Perfil destacado\nVisibilidad extra\nSoporte prioritario' },
          { nombre: 'Premium Select', descripcion: 'La mejor relación calidad-precio', duracion: '45 minutos', precio: 79990, incluye: 'Selección de modelos\nFecha flexible\nConfidencialidad garantizada' }
        ],
        faq: [
          { pregunta: '¿Cómo contratar un servicio?', respuesta: 'Puedes contactarnos a través de WhatsApp o correo para coordinar un servicio de acuerdo a tus necesidades.' },
          { pregunta: '¿Cuáles son los métodos de pago?', respuesta: 'Aceptamos transferencia bancaria, depósito, y otros métodos de pago según lo coordines con el administrador.' }
        ]
      };
      await DataService.setConfig('servicios', serviciosDefault);
    }
    
    // Verificar nosotros
    const nosotros = await DataService.getNosotrosConfig();
    if (!nosotros || !nosotros.active) {
      const nosotrosDefault = {
        active: true,
        nombre: 'Sala Negra',
        email: 'contacto@salanegra.com',
        telefono: '+56 9 0000 0000',
        whatsapp: '+56 9 0000 0000',
        direccion: 'Santiago, Chile',
        info: [],
        legal: 'Sala Negra es una plataforma de servicios. Todos los servicios ofrecidos son entre adultos mayores de 18 años. La plataforma no se responsabiliza por acuerdos privados realizados fuera del sitio.'
      };
      await DataService.setConfig('nosotros', nosotrosDefault);
    }
  } catch (error) {
    console.error('Error inicializando datos:', error);
  }
}

// Cargar clave al iniciar
loadAdminPassword();

// ============================================
// SECCIONES COLAPSABLES
// ============================================
function initCollapsibleSections() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', function() {
      const sectionId = this.getAttribute('data-section');
      const section = document.getElementById(sectionId);
      if (section) {
        section.classList.toggle('collapsed');
      }
    });
  });
}

const loginScreen = document.getElementById('login-screen');
const adminContent = document.getElementById('admin-content');
const adminHeader = document.querySelector('.admin-header');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('admin-login-btn');
const logoutBtn = document.getElementById('admin-logout-btn');
const confirmModal = document.getElementById('confirm-modal');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmDelete = document.getElementById('confirm-delete');
const confirmTitle = document.getElementById('confirm-title');

let isLoggedIn = false;
let pendingDeleteId = null;

// Cursor personalizado
const cursor = document.getElementById('cursor');
if (cursor) {
  let cx = 0, cy = 0, tx = 0, ty = 0, moving = false;
  const move = (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!moving) {
      moving = true;
      requestAnimationFrame(loop);
    }
  };
  const loop = () => {
    cx += (tx - cx) * 0.2;
    cy += (ty - cy) * 0.2;
    cursor.style.transform = `translate(${cx}px, ${cy}px)`;
    if (Math.abs(tx - cx) > 0.5 || Math.abs(ty - cy) > 0.5) {
      requestAnimationFrame(loop);
    } else {
      moving = false;
    }
  };
  window.addEventListener('mousemove', move, { passive: true });
}

// Auth
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    console.log('Login button clicked'); // Debug
    console.log('Verificando contraseña de admin...');
    
    // Asegurar que la clave esté cargada
    if (!ADMIN_PASSWORD) {
      console.log('Cargando clave admin...');
      await loadAdminPassword();
      console.log('Clave admin cargada correctamente');
    }
    
    if (passwordInput.value === ADMIN_PASSWORD) {
      console.log('Login exitoso');
      isLoggedIn = true;
      loginScreen.style.display = 'none';
      adminContent.style.display = 'block';
      adminHeader.style.display = 'block';
    
      // Inicializar datos desde AWS si no existen
      await initializeDefaultData();
    
      await loadRegistrosFromAPI();
      renderRegistros();
    
      // Inicializar secciones colapsables
      initCollapsibleSections();
    
      // Actualizar badge de mensajes, registros y renovaciones
      updateMensajesBadge();
      updateRegistrosBadge();
      updateAprobadosBadge();
      updateRechazadosBadge();
      updateRenovacionesBadge();
      renderRenovaciones();
    
      // Revisar nuevos mensajes, registros y renovaciones cada 5 segundos
      setInterval(updateMensajesBadge, 5000);
      setInterval(updateRegistrosBadge, 5000);
      setInterval(updateRenovacionesBadge, 5000);
    } else {
      alert('Contraseña incorrecta');
    }
  });
}

if (passwordInput) {
  passwordInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && loginBtn) loginBtn.click();
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    isLoggedIn = false;
    loginScreen.style.display = 'flex';
    adminContent.style.display = 'none';
    adminHeader.style.display = 'none';
    if (passwordInput) passwordInput.value = '';
  });
}

// Confirmations
if (confirmCancel) {
  confirmCancel.addEventListener('click', () => {
    confirmModal.classList.remove('open');
    pendingDeleteId = null;
  });
}

if (confirmDelete) {
  confirmDelete.addEventListener('click', () => {
    confirmModal.classList.remove('open');
    pendingDeleteId = null;
  });
}

// Tab Navigation
const adminTabs = document.querySelectorAll('.admin-tab');
const tabContents = document.querySelectorAll('.admin-tab-content');

adminTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    adminTabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Refresh data when changing tabs
    if (tabName === 'registros') {
      renderRegistros();
    } else if (tabName === 'registros-aprobados') {
      renderRegistrosAprobados();
    } else if (tabName === 'registros-rechazados') {
      renderRegistrosRechazados();
    } else if (tabName === 'mensajes') {
      renderMensajes(false); // NO auto-marcar como leídos
    } else if (tabName === 'servicios-nosotros') {
      loadServiciosToForm();
      loadNosotrosToForm();
    } else if (tabName === 'planes') {
      loadPlansToForm();
      renderDiscountCodes();
    } else if (tabName === 'renovaciones') {
      renderRenovaciones();
    }
  });
});

// Registros (Usuarios pendientes de aprobación)
// Variable 'registros' ya está definida globalmente y se carga desde AWS

const renderRegistros = () => {
  const list = document.getElementById('registros-list');
  const empty = document.getElementById('registros-empty');

  if (!list || !empty) {
    console.error('Elementos de registros no encontrados');
    return;
  }

  // Filtrar por 'pendiente' O 'pending' (aceptar ambos idiomas)
  const pendingOnly = registros.filter(r => {
    const normalizedStatus = String(r.status || '').toLowerCase().trim();
    return normalizedStatus === 'pendiente' || normalizedStatus === 'pending';
  });

  if (pendingOnly.length === 0) {
    console.warn('⚠️ No hay registros pendientes para mostrar');
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  console.log('✅ Renderizando', pendingOnly.length, 'registros pendientes');
  list.style.display = 'grid';
  empty.style.display = 'none';
  list.innerHTML = pendingOnly.map(reg => {
    const planNames = { vip: 'VIP Black', premium: 'Premium Select', luxury: 'Luxury & Exclusive' };
    const planName = planNames[reg.selectedPlan] || reg.selectedPlan || 'No seleccionado';
    const interviewInfo = reg.interviewDate && reg.interviewTime 
      ? `${reg.interviewDate} a las ${reg.interviewTime}` 
      : 'No agendada';
    const paymentStatus = reg.payAfterInterview ? '💳 Paga después de entrevista' : '✓ Comprobante adjunto';
    
    return `
    <div class="admin-item" data-reg-id="${reg.id}" style="flex-direction: column; gap: 16px;">
      <!-- Header -->
      <div style="width: 100%; display: flex; justify-content: space-between; align-items: start; flex-wrap: wrap; gap: 12px;">
        <div style="flex: 1; min-width: 200px;">
          <div class="admin-item-name" style="font-size: 18px;">${reg.displayName || 'Sin nombre'}</div>
          <div style="color: var(--gold); font-size: 14px;">@${reg.username || 'sin.usuario'}</div>
          <div class="admin-item-email">${reg.email || ''}</div>
          <div class="admin-item-date">Registrado: ${reg.date}</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span class="admin-item-status status-pendiente">Pendiente</span>
          <span style="background: ${reg.selectedPlan === 'luxury' ? 'linear-gradient(135deg, #8B5CF6, #D4AF37)' : reg.selectedPlan === 'premium' ? 'var(--gold)' : 'rgba(212,175,55,0.3)'}; color: ${reg.selectedPlan === 'premium' || reg.selectedPlan === 'luxury' ? '#0A0A0A' : 'var(--gold)'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">${planName}</span>
        </div>
      </div>
      
      <!-- Info Grid -->
      <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;">
        <!-- Contact -->
        <div>
          <div style="color: var(--gold); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">📞 Contacto</div>
          <div style="color: var(--text); font-size: 13px;">WhatsApp: ${reg.whatsapp || 'N/A'}</div>
          <div style="color: var(--text); font-size: 13px;">Ciudad: ${reg.city || 'N/A'}${reg.commune ? ', ' + reg.commune : ''}</div>
          <div style="color: var(--text); font-size: 13px;">Nacionalidad: ${reg.nationality || 'N/A'}</div>
        </div>
        
        <!-- Physical -->
        <div>
          <div style="color: var(--gold); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">💃 Físico</div>
          <div style="color: var(--text); font-size: 13px;">Edad: ${reg.age || 'N/A'} años</div>
          <div style="color: var(--text); font-size: 13px;">Altura: ${reg.height || 'N/A'} cm | Peso: ${reg.weight || 'N/A'} kg</div>
          <div style="color: var(--text); font-size: 13px;">Medidas: ${reg.measurements || 'N/A'}</div>
        </div>
        
        <!-- Rates -->
        <div>
          <div style="color: var(--gold); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">💰 Tarifas</div>
          <div style="color: var(--text); font-size: 13px;">1 hora: $${parseInt(reg.priceHour || 0).toLocaleString('es-CL')}</div>
          <div style="color: var(--text); font-size: 13px;">2 horas: ${reg.priceTwoHours ? '$' + parseInt(reg.priceTwoHours).toLocaleString('es-CL') : 'N/A'}</div>
          <div style="color: var(--text); font-size: 13px;">Noche: ${reg.priceOvernight ? '$' + parseInt(reg.priceOvernight).toLocaleString('es-CL') : 'N/A'}</div>
        </div>
        
        <!-- Interview -->
        <div>
          <div style="color: #8B5CF6; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">📅 Entrevista</div>
          <div style="color: var(--text); font-size: 13px; font-weight: 600;">${interviewInfo}</div>
          <div style="color: var(--muted); font-size: 12px; margin-top: 4px;">${paymentStatus}</div>
        </div>
      </div>
      
      <!-- Bio -->
      ${reg.bio ? `
      <div style="width: 100%; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px;">
        <div style="color: var(--gold); font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">📝 Bio</div>
        <div style="color: var(--text); font-size: 13px; white-space: pre-wrap;">${reg.bio}</div>
      </div>
      ` : ''}
      
      <!-- Services -->
      ${reg.services && reg.services.length > 0 ? `
      <div style="width: 100%; display: flex; flex-wrap: wrap; gap: 8px;">
        <span style="color: var(--gold); font-size: 12px; margin-right: 8px;">Servicios:</span>
        ${(Array.isArray(reg.services) ? reg.services : [reg.services]).map(s => `<span style="background: rgba(212,175,55,0.15); color: var(--gold); padding: 4px 8px; border-radius: 4px; font-size: 12px;">${s}</span>`).join('')}
      </div>
      ` : ''}
      
      <!-- Verification Status -->
      <div style="width: 100%; display: flex; flex-wrap: wrap; gap: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <span class="verification-item ${reg.profilePhotosData?.length > 0 ? 'clickable' : ''}" style="font-size: 12px; cursor: ${reg.profilePhotosData?.length > 0 ? 'pointer' : 'default'}; ${reg.hasProfilePhotos ? 'color: #10B981;' : 'color: var(--muted);'}" ${reg.profilePhotosData?.length > 0 ? `onclick="viewVerificationFiles('${reg.id}', 'photos')"` : ''}>${reg.hasProfilePhotos ? '✓' : '○'} Fotos ${reg.profilePhotosData?.length > 0 ? '👁️' : ''}</span>
        <span class="verification-item ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'pointer' : 'default'}; ${reg.hasVerificationSelfie ? 'color: #10B981;' : 'color: var(--muted);'}" ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? `onclick="viewVerificationFiles('${reg.id}', 'selfie')"` : ''}>${reg.hasVerificationSelfie ? '✓' : '○'} Selfie verificación ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? '👁️' : ''}</span>
        <span class="verification-item ${(reg.idDocumentUrl || reg.idDocumentData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.idDocumentUrl || reg.idDocumentData) ? 'pointer' : 'default'}; ${reg.hasIdDocument ? 'color: #10B981;' : 'color: var(--muted);'}" ${(reg.idDocumentUrl || reg.idDocumentData) ? `onclick="viewVerificationFiles('${reg.id}', 'document')"` : ''}>${reg.hasIdDocument ? '✓' : '○'} Documento ID ${(reg.idDocumentUrl || reg.idDocumentData) ? '👁️' : ''}</span>
        <span class="verification-item ${(reg.transferReceiptUrl || reg.transferReceiptData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.transferReceiptUrl || reg.transferReceiptData) ? 'pointer' : 'default'}; ${reg.hasTransferReceipt ? 'color: #10B981;' : 'color: var(--muted);'}" ${(reg.transferReceiptUrl || reg.transferReceiptData) ? `onclick="viewVerificationFiles('${reg.id}', 'receipt')"` : ''}>${reg.hasTransferReceipt ? '✓' : '○'} Comprobante pago ${(reg.transferReceiptUrl || reg.transferReceiptData) ? '👁️' : ''}</span>
        <span style="font-size: 12px; ${reg.ageConfirm ? 'color: #10B981;' : 'color: #DC2626;'}">${reg.ageConfirm ? '✓' : '✗'} Mayor de edad</span>
      </div>

      <!-- Actions -->
      <div class="admin-item-actions" style="width: 100%; justify-content: flex-end; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <button class="admin-item-btn" style="background: rgba(139,92,246,0.2); color: #8B5CF6;" onclick="confirmInterview('${reg.id}')">📞 Confirmar Entrevista</button>
        <button class="admin-item-btn admin-approve" onclick="approveRegistro('${reg.id}')">✓ Aprobar Cuenta</button>
        <button class="admin-item-btn admin-reject" onclick="rejectRegistro('${reg.id}')">✗ Rechazar</button>
      </div>
    </div>
  `;
  }).join('');
};

// ============================================
// VISUALIZADOR DE ARCHIVOS DE VERIFICACIÓN
// ============================================
window.viewVerificationFiles = (regId, type) => {
  // Convertir a string para comparación correcta
  const regIdStr = String(regId);
  const reg = registros.find(r => String(r.id) === regIdStr);
  if (!reg) {
    console.warn('Registro no encontrado para visualización:', regIdStr);
    return;
  }
  
  let content = '';
  let title = '';
  
  if (type === 'photos' && reg.profilePhotosData?.length > 0) {
    title = 'Fotos de Perfil';
    content = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        ${reg.profilePhotosData.map((photo, i) => {
          const imgSrc = photo.url || photo.base64;
          return `
          <div style="position: relative;">
            <img src="${imgSrc}" alt="Foto ${i+1}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer;" onclick="openFullImage('${imgSrc}')" />
            <span style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${i+1}/${reg.profilePhotosData.length}</span>
          </div>
        `}).join('')}
      </div>
    `;
  } else if (type === 'selfie' && (reg.verificationSelfieUrl || reg.verificationSelfieData)) {
    const selfieSrc = reg.verificationSelfieUrl || reg.verificationSelfieData;
    title = 'Selfie de Verificación';
    content = `
      <div style="text-align: center;">
        <img src="${selfieSrc}" alt="Selfie" style="max-width: 100%; max-height: 70vh; border-radius: 12px; cursor: pointer;" onclick="openFullImage('${selfieSrc}')" />
        <p style="color: var(--muted); font-size: 13px; margin-top: 12px;">📷 ${reg.verificationSelfieName || 'selfie.jpg'}</p>
      </div>
    `;
  } else if (type === 'document' && (reg.idDocumentUrl || reg.idDocumentData)) {
    const docSrc = reg.idDocumentUrl || reg.idDocumentData;
    title = 'Documento de Identidad';
    content = `
      <div style="text-align: center;">
        <img src="${docSrc}" alt="Documento ID" style="max-width: 100%; max-height: 70vh; border-radius: 12px; cursor: pointer;" onclick="openFullImage('${docSrc}')" />
        <p style="color: var(--muted); font-size: 13px; margin-top: 12px;">🪪 ${reg.idDocumentName || 'documento.jpg'}</p>
        <div style="background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.3); padding: 12px; border-radius: 8px; margin-top: 16px;">
          <p style="color: #DC2626; font-size: 12px; margin: 0;">⚠️ Documento confidencial - Solo para verificación interna</p>
        </div>
      </div>
    `;
  } else if (type === 'receipt' && (reg.transferReceiptUrl || reg.transferReceiptData)) {
    const receiptSrc = reg.transferReceiptUrl || reg.transferReceiptData;
    title = 'Comprobante de Pago';
    content = `
      <div style="text-align: center;">
        <img src="${receiptSrc}" alt="Comprobante de Pago" style="max-width: 100%; max-height: 70vh; border-radius: 12px; cursor: pointer;" onclick="openFullImage('${receiptSrc}')" />
        <p style="color: var(--muted); font-size: 13px; margin-top: 12px;">💳 ${reg.transferReceiptName || 'comprobante.jpg'}</p>
        <div style="background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); padding: 12px; border-radius: 8px; margin-top: 16px;">
          <p style="color: #10B981; font-size: 12px; margin: 0;">💰 Plan: ${reg.selectedPlan?.toUpperCase() || 'N/A'} - Precio: $${parseInt(reg.finalPrice || 0).toLocaleString('es-CL')}</p>
        </div>
      </div>
    `;
  }
  
  if (!content) return;
  
  // Crear modal
  const modal = document.createElement('div');
  modal.id = 'verification-modal';
  modal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.9); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 24px;';
  modal.innerHTML = `
    <div style="background: #1A1A1A; border: 1px solid rgba(212,175,55,0.3); border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
      <div style="position: sticky; top: 0; background: #1A1A1A; padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="color: var(--gold); margin: 0; font-size: 18px;">${title} - ${reg.displayName}</h3>
        <button onclick="closeVerificationModal()" style="background: none; border: none; color: white; font-size: 28px; cursor: pointer; padding: 0; line-height: 1;">&times;</button>
      </div>
      <div style="padding: 24px;">
        ${content}
      </div>
    </div>
  `;
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeVerificationModal();
  });
  
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';
};

window.openFullImage = (src) => {
  const fullModal = document.createElement('div');
  fullModal.id = 'full-image-modal';
  fullModal.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 10001; display: flex; align-items: center; justify-content: center; cursor: zoom-out;';
  fullModal.innerHTML = `<img src="${src}" style="max-width: 95vw; max-height: 95vh; object-fit: contain;" />`;
  fullModal.addEventListener('click', () => {
    fullModal.remove();
  });
  document.body.appendChild(fullModal);
};

window.closeVerificationModal = () => {
  const modal = document.getElementById('verification-modal');
  if (modal) {
    modal.remove();
    document.body.style.overflow = '';
  }
};

window.approveRegistro = async (id) => {
  const reg = registros.find(r => r.id === id);
  if (reg) {
    reg.status = 'aprobado';
    reg.approvedAt = new Date().toISOString();
    
    // Calcular fecha de vencimiento del plan (configurables de 7 a 30 días)
    // Obtener configuración de duración del plan desde el registro
    let planDuration = 30; // Por defecto 30 días
    
    // Si el registro tiene una duración específica seleccionada, usarla
    if (reg.planDuration && reg.planDuration >= 7 && reg.planDuration <= 30) {
      planDuration = parseInt(reg.planDuration);
    } else {
      // Duraciones por defecto por plan (máximo 30 días)
      const defaultDurations = {
        'luxury': 30,   // días
        'vip': 30,      // días  
        'premium': 30   // días
      };
      planDuration = Math.min(defaultDurations[reg.selectedPlan] || 30, 30);
    }
    
    const approvalDate = new Date();
    const expiryDate = new Date(approvalDate);
    expiryDate.setDate(approvalDate.getDate() + planDuration);
    
    // Agregar información del plan con fechas
    reg.planInfo = {
      planType: reg.selectedPlan || 'premium',
      startDate: reg.approvedAt,
      expiryDate: expiryDate.toISOString(),
      duration: planDuration,
      price: reg.finalPrice || 0,
      paymentReceiptData: reg.transferReceiptData || null
    };
    
    // Obtener configuraciones en PARALELO para mayor velocidad
    const [plansConfig, existingUsers, existingProfiles] = await Promise.all([
      DataService.getPlansConfig().then(r => r || {}),
      DataService.getApprovedUsers().then(r => r || []),
      DataService.getApprovedProfiles().then(r => r || [])
    ]);
    
    // Determinar restricciones según el plan (usando configuraciones del admin)
    const getConfigValue = (plan, key, defaultValue) => {
      return plansConfig[plan]?.[key] ?? defaultValue;
    };
    
    const planLimits = {
      'luxury': { 
        photos: getConfigValue('luxury', 'photos', 0),
        videos: getConfigValue('luxury', 'videos', 0),
        states: getConfigValue('luxury', 'estados', 0), 
        stateDuration: getConfigValue('luxury', 'estadosDuracion', 24),
        instantes: getConfigValue('luxury', 'instantes', 0),
        instantesDuration: getConfigValue('luxury', 'instantesDuracion', 48)
      },
      'vip': { 
        photos: getConfigValue('vip', 'photos', 10),
        videos: getConfigValue('vip', 'videos', 2),
        states: getConfigValue('vip', 'estados', 2), 
        stateDuration: getConfigValue('vip', 'estadosDuracion', 6),
        instantes: getConfigValue('vip', 'instantes', 3),
        instantesDuration: getConfigValue('vip', 'instantesDuracion', 12)
      },
      'premium': { 
        photos: getConfigValue('premium', 'photos', 15),
        videos: getConfigValue('premium', 'videos', 4),
        states: getConfigValue('premium', 'estados', 5), 
        stateDuration: getConfigValue('premium', 'estadosDuracion', 12),
        instantes: getConfigValue('premium', 'instantes', 5),
        instantesDuration: getConfigValue('premium', 'instantesDuracion', 24)
      }
    };
    
    reg.planLimits = planLimits[reg.selectedPlan] || planLimits['premium'];
    
    // Determinar el carrusel según el plan elegido
    const planToCarousel = {
      'luxury': 'luxury',      // Luxury & Exclusive carousel
      'vip': 'vip-black',      // VIP Black carousel
      'premium': 'premium-select' // Premium Select carousel
    };
    reg.carouselType = planToCarousel[reg.selectedPlan] || 'premium-select';
    
    // Determinar profileTypes según el plan (1 badge por carrusel)
    const planToProfileTypes = {
      'luxury': ['luxury-exclusive'],
      'vip': ['vip'],
      'premium': ['premium']
    };
    reg.profileTypes = planToProfileTypes[reg.selectedPlan] || ['premium'];
    
    // Agregar stats iniciales
    reg.stats = {
      likes: 0,
      views: 0,
      recommendations: 0,
      experiences: 0,
      rating: 5.0
    };
    
    // ============================================
    // CREAR currentUser para que la usuaria pueda acceder a su panel
    // ============================================
    
    // Calcular fecha de vencimiento del plan (usar planDuration ya calculada arriba)
    const planExpiryDate = new Date();
    planExpiryDate.setDate(planExpiryDate.getDate() + planDuration);
    
    const approvedUser = {
      id: reg.id,
      displayName: reg.displayName,
      username: reg.username,
      email: reg.email,
      password: reg.password, // IMPORTANTE: incluir la contraseña para el login
      whatsapp: reg.whatsapp,
      city: reg.city,
      commune: reg.commune,
      bio: reg.bio,
      age: reg.age,
      birthdate: reg.birthdate, // Fecha de nacimiento
      nationality: reg.nationality, // Nacionalidad
      height: reg.height, // Altura
      avatar: null,
      selectedPlan: reg.selectedPlan || 'premium',
      planInfo: reg.planInfo, // Información completa del plan
      planLimits: reg.planLimits, // Límites según el plan
      planExpiry: planExpiryDate.toISOString(), // Fecha de vencimiento del plan
      priceHour: reg.priceHour,
      priceTwoHours: reg.priceTwoHours,
      priceOvernight: reg.priceOvernight,
      // Servicios y disponibilidad
      services: reg.services || [],
      incall: reg.incall || false,
      outcall: reg.outcall || false,
      travel: reg.travel || false,
      availability: reg.availability || '',
      registrationDate: reg.date,
      approvedAt: reg.approvedAt,
      status: 'aprobado',
      profileVisible: true, // Nace visible
      isActive: true, // Nace activo
      profilePhotosData: reg.profilePhotosData || [], // Fotos del perfil
      paymentHistory: [{ // Historial de pago real
        date: reg.approvedAt,
        amount: reg.finalPrice || 0,
        plan: reg.selectedPlan,
        duration: reg.planInfo.duration,
        receiptData: reg.transferReceiptData || null
      }]
    };
    

    // Usar datos ya precargados en paralelo (existingUsers y existingProfiles)
    const approvedUsers = existingUsers;
    const approvedProfiles = existingProfiles;
    
    // Crear objeto de perfil para el carrusel
    // IMPORTANTE: Solo guardar datos que realmente existen, no inventar valores por defecto
    const hasPhysicalData = reg.age || reg.height || reg.weight || (reg.bustSize && reg.waistSize && reg.hipSize);
    const hasAttributeData = reg.hairColor || reg.eyeColor || reg.bodyType;
    const hasPriceData = reg.priceHour || reg.priceTwoHours || reg.priceOvernight;
    
    const carouselProfile = {
      id: `profile-${reg.id}`,
      username: reg.username || `user.${reg.id}`,
      displayName: reg.displayName,
      title: reg.displayName,
      verified: true,
      profileTypes: reg.profileTypes,
      carouselType: reg.carouselType,
      selectedPlan: reg.selectedPlan,
      // Datos básicos para mostrar en tarjetas
      age: reg.age ? parseInt(reg.age) : null,
      birthdate: reg.birthdate || null, // Fecha de nacimiento para perfil-clienta
      height: reg.height ? parseInt(reg.height) : null,
      nationality: reg.nationality || null,
      tagline: reg.tagline || '✨ Experiencia VIP exclusiva',
      // Solo incluir physicalInfo si hay datos reales
      physicalInfo: hasPhysicalData ? {
        ethnicity: reg.nationality || null,
        skinTone: reg.skinTone || null,
        age: reg.age ? parseInt(reg.age) : null,
        height: reg.height ? parseInt(reg.height) : null,
        weight: reg.weight ? parseInt(reg.weight) : null,
        measurements: reg.bustSize && reg.waistSize && reg.hipSize ? {
          bust: parseInt(reg.bustSize),
          waist: parseInt(reg.waistSize),
          hips: parseInt(reg.hipSize)
        } : null
      } : null,
      // Solo incluir attributes si hay datos reales
      attributes: hasAttributeData ? {
        hairColor: reg.hairColor || null,
        eyeColor: reg.eyeColor || null,
        bodyType: reg.bodyType || null
      } : null,
      services: reg.services && reg.services.length > 0 ? reg.services : [],
      incall: reg.incall || false,
      outcall: reg.outcall || false,
      travel: reg.travel || false,
      photos: reg.profilePhotosData ? reg.profilePhotosData.length : 0,
      profilePhotosData: reg.profilePhotosData || [],
      videos: 0,
      // Solo incluir precios si fueron configurados (solo CLP)
      price: hasPriceData && reg.priceHour ? { 
        CLP: parseInt(reg.priceHour)
      } : null,
      prices: hasPriceData ? {
        hour: reg.priceHour ? { CLP: parseInt(reg.priceHour) } : null,
        twoHours: reg.priceTwoHours ? { CLP: parseInt(reg.priceTwoHours) } : null,
        overnight: reg.priceOvernight ? { CLP: parseInt(reg.priceOvernight) } : null
      } : null,
      availability: reg.schedule || null,
      languages: reg.languages && reg.languages.length > 0 ? reg.languages : null,
      commune: reg.commune || null,
      city: reg.city || null,
      whatsapp: reg.whatsapp || '',
      bio: reg.bio || '',
      stats: {
        likes: 0,
        views: 0,
        recommendations: 0,
        experiences: 0,
        rating: 5.0
      },
      status: 'aprobado',
      approvedAt: reg.approvedAt,
      originalRegistro: reg,
      // Campos adicionales para compatibilidad con el modal
      avatar: reg.profilePhotosData && reg.profilePhotosData.length > 0 ?
        (reg.profilePhotosData[0].url || reg.profilePhotosData[0].base64) : null,
      profileVisible: true, // Nace ACTIVADO - aparece en carruseles inmediatamente
      isActive: true, // Nace ACTIVADO - visible en carruseles desde el momento de aprobación
      createdAt: Date.now()
    };
    
    // Ejecutar todas las escrituras finales en PARALELO para mayor velocidad
    const savePromises = [];

    // Guardar usuario aprobado
    const existingUserIndex = approvedUsers.findIndex(u => u.id === approvedUser.id);
    if (existingUserIndex !== -1) {
      savePromises.push(DataService.updateUser(approvedUser.id, approvedUser));
    } else {
      savePromises.push(DataService.addApprovedUser(approvedUser));
    }

    // Guardar perfil para carruseles
    const existingIndex = approvedProfiles.findIndex(p => p.id === carouselProfile.id);
    if (existingIndex !== -1) {
      savePromises.push(DataService.updateProfile(carouselProfile.id, carouselProfile));
    } else {
      savePromises.push(DataService.addApprovedProfile(carouselProfile));
    }

    // Guardar registro actualizado
    savePromises.push(DataService.updateRegistro(reg.id, reg));

    // Ejecutar todo en paralelo
    await Promise.all(savePromises);

    renderRegistros();
    renderRegistrosAprobados();
    updateRegistrosBadge();
    updateAprobadosBadge();
    alert(`✓ Cuenta de "${reg.displayName}" aprobada exitosamente.\n\n📍 Perfil ACTIVADO y visible en carruseles.\n✨ La creadora puede gestionar su perfil desde su panel.\n📂 El registro queda archivado por seguridad.`);
  }
};

window.rejectRegistro = async (id) => {
  const reason = prompt('Motivo del rechazo (se enviará al usuario):');
  if (reason === null) return; // Cancelled
  
  const reg = registros.find(r => r.id === id);
  if (reg) {
    reg.status = 'rechazado';
    reg.rejectedAt = new Date().toISOString();
    reg.rejectionReason = reason;
    
    // Mantener el registro en AWS pendingRegistros (no eliminar por temas legales)
    // El registro queda archivado con status 'rechazado'
    await DataService.updateRegistro(reg.id, reg);
    
    renderRegistros();
    renderRegistrosRechazados();
    updateRegistrosBadge();
    updateRechazadosBadge();
    alert(`Cuenta de "${reg.displayName}" rechazada.\n📂 El registro queda archivado por seguridad y temas legales.${reg.payAfterInterview ? '' : '\nSe procederá a la devolución del pago.'}`);
  }
};

window.confirmInterview = async (id) => {
  console.log('🔄 Iniciando confirmInterview para ID:', id);
  
  const reg = registros.find(r => r.id === id);
  if (!reg) {
    console.error('❌ No se encontró registro con ID:', id);
    alert('❌ Error: No se encontró el registro');
    return;
  }
  
  console.log('✅ Registro encontrado:', reg.displayName);
  
  reg.interviewStatus = 'confirmada';
  await DataService.updateRegistro(reg.id, reg);
  renderRegistros();
  
  console.log('📱 Preparando mensaje de WhatsApp...');
  
  // Formatear fecha para el mensaje
  const fechaEntrevista = reg.interviewDate || 'próximamente';
  const horaEntrevista = reg.interviewTime || 'a confirmar';
  
  // Crear mensaje precargado para WhatsApp
  const mensaje = `¡Hola ${reg.displayName}! 👋

` +
    `Somos el equipo de *Sala Negra* ✨

` +
    `Te confirmamos tu entrevista para el día *${fechaEntrevista}* a las *${horaEntrevista}*.

` +
    `📍 La entrevista será por videollamada.
` +
    `⏰ Por favor, conéctate 5 minutos antes.
` +
    `📱 Ten a mano tu documento de identidad.

` +
    `Si necesitas reagendar, por favor avísanos con anticipación.

` +
    `¡Te esperamos! 💎`;
    
  // Limpiar número de WhatsApp (quitar espacios, guiones, etc.)
  let phoneNumber = (reg.whatsapp || '').replace(/[\s\-\(\)\.]/g, '');
  console.log('📞 Número original:', reg.whatsapp);
  console.log('📞 Número limpio:', phoneNumber);
  
  // Si empieza con +, quitarlo para la URL
  if (phoneNumber.startsWith('+')) {
    phoneNumber = phoneNumber.substring(1);
  }
  // Si no tiene código de país y empieza con 9, asumir Chile (+56)
  if (phoneNumber.startsWith('9') && phoneNumber.length === 9) {
    phoneNumber = '56' + phoneNumber;
  }
  
  console.log('📞 Número final para WhatsApp:', phoneNumber);
  
  // Abrir WhatsApp Web con el mensaje precargado
  const whatsappUrl = `https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(mensaje)}`;
  console.log('🌐 URL de WhatsApp:', whatsappUrl);
  
  // Intentar abrir WhatsApp Web
  try {
    window.open(whatsappUrl, '_blank');
    console.log('✅ WhatsApp Web abierto correctamente');
  } catch (error) {
    console.error('❌ Error abriendo WhatsApp Web:', error);
    alert('❌ Error: No se pudo abrir WhatsApp. Por favor, revisa el bloqueador de pop-ups.');
    return;
  }
  
  alert(`📅 Entrevista confirmada para "${reg.displayName}"\n\n` +
    `📆 Fecha: ${fechaEntrevista}\n` +
    `🕐 Hora: ${horaEntrevista}\n\n` +
    `Se abrió WhatsApp Web para enviar el mensaje de confirmación.`);
};

// Add fadeOut animation
if (!document.querySelector('style[data-admin]')) {
  const style = document.createElement('style');
  style.setAttribute('data-admin', '');
  style.textContent = `
    @keyframes fadeOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-20px); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);
}

// Crear/Editar Perfiles de Escort
let publicacionesCreadas = [];
let publicacionesAprobadas = [];
let editingPublicacionId = null;

// Cargar publicaciones desde AWS
async function loadPublicacionesFromAPI() {
  try {
    publicacionesCreadas = await DataService.getPublicaciones() || [];
    publicacionesAprobadas = publicacionesCreadas.filter(p => p.status === 'aprobada');
  } catch (error) {
    console.error('Error cargando publicaciones:', error);
    publicacionesCreadas = [];
    publicacionesAprobadas = [];
  }
}

const publicacionForm = document.getElementById('publicacion-form');
const formResetBtn = document.getElementById('form-reset-btn');
const formMessage = document.getElementById('form-message');

// Solo inicializar si el formulario existe
if (publicacionForm) {
const resetPublicacionForm = () => {
  publicacionForm.reset();
  editingPublicacionId = null;
  document.getElementById('form-submit-btn').textContent = 'Enviar para Aprobación';
  formMessage.style.display = 'none';
  
  // Habilitar todos los campos
  const formInputs = publicacionForm.querySelectorAll('input, select, textarea');
  formInputs.forEach(input => input.disabled = false);
};

const showFormMessage = (text, type = 'success') => {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
  formMessage.style.display = 'block';
  setTimeout(() => {
    formMessage.style.display = 'none';
  }, 3000);
};

const generatePublicacionId = () => {
  return 'escort-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

// Función para recopilar datos del formulario
const collectFormData = () => {
  // Información Básica
  const displayName = document.getElementById('pub-displayName').value.trim();
  const username = document.getElementById('pub-username').value.trim();
  const bio = document.getElementById('pub-bio').value.trim();
  const whatsapp = document.getElementById('pub-whatsapp').value.trim();
  const verified = document.getElementById('pub-verified').value === 'true';
  
  // Recopilar tipos de perfil seleccionados (múltiples checkboxes)
  const profileTypeCheckboxes = document.querySelectorAll('input[name="profileTypes"]:checked');
  const profileTypes = Array.from(profileTypeCheckboxes).map(cb => cb.value);
  
  // Agregar automáticamente "nuevo" si es una publicación nueva
  if (!editingPublicacionId) {
    profileTypes.push('nuevo');
  }

  // Carrusel principal
  const carouselType = document.getElementById('pub-carousel').value.trim();

  // Información Física
  const ethnicity = document.getElementById('pub-ethnicity').value.trim();
  const skinTone = document.getElementById('pub-skinTone').value.trim();
  const age = parseInt(document.getElementById('pub-age').value);
  const height = parseInt(document.getElementById('pub-height').value);
  const weight = parseInt(document.getElementById('pub-weight').value);
  const bust = parseInt(document.getElementById('pub-bust').value);
  const waist = parseInt(document.getElementById('pub-waist').value);
  const hips = parseInt(document.getElementById('pub-hips').value);

  // Mis Atributos
  const smoker = document.getElementById('pub-smoker').value === 'true';
  const tattoos = document.getElementById('pub-tattoos').value === 'true';
  const piercings = document.getElementById('pub-piercings').value === 'true';
  const hairColor = document.getElementById('pub-hairColor').value.trim();
  const hairLength = document.getElementById('pub-hairLength').value.trim();
  const eyeColor = document.getElementById('pub-eyeColor').value.trim();
  const buttSize = document.getElementById('pub-buttSize').value.trim();
  const breastSize = document.getElementById('pub-breastSize').value.trim();
  const breastType = document.getElementById('pub-breastType').value.trim();
  const bodyType = document.getElementById('pub-bodyType').value.trim();
  const pubicHair = document.getElementById('pub-pubicHair').value.trim();

  // Servicios Ofrecidos (checkboxes)
  const serviceCheckboxes = document.querySelectorAll('input[name="services"]:checked');
  const services = Array.from(serviceCheckboxes).map(cb => cb.value);

  // Tarifas (solo CLP)
  const price1hrCLP = parseInt(document.getElementById('pub-price-1hr-clp').value);
  const price2hrsCLP = parseInt(document.getElementById('pub-price-2hrs-clp').value);
  const priceOvernightCLP = parseInt(document.getElementById('pub-price-overnight-clp').value);

  // Disponibilidad
  const incall = document.getElementById('pub-incall').value === 'true';
  const outcall = document.getElementById('pub-outcall').value === 'true';
  const travel = document.getElementById('pub-travel').value === 'true';
  const availability = document.getElementById('pub-availability').value.trim();
  const commune = document.getElementById('pub-commune').value.trim();
  const city = document.getElementById('pub-city').value.trim();

  // Idiomas (checkboxes)
  const languageCheckboxes = document.querySelectorAll('input[name="languages"]:checked');
  const languages = Array.from(languageCheckboxes).map(cb => cb.value);

  // Multimedia
  const photos = parseInt(document.getElementById('pub-photos').value);
  const videos = parseInt(document.getElementById('pub-videos').value);

  // Status (hidden field)
  const status = document.getElementById('pub-status').value;

  return {
    displayName,
    username,
    bio,
    whatsapp,
    verified,
    profileTypes,
    carouselType,
    physicalInfo: {
      ethnicity,
      skinTone,
      age,
      height,
      weight,
      measurements: { bust, waist, hips }
    },
    attributes: {
      smoker,
      tattoos,
      piercings,
      hairColor,
      hairLength,
      eyeColor,
      buttSize,
      breastSize,
      breastType,
      bodyType,
      pubicHair
    },
    services,
    prices: {
      hour: { CLP: price1hrCLP },
      twoHours: { CLP: price2hrsCLP },
      overnight: { CLP: priceOvernightCLP }
    },
    availabilityDetails: {
      incall,
      outcall,
      travel
    },
    availability,
    commune,
    city,
    languages,
    photos,
    videos,
    status
  };
};

// Validación del formulario
const validateFormData = (data) => {
  const errors = [];

  if (!data.displayName) errors.push('El nombre de visualización es requerido');
  if (!data.username) errors.push('El nombre de usuario es requerido');
  if (!data.bio) errors.push('La biografía es requerida');
  if (!data.carouselType) errors.push('Debes seleccionar un carrusel');
  if (!data.physicalInfo.age || data.physicalInfo.age < 18) errors.push('La edad debe ser mayor de 18 años');
  if (!data.physicalInfo.height) errors.push('La altura es requerida');
  if (!data.physicalInfo.weight) errors.push('El peso es requerido');
  if (!data.physicalInfo.measurements.bust) errors.push('La medida de busto es requerida');
  if (!data.physicalInfo.measurements.waist) errors.push('La medida de cintura es requerida');
  if (!data.physicalInfo.measurements.hips) errors.push('La medida de cadera es requerida');
  if (data.services.length === 0) errors.push('Debes seleccionar al menos un servicio');
  if (!data.prices.hour.CLP) errors.push('La tarifa por hora es requerida');
  if (!data.commune) errors.push('La comuna es requerida');
  if (!data.city) errors.push('La ciudad es requerida');

  return errors;
};

publicacionForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Verificar si el perfil está aprobado (no permitir edición)
  if (editingPublicacionId) {
    const existingProfile = publicacionesCreadas.find(p => p.id === editingPublicacionId);
    if (existingProfile && existingProfile.status === 'aprobado') {
      showFormMessage('No puedes editar un perfil ya aprobado', 'error');
      return;
    }
  }

  const formData = collectFormData();
  const errors = validateFormData(formData);

  if (errors.length > 0) {
    showFormMessage(errors.join('. '), 'error');
    return;
  }

  if (editingPublicacionId) {
    // Editar existente (solo si está pendiente o rechazado)
    const index = publicacionesCreadas.findIndex(p => p.id === editingPublicacionId);
    if (index !== -1) {
      publicacionesCreadas[index] = {
        ...publicacionesCreadas[index],
        ...formData,
        updatedAt: Date.now()
      };
      showFormMessage('Perfil actualizado y enviado para aprobación', 'success');
    }
  } else {
    // Crear nuevo
    const newProfile = {
      id: generatePublicacionId(),
      ...formData,
      stats: {
        likes: 0,
        views: 0,
        recommendations: 0,
        experiences: 0
      },
      approved: false,
      createdAt: Date.now()
    };
    publicacionesCreadas.push(newProfile);
    showFormMessage('Perfil creado y enviado para aprobación', 'success');
  }

  // Guardar en AWS
  await DataService.savePublicaciones(publicacionesCreadas);
  resetPublicacionForm();
  renderPublicacionesCreadas();
});

formResetBtn.addEventListener('click', resetPublicacionForm);

const renderPublicacionesCreadas = () => {
  const list = document.getElementById('publicaciones-creadas-list');
  const empty = document.getElementById('publicaciones-creadas-empty');

  if (publicacionesCreadas.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  list.innerHTML = publicacionesCreadas.map(pub => {
    const statusBadge = pub.status === 'aprobado' 
      ? '<span style="background: #10b981; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">✓ Aprobado</span>'
      : pub.status === 'rechazado'
      ? '<span style="background: #ef4444; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">✗ Rechazado</span>'
      : '<span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">⏳ Pendiente</span>';
    
    const priceDisplay = pub.prices 
      ? `1hr: $${pub.prices.hour.CLP.toLocaleString('es-CL')} | 2hrs: $${pub.prices.twoHours.CLP.toLocaleString('es-CL')}`
      : 'Sin precio';
    
    const servicesDisplay = pub.services && pub.services.length > 0
      ? pub.services.slice(0, 3).join(', ') + (pub.services.length > 3 ? '...' : '')
      : 'Sin servicios';
    
    const canEdit = pub.status !== 'aprobado';
    
    return `
      <div class="admin-item publicacion-item" data-pub-id="${pub.id}">
        <div class="publicacion-item-info">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div class="publicacion-item-title">${pub.displayName || pub.username}</div>
            ${statusBadge}
          </div>
          <div class="publicacion-item-details">
            <div class="publicacion-item-detail"><strong>Usuario:</strong> @${pub.username}</div>
            <div class="publicacion-item-detail"><strong>Edad:</strong> ${pub.physicalInfo?.age || 'N/A'} años | <strong>Altura:</strong> ${pub.physicalInfo?.height || 'N/A'}cm</div>
            <div class="publicacion-item-detail"><strong>Medidas:</strong> ${pub.physicalInfo?.measurements?.bust}-${pub.physicalInfo?.measurements?.waist}-${pub.physicalInfo?.measurements?.hips} cm</div>
            <div class="publicacion-item-detail"><strong>Ubicación:</strong> ${pub.commune}, ${pub.city}</div>
            <div class="publicacion-item-detail"><strong>Servicios:</strong> ${servicesDisplay}</div>
            <div class="publicacion-item-detail"><strong>Tarifas:</strong> ${priceDisplay}</div>
            ${pub.whatsapp ? `<div class="publicacion-item-detail"><strong>WhatsApp:</strong> ${pub.whatsapp}</div>` : ''}
            <div class="publicacion-item-detail"><strong>Fotos:</strong> ${pub.photos} | <strong>Videos:</strong> ${pub.videos}</div>
            <div class="publicacion-item-detail"><strong>Me Gusta:</strong> ${pub.stats?.likes || 0} | <strong>Vistas:</strong> ${pub.stats?.views || 0} | <strong>Experiencias:</strong> ${pub.stats?.experiences || 0}</div>
          </div>
        </div>
        <div class="publicacion-item-actions">
          ${canEdit ? `<button class="admin-edit-btn" onclick="editPublicacion('${pub.id}')">Editar</button>` : '<span style="color: #6b7280; font-size: 12px;">🔒 Aprobado</span>'}
          ${canEdit ? `<button class="admin-delete-pub-btn" onclick="deletePublicacion('${pub.id}')">Eliminar</button>` : ''}
        </div>
      </div>
    `;
  }).join('');
};

window.editPublicacion = (id) => {
  const pub = publicacionesCreadas.find(p => p.id === id);
  if (!pub) return;

  // Si está aprobado, bloquear edición
  if (pub.status === 'aprobado') {
    alert('Este perfil ya está aprobado y no puede ser editado.');
    return;
  }

  editingPublicacionId = id;
  
  // Información Básica
  document.getElementById('pub-displayName').value = pub.displayName || '';
  document.getElementById('pub-username').value = pub.username || '';
  document.getElementById('pub-bio').value = pub.bio || '';
  document.getElementById('pub-whatsapp').value = pub.whatsapp || '';
  document.getElementById('pub-verified').value = pub.verified ? 'true' : 'false';
  
  // Tipos de perfil (múltiples checkboxes)
  const profileTypes = pub.profileTypes || [pub.profileType] || ['vip'];
  document.querySelectorAll('input[name="profileTypes"]').forEach(checkbox => {
    checkbox.checked = profileTypes.includes(checkbox.value);
  });

  // Información Física
  document.getElementById('pub-ethnicity').value = pub.physicalInfo?.ethnicity || '';
  document.getElementById('pub-skinTone').value = pub.physicalInfo?.skinTone || '';
  document.getElementById('pub-age').value = pub.physicalInfo?.age || '';
  document.getElementById('pub-height').value = pub.physicalInfo?.height || '';
  document.getElementById('pub-weight').value = pub.physicalInfo?.weight || '';
  document.getElementById('pub-bust').value = pub.physicalInfo?.measurements?.bust || '';
  document.getElementById('pub-waist').value = pub.physicalInfo?.measurements?.waist || '';
  document.getElementById('pub-hips').value = pub.physicalInfo?.measurements?.hips || '';

  // Mis Atributos
  document.getElementById('pub-smoker').value = pub.attributes?.smoker ? 'true' : 'false';
  document.getElementById('pub-tattoos').value = pub.attributes?.tattoos ? 'true' : 'false';
  document.getElementById('pub-piercings').value = pub.attributes?.piercings ? 'true' : 'false';
  document.getElementById('pub-hairColor').value = pub.attributes?.hairColor || '';
  document.getElementById('pub-hairLength').value = pub.attributes?.hairLength || '';
  document.getElementById('pub-eyeColor').value = pub.attributes?.eyeColor || '';
  document.getElementById('pub-buttSize').value = pub.attributes?.buttSize || '';
  document.getElementById('pub-breastSize').value = pub.attributes?.breastSize || '';
  document.getElementById('pub-breastType').value = pub.attributes?.breastType || '';
  document.getElementById('pub-bodyType').value = pub.attributes?.bodyType || '';
  document.getElementById('pub-pubicHair').value = pub.attributes?.pubicHair || '';

  // Servicios (checkboxes)
  document.querySelectorAll('input[name="services"]').forEach(checkbox => {
    checkbox.checked = pub.services?.includes(checkbox.value) || false;
  });

  // Tarifas (solo CLP)
  document.getElementById('pub-price-1hr-clp').value = pub.prices?.hour?.CLP || '';
  document.getElementById('pub-price-2hrs-clp').value = pub.prices?.twoHours?.CLP || '';
  document.getElementById('pub-price-overnight-clp').value = pub.prices?.overnight?.CLP || '';

  // Disponibilidad
  document.getElementById('pub-incall').value = pub.availabilityDetails?.incall ? 'true' : 'false';
  document.getElementById('pub-outcall').value = pub.availabilityDetails?.outcall ? 'true' : 'false';
  document.getElementById('pub-travel').value = pub.availabilityDetails?.travel ? 'true' : 'false';
  document.getElementById('pub-availability').value = pub.availability || '';
  document.getElementById('pub-commune').value = pub.commune || '';
  document.getElementById('pub-city').value = pub.city || '';

  // Idiomas (checkboxes)
  document.querySelectorAll('input[name="languages"]').forEach(checkbox => {
    checkbox.checked = pub.languages?.includes(checkbox.value) || false;
  });

  // Multimedia
  document.getElementById('pub-photos').value = pub.photos || 0;
  document.getElementById('pub-videos').value = pub.videos || 0;

  // Hidden fields
  document.getElementById('pub-id').value = pub.id;
  document.getElementById('pub-status').value = pub.status || 'pendiente';

  document.getElementById('form-submit-btn').textContent = 'Guardar Cambios';

  // Scroll al formulario
  document.getElementById('publicacion-form').scrollIntoView({ behavior: 'smooth' });
};

window.deletePublicacion = async (id) => {
  if (confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
    publicacionesCreadas = publicacionesCreadas.filter(p => p.id !== id);
    await DataService.savePublicaciones(publicacionesCreadas);
    renderPublicacionesCreadas();
    showFormMessage('Publicación eliminada', 'success');
  }
};

// Inicializar vista de publicaciones creadas
renderPublicacionesCreadas();
} // Fin del if (publicacionForm)

// ============================================
// Tab: Mensajes de Contacto
// ============================================
const mensajesTab = document.getElementById('mensajes-tab');
const mensajesList = document.getElementById('mensajes-list');
const mensajesEmpty = document.getElementById('mensajes-empty');
const mensajesBadge = document.getElementById('mensajes-badge');

async function updateMensajesBadge() {
  const mensajes = await DataService.getContactMessages() || [];
  const noLeidos = mensajes.filter(m => !m.leido).length;
  
  if (mensajesBadge) {
    if (noLeidos > 0) {
      mensajesBadge.textContent = noLeidos > 9 ? '9+' : noLeidos;
      mensajesBadge.style.display = 'flex';
    } else {
      mensajesBadge.style.display = 'none';
    }
  }
}

// ============================================
// Tab: Renovaciones de Plan
// ============================================
const renovacionesList = document.getElementById('renovaciones-list');
const renovacionesEmpty = document.getElementById('renovaciones-empty');
const renovacionesBadge = document.getElementById('renovaciones-badge');
let currentPlanRequestFilter = 'all';

async function updateRenovacionesBadge() {
  const requests = await DataService.getPlanRequests() || [];
  const pendientes = requests.filter(r => r.status === 'pending' && (r.type === 'renewal' || r.type === 'upgrade')).length;
  
  if (renovacionesBadge) {
    if (pendientes > 0) {
      renovacionesBadge.textContent = pendientes > 9 ? '9+' : pendientes;
      renovacionesBadge.style.display = 'flex';
    } else {
      renovacionesBadge.style.display = 'none';
    }
  }
  
  // Actualizar contadores de filtros
  updateFilterCounts();
}

async function updateFilterCounts() {
  const requests = await DataService.getPlanRequests() || [];
  const pending = requests.filter(r => r.status === 'pending');
  
  const allCount = pending.filter(r => r.type === 'renewal' || r.type === 'upgrade').length;
  const renewalCount = pending.filter(r => r.type === 'renewal').length;
  const upgradeCount = pending.filter(r => r.type === 'upgrade').length;
  
  const filterAll = document.getElementById('filter-count-all');
  const filterRenewal = document.getElementById('filter-count-renewal');
  const filterUpgrade = document.getElementById('filter-count-upgrade');
  
  if (filterAll) filterAll.textContent = allCount;
  if (filterRenewal) filterRenewal.textContent = renewalCount;
  if (filterUpgrade) filterUpgrade.textContent = upgradeCount;
}

// Filtrar solicitudes de plan
window.filterPlanRequests = function(filter) {
  currentPlanRequestFilter = filter;
  
  // Actualizar botones activos
  document.querySelectorAll('.admin-filter-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.filter === filter) {
      btn.classList.add('active');
    }
  });
  
  renderRenovaciones();
};

async function renderRenovaciones() {
  if (!renovacionesList || !renovacionesEmpty) return;
  
  const requests = await DataService.getPlanRequests() || [];
  let solicitudes = requests.filter(r => (r.type === 'renewal' || r.type === 'upgrade') && r.status === 'pending');
  
  // Aplicar filtro
  if (currentPlanRequestFilter === 'renewal') {
    solicitudes = solicitudes.filter(r => r.type === 'renewal');
  } else if (currentPlanRequestFilter === 'upgrade') {
    solicitudes = solicitudes.filter(r => r.type === 'upgrade');
  }
  
  if (solicitudes.length === 0) {
    renovacionesList.innerHTML = '';
    renovacionesList.style.display = 'none';
    renovacionesEmpty.style.display = 'block';
    return;
  }
  
  renovacionesEmpty.style.display = 'none';
  renovacionesList.style.display = 'grid';
  
  const planNames = {
    'premium': 'Premium Select',
    'vip': 'VIP Black',
    'luxury': 'Luxury & Exclusive',
    'luxury-exclusive': 'Luxury & Exclusive'
  };
  
  renovacionesList.innerHTML = solicitudes.map(req => {
    const requestDate = new Date(req.requestDate);
    // Manejar currentExpiry que puede ser undefined o null (usuarios aprobados antes de agregar planExpiry)
    const currentExpiry = req.currentExpiry ? new Date(req.currentExpiry) : null;
    const currentExpiryText = currentExpiry && !isNaN(currentExpiry.getTime()) 
      ? currentExpiry.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'No definido';
    const newExpiry = new Date(req.newExpiry);
    const isUpgrade = req.type === 'upgrade';
    const borderColor = isUpgrade ? '#8B5CF6' : '#F59E0B';
    const typeIcon = isUpgrade ? '⬆️' : '🔄';
    const typeLabel = isUpgrade ? 'Mejora de Plan' : 'Renovación';
    
    return `
      <div class="admin-item" style="flex-direction: column; gap: 16px; border-left: 4px solid ${borderColor};">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start;">
          <div>
            <div class="admin-item-name" style="font-size: 16px;">${typeIcon} ${req.displayName || req.username}</div>
            <div style="color: var(--gold); font-size: 13px;">@${req.username}</div>
            <div class="admin-item-email">${req.email || ''}</div>
          </div>
          <div style="text-align: right;">
            <span style="background: ${isUpgrade ? 'rgba(139,92,246,0.2)' : 'rgba(245,158,11,0.2)'}; color: ${isUpgrade ? '#8B5CF6' : '#F59E0B'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">⏳ ${typeLabel}</span>
            <div style="color: var(--muted); font-size: 11px; margin-top: 4px;">Solicitado: ${requestDate.toLocaleDateString('es-CL')}</div>
          </div>
        </div>
        
        <!-- Detalles de la solicitud -->
        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Plan Actual</div>
              <div style="color: var(--text); font-weight: 600;">${planNames[req.currentPlan] || req.currentPlan}</div>
            </div>
            ${isUpgrade ? `
              <div>
                <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Nuevo Plan</div>
                <div style="color: #8B5CF6; font-weight: 600;">⬆️ ${planNames[req.newPlan] || req.newPlan}</div>
              </div>
            ` : `
              <div>
                <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Duración Solicitada</div>
                <div style="color: var(--gold); font-weight: 600;">+${req.duration} días</div>
              </div>
            `}
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
            <div>
              <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Vencimiento Actual</div>
              <div style="color: #EF4444; font-weight: 600;">${currentExpiryText}</div>
            </div>
            <div>
              <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Nuevo Vencimiento</div>
              <div style="color: #10B981; font-weight: 600;">${newExpiry.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          ${isUpgrade ? `
            <div style="display: grid; grid-template-columns: 1fr; gap: 12px; margin-bottom: 12px;">
              <div>
                <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Duración del nuevo plan</div>
                <div style="color: var(--gold); font-weight: 600;">+${req.duration} días</div>
              </div>
            </div>
          ` : ''}
          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
            <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Monto Pagado</div>
            <div style="color: var(--gold); font-size: 20px; font-weight: 700;">$${(req.price || 0).toLocaleString('es-CL')} CLP</div>
          </div>
        </div>
        
        <!-- Comprobante -->
        <div style="width: 100%;">
          <div style="color: var(--muted); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📎 Comprobante de Pago</div>
          ${req.receiptData ? `
            <div style="display: flex; gap: 12px; align-items: center;">
              <img src="${req.receiptData}" alt="Comprobante" style="max-width: 150px; max-height: 100px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255,255,255,0.1);" onclick="window.open('${req.receiptData}', '_blank')"/>
              <span style="color: var(--muted); font-size: 12px;">${req.receiptName || 'comprobante.jpg'}</span>
            </div>
          ` : '<span style="color: var(--muted); font-size: 12px;">Sin comprobante</span>'}
        </div>
        
        <!-- Botones de acción -->
        <div style="width: 100%; display: flex; gap: 12px; justify-content: flex-end; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px;">
          <button class="admin-btn admin-btn-danger" onclick="rejectPlanRequest('${req.id || req.requestDate}')" style="padding: 10px 20px;">
            ❌ Rechazar
          </button>
          <button class="admin-btn" onclick="approvePlanRequest('${req.id || req.requestDate}')" style="padding: 10px 24px; background: linear-gradient(135deg, #10B981, #059669);">
            ✓ Aprobar ${typeLabel}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Aprobar solicitud de plan (renovación o upgrade)
window.approvePlanRequest = async function(requestId) {
  const requests = await DataService.getPlanRequests() || [];
  const requestIndex = requests.findIndex(r => (r.id === requestId) || (r.requestDate === requestId));
  
  if (requestIndex === -1) {
    alert('Solicitud no encontrada');
    return;
  }
  
  const request = requests[requestIndex];
  const isUpgrade = request.type === 'upgrade';
  const typeLabel = isUpgrade ? 'mejora de plan' : 'renovación';
  
  if (!confirm(`¿Aprobar esta ${typeLabel}?`)) return;
  
  // Actualizar el usuario en AWS approvedUsers
  const approvedUsers = await DataService.getApprovedUsers() || [];
  const userIndex = approvedUsers.findIndex(u => u.id === request.userId);
  
  if (userIndex !== -1) {
    // Actualizar fecha de vencimiento
    approvedUsers[userIndex].planExpiry = request.newExpiry;
    // ACTIVAR el perfil automáticamente al aprobar renovación/upgrade
    approvedUsers[userIndex].isActive = true;

    if (isUpgrade) {
      // Actualizar plan para upgrade
      approvedUsers[userIndex].selectedPlan = request.newPlan;
      approvedUsers[userIndex].lastUpgradeDate = new Date().toISOString();
      approvedUsers[userIndex].lastUpgradeDuration = request.duration;
    } else {
      // Solo actualizar fechas para renovación
      approvedUsers[userIndex].lastRenewalDate = new Date().toISOString();
      approvedUsers[userIndex].lastRenewalDuration = request.duration;
    }

    await DataService.updateUser(approvedUsers[userIndex].id, approvedUsers[userIndex]);
  }
  
  // También actualizar en AWS pendingRegistros si existe
  const regIndex = registros.findIndex(r => r.id === request.userId);
  if (regIndex !== -1) {
    registros[regIndex].planExpiry = request.newExpiry;
    if (isUpgrade) {
      registros[regIndex].selectedPlan = request.newPlan;
      registros[regIndex].lastUpgradeDate = new Date().toISOString();
    } else {
      registros[regIndex].lastRenewalDate = new Date().toISOString();
    }
    await DataService.updateRegistro(registros[regIndex].id, registros[regIndex]);
  }
  
  // Verificar si es el usuario actualmente logueado y actualizar currentUser (localStorage temporal)
  const currentUser = await DataService.getCurrentUser();
  if (currentUser && currentUser.id === request.userId) {
    currentUser.planExpiry = request.newExpiry;
    if (isUpgrade) {
      currentUser.selectedPlan = request.newPlan;
      currentUser.lastUpgradeDate = new Date().toISOString();
    } else {
      currentUser.lastRenewalDate = new Date().toISOString();
    }
    await DataService.setCurrentUser(currentUser);
  }
  
  // Actualizar AWS approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const profileIndex = approvedProfiles.findIndex(p => p.id === `profile-${request.userId}`);

  if (profileIndex !== -1) {
    // Actualizar fecha de vencimiento y ACTIVAR el perfil
    approvedProfiles[profileIndex].planExpiry = request.newExpiry;
    approvedProfiles[profileIndex].isActive = true;

    if (isUpgrade) {
      // Mapear plan a tipo de carrusel
      const planToCarousel = {
        'luxury': 'luxury',
        'luxury-exclusive': 'luxury',
        'vip': 'vip-black',
        'premium': 'premium-select'
      };

      // Mapear plan a tipos de perfil (1 badge por carrusel)
      const planToProfileTypes = {
        'luxury': ['luxury-exclusive'],
        'luxury-exclusive': ['luxury-exclusive'],
        'vip': ['vip'],
        'premium': ['premium']
      };

      approvedProfiles[profileIndex].carouselType = planToCarousel[request.newPlan] || 'premium-select';
      approvedProfiles[profileIndex].selectedPlan = request.newPlan;
      approvedProfiles[profileIndex].profileTypes = planToProfileTypes[request.newPlan] || ['premium'];
    }

    await DataService.updateProfile(approvedProfiles[profileIndex].id, approvedProfiles[profileIndex]);
    console.log('✅ Perfil activado y actualizado:', approvedProfiles[profileIndex].displayName || request.displayName);
  }
  
  // Marcar solicitud como aprobada
  requests[requestIndex].status = 'approved';
  requests[requestIndex].approvedAt = new Date().toISOString();
  await DataService.savePlanRequests(requests);
  
  const planNames = {
    'premium': 'Premium Select',
    'vip': 'VIP Black',
    'luxury': 'Luxury & Exclusive',
    'luxury-exclusive': 'Luxury & Exclusive'
  };
  
  if (isUpgrade) {
    alert(`✅ ¡Mejora de plan aprobada!\n\nUsuario: ${request.displayName || request.username}\nNuevo plan: ${planNames[request.newPlan] || request.newPlan}\nNueva fecha de vencimiento: ${new Date(request.newExpiry).toLocaleDateString('es-CL')}`);
  } else {
    alert(`✅ ¡Renovación aprobada!\n\nUsuario: ${request.displayName || request.username}\nNueva fecha de vencimiento: ${new Date(request.newExpiry).toLocaleDateString('es-CL')}`);
  }
  
  renderRenovaciones();
  updateRenovacionesBadge();
  // Actualizar lista de aprobados para mostrar el perfil como activo
  renderRegistrosAprobados();
};

// Rechazar solicitud de plan
window.rejectPlanRequest = async function(requestId) {
  const reason = prompt('Motivo del rechazo (opcional):');
  
  const requests = await DataService.getPlanRequests() || [];
  const requestIndex = requests.findIndex(r => (r.id === requestId) || (r.requestDate === requestId));
  
  if (requestIndex === -1) {
    alert('Solicitud no encontrada');
    return;
  }
  
  // Marcar como rechazada
  requests[requestIndex].status = 'rejected';
  requests[requestIndex].rejectedAt = new Date().toISOString();
  requests[requestIndex].rejectionReason = reason || 'Sin motivo especificado';
  await DataService.savePlanRequests(requests);
  
  alert('Solicitud rechazada');
  
  renderRenovaciones();
  updateRenovacionesBadge();
};

// ============================================
// BADGE DE REGISTROS PENDIENTES
// ============================================
const registrosBadge = document.getElementById('registros-badge');
const aprobadosBadge = document.getElementById('aprobados-badge');
const rechazadosBadge = document.getElementById('rechazados-badge');

function updateRegistrosBadge() {
  // Usar variable global registros que se carga desde AWS
  const pendientes = registros.filter(r => r.status === 'pendiente').length;
  
  if (registrosBadge) {
    if (pendientes > 0) {
      registrosBadge.textContent = pendientes > 9 ? '9+' : pendientes;
      registrosBadge.style.display = 'flex';
    } else {
      registrosBadge.style.display = 'none';
    }
  }
}

function updateAprobadosBadge() {
  // Usar variable global registros que se carga desde AWS
  const aprobados = registros.filter(r => r.status === 'aprobado').length;
  
  if (aprobadosBadge) {
    if (aprobados > 0) {
      aprobadosBadge.textContent = aprobados > 99 ? '99+' : aprobados;
      aprobadosBadge.style.display = 'flex';
    } else {
      aprobadosBadge.style.display = 'none';
    }
  }
}

function updateRechazadosBadge() {
  // Usar variable global registros que se carga desde AWS
  const rechazados = registros.filter(r => r.status === 'rechazado').length;
  
  if (rechazadosBadge) {
    if (rechazados > 0) {
      rechazadosBadge.textContent = rechazados > 99 ? '99+' : rechazados;
      rechazadosBadge.style.display = 'flex';
    } else {
      rechazadosBadge.style.display = 'none';
    }
  }
}

// ============================================
// FILTROS PARA REGISTROS APROBADOS
// ============================================
let allAprobadosData = { registros: [], profiles: [] };

function applyAprobadosFilters() {
  const statusFilter = document.getElementById('filter-status')?.value || 'todos';
  const emailFilter = document.getElementById('filter-email')?.value?.toLowerCase().trim() || '';

  renderRegistrosAprobadosFiltered(statusFilter, emailFilter);
}

function clearAprobadosFilters() {
  const statusSelect = document.getElementById('filter-status');
  const emailInput = document.getElementById('filter-email');

  if (statusSelect) statusSelect.value = 'todos';
  if (emailInput) emailInput.value = '';

  renderRegistrosAprobadosFiltered('todos', '');
}

function renderRegistrosAprobadosFiltered(statusFilter, emailFilter) {
  const list = document.getElementById('registros-aprobados-list');
  const empty = document.getElementById('registros-aprobados-empty');

  if (!list || !empty) return;

  const { registros: aprobados, profiles: approvedProfiles } = allAprobadosData;

  // Aplicar filtros
  let filtered = aprobados.filter(reg => {
    // Verificar estado del perfil
    const profile = approvedProfiles.find(p => p.id === `profile-${reg.id}` || p.userId === reg.id);
    const isActive = profile ? (profile.isActive !== false) : true;

    // Filtro por estado
    if (statusFilter === 'activos' && !isActive) return false;
    if (statusFilter === 'desactivos' && isActive) return false;

    // Filtro por correo
    if (emailFilter && !reg.email?.toLowerCase().includes(emailFilter)) return false;

    return true;
  });

  if (filtered.length === 0) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  list.style.display = 'grid';
  empty.style.display = 'none';

  list.innerHTML = filtered.map(reg => {
    const profile = approvedProfiles.find(p => p.id === `profile-${reg.id}` || p.userId === reg.id);
    const isActive = profile ? (profile.isActive !== false) : true;
    const statusText = isActive ? '🟢 Activo' : '🔴 Desactivado';
    const toggleBtnText = isActive ? 'Desactivar' : 'Activar';
    const toggleBtnColor = isActive ? '#F59E0B' : '#10B981';

    return `
    <div class="admin-item collapsible-profile" style="flex-direction: column; gap: 0; border-left: 4px solid ${isActive ? '#10B981' : '#6B7280'};">
      <div class="profile-header" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 0; cursor: pointer;" onclick="toggleProfileDetails('${reg.id}')">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="expand-icon" id="expand-icon-${reg.id}" style="color: var(--gold); font-size: 14px; transition: transform 0.3s;">▶</span>
          <div>
            <div class="admin-item-name" style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
              ${reg.displayName || 'Sin nombre'}
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 8px; background: ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(107,114,128,0.2)'}; color: ${isActive ? '#10B981' : '#6B7280'};">${statusText}</span>
            </div>
            <div class="admin-item-email" style="font-size: 12px;">${reg.email || ''}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;" onclick="event.stopPropagation();">
          <button onclick="toggleProfileStatus('${reg.id}')" style="background: ${toggleBtnColor}; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">${toggleBtnText}</button>
          <button onclick="deleteApprovedProfile('${reg.id}')" style="background: #DC2626; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">Eliminar</button>
        </div>
      </div>

      <div class="profile-details" id="profile-details-${reg.id}" style="display: none; width: 100%; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div>
            <div style="color: var(--gold); font-size: 13px;">@${reg.username || 'sin.usuario'}</div>
          </div>
          <div style="text-align: right;">
            <span style="background: rgba(16,185,129,0.2); color: #10B981; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Aprobado</span>
            <div style="color: var(--muted); font-size: 11px; margin-top: 4px;">Aprobado: ${reg.approvedAt ? new Date(reg.approvedAt).toLocaleDateString('es-CL') : 'N/A'}</div>
          </div>
        </div>

        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="color: var(--gold); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📂 Datos de Verificación Archivados</div>
          <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <span class="verification-item ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'pointer' : 'default'}; color: ${reg.hasVerificationSelfie ? '#10B981' : 'var(--muted)'};" onclick="${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? `viewArchivedFile('${reg.id}', 'selfie')` : ''}">${reg.hasVerificationSelfie ? '✓' : '○'} Selfie ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? '👁️' : ''}</span>
            <span class="verification-item ${(reg.idDocumentUrl || reg.idDocumentData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.idDocumentUrl || reg.idDocumentData) ? 'pointer' : 'default'}; color: ${reg.hasIdDocument ? '#10B981' : 'var(--muted)'};" onclick="${(reg.idDocumentUrl || reg.idDocumentData) ? `viewArchivedFile('${reg.id}', 'document')` : ''}">${reg.hasIdDocument ? '✓' : '○'} Documento ID ${(reg.idDocumentUrl || reg.idDocumentData) ? '👁️' : ''}</span>
            <span class="verification-item ${reg.profilePhotosData?.length > 0 ? 'clickable' : ''}" style="font-size: 12px; cursor: ${reg.profilePhotosData?.length > 0 ? 'pointer' : 'default'}; color: ${reg.hasProfilePhotos ? '#10B981' : 'var(--muted)'};" onclick="${reg.profilePhotosData?.length > 0 ? `viewArchivedFile('${reg.id}', 'photos')` : ''}">${reg.hasProfilePhotos ? '✓' : '○'} Fotos (${reg.profilePhotosData?.length || 0}) ${reg.profilePhotosData?.length > 0 ? '👁️' : ''}</span>
          </div>
        </div>

        ${reg.planInfo ? `
        <div style="width: 100%; background: rgba(212,175,55,0.1); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="color: var(--gold); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📋 Información del Plan</div>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px;">
            <span style="color: var(--text);">Plan: <strong>${reg.planInfo.planType || reg.selectedPlan || 'N/A'}</strong></span>
            <span style="color: var(--text);">Duración: <strong>${reg.planInfo.duration || 30} días</strong></span>
            <span style="color: ${new Date(reg.planInfo.expiryDate) > new Date() ? '#10B981' : '#DC2626'};">Vence: <strong>${reg.planInfo.expiryDate ? new Date(reg.planInfo.expiryDate).toLocaleDateString('es-CL') : 'N/A'}</strong></span>
          </div>
        </div>
        ` : ''}

        <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px; color: var(--muted);">
          <span>📍 ${reg.city || 'N/A'}</span>
          <span>📞 ${reg.whatsapp || 'N/A'}</span>
          <span>📅 Registro: ${reg.date}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');
}

// ============================================
// RENDERIZAR REGISTROS APROBADOS (carga datos y aplica filtros)
// ============================================
async function renderRegistrosAprobados() {
  // Cargar datos
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const aprobados = registros.filter(r => r.status === 'aprobado');

  // Guardar en variable global para filtrado
  allAprobadosData = { registros: aprobados, profiles: approvedProfiles };

  // Aplicar filtros actuales
  applyAprobadosFilters();
}

// ============================================
// RENDERIZAR REGISTROS RECHAZADOS
// ============================================
function renderRegistrosRechazados() {
  const list = document.getElementById('registros-rechazados-list');
  const empty = document.getElementById('registros-rechazados-empty');
  
  if (!list || !empty) return;
  
  // Usar variable global registros que se carga desde AWS
  const rechazados = registros.filter(r => r.status === 'rechazado');
  
  if (rechazados.length === 0) {
    list.innerHTML = '';
    list.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  
  list.style.display = 'grid';
  empty.style.display = 'none';
  
  list.innerHTML = rechazados.map(reg => `
    <div class="admin-item collapsible-profile" style="flex-direction: column; gap: 0; border-left: 4px solid #DC2626;">
      <!-- Header colapsable -->
      <div class="profile-header" style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 0; cursor: pointer;" onclick="toggleRejectedDetails('${reg.id}')">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span class="expand-icon" id="expand-rejected-${reg.id}" style="color: var(--gold); font-size: 14px; transition: transform 0.3s;">▶</span>
          <div>
            <div class="admin-item-name" style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
              ${reg.displayName || 'Sin nombre'}
              <span style="font-size: 11px; padding: 2px 8px; border-radius: 8px; background: rgba(220,38,38,0.2); color: #DC2626;">✗ Rechazado</span>
            </div>
            <div class="admin-item-email" style="font-size: 12px;">${reg.email || ''}</div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;" onclick="event.stopPropagation();">
          <button onclick="deleteRejectedProfile('${reg.id}')" style="background: #6B7280; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer;">Eliminar</button>
        </div>
      </div>
      
      <!-- Detalles colapsables -->
      <div class="profile-details" id="rejected-details-${reg.id}" style="display: none; width: 100%; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
          <div style="color: var(--gold); font-size: 13px;">@${reg.username || 'sin.usuario'}</div>
          <div style="color: var(--muted); font-size: 11px;">Rechazado: ${reg.rejectedAt ? new Date(reg.rejectedAt).toLocaleDateString('es-CL') : 'N/A'}</div>
        </div>
        
        <!-- Motivo de rechazo -->
        <div style="width: 100%; background: rgba(220,38,38,0.1); border: 1px solid rgba(220,38,38,0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="color: #DC2626; font-size: 11px; text-transform: uppercase; margin-bottom: 4px;">Motivo del rechazo:</div>
          <div style="color: var(--text); font-size: 13px;">${reg.rejectionReason || 'No especificado'}</div>
        </div>
        
        <!-- Datos de verificación archivados -->
        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div style="color: var(--gold); font-size: 11px; text-transform: uppercase; margin-bottom: 8px;">📂 Datos de Verificación Archivados (Legal)</div>
          <div style="display: flex; flex-wrap: wrap; gap: 12px;">
            <span class="verification-item ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? 'pointer' : 'default'}; color: ${reg.hasVerificationSelfie ? '#10B981' : 'var(--muted)'};" onclick="${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? `viewArchivedFile('${reg.id}', 'selfie')` : ''}">${reg.hasVerificationSelfie ? '✓' : '○'} Selfie ${(reg.verificationSelfieUrl || reg.verificationSelfieData) ? '👁️' : ''}</span>
            <span class="verification-item ${(reg.idDocumentUrl || reg.idDocumentData) ? 'clickable' : ''}" style="font-size: 12px; cursor: ${(reg.idDocumentUrl || reg.idDocumentData) ? 'pointer' : 'default'}; color: ${reg.hasIdDocument ? '#10B981' : 'var(--muted)'};" onclick="${(reg.idDocumentUrl || reg.idDocumentData) ? `viewArchivedFile('${reg.id}', 'document')` : ''}">${reg.hasIdDocument ? '✓' : '○'} Documento ID ${(reg.idDocumentUrl || reg.idDocumentData) ? '👁️' : ''}</span>
            <span class="verification-item ${reg.profilePhotosData?.length > 0 ? 'clickable' : ''}" style="font-size: 12px; cursor: ${reg.profilePhotosData?.length > 0 ? 'pointer' : 'default'}; color: ${reg.hasProfilePhotos ? '#10B981' : 'var(--muted)'};" onclick="${reg.profilePhotosData?.length > 0 ? `viewArchivedFile('${reg.id}', 'photos')` : ''}">${reg.hasProfilePhotos ? '✓' : '○'} Fotos (${reg.profilePhotosData?.length || 0}) ${reg.profilePhotosData?.length > 0 ? '👁️' : ''}</span>
          </div>
        </div>
        
        <!-- Info mínima -->
        <div style="width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; font-size: 12px; color: var(--muted);">
          <span>📍 ${reg.city || 'N/A'}</span>
          <span>📞 ${reg.whatsapp || 'N/A'}</span>
          <span>📅 Registro: ${reg.date}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// Toggle detalles de rechazados
window.toggleRejectedDetails = (regId) => {
  const details = document.getElementById(`rejected-details-${regId}`);
  const icon = document.getElementById(`expand-rejected-${regId}`);
  
  if (!details || !icon) return;
  
  if (details.style.display === 'none') {
    details.style.display = 'block';
    icon.textContent = '▼';
  } else {
    details.style.display = 'none';
    icon.textContent = '▶';
  }
};

// Eliminar perfil rechazado
window.deleteRejectedProfile = async (regId) => {
  if (!confirm('⚠️ ¿Eliminar este registro rechazado?\n\nEsto eliminará permanentemente los datos archivados.')) {
    return;
  }

  // Feedback visual inmediato
  const el = document.querySelector(`[data-reg-id="${regId}"]`);
  if (el) {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
  }

  try {
    await Promise.all([
      DataService.deleteRegistro(regId),
      DataService.deleteAllUserMedia(regId).catch(() => {}) // S3 cleanup
    ]);
    registros = registros.filter(r => r.id !== regId);

    // Animación de salida
    if (el) {
      el.style.transition = 'all 0.3s ease';
      el.style.transform = 'translateX(-100%)';
      el.style.opacity = '0';
      setTimeout(() => {
        renderRegistrosRechazados();
        updateRegistrosBadge(); updateAprobadosBadge(); updateRechazadosBadge();
      }, 300);
    } else {
      renderRegistrosRechazados();
      updateRegistrosBadge(); updateAprobadosBadge(); updateRechazadosBadge();
    }
  } catch (error) {
    console.error('Error eliminando registro rechazado:', error);
    if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
    alert('❌ Error al eliminar el registro');
  }
};

// Función para ver archivos archivados
window.viewArchivedFile = (regId, type) => {
  // Convertir a string para comparación correcta
  const regIdStr = String(regId);

  // Buscar en todos los registros (pendientes, aprobados, rechazados)
  const reg = registros.find(r => String(r.id) === regIdStr);
  if (!reg) {
    console.warn('Registro no encontrado:', regIdStr);
    return;
  }

  // Usar la misma función de visualización
  viewVerificationFiles(regIdStr, type);
};

// ============================================
// FUNCIONES PARA GESTIONAR PERFILES APROBADOS
// ============================================

// Expandir/contraer detalles del perfil
window.toggleProfileDetails = (regId) => {
  const details = document.getElementById(`profile-details-${regId}`);
  const icon = document.getElementById(`expand-icon-${regId}`);
  
  if (!details || !icon) return;
  
  if (details.style.display === 'none') {
    details.style.display = 'block';
    icon.textContent = '▼';
    icon.style.transform = 'rotate(0deg)';
  } else {
    details.style.display = 'none';
    icon.textContent = '▶';
    icon.style.transform = 'rotate(0deg)';
  }
};

// Exponer funciones de filtrado al window
window.applyAprobadosFilters = applyAprobadosFilters;
window.clearAprobadosFilters = clearAprobadosFilters;

// Activar/Desactivar perfil
window.toggleProfileStatus = async (regId) => {
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const approvedUsers = await DataService.getApprovedUsers() || [];
  
  // Buscar perfil
  const profileIndex = approvedProfiles.findIndex(p => p.id === `profile-${regId}` || p.userId === regId);
  const userIndex = approvedUsers.findIndex(u => u.id === regId);
  
  if (profileIndex !== -1) {
    // Toggle estado
    const currentStatus = approvedProfiles[profileIndex].isActive !== false;
    approvedProfiles[profileIndex].isActive = !currentStatus;
    await DataService.updateProfile(approvedProfiles[profileIndex].id, approvedProfiles[profileIndex]);
  }
  
  if (userIndex !== -1) {
    const currentStatus = approvedUsers[userIndex].isActive !== false;
    approvedUsers[userIndex].isActive = !currentStatus;
    await DataService.updateUser(approvedUsers[userIndex].id, approvedUsers[userIndex]);
  }
  
  // Re-renderizar
  renderRegistrosAprobados();
  
  // Mostrar notificación
  const newStatus = profileIndex !== -1 ? approvedProfiles[profileIndex].isActive : true;
  alert(newStatus ? '✅ Perfil activado correctamente' : '🔴 Perfil desactivado correctamente');
};

// Eliminar perfil aprobado completamente
window.deleteApprovedProfile = async (regId) => {
  if (!confirm('⚠️ ¿Estás seguro de eliminar este perfil?\n\nEsta acción eliminará:\n- El registro de la usuaria\n- El perfil del carrusel\n- Los datos de la cuenta\n- Todas las fotos y videos de S3\n- Todos los instantes\n\nEsta acción NO se puede deshacer.')) {
    return;
  }

  // Feedback visual inmediato
  const el = document.querySelector(`[data-reg-id="${regId}"]`);
  if (el) {
    el.style.opacity = '0.4';
    el.style.pointerEvents = 'none';
  }

  try {
    // Eliminar stories/instantes del usuario
    const stories = await DataService.getStories(regId) || [];
    const storyDeletes = stories.map(s => DataService.deleteStory(s.id).catch(() => {}));

    // Ejecutar eliminaciones en paralelo
    await Promise.all([
      DataService.deleteRegistro(regId),
      DataService.deleteProfile(`profile-${regId}`),
      DataService.deleteUser(regId),
      DataService.deleteAllUserMedia(regId).catch(() => {}), // S3: fotos, videos, instantes
      ...storyDeletes
    ]);
    registros = registros.filter(r => r.id !== regId);

    // Animación de salida
    if (el) {
      el.style.transition = 'all 0.3s ease';
      el.style.transform = 'translateX(-100%)';
      el.style.opacity = '0';
      setTimeout(() => {
        renderRegistrosAprobados();
        updateRegistrosBadge(); updateAprobadosBadge(); updateRechazadosBadge();
      }, 300);
    } else {
      renderRegistrosAprobados();
      updateRegistrosBadge(); updateAprobadosBadge(); updateRechazadosBadge();
    }
  } catch (error) {
    console.error('Error eliminando perfil aprobado:', error);
    if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
    alert('❌ Error al eliminar el perfil');
  }
};

async function renderMensajes(autoMarkAsRead = false) {
  let mensajes = await DataService.getContactMessages() || [];
  
  // Auto-marcar como leídos cuando se abre la pestaña
  if (autoMarkAsRead) {
    let updated = false;
    mensajes.forEach(msg => {
      if (!msg.leido) {
        msg.leido = true;
        updated = true;
      }
    });
    if (updated) {
      // Actualizar mensajes en AWS (marca como leídos)
      for (const msg of mensajes) {
        if (msg.id) {
          await DataService.addContactMessage(msg);
        }
      }
      updateMensajesBadge();
    }
  }
  
  if (mensajes.length === 0) {
    mensajesList.style.display = 'none';
    mensajesEmpty.style.display = 'block';
    return;
  }

  mensajesList.style.display = 'grid';
  mensajesEmpty.style.display = 'none';

  mensajesList.innerHTML = mensajes.map(msg => {
    const fecha = new Date(msg.fecha);
    const fechaFormato = fecha.toLocaleDateString('es-CL', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const archivosHTML = msg.archivos && msg.archivos.length > 0 
      ? `<div class="publicacion-item-detail">
          <strong>📎 Archivos:</strong> ${msg.archivos.map(a => `<a href="${a.data}" download="${a.nombre}" style="color: var(--gold); text-decoration: underline;">${a.nombre}</a>`).join(', ')}
        </div>`
      : '';

    const respuestasHTML = msg.respuestas && msg.respuestas.length > 0
      ? `<div style="margin-top: 12px; padding: 12px; background: rgba(59,130,246,0.1); border-radius: 8px; border-left: 3px solid #3B82F6;">
          <div style="color: #3B82F6; font-size: 12px; font-weight: 600; margin-bottom: 8px;">✅ Respuestas enviadas (${msg.respuestas.length}):</div>
          ${msg.respuestas.map(r => `
            <div style="color: var(--muted); font-size: 11px; margin-bottom: 4px;">
              ${new Date(r.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="color: var(--text); font-size: 13px; margin-bottom: 8px; padding-left: 8px; border-left: 2px solid var(--border);">${r.texto.substring(0, 150)}${r.texto.length > 150 ? '...' : ''}</div>
          `).join('')}
        </div>`
      : '';

    const statusBadge = msg.respondido 
      ? '<span style="background: rgba(59,130,246,0.2); color: #3B82F6; padding: 4px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">✅ Respondido</span>'
      : '';

    return `
      <div class="admin-item" data-message-id="${msg.id}" style="flex-direction: column; align-items: start; gap: 12px; ${msg.leido ? '' : 'border-left: 4px solid var(--gold);'}">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div class="admin-item-name">${msg.nombre}${statusBadge}</div>
            <div class="admin-item-email">${msg.email}</div>
            <div class="admin-item-date">${fechaFormato}</div>
          </div>
          <span class="admin-item-status ${msg.leido ? 'status-aprobado' : 'status-pendiente'}">
            ${msg.leido ? 'Leído' : '🔴 Nuevo'}
          </span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <div class="publicacion-item-details">
            <div class="publicacion-item-detail"><strong>📞 Teléfono:</strong> ${msg.telefono}</div>
            <div class="publicacion-item-detail" style="margin-top: 8px;"><strong>💬 Mensaje:</strong></div>
            <div style="color: var(--text); margin-top: 4px; white-space: pre-wrap;">${msg.mensaje}</div>
            ${archivosHTML}
            ${respuestasHTML}
          </div>
        </div>
        <div class="admin-item-actions" style="width: 100%; justify-content: flex-end;">
          ${!msg.leido ? `<button class="admin-item-btn admin-approve" onclick="marcarLeido('${msg.id}')">Marcar como leído</button>` : ''}
          <button class="admin-item-btn" style="background: linear-gradient(135deg, #3B82F6, #2563EB); color: #fff;" onclick="responderMensaje('${msg.id}')">📧 Responder</button>
          <button class="admin-item-btn admin-reject" onclick="eliminarMensaje('${msg.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

// Modal para responder mensajes
function crearModalRespuesta() {
  if (document.getElementById('reply-modal')) return;
  
  const modal = document.createElement('div');
  modal.id = 'reply-modal';
  modal.className = 'modal-overlay';
  modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 10000; display: none; align-items: center; justify-content: center; padding: 20px;';
  modal.innerHTML = `
    <div style="background: var(--surface); border-radius: 16px; max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto;">
      <div style="padding: 20px; border-bottom: 1px solid var(--border);">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h3 style="margin: 0; color: var(--text);">📧 Responder Mensaje</h3>
          <button onclick="cerrarModalRespuesta()" style="background: none; border: none; color: var(--muted); font-size: 24px; cursor: pointer;">&times;</button>
        </div>
      </div>
      <div style="padding: 20px;">
        <div id="reply-original-message" style="background: rgba(0,0,0,0.3); padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid var(--gold);">
          <!-- Info del mensaje original -->
        </div>
        <label style="display: block; color: var(--text); margin-bottom: 8px; font-weight: 600;">Tu respuesta:</label>
        <textarea id="reply-text" rows="8" style="width: 100%; background: var(--background); border: 1px solid var(--border); border-radius: 8px; padding: 12px; color: var(--text); resize: vertical;" placeholder="Escribe tu respuesta aquí..."></textarea>
        <div style="display: flex; gap: 12px; margin-top: 20px; justify-content: flex-end;">
          <button onclick="cerrarModalRespuesta()" style="padding: 12px 24px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; color: var(--text); cursor: pointer;">Cancelar</button>
          <button onclick="enviarRespuesta()" id="reply-send-btn" style="padding: 12px 24px; background: linear-gradient(135deg, #D4AF37, #F4D03F); border: none; border-radius: 8px; color: #000; font-weight: 600; cursor: pointer;">Enviar Respuesta</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

let currentReplyMessageId = null;

window.responderMensaje = async (id) => {
  // Crear modal inmediatamente para feedback instantáneo
  crearModalRespuesta();
  currentReplyMessageId = id;

  const modal = document.getElementById('reply-modal');
  const originalDiv = document.getElementById('reply-original-message');
  const textarea = document.getElementById('reply-text');

  // Mostrar modal con mensaje de carga
  originalDiv.innerHTML = '<div style="color: var(--muted); text-align: center; padding: 20px;">Cargando mensaje...</div>';
  textarea.value = '';
  modal.style.display = 'flex';

  // Cargar datos del mensaje de forma asíncrona
  try {
    const mensajes = await DataService.getContactMessages() || [];
    const mensaje = mensajes.find(m => m.id == id);

    if (!mensaje) {
      originalDiv.innerHTML = '<div style="color: #DC2626; text-align: center; padding: 20px;">❌ Error: Mensaje no encontrado</div>';
      return;
    }

    // Actualizar contenido del modal
    originalDiv.innerHTML = `
      <div style="color: var(--muted); font-size: 12px; margin-bottom: 8px;">Mensaje de: <strong style="color: var(--text);">${mensaje.nombre}</strong> (${mensaje.email})</div>
      <div style="color: var(--text); font-size: 14px;">"${mensaje.mensaje.substring(0, 300)}${mensaje.mensaje.length > 300 ? '...' : ''}"</div>
    `;
  } catch (error) {
    console.error('Error cargando mensaje:', error);
    originalDiv.innerHTML = '<div style="color: #DC2626; text-align: center; padding: 20px;">❌ Error cargando el mensaje</div>';
  }
};

window.cerrarModalRespuesta = () => {
  const modal = document.getElementById('reply-modal');
  if (modal) modal.style.display = 'none';
  currentReplyMessageId = null;
};

window.enviarRespuesta = async () => {
  const textarea = document.getElementById('reply-text');
  const sendBtn = document.getElementById('reply-send-btn');
  const replyText = textarea.value.trim();
  
  if (!replyText) {
    alert('Por favor escribe una respuesta');
    return;
  }
  
  const mensajes = await DataService.getContactMessages() || [];
  const mensaje = mensajes.find(m => m.id == currentReplyMessageId);
  if (!mensaje) return;
  
  const emailConfig = await DataService.getConfig('emailConfig') || {};
  
  sendBtn.disabled = true;
  sendBtn.textContent = 'Enviando...';
  
  try {
    const API_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api' 
      : '/api';
    
    const response = await fetch(`${API_URL}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'sendReply',
        message: mensaje,
        replyText: replyText,
        config: emailConfig
      })
    });
    
    if (response.ok) {
      // Guardar historial de respuestas
      if (!mensaje.respuestas) mensaje.respuestas = [];
      mensaje.respuestas.push({
        fecha: new Date().toISOString(),
        texto: replyText
      });
      mensaje.respondido = true;
      await DataService.addContactMessage(mensaje);
      
      alert('✅ Respuesta enviada exitosamente');
      cerrarModalRespuesta();
      renderMensajes();
    } else {
      throw new Error('Error del servidor');
    }
  } catch (err) {
    console.error('Error enviando respuesta:', err);
    // Si el backend no está disponible, abrir cliente de email
    const mailtoLink = `mailto:${mensaje.email}?subject=Re: Tu mensaje en Sala Oscura&body=${encodeURIComponent(replyText)}`;
    
    if (confirm('No se pudo enviar por el servidor. ¿Deseas abrir tu cliente de correo para enviar la respuesta?')) {
      window.open(mailtoLink);
      
      // Igual guardar que se respondió
      if (!mensaje.respuestas) mensaje.respuestas = [];
      mensaje.respuestas.push({
        fecha: new Date().toISOString(),
        texto: replyText,
        metodo: 'mailto'
      });
      mensaje.respondido = true;
      await DataService.addContactMessage(mensaje);
      
      cerrarModalRespuesta();
      renderMensajes();
    }
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Enviar Respuesta';
  }
};

window.marcarLeido = async (id) => {
  try {
    await DataService.updateContactMessage(id, { leido: true });
    renderMensajes();
    updateMensajesBadge();
  } catch (error) {
    console.error('Error marcando mensaje como leído:', error);
  }
};

window.eliminarMensaje = async (id) => {
  if (confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
    // Feedback visual inmediato: encontrar y ocultar el elemento del DOM
    const messageElement = document.querySelector(`[data-message-id="${id}"]`);
    if (messageElement) {
      messageElement.style.opacity = '0.5';
      messageElement.style.pointerEvents = 'none';

      // Añadir indicador de eliminación
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position: absolute; inset: 0; background: rgba(220,38,38,0.1); display: flex; align-items: center; justify-content: center; font-weight: 600; color: #DC2626;';
      overlay.textContent = 'Eliminando...';
      messageElement.style.position = 'relative';
      messageElement.appendChild(overlay);
    }

    try {
      // Eliminar del backend
      await DataService.deleteMessage(id);

      // Remover del DOM con animación
      if (messageElement) {
        messageElement.style.transition = 'all 0.3s ease';
        messageElement.style.transform = 'translateX(-100%)';
        messageElement.style.opacity = '0';

        setTimeout(() => {
          messageElement.remove();
          updateMensajesBadge();
        }, 300);
      } else {
        // Si no encontramos el elemento, recargar la lista completa
        renderMensajes();
        updateMensajesBadge();
      }
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      alert('❌ Error al eliminar el mensaje. Por favor intenta nuevamente.');

      // Restaurar el elemento si falló
      if (messageElement) {
        messageElement.style.opacity = '1';
        messageElement.style.pointerEvents = 'auto';
        const overlay = messageElement.querySelector('div[style*="Eliminando"]');
        if (overlay) overlay.remove();
      }
    }
  }
};

// ========================================
// GESTIÓN DE PLANES
// ========================================

const DEFAULT_PLANS = {
  vip: {
    name: 'VIP Black',
    description: 'Visibilidad premium para destacar',
    prices: {
      7: 19990,
      15: 34990,
      30: 49990
    },
    price: 49990, // Legacy - precio por defecto (30 días)
    tarifaMin: 100000,
    tarifaMax: 199999,
    photos: 10,
    videos: 2,
    instantes: 3,
    instantesDuracion: 12,
    estados: 2,
    estadosDuracion: 6,
    features: [
      'Perfil verificado',
      'Apareces en sección VIP',
      'Badge VIP exclusivo',
      'Hasta 10 fotos',
      '2 videos',
      'Estadísticas básicas'
    ],
    active: true
  },
  premium: {
    name: 'Premium Select',
    description: 'La mejor relación calidad-precio',
    prices: {
      7: 29990,
      15: 54990,
      30: 79990
    },
    price: 79990,
    tarifaMin: 200000,
    tarifaMax: 999999999,
    photos: 15,
    videos: 4,
    instantes: 5,
    instantesDuracion: 24,
    estados: 5,
    estadosDuracion: 12,
    features: [
      'Todo lo de VIP',
      'Apareces en Premium Select',
      'Badge Premium dorado',
      'Hasta 15 fotos',
      '4 videos',
      'Estadísticas avanzadas',
      'Prioridad en búsquedas',
      'Soporte prioritario'
    ],
    active: true,
    featured: true
  },
  luxury: {
    name: 'Luxury & Exclusive',
    description: 'Exclusividad total, sin límites',
    prices: {
      7: 59990,
      15: 99990,
      30: 149990
    },
    price: 149990,
    tarifaMin: 100000, // Sin restricción, disponible desde 100k
    tarifaMax: 999999999,
    cupos: 50,
    photos: 0, // 0 = ilimitado
    videos: 0, // 0 = ilimitado
    instantes: 0, // 0 = ilimitado
    instantesDuracion: 48,
    estados: 0, // 0 = ilimitado
    estadosDuracion: 24,
    features: [
      'Todo lo de Premium',
      'Carrusel principal destacado',
      'Badge Luxury diamante',
      'Fotos ilimitadas',
      'Videos ilimitados',
      'Estadísticas completas',
      'Máxima visibilidad',
      'Gestor de cuenta personal',
      'Verificación prioritaria'
    ],
    active: true,
    limited: true
  }
};

async function loadPlans() {
  const stored = await DataService.getConfig('luxuryPlans');
  if (stored) {
    return stored;
  }
  
  // Si no existen planes guardados, inicializar con valores por defecto
  console.log('🔧 Admin - Inicializando planes por defecto en AWS...');
  const defaultPlans = { ...DEFAULT_PLANS };
  await DataService.setConfig('luxuryPlans', defaultPlans);
  console.log('✅ Admin - Planes inicializados correctamente');
  
  return defaultPlans;
}

async function savePlans(plans) {
  await DataService.setConfig('luxuryPlans', plans);
  
  // También guardar configuración simplificada para el perfil-clienta
  const plansConfig = {
    vip: {
      photos: plans.vip.photos,
      videos: plans.vip.videos,
      instantes: plans.vip.instantes,
      instantesDuracion: plans.vip.instantesDuracion,
      estados: plans.vip.estados,
      estadosDuracion: plans.vip.estadosDuracion
    },
    premium: {
      photos: plans.premium.photos,
      videos: plans.premium.videos,
      instantes: plans.premium.instantes,
      instantesDuracion: plans.premium.instantesDuracion,
      estados: plans.premium.estados,
      estadosDuracion: plans.premium.estadosDuracion
    },
    luxury: {
      photos: plans.luxury.photos,
      videos: plans.luxury.videos,
      instantes: plans.luxury.instantes,
      instantesDuracion: plans.luxury.instantesDuracion,
      estados: plans.luxury.estados,
      estadosDuracion: plans.luxury.estadosDuracion
    }
  };
  
  await DataService.setConfig('plansConfig', plansConfig);
}

async function loadPlansToForm() {
  const plans = await loadPlans();
  
  // VIP - Descripción y Tarifa
  const vipDescEl = document.getElementById('plan-vip-description');
  if (vipDescEl) vipDescEl.value = plans.vip.description || 'Visibilidad premium para destacar';
  const vipTarifaMinEl = document.getElementById('plan-vip-tarifa-min');
  if (vipTarifaMinEl) vipTarifaMinEl.value = plans.vip.tarifaMin || 100000;
  const vipTarifaMaxEl = document.getElementById('plan-vip-tarifa-max');
  if (vipTarifaMaxEl) vipTarifaMaxEl.value = plans.vip.tarifaMax || 199999;
  
  // VIP - Precios por duración
  const vipPrices = plans.vip.prices || { 7: 19990, 15: 34990, 30: 49990 };
  document.getElementById('plan-vip-price-7').value = vipPrices[7] || 19990;
  document.getElementById('plan-vip-price-15').value = vipPrices[15] || 34990;
  document.getElementById('plan-vip-price-30').value = vipPrices[30] || plans.vip.price || 49990;
  document.getElementById('plan-vip-photos').value = plans.vip.photos;
  document.getElementById('plan-vip-videos').value = plans.vip.videos;
  
  // VIP - Instantes y Estados
  const vipInstantesEl = document.getElementById('plan-vip-instantes');
  if (vipInstantesEl) vipInstantesEl.value = plans.vip.instantes ?? 3;
  const vipInstantesDuracionEl = document.getElementById('plan-vip-instantes-duracion');
  if (vipInstantesDuracionEl) vipInstantesDuracionEl.value = plans.vip.instantesDuracion ?? 12;
  const vipEstadosEl = document.getElementById('plan-vip-estados');
  if (vipEstadosEl) vipEstadosEl.value = plans.vip.estados ?? 2;
  const vipEstadosDuracionEl = document.getElementById('plan-vip-estados-duracion');
  if (vipEstadosDuracionEl) vipEstadosDuracionEl.value = plans.vip.estadosDuracion ?? 6;
  
  document.getElementById('plan-vip-features').value = plans.vip.features.join('\n');
  document.getElementById('plan-vip-active').checked = plans.vip.active;
  
  // Premium - Descripción y Tarifa
  const premiumDescEl = document.getElementById('plan-premium-description');
  if (premiumDescEl) premiumDescEl.value = plans.premium.description || 'La mejor relación calidad-precio';
  const premiumTarifaMinEl = document.getElementById('plan-premium-tarifa-min');
  if (premiumTarifaMinEl) premiumTarifaMinEl.value = plans.premium.tarifaMin || 200000;
  const premiumTarifaMaxEl = document.getElementById('plan-premium-tarifa-max');
  if (premiumTarifaMaxEl) premiumTarifaMaxEl.value = plans.premium.tarifaMax || 999999999;
  
  // Premium - Precios por duración
  const premiumPrices = plans.premium.prices || { 7: 29990, 15: 54990, 30: 79990 };
  document.getElementById('plan-premium-price-7').value = premiumPrices[7] || 29990;
  document.getElementById('plan-premium-price-15').value = premiumPrices[15] || 54990;
  document.getElementById('plan-premium-price-30').value = premiumPrices[30] || plans.premium.price || 79990;
  document.getElementById('plan-premium-photos').value = plans.premium.photos;
  document.getElementById('plan-premium-videos').value = plans.premium.videos;
  
  // Premium - Instantes y Estados
  const premiumInstantesEl = document.getElementById('plan-premium-instantes');
  if (premiumInstantesEl) premiumInstantesEl.value = plans.premium.instantes ?? 5;
  const premiumInstantesDuracionEl = document.getElementById('plan-premium-instantes-duracion');
  if (premiumInstantesDuracionEl) premiumInstantesDuracionEl.value = plans.premium.instantesDuracion ?? 24;
  const premiumEstadosEl = document.getElementById('plan-premium-estados');
  if (premiumEstadosEl) premiumEstadosEl.value = plans.premium.estados ?? 5;
  const premiumEstadosDuracionEl = document.getElementById('plan-premium-estados-duracion');
  if (premiumEstadosDuracionEl) premiumEstadosDuracionEl.value = plans.premium.estadosDuracion ?? 12;
  
  document.getElementById('plan-premium-features').value = plans.premium.features.join('\n');
  document.getElementById('plan-premium-active').checked = plans.premium.active;
  document.getElementById('plan-premium-featured').checked = plans.premium.featured || false;
  
  // Luxury - Descripción y Cupos
  const luxuryDescEl = document.getElementById('plan-luxury-description');
  if (luxuryDescEl) luxuryDescEl.value = plans.luxury.description || 'Exclusividad total, sin límites';
  const luxuryCuposEl = document.getElementById('plan-luxury-cupos');
  if (luxuryCuposEl) luxuryCuposEl.value = plans.luxury.cupos || 50;
  
  // Luxury - Precios por duración
  const luxuryPrices = plans.luxury.prices || { 7: 59990, 15: 99990, 30: 149990 };
  document.getElementById('plan-luxury-price-7').value = luxuryPrices[7] || 59990;
  document.getElementById('plan-luxury-price-15').value = luxuryPrices[15] || 99990;
  document.getElementById('plan-luxury-price-30').value = luxuryPrices[30] || plans.luxury.price || 149990;
  document.getElementById('plan-luxury-photos').value = plans.luxury.photos;
  document.getElementById('plan-luxury-videos').value = plans.luxury.videos;
  
  // Luxury - Instantes y Estados
  const luxuryInstantesEl = document.getElementById('plan-luxury-instantes');
  if (luxuryInstantesEl) luxuryInstantesEl.value = plans.luxury.instantes ?? 0;
  const luxuryInstantesDuracionEl = document.getElementById('plan-luxury-instantes-duracion');
  if (luxuryInstantesDuracionEl) luxuryInstantesDuracionEl.value = plans.luxury.instantesDuracion ?? 48;
  const luxuryEstadosEl = document.getElementById('plan-luxury-estados');
  if (luxuryEstadosEl) luxuryEstadosEl.value = plans.luxury.estados ?? 0;
  const luxuryEstadosDuracionEl = document.getElementById('plan-luxury-estados-duracion');
  if (luxuryEstadosDuracionEl) luxuryEstadosDuracionEl.value = plans.luxury.estadosDuracion ?? 24;
  
  document.getElementById('plan-luxury-features').value = plans.luxury.features.join('\n');
  document.getElementById('plan-luxury-active').checked = plans.luxury.active;
  document.getElementById('plan-luxury-limited').checked = plans.luxury.limited || false;
}

async function savePlansFromForm() {
  try {
    const vipDescEl = document.getElementById('plan-vip-description');
    const vipTarifaMinEl = document.getElementById('plan-vip-tarifa-min');
    const vipTarifaMaxEl = document.getElementById('plan-vip-tarifa-max');
    const premiumDescEl = document.getElementById('plan-premium-description');
    const premiumTarifaMinEl = document.getElementById('plan-premium-tarifa-min');
    const premiumTarifaMaxEl = document.getElementById('plan-premium-tarifa-max');
    const luxuryDescEl = document.getElementById('plan-luxury-description');
    const luxuryCuposEl = document.getElementById('plan-luxury-cupos');

    const plans = {
      vip: {
        name: 'VIP Black',
        description: vipDescEl ? vipDescEl.value : 'Visibilidad premium para destacar',
        prices: {
          7: parseInt(document.getElementById('plan-vip-price-7')?.value) || 19990,
          15: parseInt(document.getElementById('plan-vip-price-15')?.value) || 34990,
          30: parseInt(document.getElementById('plan-vip-price-30')?.value) || 49990
        },
        price: parseInt(document.getElementById('plan-vip-price-30')?.value) || 49990,
        tarifaMin: vipTarifaMinEl ? parseInt(vipTarifaMinEl.value) || 100000 : 100000,
        tarifaMax: vipTarifaMaxEl ? parseInt(vipTarifaMaxEl.value) || 199999 : 199999,
        photos: parseInt(document.getElementById('plan-vip-photos')?.value) || 10,
        videos: parseInt(document.getElementById('plan-vip-videos')?.value) || 2,
        instantes: parseInt(document.getElementById('plan-vip-instantes')?.value) ?? 3,
        instantesDuracion: parseInt(document.getElementById('plan-vip-instantes-duracion')?.value) ?? 12,
        estados: parseInt(document.getElementById('plan-vip-estados')?.value) ?? 2,
        estadosDuracion: parseInt(document.getElementById('plan-vip-estados-duracion')?.value) ?? 6,
        features: document.getElementById('plan-vip-features')?.value?.split('\n').filter(f => f.trim()) || [],
        active: document.getElementById('plan-vip-active')?.checked ?? true
      },
      premium: {
        name: 'Premium Select',
        description: premiumDescEl ? premiumDescEl.value : 'La mejor relación calidad-precio',
        prices: {
          7: parseInt(document.getElementById('plan-premium-price-7')?.value) || 29990,
          15: parseInt(document.getElementById('plan-premium-price-15')?.value) || 54990,
          30: parseInt(document.getElementById('plan-premium-price-30')?.value) || 79990
        },
        price: parseInt(document.getElementById('plan-premium-price-30')?.value) || 79990,
        tarifaMin: premiumTarifaMinEl ? parseInt(premiumTarifaMinEl.value) || 200000 : 200000,
        tarifaMax: premiumTarifaMaxEl ? parseInt(premiumTarifaMaxEl.value) || 999999999 : 999999999,
        photos: parseInt(document.getElementById('plan-premium-photos')?.value) || 15,
        videos: parseInt(document.getElementById('plan-premium-videos')?.value) || 4,
        instantes: parseInt(document.getElementById('plan-premium-instantes')?.value) ?? 5,
        instantesDuracion: parseInt(document.getElementById('plan-premium-instantes-duracion')?.value) ?? 24,
        estados: parseInt(document.getElementById('plan-premium-estados')?.value) ?? 5,
        estadosDuracion: parseInt(document.getElementById('plan-premium-estados-duracion')?.value) ?? 12,
        features: document.getElementById('plan-premium-features')?.value?.split('\n').filter(f => f.trim()) || [],
        active: document.getElementById('plan-premium-active')?.checked ?? true,
        featured: document.getElementById('plan-premium-featured')?.checked ?? true
      },
      luxury: {
        name: 'Luxury & Exclusive',
        description: luxuryDescEl ? luxuryDescEl.value : 'Exclusividad total, sin límites',
        prices: {
          7: parseInt(document.getElementById('plan-luxury-price-7')?.value) || 59990,
          15: parseInt(document.getElementById('plan-luxury-price-15')?.value) || 99990,
          30: parseInt(document.getElementById('plan-luxury-price-30')?.value) || 149990
        },
        price: parseInt(document.getElementById('plan-luxury-price-30')?.value) || 149990,
        tarifaMin: 100000,
        tarifaMax: 999999999,
        cupos: luxuryCuposEl ? parseInt(luxuryCuposEl.value) || 50 : 50,
        photos: parseInt(document.getElementById('plan-luxury-photos')?.value) || 0,
        videos: parseInt(document.getElementById('plan-luxury-videos')?.value) || 0,
        instantes: parseInt(document.getElementById('plan-luxury-instantes')?.value) ?? 0,
        instantesDuracion: parseInt(document.getElementById('plan-luxury-instantes-duracion')?.value) ?? 48,
        estados: parseInt(document.getElementById('plan-luxury-estados')?.value) ?? 0,
        estadosDuracion: parseInt(document.getElementById('plan-luxury-estados-duracion')?.value) ?? 24,
        features: document.getElementById('plan-luxury-features')?.value?.split('\n').filter(f => f.trim()) || [],
        active: document.getElementById('plan-luxury-active')?.checked ?? true,
        limited: document.getElementById('plan-luxury-limited')?.checked ?? false
      }
    };

    await savePlans(plans);

    console.log('✅ Planes guardados en AWS:', plans);
    showPlansMessage('✓ Planes guardados correctamente. Los cambios se reflejarán en el formulario de registro.', 'success');

    const saveBtn = document.getElementById('save-plans-btn');
    if (saveBtn) {
      const originalText = saveBtn.textContent;
      saveBtn.textContent = '✓ Guardado!';
      saveBtn.style.background = '#10B981';
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '';
      }, 2000);
    }
  } catch (error) {
    console.error('Error guardando planes:', error);
    showPlansMessage('❌ Error al guardar los planes. Por favor intenta de nuevo.', 'error');
  }
}

function resetPlansToDefault() {
  if (confirm('¿Estás seguro de restaurar los planes a sus valores predeterminados?')) {
    savePlans(DEFAULT_PLANS);
    loadPlansToForm();
    showPlansMessage('✓ Planes restaurados a valores predeterminados.', 'success');
  }
}

function showPlansMessage(text, type) {
  const msgEl = document.getElementById('plans-message');
  if (msgEl) {
    msgEl.textContent = text;
    msgEl.className = `form-message ${type}`;
    msgEl.style.display = 'block';
    setTimeout(() => {
      msgEl.style.display = 'none';
    }, 4000);
  }
}

// Event listeners para planes
const savePlansBtn = document.getElementById('save-plans-btn');
const resetPlansBtn = document.getElementById('reset-plans-btn');
const planesTabBtn = document.querySelector('[data-tab="planes"]');

if (savePlansBtn) {
  savePlansBtn.addEventListener('click', savePlansFromForm);
}

if (resetPlansBtn) {
  resetPlansBtn.addEventListener('click', resetPlansToDefault);
}

if (planesTabBtn) {
  planesTabBtn.addEventListener('click', () => {
    loadPlansToForm();
    renderDiscountCodes();
  });
}

// ========================================
// GESTIÓN DE CÓDIGOS DE DESCUENTO
// ========================================

async function loadDiscountCodes() {
  const stored = await DataService.getConfig('luxuryDiscountCodes');
  return stored || [];
}

async function saveDiscountCodes(codes) {
  await DataService.setConfig('luxuryDiscountCodes', codes);
}

async function renderDiscountCodes() {
  const codesList = document.getElementById('discount-codes-list');
  const codesEmpty = document.getElementById('discount-codes-empty');
  
  if (!codesList) return;
  
  const codes = await loadDiscountCodes();
  
  if (codes.length === 0) {
    codesList.style.display = 'none';
    if (codesEmpty) codesEmpty.style.display = 'block';
    return;
  }
  
  codesList.style.display = 'grid';
  if (codesEmpty) codesEmpty.style.display = 'none';
  
  codesList.innerHTML = codes.map(code => {
    const isExpired = code.expiry && new Date(code.expiry) < new Date();
    const usesText = code.maxUses === 0 ? 'Ilimitado' : `${code.usedCount || 0}/${code.maxUses}`;
    const discountText = code.type === 'free' ? '100% GRATIS' : `${code.value}% OFF`;
    const plansText = code.plans === 'all' ? 'Todos' : code.plans.toUpperCase();
    // Corregir visualización de fecha: extraer solo la parte de fecha (YYYY-MM-DD) antes de convertir
    const expiryText = code.expiry ? new Date(code.expiry).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : 'Sin expiración';
    const statusClass = isExpired ? 'status-rechazado' : (code.active ? 'status-aprobado' : 'status-pendiente');
    const statusText = isExpired ? 'Expirado' : (code.active ? 'Activo' : 'Inactivo');
    
    return `
      <div class="admin-item" data-code-id="${code.id}" style="flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 200px;">
          <div class="admin-item-name" style="font-size: 18px; font-family: monospace; letter-spacing: 2px;">${code.code}</div>
          <div class="admin-item-email" style="margin-top: 8px;">
            <span style="background: rgba(212,175,55,0.2); color: var(--gold); padding: 4px 8px; border-radius: 4px; font-weight: 600;">${discountText}</span>
            <span style="margin-left: 8px;">Planes: ${plansText}</span>
          </div>
        </div>
        <div style="display: flex; gap: 24px; align-items: center;">
          <div style="text-align: center;">
            <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Usos</div>
            <div style="color: var(--text); font-weight: 600;">${usesText}</div>
          </div>
          <div style="text-align: center;">
            <div style="color: var(--muted); font-size: 11px; text-transform: uppercase;">Expira</div>
            <div style="color: var(--text); font-weight: 600;">${expiryText}</div>
          </div>
          <span class="admin-item-status ${statusClass}">${statusText}</span>
        </div>
        <div class="admin-item-actions">
          <button class="admin-item-btn ${code.active ? 'admin-reject' : 'admin-approve'}" onclick="toggleDiscountCode('${code.id}')">${code.active ? 'Desactivar' : 'Activar'}</button>
          <button class="admin-item-btn admin-reject" onclick="deleteDiscountCode('${code.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

async function createDiscountCode() {
  const codeInput = document.getElementById('new-code-name');
  const typeSelect = document.getElementById('new-code-type');
  const valueInput = document.getElementById('new-code-value');
  const usesInput = document.getElementById('new-code-uses');
  const plansSelect = document.getElementById('new-code-plans');
  const expiryInput = document.getElementById('new-code-expiry');
  
  const code = codeInput.value.trim().toUpperCase();
  const type = typeSelect.value;
  const value = type === 'free' ? 100 : (parseInt(valueInput.value) || 0);
  const maxUses = parseInt(usesInput.value) || 0;
  const plans = plansSelect.value;

  // Corregir fecha de expiración: construir fecha en UTC para evitar desfase por zona horaria
  let expiry = null;
  if (expiryInput.value) {
    // Parsear fecha como YYYY-MM-DD y agregar 23:59:59 en UTC
    const [year, month, day] = expiryInput.value.split('-').map(Number);
    // Date.UTC usa mes indexado desde 0, por eso restamos 1 al mes
    expiry = new Date(Date.UTC(year, month - 1, day, 23, 59, 59)).toISOString();
  }
  
  if (!code) {
    alert('Por favor ingresa un código');
    return;
  }
  
  if (code.length < 3) {
    alert('El código debe tener al menos 3 caracteres');
    return;
  }
  
  if (type === 'percentage' && (value < 1 || value > 100)) {
    alert('El porcentaje debe estar entre 1 y 100');
    return;
  }
  
  const codes = await loadDiscountCodes();
  
  // Check if code already exists
  if (codes.some(c => c.code === code)) {
    alert('Este código ya existe');
    return;
  }
  
  const newCode = {
    id: 'code_' + Date.now(),
    code: code,
    type: type,
    value: value,
    maxUses: maxUses,
    usedCount: 0,
    plans: plans,
    expiry: expiry,
    active: true,
    createdAt: new Date().toISOString()
  };
  
  codes.push(newCode);
  await saveDiscountCodes(codes);
  
  // Clear form
  codeInput.value = '';
  valueInput.value = '';
  usesInput.value = '0';
  expiryInput.value = '';
  typeSelect.value = 'percentage';
  plansSelect.value = 'all';
  
  renderDiscountCodes();
  showPlansMessage('✓ Código de descuento creado correctamente', 'success');
}

window.toggleDiscountCode = async (id) => {
  const codes = await loadDiscountCodes();
  const code = codes.find(c => c.id === id);
  if (code) {
    code.active = !code.active;
    await saveDiscountCodes(codes);
    renderDiscountCodes();
  }
};

window.deleteDiscountCode = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este código?')) return;
  
  let codes = await loadDiscountCodes();
  codes = codes.filter(c => c.id !== id);
  await saveDiscountCodes(codes);
  renderDiscountCodes();
};

// Event listeners para códigos de descuento
const createCodeBtn = document.getElementById('create-code-btn');
const codeTypeSelect = document.getElementById('new-code-type');

if (createCodeBtn) {
  createCodeBtn.addEventListener('click', createDiscountCode);
}

// Toggle value input visibility based on type
if (codeTypeSelect) {
  codeTypeSelect.addEventListener('change', () => {
    const valueInput = document.getElementById('new-code-value');
    if (codeTypeSelect.value === 'free') {
      valueInput.value = '100';
      valueInput.disabled = true;
    } else {
      valueInput.disabled = false;
      valueInput.value = '';
    }
  });
}

// ========================================
// GESTIÓN DE DATOS BANCARIOS Y OPCIONES DE PAGO
// ========================================

const DEFAULT_BANK_DATA = {
  bankName: '',
  accountType: '',
  accountNumber: '',
  rut: '',
  holder: '',
  email: ''
};

const DEFAULT_PAYMENT_OPTIONS = {
  allowPayLater: true,
  requireTransferReceipt: true,
  requireInterview: true
};

async function loadBankData() {
  const stored = await DataService.getConfig('luxuryBankData');
  return stored || { ...DEFAULT_BANK_DATA };
}

async function saveBankData(data) {
  await DataService.setConfig('luxuryBankData', data);
}

async function loadPaymentOptions() {
  const stored = await DataService.getConfig('luxuryPaymentOptions');
  return stored || { ...DEFAULT_PAYMENT_OPTIONS };
}

async function savePaymentOptions(options) {
  await DataService.setConfig('luxuryPaymentOptions', options);
}

async function loadBankDataToForm() {
  const data = await loadBankData();
  
  const bankNameEl = document.getElementById('bank-name');
  const accountTypeEl = document.getElementById('bank-account-type');
  const accountNumberEl = document.getElementById('bank-account-number');
  const rutEl = document.getElementById('bank-rut');
  const holderEl = document.getElementById('bank-holder');
  const emailEl = document.getElementById('bank-email');
  
  if (bankNameEl) bankNameEl.value = data.bankName;
  if (accountTypeEl) accountTypeEl.value = data.accountType;
  if (accountNumberEl) accountNumberEl.value = data.accountNumber;
  if (rutEl) rutEl.value = data.rut;
  if (holderEl) holderEl.value = data.holder;
  if (emailEl) emailEl.value = data.email;
}

async function loadPaymentOptionsToForm() {
  const options = await loadPaymentOptions();
  
  const allowPayLaterEl = document.getElementById('allow-pay-later');
  const requireReceiptEl = document.getElementById('require-transfer-receipt');
  const requireInterviewEl = document.getElementById('require-interview');
  
  if (allowPayLaterEl) allowPayLaterEl.checked = options.allowPayLater;
  if (requireReceiptEl) requireReceiptEl.checked = options.requireTransferReceipt;
  if (requireInterviewEl) requireInterviewEl.checked = options.requireInterview;
}

async function saveBankDataFromForm() {
  const data = {
    bankName: document.getElementById('bank-name')?.value || DEFAULT_BANK_DATA.bankName,
    accountType: document.getElementById('bank-account-type')?.value || DEFAULT_BANK_DATA.accountType,
    accountNumber: document.getElementById('bank-account-number')?.value || DEFAULT_BANK_DATA.accountNumber,
    rut: document.getElementById('bank-rut')?.value || DEFAULT_BANK_DATA.rut,
    holder: document.getElementById('bank-holder')?.value || DEFAULT_BANK_DATA.holder,
    email: document.getElementById('bank-email')?.value || DEFAULT_BANK_DATA.email
  };
  
  await saveBankData(data);
  showBankMessage('✓ Datos bancarios guardados correctamente', 'success');
}

async function savePaymentOptionsFromForm() {
  const options = {
    allowPayLater: document.getElementById('allow-pay-later')?.checked ?? true,
    requireTransferReceipt: document.getElementById('require-transfer-receipt')?.checked ?? true,
    requireInterview: document.getElementById('require-interview')?.checked ?? true
  };
  
  await savePaymentOptions(options);
  showBankMessage('✓ Opciones de pago guardadas correctamente', 'success');
}

function showBankMessage(text, type) {
  const msgEl = document.getElementById('bank-message');
  if (msgEl) {
    msgEl.textContent = text;
    msgEl.className = `form-message ${type}`;
    msgEl.style.display = 'block';
    setTimeout(() => {
      msgEl.style.display = 'none';
    }, 4000);
  }
}

// ============================================
// CONFIGURACIÓN DE HORARIOS DE ENTREVISTA
// ============================================

function generateInterviewTimes(startTime, endTime, interval) {
  const times = [];
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let currentHour = startHour;
  let currentMin = startMin;
  
  while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
    const hour24 = currentHour;
    const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    const timeValue = `${hour24.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    const timeLabel = `${hour12.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')} ${ampm}`;
    
    times.push({ value: timeValue, label: timeLabel });
    
    currentMin += interval;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return times;
}

function updateInterviewTimesPreview() {
  const startTime = document.getElementById('interview-start-time')?.value || '10:00';
  const endTime = document.getElementById('interview-end-time')?.value || '20:00';
  const interval = parseInt(document.getElementById('interview-interval')?.value || '30');
  
  const times = generateInterviewTimes(startTime, endTime, interval);
  const previewEl = document.getElementById('interview-times-preview');
  
  if (previewEl) {
    previewEl.innerHTML = times.map(t => 
      `<span style="background: rgba(139,92,246,0.2); color: #A78BFA; padding: 6px 12px; border-radius: 6px; font-size: 13px;">${t.label}</span>`
    ).join('');
  }
}

async function saveInterviewSchedule() {
  const startTime = document.getElementById('interview-start-time')?.value || '10:00';
  const endTime = document.getElementById('interview-end-time')?.value || '20:00';
  const interval = parseInt(document.getElementById('interview-interval')?.value || '30');
  
  const schedule = {
    startTime,
    endTime,
    interval,
    times: generateInterviewTimes(startTime, endTime, interval)
  };
  
  await DataService.setConfig('luxuryInterviewSchedule', schedule);
  showBankMessage('✓ Horarios de entrevista guardados correctamente', 'success');
}

async function loadInterviewScheduleToForm() {
  const schedule = await DataService.getConfig('luxuryInterviewSchedule');
  if (schedule) {
    const startEl = document.getElementById('interview-start-time');
    const endEl = document.getElementById('interview-end-time');
    const intervalEl = document.getElementById('interview-interval');
    
    if (startEl) startEl.value = schedule.startTime;
    if (endEl) endEl.value = schedule.endTime;
    if (intervalEl) intervalEl.value = schedule.interval;
  }
  updateInterviewTimesPreview();
}

// Event listeners para horarios de entrevista
const saveInterviewScheduleBtn = document.getElementById('save-interview-schedule-btn');
const interviewStartTime = document.getElementById('interview-start-time');
const interviewEndTime = document.getElementById('interview-end-time');
const interviewInterval = document.getElementById('interview-interval');

if (saveInterviewScheduleBtn) {
  saveInterviewScheduleBtn.addEventListener('click', saveInterviewSchedule);
}

// Update preview when values change
if (interviewStartTime) {
  interviewStartTime.addEventListener('change', updateInterviewTimesPreview);
}
if (interviewEndTime) {
  interviewEndTime.addEventListener('change', updateInterviewTimesPreview);
}
if (interviewInterval) {
  interviewInterval.addEventListener('change', updateInterviewTimesPreview);
}

// Event listeners para datos bancarios
const saveBankBtn = document.getElementById('save-bank-btn');
const savePaymentOptionsBtn = document.getElementById('save-payment-options-btn');

if (saveBankBtn) {
  saveBankBtn.addEventListener('click', saveBankDataFromForm);
}

if (savePaymentOptionsBtn) {
  savePaymentOptionsBtn.addEventListener('click', savePaymentOptionsFromForm);
}

// Load bank data when planes tab is clicked
if (planesTabBtn) {
  const originalClick = planesTabBtn.onclick;
  planesTabBtn.addEventListener('click', () => {
    loadBankDataToForm();
    loadPaymentOptionsToForm();
    loadInterviewScheduleToForm();
  });
}

// ========== SERVICIOS Y NOSOTROS ==========

// Funciones para Servicios
async function loadServiciosToForm() {
  const serviciosList = document.getElementById('servicios-list');
  const faqList = document.getElementById('faq-list');
  const serviciosActive = document.getElementById('servicios-active');
  
  if (!serviciosList || !faqList || !serviciosActive) {
    console.error('Elementos no encontrados en el DOM');
    return;
  }
  
  const data = await DataService.getServiciosConfig() || { active: true, servicios: [], faq: [] };
  
  serviciosActive.checked = data.active;
  
  // Cargar servicios
  serviciosList.innerHTML = data.servicios.map((s, idx) => `
    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.2);">
      <div style="display: grid; grid-template-columns: 1fr 1fr 100px; gap: 12px; margin-bottom: 12px;">
        <input type="text" class="servicio-nombre" value="${s.nombre || ''}" placeholder="Nombre del servicio" style="background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; font-size: 12px;" />
        <input type="text" class="servicio-duracion" value="${s.duracion || ''}" placeholder="Duración (ej: 1 hora)" style="background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; font-size: 12px;" />
        <input type="number" class="servicio-precio" value="${s.precio || ''}" placeholder="Precio" style="background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; font-size: 12px;" />
      </div>
      <textarea class="servicio-descripcion" placeholder="Descripción completa del servicio" style="width: 100%; background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; margin-bottom: 12px; font-family: inherit; font-size: 12px; min-height: 80px; resize: vertical;">${s.descripcion || ''}</textarea>
      <textarea class="servicio-incluye" placeholder="Qué incluye (una línea por característica)" style="width: 100%; background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; margin-bottom: 12px; font-family: inherit; font-size: 12px; min-height: 80px; resize: vertical;">${s.incluye || ''}</textarea>
      <button type="button" class="remove-servicio-btn" data-index="${idx}" style="background: #DC2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Eliminar</button>
    </div>
  `).join('');
  
  // Event listeners para eliminar servicios
  serviciosList.querySelectorAll('.remove-servicio-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.index);
      data.servicios.splice(idx, 1);
      await DataService.setConfig('servicios', data);
      loadServiciosToForm();
    });
  });

  // Cargar FAQ
  faqList.innerHTML = data.faq.map((f, idx) => `
    <div style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.2);">
      <input type="text" class="faq-pregunta" value="${f.pregunta}" placeholder="Pregunta" style="width: 100%; background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; margin-bottom: 8px;" />
      <textarea class="faq-respuesta" placeholder="Respuesta" style="width: 100%; background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; margin-bottom: 8px; height: 80px; font-family: inherit;">${f.respuesta}</textarea>
      <button type="button" class="remove-faq-btn" data-index="${idx}" style="background: #DC2626; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">Eliminar</button>
    </div>
  `).join('');
  
  // Event listeners para eliminar FAQ
  faqList.querySelectorAll('.remove-faq-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.index);
      data.faq.splice(idx, 1);
      await DataService.setConfig('servicios', data);
      loadServiciosToForm();
    });
  });

  // Event listeners para agregar servicios y FAQ
  const addServicioBtn = document.getElementById('add-servicio-btn');
  if (addServicioBtn) {
    addServicioBtn.onclick = async (e) => {
      e.preventDefault();
      data.servicios.push({ nombre: '', descripcion: '', duracion: '', precio: 0, incluye: '' });
      await DataService.setConfig('servicios', data);
      loadServiciosToForm();
    };
  }

  const addFaqBtn = document.getElementById('add-faq-btn');
  if (addFaqBtn) {
    addFaqBtn.onclick = async (e) => {
      e.preventDefault();
      data.faq.push({ pregunta: '', respuesta: '' });
      await DataService.setConfig('servicios', data);
      loadServiciosToForm();
    };
  }

  const saveServiciosBtn = document.getElementById('save-servicios-btn');
  if (saveServiciosBtn) {
    saveServiciosBtn.onclick = (e) => {
      e.preventDefault();
      saveServiciosFromForm();
    };
  }
}

async function saveServiciosFromForm() {
  const data = {
    active: document.getElementById('servicios-active').checked,
    servicios: [],
    faq: []
  };

  // Recolectar servicios
  document.querySelectorAll('#servicios-list > div').forEach(div => {
    const nombre = div.querySelector('.servicio-nombre').value;
    const descripcion = div.querySelector('.servicio-descripcion').value;
    const duracion = div.querySelector('.servicio-duracion').value;
    const precio = parseInt(div.querySelector('.servicio-precio').value) || 0;
    const incluye = div.querySelector('.servicio-incluye').value;
    
    if (nombre && descripcion && precio) {
      data.servicios.push({ nombre, descripcion, duracion, precio, incluye });
    }
  });

  // Recolectar FAQ
  document.querySelectorAll('#faq-list > div').forEach(div => {
    const pregunta = div.querySelector('.faq-pregunta').value;
    const respuesta = div.querySelector('.faq-respuesta').value;
    
    if (pregunta && respuesta) {
      data.faq.push({ pregunta, respuesta });
    }
  });

  await DataService.setConfig('servicios', data);
  
  const msg = document.getElementById('servicios-message');
  msg.textContent = '✓ Servicios guardados correctamente';
  msg.className = 'form-message success';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
}

// Funciones para Nosotros
async function loadNosotrosToForm() {
  const data = await DataService.getNosotrosConfig() || { active: true, nombre: '', email: '', telefono: '', whatsapp: '', direccion: '', info: [], legal: '' };
  
  document.getElementById('nosotros-active').checked = data.active;
  document.getElementById('nosotros-nombre').value = data.nombre || '';
  document.getElementById('nosotros-email').value = data.email || '';
  document.getElementById('nosotros-telefono').value = data.telefono || '';
  document.getElementById('nosotros-whatsapp').value = data.whatsapp || '';
  document.getElementById('nosotros-direccion').value = data.direccion || '';
  document.getElementById('nosotros-legal').value = data.legal || '';
  
  // Cargar información adicional
  const infoList = document.getElementById('nosotros-info-list');
  if (!infoList) {
    console.error('nosotros-info-list no encontrado');
    return;
  }
  
  if (data.info && data.info.length > 0) {
    infoList.innerHTML = data.info.map((info, idx) => `
      <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border: 1px solid rgba(212,175,55,0.2);">
        <div style="display: grid; grid-template-columns: 1fr 80px; gap: 8px; margin-bottom: 8px;">
          <input type="text" class="info-titulo" value="${info.titulo || ''}" placeholder="Título (ej: Horarios, Promoción, etc.)" style="background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; font-size: 12px;" />
          <button type="button" class="remove-info-btn" data-index="${idx}" style="background: #DC2626; color: white; border: none; padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Eliminar</button>
        </div>
        <textarea class="info-contenido" placeholder="Contenido de la información" style="width: 100%; background: rgba(0,0,0,0.4); color: var(--text); border: 1px solid rgba(212,175,55,0.3); border-radius: 6px; padding: 8px; font-family: inherit; font-size: 12px; min-height: 80px; resize: vertical;">${info.contenido || ''}</textarea>
      </div>
    `).join('');
  } else {
    infoList.innerHTML = '';
  }
  
  // Event listeners para eliminar información
  infoList.querySelectorAll('.remove-info-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.index);
      data.info.splice(idx, 1);
      await DataService.setConfig('nosotros', data);
      loadNosotrosToForm();
    });
  });
  
  // Event listener para agregar información
  const addInfoBtn = document.getElementById('add-nosotros-info-btn');
  if (addInfoBtn) {
    addInfoBtn.onclick = async (e) => {
      e.preventDefault();
      data.info.push({ titulo: '', contenido: '' });
      await DataService.setConfig('nosotros', data);
      loadNosotrosToForm();
    };
  }
}

async function saveNosotrosFromForm() {
  const data = {
    active: document.getElementById('nosotros-active').checked,
    nombre: document.getElementById('nosotros-nombre').value,
    email: document.getElementById('nosotros-email').value,
    telefono: document.getElementById('nosotros-telefono').value,
    whatsapp: document.getElementById('nosotros-whatsapp').value,
    direccion: document.getElementById('nosotros-direccion').value,
    info: [],
    legal: document.getElementById('nosotros-legal').value
  };
  
  // Recolectar información adicional
  document.querySelectorAll('#nosotros-info-list > div').forEach(div => {
    const titulo = div.querySelector('.info-titulo').value;
    const contenido = div.querySelector('.info-contenido').value;
    
    if (titulo && contenido) {
      data.info.push({ titulo, contenido });
    }
  });

  await DataService.setConfig('nosotros', data);
  
  const msg = document.getElementById('nosotros-message');
  msg.textContent = '✓ Información guardada correctamente';
  msg.className = 'form-message success';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
}

// Event Listeners para Servicios
// (Se registran dentro de loadServiciosToForm para asegurar que los elementos existan)

// Event Listeners para Nosotros
document.getElementById('save-nosotros-btn')?.addEventListener('click', saveNosotrosFromForm);

// ============================================
// CONFIGURACIÓN DE CORREO
// ============================================
async function loadCorreoConfig() {
  const config = await DataService.getConfig('emailConfig') || {};
  
  document.getElementById('correo-active').checked = config.active || false;
  document.getElementById('correo-provider').value = config.provider || '';
  document.getElementById('smtp-host').value = config.smtp?.host || '';
  document.getElementById('smtp-port').value = config.smtp?.port || '';
  document.getElementById('smtp-secure').value = config.smtp?.secure || 'tls';
  document.getElementById('smtp-user').value = config.smtp?.user || '';
  document.getElementById('smtp-pass').value = config.smtp?.pass || '';
  document.getElementById('api-key').value = config.api?.key || '';
  document.getElementById('api-domain').value = config.api?.domain || '';
  document.getElementById('correo-from').value = config.from || '';
  document.getElementById('correo-to').value = config.to || '';
  document.getElementById('correo-cc').value = config.cc || '';
  document.getElementById('correo-subject').value = config.subject || 'Nuevo mensaje de contacto - {nombre}';
  
  if (config.template) {
    document.getElementById('correo-template').value = config.template;
  }
  
  // Mostrar/ocultar configuración según proveedor
  updateProviderConfig(config.provider);
}

function updateProviderConfig(provider) {
  const smtpConfig = document.getElementById('smtp-config');
  const apiConfig = document.getElementById('api-config');
  const domainGroup = document.getElementById('api-domain-group');
  
  smtpConfig.style.display = 'none';
  apiConfig.style.display = 'none';
  
  if (provider === 'smtp' || provider === 'gmail' || provider === 'outlook') {
    smtpConfig.style.display = 'block';
    
    // Pre-llenar configuración para proveedores conocidos
    if (provider === 'gmail') {
      document.getElementById('smtp-host').placeholder = 'smtp.gmail.com';
      document.getElementById('smtp-port').placeholder = '587';
    } else if (provider === 'outlook') {
      document.getElementById('smtp-host').placeholder = 'smtp.office365.com';
      document.getElementById('smtp-port').placeholder = '587';
    }
  } else if (provider === 'sendgrid' || provider === 'mailgun' || provider === 'ses') {
    apiConfig.style.display = 'block';
    if (domainGroup) {
      domainGroup.style.display = provider === 'mailgun' ? 'block' : 'none';
    }
  }
}

async function saveCorreoConfig() {
  const config = {
    active: document.getElementById('correo-active').checked,
    provider: document.getElementById('correo-provider').value,
    smtp: {
      host: document.getElementById('smtp-host').value,
      port: document.getElementById('smtp-port').value,
      secure: document.getElementById('smtp-secure').value,
      user: document.getElementById('smtp-user').value,
      pass: document.getElementById('smtp-pass').value
    },
    api: {
      key: document.getElementById('api-key').value,
      domain: document.getElementById('api-domain').value
    },
    from: document.getElementById('correo-from').value,
    to: document.getElementById('correo-to').value,
    cc: document.getElementById('correo-cc').value,
    subject: document.getElementById('correo-subject').value,
    template: document.getElementById('correo-template').value
  };
  
  await DataService.setConfig('emailConfig', config);
  
  const msg = document.getElementById('correo-message');
  msg.textContent = '✓ Configuración de correo guardada correctamente';
  msg.className = 'form-message success';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 3000);
}

async function testCorreo() {
  const config = await DataService.getConfig('emailConfig') || {};
  
  if (!config.active) {
    alert('Las notificaciones por correo están desactivadas.');
    return;
  }
  
  if (!config.provider) {
    alert('Por favor, selecciona un proveedor de correo.');
    return;
  }
  
  if (!config.to) {
    alert('Por favor, configura un correo de destino.');
    return;
  }
  
  // Simular envío de prueba
  const msg = document.getElementById('correo-message');
  msg.textContent = '📧 Correo de prueba enviado (simulado). Cuando tengas un backend configurado, el correo se enviará realmente.';
  msg.className = 'form-message success';
  msg.style.display = 'block';
  setTimeout(() => msg.style.display = 'none', 5000);
  
  // Aquí iría la llamada real al backend para enviar el correo
  console.log('Test email config:', config);
}

// Admin Panel - Luxury1 - Updated 2026-01-25
// Event listeners para configuración de correo
document.getElementById('correo-provider')?.addEventListener('change', (e) => {
  updateProviderConfig(e.target.value);
});

document.getElementById('save-correo-btn')?.addEventListener('click', saveCorreoConfig);
document.getElementById('test-correo-btn')?.addEventListener('click', testCorreo);

// ========================================
// FUNCIONES DE UTILIDAD PARA REGISTROS
// ========================================

// Recargar registros desde AWS
window.recargarRegistros = async () => {
  const btn = event.target.closest('button');
  const originalText = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<span>⏳</span><span>Recargando...</span>';
  btn.style.opacity = '0.6';

  try {
    await loadRegistrosFromAPI();
    renderRegistros();
    updateRegistrosBadge();

    btn.innerHTML = '<span>✅</span><span>¡Recargado!</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }, 2000);

    console.log('✅ Registros recargados:', registros.length);
  } catch (error) {
    console.error('❌ Error recargando registros:', error);
    btn.innerHTML = '<span>❌</span><span>Error</span>';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
      btn.style.opacity = '1';
    }, 2000);
    alert('Error al recargar los registros. Revisa la consola para más detalles.');
  }
};

// Mostrar registros para limpiar
window.mostrarRegistrosParaLimpiar = async () => {
  const pendientes = registros.filter(r => r.status === 'pendiente');

  if (pendientes.length === 0) {
    alert('No hay registros pendientes para limpiar.');
    return;
  }

  // Crear lista de registros con checkbox
  let mensaje = '🗑️ LIMPIEZA DE REGISTROS ANTIGUOS\n\n';
  mensaje += 'Selecciona los IDs de los registros que deseas eliminar:\n\n';

  pendientes.forEach((reg, index) => {
    mensaje += `${index + 1}. ${reg.displayName || 'Sin nombre'} (@${reg.username || 'sin.usuario'})\n`;
    mensaje += `   ID: ${reg.id}\n`;
    mensaje += `   Fecha: ${reg.date}\n\n`;
  });

  mensaje += '\n⚠️ Esta acción NO se puede deshacer.\n\n';
  mensaje += 'Ingresa los números de los registros a eliminar separados por comas (Ej: 1,3,5):\n';
  mensaje += 'O escribe "todos" para eliminar todos los registros pendientes:';

  const respuesta = prompt(mensaje);

  if (!respuesta) return; // Cancelado

  let idsAEliminar = [];

  if (respuesta.toLowerCase().trim() === 'todos') {
    idsAEliminar = pendientes.map(r => r.id);
  } else {
    const indices = respuesta.split(',').map(s => parseInt(s.trim()) - 1);
    idsAEliminar = indices
      .filter(i => i >= 0 && i < pendientes.length)
      .map(i => pendientes[i].id);
  }

  if (idsAEliminar.length === 0) {
    alert('No se seleccionaron registros válidos.');
    return;
  }

  const confirmacion = confirm(`⚠️ ¿Estás seguro de eliminar ${idsAEliminar.length} registro(s)?\n\nEsta acción NO se puede deshacer.`);

  if (!confirmacion) return;

  // Eliminar registros
  let eliminados = 0;
  let errores = 0;

  for (const id of idsAEliminar) {
    try {
      await DataService.deleteRegistro(id);
      registros = registros.filter(r => r.id !== id);
      eliminados++;
    } catch (error) {
      console.error(`Error eliminando registro ${id}:`, error);
      errores++;
    }
  }

  renderRegistros();
  updateRegistrosBadge();

  if (errores > 0) {
    alert(`✅ ${eliminados} registro(s) eliminado(s)\n❌ ${errores} error(es)\n\nRevisa la consola para más detalles.`);
  } else {
    alert(`✅ ${eliminados} registro(s) eliminado(s) correctamente`);
  }
};

// ========================================
// VERIFICAR Y DESACTIVAR PERFILES VENCIDOS (Admin)
// ========================================
async function checkAndDeactivateExpiredProfilesAdmin() {
  console.log('🔍 Admin: Verificando perfiles vencidos...');

  const todayStr = new Date().toISOString().split('T')[0];
  let deactivated = 0;

  try {
    // Desactivar en approvedUsers
    const approvedUsers = await DataService.getApprovedUsers() || [];
    for (const user of approvedUsers) {
      if (user.planExpiry && user.planExpiry < todayStr && user.isActive !== false) {
        console.log(`⏰ Desactivando usuario vencido: ${user.displayName || user.email} (vencido: ${user.planExpiry})`);
        user.isActive = false;
        await DataService.updateUser(user.id, user);
        deactivated++;
      }
    }

    // Desactivar en approvedProfiles
    const approvedProfiles = await DataService.getApprovedProfiles() || [];
    for (const profile of approvedProfiles) {
      if (profile.planExpiry && profile.planExpiry < todayStr && profile.isActive !== false) {
        console.log(`⏰ Desactivando perfil vencido: ${profile.displayName || profile.email} (vencido: ${profile.planExpiry})`);
        profile.isActive = false;
        await DataService.updateProfile(profile.id, profile);
        deactivated++;
      }
    }

    if (deactivated > 0) {
      console.log(`✅ Admin: ${deactivated} perfiles/usuarios desactivados por vencimiento`);
    } else {
      console.log('✅ Admin: No hay perfiles vencidos para desactivar');
    }
  } catch (error) {
    console.error('❌ Error verificando perfiles vencidos:', error);
  }
}

// Cargar configuración de correo al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Admin panel inicializando...');

  // Cargar configuración de correo
  loadCorreoConfig();

  // Cargar clave de admin desde AWS
  await loadAdminPassword();
  console.log('Clave admin cargada:', ADMIN_PASSWORD ? 'Sí' : 'No');

  // Cargar registros desde AWS
  await loadRegistrosFromAPI();

  // Inicializar datos por defecto si no existen
  await initializeDefaultData();

  // VERIFICAR Y DESACTIVAR PERFILES VENCIDOS
  await checkAndDeactivateExpiredProfilesAdmin();

  // Los planes se inicializan automáticamente en loadPlans() si no existen
  console.log('✅ Admin panel inicializado completamente');
});