// ========================================
// VERIFICAR Y DESACTIVAR PERFILES VENCIDOS
// ========================================
async function checkAndDeactivateExpiredProfiles() {
  try {
    const approvedProfiles = await DataService.getApprovedUsers() || [];
    const today = new Date().toISOString().split('T')[0];
    let updated = false;

    for (const profile of approvedProfiles) {
      // Si el perfil tiene fecha de vencimiento y ya venció
      if (profile.planExpiry && profile.planExpiry < today && profile.isActive !== false) {
        console.log(`⏰ Perfil vencido detectado: ${profile.displayName || profile.email} - Desactivando...`);
        profile.isActive = false;
        updated = true;
      }
    }

    if (updated) {
      await DataService.saveApprovedUsers(approvedProfiles);
      console.log('✅ Perfiles vencidos desactivados correctamente');
    }
  } catch (error) {
    console.error('Error verificando perfiles vencidos:', error);
  }
}

// Ejecutar verificación al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  // Pequeño delay para asegurar que DataService esté listo
  setTimeout(checkAndDeactivateExpiredProfiles, 1000);
});

// Navegación móvil
const navToggle = document.querySelector('.nav-toggle');
const siteNav = document.querySelector('.site-nav');
if (navToggle && siteNav) {
  navToggle.addEventListener('click', () => {
    const open = siteNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
}

// Smooth scroll - solo para secciones, no para modals
for (const link of document.querySelectorAll('a[href^="#"]:not([href*="modal"])')) {
  link.addEventListener('click', (e) => {
    const targetId = link.getAttribute('href');
    if (!targetId || targetId === '#') return;
    
    const el = document.querySelector(targetId);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      siteNav?.classList.remove('open');
      navToggle?.setAttribute('aria-expanded', 'false');
    }
  });
}

// Año en footer
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = new Date().getFullYear();

// ========== CONTROL DE VISIBILIDAD DE BOTONES DEL FOOTER ==========
async function updateFooterLinks() {
  const servicios = await DataService.getServiciosConfig() || { active: false };
  const nosotros = await DataService.getNosotrosConfig() || { active: false };
  
  const serviciosLink = document.getElementById('footer-servicios-link');
  const nosotrosLink = document.getElementById('footer-nosotros-link');
  
  if (serviciosLink) {
    serviciosLink.style.display = servicios.active ? 'block' : 'none';
  }
  
  if (nosotrosLink) {
    nosotrosLink.style.display = nosotros.active ? 'block' : 'none';
  }
}

// Actualizar cuando carga la página
document.addEventListener('DOMContentLoaded', updateFooterLinks);

// ========== SISTEMA DE FILTROS DE PERFILES ==========
let activeFilters = {
  age: '',
  height: '',
  nationality: '',
  weight: ''
};

// Toggle panel de filtros
window.toggleFilter = () => {
  const panel = document.getElementById('filter-panel');
  const toggle = document.getElementById('filter-toggle');
  
  if (panel.style.display === 'none') {
    panel.style.display = 'block';
    toggle.classList.add('active');
  } else {
    panel.style.display = 'none';
    toggle.classList.remove('active');
  }
};

// Aplicar filtros
window.applyFilters = () => {
  activeFilters = {
    age: document.getElementById('filter-age')?.value || '',
    height: document.getElementById('filter-height')?.value || '',
    nationality: document.getElementById('filter-nationality')?.value || '',
    weight: document.getElementById('filter-weight')?.value || ''
  };
  
  // Mostrar tags de filtros activos
  updateFilterTags();
  
  // Refrescar todos los carruseles con filtros
  if (window.refreshCarouselsWithFilter) {
    window.refreshCarouselsWithFilter(activeFilters);
  }
  
  // Cerrar panel
  document.getElementById('filter-panel').style.display = 'none';
  document.getElementById('filter-toggle').classList.remove('active');
};

// Limpiar filtros
window.clearFilters = () => {
  activeFilters = { age: '', height: '', nationality: '', weight: '' };
  
  // Reset selects
  document.getElementById('filter-age').value = '';
  document.getElementById('filter-height').value = '';
  document.getElementById('filter-nationality').value = '';
  document.getElementById('filter-weight').value = '';
  
  // Ocultar tags
  document.getElementById('active-filters').style.display = 'none';
  
  // Refrescar sin filtros
  if (window.refreshCarouselsWithFilter) {
    window.refreshCarouselsWithFilter(activeFilters);
  }
};

// Actualizar tags de filtros activos
function updateFilterTags() {
  const container = document.getElementById('active-filters');
  const tagsContainer = document.getElementById('filter-tags');
  
  const filterLabels = {
    age: 'Edad',
    height: 'Estatura',
    nationality: 'Nacionalidad',
    weight: 'Peso'
  };
  
  const activeTags = Object.entries(activeFilters)
    .filter(([_, value]) => value !== '')
    .map(([key, value]) => ({
      key,
      label: filterLabels[key],
      value: formatFilterValue(key, value)
    }));
  
  if (activeTags.length > 0) {
    container.style.display = 'flex';
    tagsContainer.innerHTML = activeTags.map(tag => `
      <div class="filter-tag">
        <span>${tag.label}: ${tag.value}</span>
        <span class="filter-tag-remove" onclick="removeFilter('${tag.key}')">✕</span>
      </div>
    `).join('');
  } else {
    container.style.display = 'none';
  }
}

// Formatear valor de filtro para mostrar
function formatFilterValue(key, value) {
  if (key === 'age') {
    return value === '40+' ? '40+ años' : `${value} años`;
  } else if (key === 'height') {
    if (value === '170+') return '1.70+ m';
    const [min, max] = value.split('-');
    return `1.${min.slice(-2)} - 1.${max.slice(-2)} m`;
  } else if (key === 'weight') {
    return value === '75+' ? '75+ kg' : `${value} kg`;
  }
  return value;
}

// Remover filtro individual
window.removeFilter = (filterKey) => {
  activeFilters[filterKey] = '';
  document.getElementById(`filter-${filterKey === 'nationality' ? 'nationality' : filterKey}`).value = '';
  updateFilterTags();
  
  if (window.refreshCarouselsWithFilter) {
    window.refreshCarouselsWithFilter(activeFilters);
  }
};

// Función para verificar si un perfil pasa los filtros
window.profilePassesFilter = (profile, filters) => {
  // Si no hay filtros activos, pasa
  if (!filters || Object.values(filters).every(v => !v)) return true;
  
  // Filtro de edad
  if (filters.age) {
    const age = profile.physicalInfo?.age || profile.age || 0;
    if (!matchAgeRange(age, filters.age)) return false;
  }
  
  // Filtro de estatura
  if (filters.height) {
    const height = profile.physicalInfo?.height || profile.height || 0;
    if (!matchHeightRange(height, filters.height)) return false;
  }
  
  // Filtro de nacionalidad
  if (filters.nationality) {
    const nationality = (profile.nationality || profile.ethnicity || profile.physicalInfo?.ethnicity || '').toLowerCase();
    if (!nationality.includes(filters.nationality.toLowerCase())) return false;
  }
  
  // Filtro de peso
  if (filters.weight) {
    const weight = profile.physicalInfo?.weight || profile.weight || 0;
    if (!matchWeightRange(weight, filters.weight)) return false;
  }
  
  return true;
};

function matchAgeRange(age, range) {
  if (!age) return false;
  const ageNum = parseInt(age);
  if (range === '40+') return ageNum >= 40;
  const [min, max] = range.split('-').map(Number);
  return ageNum >= min && ageNum <= max;
}

function matchHeightRange(height, range) {
  if (!height) return false;
  const heightNum = parseInt(height);
  if (range === '170+') return heightNum >= 170;
  const [min, max] = range.split('-').map(Number);
  return heightNum >= min && heightNum < max;
}

function matchWeightRange(weight, range) {
  if (!weight) return false;
  const weightNum = parseInt(weight);
  if (range === '75+') return weightNum >= 75;
  const [min, max] = range.split('-').map(Number);
  return weightNum >= min && weightNum <= max;
}

// Actualizar navegación según estado de login
async function updateNavigation() {
  const currentUser = await DataService.getCurrentUser();
  const navCta = document.querySelector('.nav-cta');
  const navUl = document.querySelector('.site-nav ul');
  
  if (currentUser && navUl) {
    // Ocultar todos los links excepto Sala Oscura
    const allNavLinks = navUl.querySelectorAll('li');
    allNavLinks.forEach(li => {
      const link = li.querySelector('a');
      if (link) {
        // Mantener solo Sala Oscura visible
        if (link.classList.contains('btn-foro') || link.href.includes('salaoscura')) {
          li.style.display = 'block';
        } else {
          li.style.display = 'none';
        }
      }
    });
    
    // Agregar botón de cerrar sesión si no existe
    const existingLogout = document.querySelector('.nav-logout');
    if (!existingLogout) {
      const logoutItem = document.createElement('li');
      logoutItem.innerHTML = `<a class="nav-cta nav-logout" href="#" style="background: linear-gradient(135deg, #DC2626, #B91C1C); border: none;">Cerrar Sesión</a>`;
      logoutItem.querySelector('.nav-logout').addEventListener('click', async (e) => {
        e.preventDefault();
        await DataService.removeCurrentUser();
        // Redirigir a la página principal
        window.location.href = 'home';
      });
      navUl.appendChild(logoutItem);
    }
  }
}
document.addEventListener('DOMContentLoaded', updateNavigation);

// Animaciones al entrar en vista
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add('in-view');
  }
}, { threshold: 0.1 });
for (const el of document.querySelectorAll('.card')) observer.observe(el);

// Hero: parallax y entrada
const hero = document.querySelector('.hero');
if (hero) {
  // Parallax con el mouse: mueve el centro del gradiente
  let rafId = null;
  let mouseX = 0, mouseY = 0;
  const onMove = (e) => {
    mouseX = e.clientX / window.innerWidth * 100;
    mouseY = e.clientY / window.innerHeight * 100;
    if (!rafId) rafId = requestAnimationFrame(update);
  };
  const update = () => {
    document.documentElement.style.setProperty('--mx', mouseX + '%');
    document.documentElement.style.setProperty('--my', mouseY + '%');
    rafId = null;
  };
  window.addEventListener('mousemove', onMove, { passive: true });
}

// Cursor personalizado
const cursor = document.getElementById('cursor');
if (cursor) {
  let cx = 0, cy = 0;
  let tx = 0, ty = 0;
  let moving = false;

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

  const setHover = (on) => {
    cursor.classList.toggle('hover', !!on);
  };
  const interactive = document.querySelectorAll('a, button, .interactive');
  interactive.forEach(el => {
    el.addEventListener('mouseenter', () => setHover(true));
    el.addEventListener('mouseleave', () => setHover(false));
  });
}

// Age Gate simple
(function setupAgeGate() {
  const gate = document.getElementById('age-gate');
  if (!gate) return;

  const ACCEPT_KEY = 'agegateAcceptedAt';
  const DAY_MS = 24 * 60 * 60 * 1000;
  const acceptedAt = Number(localStorage.getItem(ACCEPT_KEY) || 0);
  const now = Date.now();
  const isValid = acceptedAt && (now - acceptedAt) < DAY_MS;

  const acceptBtn = document.getElementById('agegate-accept');
  const declineBtn = document.getElementById('agegate-decline');
  const statusEl = gate.querySelector('.agegate-status');
  const modal = gate.querySelector('.agegate-modal');

  const show = () => {
    gate.setAttribute('aria-hidden', 'false');
    document.body.classList.add('agegate-active');
    document.body.style.overflow = 'hidden';
    modal?.classList.remove('closing');
    window.addEventListener('keydown', escBlocker, true);
  };

  const hide = () => {
    if (modal) modal.classList.add('closing');
    setTimeout(() => {
      gate.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('agegate-active');
      document.body.style.overflow = '';
      modal?.classList.remove('closing');
      window.removeEventListener('keydown', escBlocker, true);
    }, 400);
  };

  const escBlocker = (e) => {
    if (gate.getAttribute('aria-hidden') === 'false' && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  if (!isValid) show();

  acceptBtn?.addEventListener('click', () => {
    localStorage.setItem(ACCEPT_KEY, String(Date.now()));
    hide();
  });

  declineBtn?.addEventListener('click', () => {
    if (statusEl) statusEl.textContent = 'Redirigiendo...';
    setTimeout(() => { window.location.href = 'https://www.google.com'; }, 800);
  });
})();

// ============================================
// Modal Management
// ============================================
function openModal(modalId) {
  console.log('🔧 Intentando abrir modal:', modalId);
  
  // Cerrar todos los modals primero
  document.getElementById('login-modal')?.setAttribute('aria-hidden', 'true');
  document.getElementById('contact-modal')?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Abrir el modal seleccionado
  const modal = document.getElementById(modalId);
  console.log('🔧 Modal encontrado:', modal ? 'Sí' : 'No');
  
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    console.log('✅ Modal abierto:', modalId);
  } else {
    console.error('❌ Modal no encontrado:', modalId);
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

// Manejar clicks en los links de modal
document.addEventListener('click', (e) => {
  let link = e.target;
  while (link && link.tagName !== 'A') {
    link = link.parentElement;
  }
  
  if (!link) return;
  
  const href = link.getAttribute('href');
  if (!href || !href.includes('modal')) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const modalId = href.replace('#', '');
  openModal(modalId);
});

// Botón Contacto del header (fallback directo)
document.querySelectorAll('a[href="#contact-modal"]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal('contact-modal');
  });
});

// Botón Publicate del header (fallback directo)
document.querySelectorAll('a[href="#login-modal"]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔐 Abriendo modal de login...');
    openModal('login-modal');
  });
});

// Login Modal - Manejar cierre y submit
(function setupLoginModal() {
  const modal = document.getElementById('login-modal');
  const closeBtn = document.getElementById('login-close');
  const overlay = modal?.querySelector('.login-overlay');
  const form = document.getElementById('login-form');
  const signupLink = document.getElementById('login-signup-link');

  if (!modal) return;

  const closeModal = () => {
    document.activeElement?.blur();
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  
  overlay?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // Cargar todas las fuentes EN PARALELO para velocidad
    const [approvedUsers, pendingRegistros] = await Promise.all([
      DataService.getApprovedUsers(),
      DataService.getPendingRegistros()
    ]);

    // Buscar la contraseña en TODAS las fuentes (puede estar en una u otra)
    const allSources = [...(approvedUsers || []), ...(pendingRegistros || [])];
    let storedPassword = null;
    for (const source of allSources) {
      if (source.email === email && source.password) {
        storedPassword = source.password;
        break;
      }
    }

    // Si no encontramos al usuario en ninguna fuente
    const userExists = allSources.some(u => u.email === email);
    if (!userExists) {
      alert('No se encontró una cuenta con ese correo. ¿Ya te registraste?');
      return;
    }

    // Verificar contraseña una sola vez
    if (!storedPassword || storedPassword.trim() !== password.trim()) {
      alert('Contraseña incorrecta. Por favor verifica tus credenciales.');
      return;
    }

    // Contraseña correcta - buscar el usuario aprobado
    const approvedUser = (approvedUsers || []).find(u => u.email === email && u.status === 'aprobado');
    if (approvedUser) {
      await DataService.setCurrentUser(approvedUser);
      closeModal();
      form.reset();
      window.location.href = 'profile';
      return;
    }

    // Buscar en registros pendientes
    const pendingUser = (pendingRegistros || []).find(u => u.email === email);
    if (pendingUser) {
      if (pendingUser.status === 'aprobado') {
        const currentUser = {
          id: pendingUser.id, email: pendingUser.email,
          displayName: pendingUser.displayName, username: pendingUser.username,
          whatsapp: pendingUser.whatsapp, city: pendingUser.city,
          commune: pendingUser.commune, bio: pendingUser.bio,
          age: pendingUser.age, birthdate: pendingUser.birthdate,
          selectedPlan: pendingUser.selectedPlan,
          registrationDate: pendingUser.date || new Date().toISOString(),
          priceHour: pendingUser.priceHour, priceTwoHours: pendingUser.priceTwoHours,
          priceOvernight: pendingUser.priceOvernight,
          avatar: pendingUser.avatar || null,
          status: 'aprobado',
          stats: pendingUser.stats || { views: 0, likes: 0, contacts: 0 }
        };
        await DataService.setCurrentUser(currentUser);
        closeModal();
        form.reset();
        window.location.href = 'profile';
      } else if (pendingUser.status === 'pendiente' || pendingUser.status === 'pending') {
        alert('⏳ Tu cuenta está pendiente de aprobación.\n\nNuestro equipo está revisando tu solicitud. Te contactaremos pronto por WhatsApp.');
      } else if (pendingUser.status === 'rechazado') {
        alert('❌ Tu solicitud fue rechazada.\n\nMotivo: ' + (pendingUser.rejectionReason || 'No especificado') + '\n\nPuedes contactarnos para más información.');
      }
    }
  });

  signupLink?.addEventListener('click', (e) => {
    e.preventDefault();
    closeModal();
    window.location.href = 'register';
  });
})();

// ============================================
// SISTEMA DE RECUPERACIÓN DE CONTRASEÑA
// ============================================
(function setupPasswordRecovery() {
  const loginModal = document.getElementById('login-modal');
  const recoveryModal = document.getElementById('recovery-modal');
  const forgotLink = document.getElementById('forgot-password-link');
  const backToLoginLink = document.getElementById('back-to-login');
  const recoveryClose = document.getElementById('recovery-close');
  const recoveryOverlay = document.getElementById('recovery-overlay');
  const recoveryForm = document.getElementById('recovery-form');
  
  if (!recoveryModal) return;
  
  // Abrir modal de recuperación
  forgotLink?.addEventListener('click', (e) => {
    e.preventDefault();
    loginModal.setAttribute('aria-hidden', 'true');
    recoveryModal.style.display = 'flex';
    recoveryModal.setAttribute('aria-hidden', 'false');
  });
  
  // Volver al login
  backToLoginLink?.addEventListener('click', (e) => {
    e.preventDefault();
    recoveryModal.style.display = 'none';
    recoveryModal.setAttribute('aria-hidden', 'true');
    loginModal.setAttribute('aria-hidden', 'false');
  });
  
  // Cerrar modal
  const closeRecoveryModal = () => {
    recoveryModal.style.display = 'none';
    recoveryModal.setAttribute('aria-hidden', 'true');
    recoveryForm?.reset();
  };
  
  recoveryClose?.addEventListener('click', closeRecoveryModal);
  recoveryOverlay?.addEventListener('click', closeRecoveryModal);
  
  // Enviar correo de recuperación
  recoveryForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('recovery-email').value;
    
    // Buscar usuario con ese email desde AWS
    const pendingRegistros = await DataService.getPendingRegistros() || [];
    const approvedUsers = await DataService.getApprovedUsers() || [];
    
    let user = approvedUsers.find(u => u.email === email);
    if (!user) user = pendingRegistros.find(u => u.email === email);
    
    if (!user) {
      alert('❌ No existe una cuenta registrada con ese correo electrónico.');
      return;
    }
    
    // Generar token de recuperación
    const recoveryToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiry = Date.now() + (24 * 60 * 60 * 1000); // 24 horas
    
    // Guardar token en AWS
    const recoveryRequests = await DataService.getPasswordRecoveryRequests() || [];
    recoveryRequests.push({
      email: email,
      token: recoveryToken,
      expiry: expiry,
      used: false,
      createdAt: new Date().toISOString()
    });
    await DataService.savePasswordRecoveryRequests(recoveryRequests);
    
    // URL de recuperación
    const recoveryUrl = `${window.location.origin}/reset?token=${recoveryToken}&email=${encodeURIComponent(email)}`;
    
    // Intentar enviar email usando AWS SES
    const emailConfig = await DataService.getEmailConfig() || {};
    
    if (emailConfig.active && emailConfig.provider) {
      // Simular envío de email (en producción usarías un backend)
      console.log('📧 Enviando correo de recuperación a:', email);
      console.log('🔗 Link de recuperación:', recoveryUrl);
      
      // Mostrar el enlace al usuario (en producción esto se enviaría por email)
      alert(`✅ Se ha enviado un enlace de recuperación a ${email}.\n\n⚠️ MODO DESARROLLO:\nComo no hay servidor de correo configurado, copia este enlace:\n\n${recoveryUrl}\n\nEste enlace expira en 24 horas.`);
    } else {
      // No hay configuración de correo, mostrar enlace directamente
      alert(`⚠️ El servidor de correo no está configurado.\n\n📧 Para configurarlo, ve al Panel Admin → Configuración → Correo.\n\n🔗 Enlace de recuperación (cópialo):\n\n${recoveryUrl}\n\nEste enlace expira en 24 horas.`);
    }
    
    closeRecoveryModal();
  });
})();

// ============================================
// SISTEMA DE LIKES Y ESTADÍSTICAS (Definir antes del modal)
// ============================================

// Cargar perfiles aprobados desde AWS (integración con admin)
const loadApprovedProfiles = async () => {
  const approved = await DataService.getApprovedProfiles() || [];
  return approved.length > 0 ? approved : null;
};

// Guardar perfil actualizado en AWS
const saveProfileStats = async (profileId, stats) => {
  let profiles = await DataService.getProfiles() || [];
  const index = profiles.findIndex(p => p.id === profileId);
  
  if (index !== -1) {
    profiles[index].stats = { ...profiles[index].stats, ...stats };
    await DataService.saveProfiles(profiles);
    
    // También actualizar en aprobados si está aprobado
    if (profiles[index].status === 'aprobado') {
      const aprobados = profiles.filter(p => p.status === 'aprobado');
      await DataService.saveApprovedProfiles(aprobados);
    }
  }
};

// ========== SISTEMA DE PROMOCIONES ==========
// Verifica si un perfil está en promoción (precio actual < precio original)
const isInPromotion = (profile) => {
  const currentPrice = parseInt(String(profile.priceHour || '0').replace(/[^0-9]/g, ''));
  const originalPrice = parseInt(String(profile.originalPriceHour || profile.priceHour || '0').replace(/[^0-9]/g, ''));
  
  // Está en promoción si el precio actual es menor al original y ambos existen
  return currentPrice > 0 && originalPrice > 0 && currentPrice < originalPrice;
};

// Obtiene los profileTypes incluyendo 'en-promocion' si corresponde
const getProfileTypesWithPromotion = (profile) => {
  let types = (profile.profileTypes && profile.profileTypes.length > 0)
    ? profile.profileTypes
    : (profile.profileType ? [profile.profileType] : (profile.selectedPlan ? [profile.selectedPlan] : ['premium']));
  types = types.filter(t => t != null);
  
  // Si está en promoción, agregar badge
  if (isInPromotion(profile)) {
    if (!types.includes('en-promocion')) {
      types = [...types, 'en-promocion'];
    }
  } else {
    // Si no está en promoción, quitar el badge si existe
    types = types.filter(t => t !== 'en-promocion');
  }
  
  return types;
};

// ========== SISTEMA DE RECOMENDACIONES (Menciones en Sala Oscura) ==========
// Cuenta cuántas veces un perfil fue mencionado en Sala Oscura
const getMentionCount = async (profileName, profileEmail) => {
  const posts = await DataService.getForoPosts() || [];
  const searchName = profileName?.toLowerCase() || '';
  const searchEmail = profileEmail?.toLowerCase() || '';
  let count = 0;
  let postIds = [];
  
  posts.forEach(post => {
    const contentLower = (post.contenido || '').toLowerCase();
    // Buscar menciones @nombre en el contenido
    if (searchName && contentLower.includes(`@${searchName}`)) {
      count++;
      postIds.push(post.id);
    }
    
    // También revisar respuestas
    if (post.respuestas) {
      post.respuestas.forEach(reply => {
        const replyLower = (reply.contenido || '').toLowerCase();
        if (searchName && replyLower.includes(`@${searchName}`)) {
          if (!postIds.includes(post.id)) {
            count++;
            postIds.push(post.id);
          }
        }
      });
    }
  });
  
  return { count, postIds };
};

// Abre Sala Oscura filtrada por los hilos donde está mencionada la persona
window.openMentionedThreads = async (profileName, profileEmail) => {
  const { postIds } = await getMentionCount(profileName, profileEmail);
  
  if (postIds.length === 0) {
    alert('No se encontraron menciones para este perfil.');
    return;
  }
  
  // Guardar los IDs de posts a mostrar (temporal en localStorage para navegación)
  localStorage.setItem('filterMentionPostIds', JSON.stringify(postIds));
  localStorage.setItem('filterMentionName', profileName);
  window.location.href = `salon?filter=mentions&name=${encodeURIComponent(profileName)}`;
};

// Obtener likes del usuario (guardados en AWS)
const getUserLikes = async () => {
  return await DataService.getUserLikes() || [];
};

// Guardar like del usuario
const saveUserLike = async (profileId) => {
  const likes = await getUserLikes();
  if (!likes.includes(profileId)) {
    likes.push(profileId);
    await DataService.saveUserLikes(likes);
  }
};

// Quitar like del usuario
const removeUserLike = async (profileId) => {
  let likes = await getUserLikes();
  likes = likes.filter(id => id !== profileId);
  await DataService.saveUserLikes(likes);
};

// Toggle like en perfil
window.toggleLike = async (profileId) => {
  const userLikesData = await getUserLikes();
  const hasLiked = userLikesData.includes(profileId);
  
  // Buscar el perfil en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const profileIndex = approvedProfiles.findIndex(p => p.id === profileId);
  
  if (profileIndex !== -1) {
    const profile = approvedProfiles[profileIndex];
    
    // Asegurar que stats existe
    if (!profile.stats) {
      profile.stats = { likes: 0, views: 0, recommendations: 0, experiences: 0 };
    }
    
    if (hasLiked) {
      // Quitar like
      await removeUserLike(profileId);
      profile.stats.likes = Math.max(0, (profile.stats.likes || 0) - 1);
    } else {
      // Agregar like
      await saveUserLike(profileId);
      profile.stats.likes = (profile.stats.likes || 0) + 1;
    }
    
    // Guardar en AWS approvedProfiles
    approvedProfiles[profileIndex] = profile;
    await DataService.saveApprovedProfiles(approvedProfiles);
    console.log('✅ Like actualizado:', profile.displayName, 'likes:', profile.stats.likes);
    
    // Actualizar contador en UI (dentro del modal)
    const likeCount = document.querySelector('.like-count');
    if (likeCount) {
      likeCount.textContent = profile.stats.likes;
      console.log('✅ UI actualizada - likes:', profile.stats.likes);
    }
    
    return !hasLiked;
  }
  
  console.warn('❌ Perfil no encontrado para toggleLike:', profileId);
  return false;
};

// Incrementar vistas cuando se abre un perfil
window.incrementViews = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const profileIndex = approvedProfiles.findIndex(p => p.id === profileId);
  
  if (profileIndex !== -1) {
    const profile = approvedProfiles[profileIndex];
    if (!profile.stats) profile.stats = { likes: 0, views: 0, recommendations: 0, experiences: 0 };
    profile.stats.views = (profile.stats.views || 0) + 1;
    
    // Guardar cambios en AWS
    approvedProfiles[profileIndex] = profile;
    await DataService.saveApprovedProfiles(approvedProfiles);
    return;
  }
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  const publicacionesCreadas = await DataService.getProfiles() || [];
  const pubIndex = publicacionesCreadas.findIndex(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  
  if (pubIndex !== -1) {
    const profile = publicacionesCreadas[pubIndex];
    profile.stats = profile.stats || {};
    profile.stats.views = (profile.stats.views || 0) + 1;
    
    // Guardar cambios en AWS
    await DataService.saveProfiles(publicacionesCreadas);
  }
};

// Compartir perfil (incrementa recomendaciones)
window.shareProfile = async (profileId) => {
  let profile = null;
  
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  if (!profile) {
    console.warn('Perfil no encontrado para compartir:', profileId);
    return;
  }
  
  // Asegurar que stats existe
  if (!profile.stats) {
    profile.stats = { likes: 0, views: 0, recommendations: 0, experiences: 0 };
  }
  
  // Crear link de perfil (usar index.html directamente, no la URL amigable que GitHub Pages no resuelve)
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  
  // Mensaje descriptivo para compartir
  const shareMessage = `🔥 ¡Mira este perfil increíble en SalaNegra!

✨ ${profile.displayName || profile.title}
📍 ${profile.commune || ''}, ${profile.city || ''}
💰 Desde $${(profile.prices?.hour?.CLP || 0).toLocaleString('es-CL')} CLP
⭐ ${profile.stats?.likes || 0} Me Gusta | ${profile.stats?.experiences || 0} Experiencias

👉 Ver perfil completo:`;

  const fullMessage = `${shareMessage}\n${profileLink}`;
  const encodedMessage = encodeURIComponent(fullMessage);
  const encodedLink = encodeURIComponent(profileLink);
  
  // Cerrar menú anterior si existe
  const existingMenu = document.getElementById('share-menu');
  if (existingMenu) {
    existingMenu.remove();
    return;
  }
  
  // Crear menú de compartir
  const shareMenu = document.createElement('div');
  shareMenu.id = 'share-menu';
  shareMenu.className = 'share-menu-overlay';
  shareMenu.innerHTML = `
    <div class="share-menu-content">
      <div class="share-menu-header">
        <h3>Compartir Perfil</h3>
        <button class="share-menu-close" onclick="document.getElementById('share-menu').remove()">✕</button>
      </div>
      
      <div class="share-preview">
        <div class="share-preview-text">${profile.displayName}</div>
        <div class="share-preview-stats">⭐ ${profile.stats.likes} · 👁️ ${profile.stats.views} · 🔥 ${profile.stats.experiences}</div>
      </div>
      
      <div class="share-options">
        <button class="share-option whatsapp" onclick="window.shareViaWhatsApp('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span>WhatsApp</span>
        </button>
        
        <button class="share-option telegram" onclick="window.shareViaTelegram('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161l-1.75 8.25c-.132.591-.473.736-.957.458l-2.645-1.948-1.276 1.227c-.141.141-.26.26-.533.26l.19-2.696 4.902-4.428c.213-.189-.046-.294-.33-.105l-6.057 3.814-2.607-.816c-.567-.177-.579-.567.119-.839l10.188-3.926c.472-.177.884.112.729.839z"/>
          </svg>
          <span>Telegram</span>
        </button>
        
        <button class="share-option facebook" onclick="window.shareViaFacebook('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span>Facebook</span>
        </button>
        
        <button class="share-option twitter" onclick="window.shareViaTwitter('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          <span>Twitter / X</span>
        </button>
        
        <button class="share-option email" onclick="window.shareViaEmail('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Email</span>
        </button>
        
        <button class="share-option copy" onclick="window.copyProfileLink('${profileId}')">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <span>Copiar Link</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(shareMenu);
  
  // Cerrar al hacer clic fuera
  shareMenu.addEventListener('click', (e) => {
    if (e.target === shareMenu) {
      shareMenu.remove();
    }
  });
};

// Funciones de compartir por red social
window.shareViaWhatsApp = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  let profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  if (!profile) return;
  
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  const message = `🔥 ¡Mira este perfil increíble en SalaNegra!\n\n✨ ${profile.displayName || profile.title}\n📍 ${profile.commune || ''}, ${profile.city || ''}\n💰 Desde $${(profile.prices?.hour?.CLP || 0).toLocaleString('es-CL')} CLP\n⭐ ${profile.stats?.likes || 0} Me Gusta | ${profile.stats?.experiences || 0} Experiencias\n\n👉 Ver perfil completo:\n${profileLink}`;
  
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  incrementRecommendation(profileId);
  document.getElementById('share-menu')?.remove();
};

window.shareViaTelegram = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  let profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  if (!profile) return;
  
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  const message = `🔥 ${profile.displayName || profile.title} - SalaNegra\n📍 ${profile.commune || ''}\n💰 Desde $${(profile.prices?.hour?.CLP || 0).toLocaleString('es-CL')} CLP`;
  
  window.open(`https://t.me/share/url?url=${encodeURIComponent(profileLink)}&text=${encodeURIComponent(message)}`, '_blank');
  incrementRecommendation(profileId);
  document.getElementById('share-menu')?.remove();
};

window.shareViaFacebook = (profileId) => {
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileLink)}`, '_blank');
  incrementRecommendation(profileId);
  document.getElementById('share-menu')?.remove();
};

window.shareViaTwitter = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  let profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  if (!profile) return;
  
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  const message = `🔥 Conoce a ${profile.displayName || profile.title} en SalaNegra - ${profile.commune || ''}, ${profile.city || ''}`;
  
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(profileLink)}`, '_blank');
  incrementRecommendation(profileId);
  document.getElementById('share-menu')?.remove();
};

window.shareViaEmail = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  let profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  if (!profile) return;
  
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;
  const subject = `Te recomiendo ver este perfil en SalaNegra`;
  const body = `Hola,\n\nTe comparto este perfil que me pareció interesante:\n\n✨ ${profile.displayName || profile.title}\n📍 ${profile.commune || ''}, ${profile.city || ''}\n💰 Desde $${(profile.prices?.hour?.CLP || 0).toLocaleString('es-CL')} CLP\n⭐ ${profile.stats?.likes || 0} Me Gusta | ${profile.stats?.experiences || 0} Experiencias\n\nVer perfil completo: ${profileLink}\n\nSaludos!`;
  
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  incrementRecommendation(profileId);
  setTimeout(() => document.getElementById('share-menu')?.remove(), 500);
};

window.copyProfileLink = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  let profile = approvedProfiles.find(p => p.id === profileId);
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  if (!profile) {
    const publicacionesCreadas = await DataService.getProfiles() || [];
    profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  }
  
  const profileLink = `${window.location.origin}/index.html?profile=${profileId}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(profileLink).then(() => {
      // Cambiar texto del botón temporalmente
      const copyBtn = document.querySelector('.share-option.copy span');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ ¡Copiado!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }
      incrementRecommendation(profileId);
    });
  } else {
    prompt('Copia este link:', profileLink);
    incrementRecommendation(profileId);
  }
};

// Función auxiliar para incrementar recomendaciones
const incrementRecommendation = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const profileIndex = approvedProfiles.findIndex(p => p.id === profileId);
  
  if (profileIndex !== -1) {
    const profile = approvedProfiles[profileIndex];
    if (!profile.stats) profile.stats = { likes: 0, views: 0, recommendations: 0, experiences: 0 };
    profile.stats.recommendations = (profile.stats.recommendations || 0) + 1;
    
    // Guardar en AWS approvedProfiles
    approvedProfiles[profileIndex] = profile;
    await DataService.saveApprovedProfiles(approvedProfiles);
    
    // Actualizar UI si existe
    const recommendationsCount = document.querySelector('.recommendations-count');
    if (recommendationsCount) {
      recommendationsCount.textContent = profile.stats.recommendations;
    }
    return;
  }
  
  // Si no está en approvedProfiles, buscar en publicaciones creadas aprobadas
  const publicacionesCreadas = await DataService.getProfiles() || [];
  const pubIndex = publicacionesCreadas.findIndex(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
  
  if (pubIndex !== -1) {
    const profile = publicacionesCreadas[pubIndex];
    profile.stats = profile.stats || {};
    profile.stats.recommendations = (profile.stats.recommendations || 0) + 1;
    
    // Guardar cambios en AWS
    await DataService.saveProfiles(publicacionesCreadas);
    
    const recCount = document.querySelector('.recommendations-count');
    if (recCount) {
      recCount.textContent = profile.stats.recommendations || 0;
    }
  }
};

// WhatsApp directo
window.openWhatsApp = async (profileId) => {
  // Buscar en approvedProfiles
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  const profile = approvedProfiles.find(p => p.id === profileId);
  
  if (!profile || !profile.whatsapp) {
    alert('WhatsApp no disponible para este perfil');
    return;
  }
  
  const message = encodeURIComponent(`Hola ${profile.displayName}, vi tu perfil en SalaNegra y me gustaría conocer más sobre tus servicios.`);
  const whatsappUrl = `https://wa.me/${profile.whatsapp.replace(/\D/g, '')}?text=${message}`;

  // En móvil, window.open puede ser bloqueado por popup blockers
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = whatsappUrl;
  } else {
    window.open(whatsappUrl, '_blank');
  }
  
  // Incrementar vistas por interacción
  window.incrementViews(profileId);
};

// Filtros globales activos (para ser usados por los carruseles)
window.currentGlobalFilters = { age: '', height: '', nationality: '', weight: '' };

// Función global para refrescar todos los carruseles cuando se aprueban nuevos perfiles
window.refreshCarousels = function() {
  // Refrescar carrusel VIP Black
  const creatorsCarousel = document.getElementById('creators-carousel');
  if (creatorsCarousel) {
    const event = new CustomEvent('refreshCreators');
    document.dispatchEvent(event);
  }
  
  // Refrescar carrusel Premium Select
  const premiumCarousel = document.getElementById('premium-select-carousel');
  if (premiumCarousel) {
    const event = new CustomEvent('refreshPremiumSelect');
    document.dispatchEvent(event);
  }
  
  // Refrescar carrusel Luxury & Exclusive
  const luxurySection = document.getElementById('featured-section');
  if (luxurySection) {
    const event = new CustomEvent('refreshLuxury');
    document.dispatchEvent(event);
  }
};

// Función global para refrescar carruseles con filtros aplicados
window.refreshCarouselsWithFilter = function(filters) {
  // Guardar los filtros globalmente para que los carruseles puedan accederlos
  window.currentGlobalFilters = filters;
  
  // Disparar eventos de refresh para cada carrusel
  document.dispatchEvent(new CustomEvent('refreshCreators'));
  document.dispatchEvent(new CustomEvent('refreshPremiumSelect'));
  document.dispatchEvent(new CustomEvent('refreshLuxury'));
};

// Featured Carousel / Destacados VIP
(async function setupFeaturedCarousel() {
  const carousel = document.getElementById('featured-carousel');
  const dotsContainer = document.getElementById('featured-dots');
  const prevBtn = document.getElementById('featured-prev');
  const nextBtn = document.getElementById('featured-next');

  if (!carousel) return;

  let currentSlide = 0;
  let autoplayInterval = null;
  const AUTOPLAY_DELAY = 5000; // 5 segundos

  // Función para cargar perfiles Luxury & Exclusive aprobados
  const loadApprovedLuxuryProfiles = async () => {
    const approvedProfiles = await DataService.getApprovedProfiles() || [];
    const today = new Date().toISOString().split('T')[0];
    // Solo mostrar perfiles Luxury que estén visibles, activos y con plan válido
    return approvedProfiles.filter(profile => {
      const isVisible = profile.profileVisible === true;
      const isActive = profile.isActive !== false;
      const isLuxury = profile.carouselType === 'luxury';
      const planNotExpired = !profile.planExpiry || profile.planExpiry >= today;

      // Aplicar filtros globales
      const passesFilter = window.profilePassesFilter ? window.profilePassesFilter(profile, window.currentGlobalFilters) : true;

      return isVisible && isActive && isLuxury && planNotExpired && passesFilter;
    });
  };

  // Obtener solo perfiles aprobados
  const getAllLuxuryProfiles = async () => {
    return await loadApprovedLuxuryProfiles();
  };

  // Usar el array de perfiles aprobados
  const featuredProfiles = await getAllLuxuryProfiles();

  // Función para abrir modal VIP (definida ANTES del early return para que siempre esté disponible globalmente)
  const openVIPModal = async (profileData) => {
    // Usar solo datos reales del perfil, sin valores por defecto inventados
    const car = profileData; // alias temporal para compatibilidad interna
    const hasPhysicalInfo = car.physicalInfo || car.height || car.weight || car.measurements;
    const hasAttributes = car.attributes || car.hairColor || car.eyeColor;
    const hasPrices = car.prices || car.price || car.priceHour;
    const hasServices = car.services && car.services.length > 0;
    
    const profile = {
      id: car.id || `profile-${Date.now()}`,
      displayName: car.displayName || car.title || 'Perfil Premium',
      username: car.username || '',
      email: car.email || '',
      verified: car.verified !== undefined ? car.verified : true,
      profileTypes: getProfileTypesWithPromotion(car),
      originalPriceHour: car.originalPriceHour || car.priceHour || null,
      isInPromotion: isInPromotion(car),
      bio: car.bio || car.description || '',
      whatsapp: car.whatsapp || car.phone || '',
      physicalInfo: hasPhysicalInfo ? {
        ethnicity: car.physicalInfo?.ethnicity || car.ethnicity || null,
        skinTone: car.physicalInfo?.skinTone || car.skinTone || null,
        age: car.physicalInfo?.age || car.age || car.edad || null,
        height: car.physicalInfo?.height || car.height || car.altura || null,
        weight: car.physicalInfo?.weight || car.weight || car.peso || null,
        measurements: (car.physicalInfo?.measurements || car.measurements) ? {
          bust: car.physicalInfo?.measurements?.bust || car.measurements?.bust || car.bust || null,
          waist: car.physicalInfo?.measurements?.waist || car.measurements?.waist || car.waist || null,
          hips: car.physicalInfo?.measurements?.hips || car.measurements?.hips || car.hips || null
        } : null
      } : null,
      attributes: hasAttributes ? {
        smoker: car.attributes?.smoker ?? car.smoker ?? null,
        tattoos: car.attributes?.tattoos ?? car.tattoos ?? null,
        piercings: car.attributes?.piercings ?? car.piercings ?? null,
        hairColor: car.attributes?.hairColor || car.hairColor || null,
        hairLength: car.attributes?.hairLength || car.hairLength || null,
        eyeColor: car.attributes?.eyeColor || car.eyeColor || null,
        buttSize: car.attributes?.buttSize || car.buttSize || null,
        breastSize: car.attributes?.breastSize || car.breastSize || null,
        breastType: car.attributes?.breastType || car.breastType || null,
        bodyType: car.attributes?.bodyType || car.bodyType || null,
        pubicHair: car.attributes?.pubicHair || car.pubicHair || null
      } : null,
      services: car.services || [],
      prices: hasPrices ? {
        hour: {
          CLP: car.prices?.hour?.CLP || car.price?.CLP || (car.priceHour ? parseInt(String(car.priceHour).replace(/[^0-9]/g, '')) : null)
        },
        twoHours: {
          CLP: car.prices?.twoHours?.CLP || (car.priceTwoHours ? parseInt(String(car.priceTwoHours).replace(/[^0-9]/g, '')) : null)
        },
        overnight: {
          CLP: car.prices?.overnight?.CLP || (car.priceOvernight ? parseInt(String(car.priceOvernight).replace(/[^0-9]/g, '')) : null)
        }
      } : null,
      availabilityDetails: car.availabilityDetails || (car.incall !== undefined || car.outcall !== undefined || car.travel !== undefined ? {
        incall: car.incall ?? car.atencionLugar ?? null,
        outcall: car.outcall ?? car.atencionDomicilio ?? null,
        travel: car.travel ?? car.viajes ?? null
      } : null),
      availability: car.availability || car.horario || null,
      commune: car.commune || car.comuna || car.location || null,
      city: car.city || car.ciudad || null,
      languages: car.languages || car.idiomas || null,
      photos: car.photos || car.profilePhotosData?.length || 0,
      videos: car.videos || 0,
      stats: {
        likes: car.stats?.likes || 0,
        views: car.stats?.views || 0,
        recommendations: car.stats?.recommendations || 0,
        experiences: car.stats?.experiences || 0
      },
      // Guardar datos originales para fotos y videos
      profilePhotosData: car.profilePhotosData || [],
      profileVideosData: car.profileVideosData || [],
      profilePhoto: car.profilePhoto || car.avatar || null
    };
    
    // Obtener estado actual de likes del usuario
    const currentUserLikes = await getUserLikes();
    const isLiked = currentUserLikes.includes(profile.id);
    
    console.log('🔍 Abriendo modal VIP para:', profile.displayName, '- Likes actuales:', profile.stats.likes, '- Usuario ha dado like:', isLiked);
    
    // Función para obtener íconos y textos de tipos de perfil
    const getProfileTypeBadge = (type) => {
      const badges = {
        'vip': { icon: '👑', text: 'VIP', color: '#0A0A0A' },
        'luxury-exclusive': { icon: '💎', text: 'Luxury & Exclusive', color: '#FFFFFF' },
        'premium': { icon: '⭐', text: 'Premium', color: '#FFFFFF' },
        'nuevo': { icon: '✨', text: 'Nuevo', color: '#FFFFFF' },
        'en-promocion': { icon: '🏷️', text: 'En Promoción', color: '#FFFFFF' }
      };
      return badges[type] || badges['vip'];
    };
    
    // Filtrar tipos de perfil válidos - eliminar undefined/null y "nuevo" si pasaron 7 días
    const validProfileTypes = (profile.profileTypes || []).filter(type => {
      if (!type) return false;
      if (type === 'nuevo' && car.createdAt) {
        const daysPassed = (Date.now() - car.createdAt) / (1000 * 60 * 60 * 24);
        return daysPassed <= 7;
      }
      return true;
    });

    // Crear modal HTML
    const serviceNames = {
      'oral': '👄 Oral con preservativo',
      'oral-preservativo': '👄 Oral con preservativo',
      'oral-sin-condon': '👄💰 Oral sin condón',
      'beso-negro': '💋 Beso negro',
      'americana': '🌟 Americana',
      'penetracion': '✨ Penetración',
      'anal': '🔥💰 Anal',
      'masajes': '💆 Masajes eróticos',
      'juguetes': '🎭 Juguetes',
      'fantasias': '🎪 Fantasías',
      'trios': '👥💰 Tríos',
      'parejas': '💑 Atención parejas',
      'despedidas': '🎉 Despedidas',
      'viajes': '✈️ Viajes',
      'pernocte': '🌙💰 Pernocte',
      'eyaculacion-facial': '💦 Eyac. facial',
      'eyaculacion-cuerpo': '💧 Eyac. cuerpo',
      'striptease': '💃 Striptease',
      'baile': '🕺 Baile erótico',
      'dominacion': '👑 Dominación',
      'sumision': '🙇 Sumisión',
      'roll-play': '🎭 Juegos de rol',
      'girlfriend': '💝 Experiencia novia',
      'pornstar': '⭐ Trato pornstar',
      'lluvia-dorada': '💛 Lluvia dorada',
      'videollamada': '📹 Videollamada',
      'grabaciones': '🎬💰 Grabaciones',
      'besos': '😘 Besos',
      'fetiche-pies': '🦶 Fetiche de pies',
      'squirt': '💦💰 Squirt',
      'bondage': '⛓️💰 Bondage',
      'spanking': '👋 Spanking',
      'strap-on': '🔗💰 Strap-on',
      'masaje-prostatico': '💆💰 Masaje prostático',
      'facesitting': '🪑 Facesitting',
      'swingers': '🔄💰 Swingers',
      'otros': '😏 Otros servicios'
    };
    
    // Usar profile en lugar de car en todo el modal
    const modalHTML = `
      <div class="vip-modal-overlay" id="vip-modal">
        <div class="vip-modal-container">
          <button class="modal-close-button" id="modal-close" aria-label="Cerrar">
            <span class="modal-close-icon">✕</span>
          </button>
          
          <div class="vip-modal-inner">
            <!-- Galería Izquierda -->
            <div class="modal-gallery-section">
              <img class="modal-main-image" src="${profile.profilePhotosData && profile.profilePhotosData.length > 0 ? (profile.profilePhotosData[0].url || profile.profilePhotosData[0].base64 || profile.profilePhotosData[0]) : (profile.profilePhoto || profile.avatar || '')}" alt="${profile.displayName}" id="modal-main-img" />
              <div class="modal-video-container" id="modal-video-container" style="display:none;">
                <video class="modal-main-video" id="modal-main-video" controls playsinline></video>
                <div class="video-watermark">SALA NEGRA</div>
              </div>

              <div class="modal-media-counter">
                <span id="modal-counter">1</span> / ${(profile.profilePhotosData?.length || 0) + (profile.profileVideosData?.length || 0) || profile.photos || 1}
              </div>

              <button class="gallery-nav-button prev" id="gallery-prev">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button class="gallery-nav-button next" id="gallery-next">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>

              <div class="modal-thumbnails" id="modal-thumbnails">
                ${profile.profilePhotosData && profile.profilePhotosData.length > 0
                  ? profile.profilePhotosData.map((photo, i) => `
                    <div class="modal-thumbnail ${i === 0 ? 'active' : ''}" data-index="${i}" data-type="photo">
                      <img src="${photo.url || photo.base64 || photo}" alt="Foto ${i+1}" />
                    </div>
                  `).join('')
                  : `<div class="modal-thumbnail active" data-index="0" data-type="photo">
                      <img src="${profile.profilePhoto || profile.avatar || ''}" alt="Foto 1" />
                    </div>`
                }
                ${profile.profileVideosData && profile.profileVideosData.length > 0
                  ? profile.profileVideosData.map((video, i) => `
                    <div class="modal-thumbnail" data-index="${(profile.profilePhotosData?.length || 0) + i}" data-type="video">
                      <div class="modal-thumbnail-video">
                        <video src="${video.url || video.data}" muted preload="metadata" onloadeddata="this.currentTime=0.5"></video>
                        <div class="modal-thumbnail-video-overlay">
                          <div class="modal-thumbnail-video-play">▶</div>
                        </div>
                      </div>
                    </div>
                  `).join('')
                  : ''
                }
              </div>
            </div>
            
            <!-- Información Derecha -->
            <div class="modal-info-section">
              <div class="modal-creator-header">
                <div class="modal-creator-details">
                  <div class="modal-name-badges-row">
                    <h2 class="modal-creator-name">${profile.displayName}</h2>
                    <div class="modal-badges-container">
                      ${validProfileTypes.map(type => {
                        const badge = getProfileTypeBadge(type);
                        const className = type.replace('-', '');
                        return `<div class="modal-profile-badge ${className}-badge">
                          <span class="badge-icon">${badge.icon}</span>
                          <span class="badge-text">${badge.text}</span>
                        </div>`;
                      }).join('')}
                    </div>
                  </div>
                  <p class="modal-creator-username">@${profile.username}</p>
                </div>
              </div>
              
              <!-- Stats Row -->
              <div class="modal-stats-row">
                <div class="modal-stat-item">
                  <span class="stat-icon">❤️</span>
                  <span class="stat-value">${profile.stats.likes >= 1000 ? (profile.stats.likes / 1000).toFixed(1) + 'K' : profile.stats.likes}</span>
                  <span class="stat-label">Me Gusta</span>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-icon">👁️</span>
                  <span class="stat-value">${profile.stats.views >= 1000 ? (profile.stats.views / 1000).toFixed(1) + 'K' : profile.stats.views}</span>
                  <span class="stat-label">Vistas</span>
                </div>
                <div class="modal-stat-item experiences-stat" onclick="openMentionedThreads('${profile.displayName}', '${profile.email}')" title="Ver experiencias en Sala Oscura">
                  <span class="stat-icon">✨</span>
                  <span class="stat-value experiences-count">${getMentionCount(profile.displayName, profile.email).count}</span>
                  <span class="stat-label">Experiencias</span>
                </div>
                <div class="modal-stat-item">
                  <span class="stat-icon">🔗</span>
                  <span class="stat-value">${profile.stats.recommendations}</span>
                  <span class="stat-label">Recomendaciones</span>
                </div>
              </div>
              
              <!-- Bio -->
              ${profile.bio ? `<p class="modal-description">${profile.bio}</p>` : ''}
              
              <!-- SECCIÓN 1: INFORMACIÓN FÍSICA (solo si hay datos) -->
              ${profile.physicalInfo && (profile.physicalInfo.age || profile.physicalInfo.height || profile.physicalInfo.ethnicity) ? `
              <div class="modal-section">
                <h4 class="modal-section-title">
                  <span class="section-icon">📋</span>
                  Información Física
                </h4>
                <div class="info-grid">
                  ${profile.physicalInfo.ethnicity ? `
                  <div class="info-item">
                    <span class="info-label">Origen</span>
                    <span class="info-value">${profile.physicalInfo.ethnicity}</span>
                  </div>` : ''}
                  ${profile.physicalInfo.skinTone ? `
                  <div class="info-item">
                    <span class="info-label">Piel</span>
                    <span class="info-value">${profile.physicalInfo.skinTone}</span>
                  </div>` : ''}
                  ${profile.physicalInfo.age ? `
                  <div class="info-item">
                    <span class="info-label">Edad</span>
                    <span class="info-value">${profile.physicalInfo.age} años</span>
                  </div>` : ''}
                  ${profile.physicalInfo.height ? `
                  <div class="info-item">
                    <span class="info-label">Altura</span>
                    <span class="info-value">${profile.physicalInfo.height} cm</span>
                  </div>` : ''}
                  ${profile.physicalInfo.weight ? `
                  <div class="info-item">
                    <span class="info-label">Peso</span>
                    <span class="info-value">${profile.physicalInfo.weight} kg</span>
                  </div>` : ''}
                  ${profile.physicalInfo.measurements && (profile.physicalInfo.measurements.bust || profile.physicalInfo.measurements.waist || profile.physicalInfo.measurements.hips) ? `
                  <div class="info-item full-width">
                    <span class="info-label">Medidas</span>
                    <span class="info-value highlight">
                      ${profile.physicalInfo.measurements.bust || '?'} - ${profile.physicalInfo.measurements.waist || '?'} - ${profile.physicalInfo.measurements.hips || '?'} cm
                    </span>
                  </div>` : ''}
                </div>
              </div>
              ` : ''}
              
              <!-- SECCIÓN 2: MIS ATRIBUTOS (solo si hay datos) -->
              ${profile.attributes && (profile.attributes.hairColor || profile.attributes.eyeColor || profile.attributes.bodyType) ? `
              <div class="modal-section">
                <h4 class="modal-section-title">
                  <span class="section-icon">✨</span>
                  Mis Atributos
                </h4>
                <div class="attributes-grid">
                  ${profile.attributes.smoker !== null ? `
                  <div class="attribute-item">
                    <span class="attr-icon">🚬</span>
                    <span class="attr-label">Fumadora</span>
                    <span class="attr-value">${profile.attributes.smoker ? 'Sí' : 'No'}</span>
                  </div>` : ''}
                  ${profile.attributes.tattoos !== null ? `
                  <div class="attribute-item">
                    <span class="attr-icon">🎨</span>
                    <span class="attr-label">Tatuajes</span>
                    <span class="attr-value">${profile.attributes.tattoos ? 'Sí' : 'No'}</span>
                  </div>` : ''}
                  ${profile.attributes.piercings !== null ? `
                  <div class="attribute-item">
                    <span class="attr-icon">💎</span>
                    <span class="attr-label">Piercings</span>
                    <span class="attr-value">${profile.attributes.piercings ? 'Sí' : 'No'}</span>
                  </div>` : ''}
                  ${profile.attributes.hairColor ? `
                  <div class="attribute-item">
                    <span class="attr-icon">💇‍♀️</span>
                    <span class="attr-label">Cabello</span>
                    <span class="attr-value">${profile.attributes.hairColor}${profile.attributes.hairLength ? ` (${profile.attributes.hairLength})` : ''}</span>
                  </div>` : ''}
                  ${profile.attributes.eyeColor ? `
                  <div class="attribute-item">
                    <span class="attr-icon">👁️</span>
                    <span class="attr-label">Ojos</span>
                    <span class="attr-value">${profile.attributes.eyeColor}</span>
                  </div>` : ''}
                  ${profile.attributes.buttSize ? `
                  <div class="attribute-item">
                    <span class="attr-icon">🍑</span>
                    <span class="attr-label">Cola</span>
                    <span class="attr-value">${profile.attributes.buttSize}</span>
                  </div>` : ''}
                  ${profile.attributes.breastSize ? `
                  <div class="attribute-item">
                    <span class="attr-icon">👙</span>
                    <span class="attr-label">Pecho</span>
                    <span class="attr-value">${profile.attributes.breastSize}${profile.attributes.breastType ? ` (${profile.attributes.breastType})` : ''}</span>
                  </div>` : ''}
                  ${profile.attributes.bodyType ? `
                  <div class="attribute-item">
                    <span class="attr-icon">💪</span>
                    <span class="attr-label">Cuerpo</span>
                    <span class="attr-value">${profile.attributes.bodyType}</span>
                  </div>` : ''}
                  ${profile.attributes.pubicHair ? `
                  <div class="attribute-item">
                    <span class="attr-icon">✂️</span>
                    <span class="attr-label">Vello púbico</span>
                    <span class="attr-value">${profile.attributes.pubicHair}</span>
                  </div>` : ''}
                </div>
              </div>
              ` : ''}
              
              <!-- SECCIÓN 3: SERVICIOS OFRECIDOS (solo si hay datos) -->
              ${profile.services && profile.services.length > 0 ? `
              <div class="modal-section">
                <h4 class="modal-section-title">
                  <span class="section-icon">💋</span>
                  Servicios Ofrecidos
                </h4>
                <div class="services-list">
                  ${profile.services.map(s => `
                    <div class="service-chip">
                      <span class="service-check">✓</span>
                      <span class="service-name">${serviceNames[s] || s}</span>
                    </div>
                  `).join('')}
                </div>
                <p class="services-note">
                  💰 = Costo extra. Los servicios marcados están disponibles. Consulta detalles al contactar.
                </p>
              </div>
              ` : ''}
              
              <!-- SECCIÓN 4: TARIFAS (solo si hay datos) -->
              ${profile.prices && (profile.prices.hour?.CLP || profile.prices.twoHours?.CLP || profile.prices.overnight?.CLP) ? `
              <div class="modal-section pricing-section">
                <h4 class="modal-section-title">
                  <span class="section-icon">💰</span>
                  Tarifas ${profile.isInPromotion ? '<span class="promo-label">🏷️ EN PROMOCIÓN</span>' : ''}
                </h4>
                <div class="pricing-grid">
                  ${profile.prices.hour?.CLP ? `
                  <div class="pricing-item ${profile.isInPromotion ? 'has-promo' : ''}">
                    <span class="pricing-duration">1 Hora</span>
                    ${profile.isInPromotion && profile.originalPriceHour ? `
                    <span class="pricing-original">$${parseInt(String(profile.originalPriceHour).replace(/[^0-9]/g, '')).toLocaleString('es-CL')} CLP</span>
                    ` : ''}
                    <span class="pricing-amount ${profile.isInPromotion ? 'promo-price' : ''}">$${profile.prices.hour.CLP.toLocaleString('es-CL')} CLP</span>
                  </div>` : ''}
                  ${profile.prices.twoHours?.CLP ? `
                  <div class="pricing-item">
                    <span class="pricing-duration">2 Horas</span>
                    <span class="pricing-amount">$${profile.prices.twoHours.CLP.toLocaleString('es-CL')} CLP</span>
                  </div>` : ''}
                  ${profile.prices.overnight?.CLP ? `
                  <div class="pricing-item">
                    <span class="pricing-duration">Pernocte</span>
                    <span class="pricing-amount">$${profile.prices.overnight.CLP.toLocaleString('es-CL')} CLP</span>
                  </div>` : ''}
                </div>
              </div>
              ` : ''}
              
              <!-- SECCIÓN 5: DISPONIBILIDAD (solo si hay datos de ubicación o horario) -->
              ${(profile.commune || profile.city || profile.availability) ? `
              <div class="modal-section">
                <h4 class="modal-section-title">
                  <span class="section-icon">📍</span>
                  Disponibilidad
                </h4>
                ${profile.availabilityDetails && (profile.availabilityDetails.incall !== null || profile.availabilityDetails.outcall !== null || profile.availabilityDetails.travel !== null) ? `
                <div class="availability-grid">
                  ${profile.availabilityDetails.incall !== null ? `
                  <div class="availability-item ${profile.availabilityDetails.incall ? 'active' : ''}">
                    <span class="avail-icon">🏠</span>
                    <span class="avail-label">In-call (Mi lugar)</span>
                    <span class="avail-status">${profile.availabilityDetails.incall ? '✓' : '✗'}</span>
                  </div>` : ''}
                  ${profile.availabilityDetails.outcall !== null ? `
                  <div class="availability-item ${profile.availabilityDetails.outcall ? 'active' : ''}">
                    <span class="avail-icon">🚗</span>
                    <span class="avail-label">Out-call (Tu lugar)</span>
                    <span class="avail-status">${profile.availabilityDetails.outcall ? '✓' : '✗'}</span>
                  </div>` : ''}
                  ${profile.availabilityDetails.travel !== null ? `
                  <div class="availability-item ${profile.availabilityDetails.travel ? 'active' : ''}">
                    <span class="avail-icon">✈️</span>
                    <span class="avail-label">Viajes</span>
                    <span class="avail-status">${profile.availabilityDetails.travel ? '✓' : '✗'}</span>
                  </div>` : ''}
                </div>
                ` : ''}
                ${profile.availability ? `
                <div class="availability-hours">
                  <span class="hours-icon">🕐</span>
                  <span class="hours-text">Horario: ${profile.availability}</span>
                </div>
                ` : ''}
                ${(profile.commune || profile.city) ? `
                <div class="availability-location">
                  <span class="location-icon">📍</span>
                  <span class="location-text">${[profile.commune, profile.city].filter(Boolean).join(', ')}</span>
                </div>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- SECCIÓN 6: IDIOMAS (solo si hay idiomas definidos) -->
              ${profile.languages && profile.languages.length > 0 ? `
              <div class="modal-section-inline">
                <h4 class="modal-section-title">
                  <span class="section-icon">🌐</span>
                  Idiomas
                </h4>
                <div class="languages-list">
                  ${profile.languages.map(lang => `<span class="language-chip">${lang}</span>`).join('')}
                </div>
              </div>
              ` : ''}
              
              <!-- SECCIÓN 7: BOTONES DE ACCIÓN -->
              <div class="modal-actions-extended" data-profile-id="${profile.id}">
                <button class="action-btn primary-action" onclick="openWhatsApp('${profile.id}')">
                  <span class="btn-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                  </span>
                  <span class="btn-text">Contactar por WhatsApp</span>
                </button>
                
                <button class="action-btn secondary-action like-btn" data-liked="false" onclick="toggleLikeInModal('${profile.id}')">
                  <span class="btn-icon" id="likeIcon-${profile.id}">🤍</span>
                  <span class="btn-text" id="likeText-${profile.id}">Me Gusta (<span class="like-count">${profile.stats.likes}</span>)</span>
                </button>
                
                <button class="action-btn secondary-action" onclick="shareProfile('${profile.id}')">
                  <span class="btn-icon">🔗</span>
                  <span class="btn-text">Recomendar (<span class="recommendations-count">${profile.stats.recommendations}</span>)</span>
                </button>
              </div>
              
              <!-- Disclaimer -->
              <div class="modal-disclaimer">
                <p>⚠️ Todos los servicios son entre adultos que consienten. Se requiere verificación de edad. Discreción y respeto mutuo garantizados.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Insertar modal en el body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Event listeners del modal
    const modal = document.getElementById('vip-modal');
    const closeBtn = document.getElementById('modal-close');
    const mainImg = document.getElementById('modal-main-img');
    const mainVideo = document.getElementById('modal-main-video');
    const counter = document.getElementById('modal-counter');
    const thumbnails = document.querySelectorAll('.modal-thumbnail');
    const prevBtn = document.getElementById('gallery-prev');
    const nextBtn = document.getElementById('gallery-next');

    // Construir array combinado de media (fotos + videos)
    const allMedia = [];
    if (profile.profilePhotosData && profile.profilePhotosData.length > 0) {
      profile.profilePhotosData.forEach(photo => {
        allMedia.push({ type: 'photo', src: photo.url || photo.base64 || photo });
      });
    } else {
      allMedia.push({ type: 'photo', src: profile.profilePhoto || profile.avatar || '' });
    }
    if (profile.profileVideosData && profile.profileVideosData.length > 0) {
      profile.profileVideosData.forEach(video => {
        allMedia.push({ type: 'video', src: video.url || video.data });
      });
    }

    let currentIndex = 0;
    const totalMedia = allMedia.length;

    // Cerrar modal
    let closeModal = () => {
      if (mainVideo) { mainVideo.pause(); mainVideo.src = ''; }
      modal.remove();
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Navegación de galería con soporte para fotos y videos
    const videoContainer = document.getElementById('modal-video-container');
    const updateGallery = (index) => {
      currentIndex = (index + totalMedia) % totalMedia;
      const media = allMedia[currentIndex];

      if (media.type === 'video') {
        // Usar setProperty con priority para sobrescribir CSS !important
        mainImg.style.setProperty('display', 'none', 'important');
        if (videoContainer) {
          videoContainer.style.setProperty('display', 'block', 'important');
          videoContainer.style.setProperty('position', 'absolute', 'important');
          videoContainer.style.setProperty('top', '0', 'important');
          videoContainer.style.setProperty('left', '0', 'important');
          videoContainer.style.setProperty('width', '100%', 'important');
          videoContainer.style.setProperty('height', '100%', 'important');
          videoContainer.style.setProperty('z-index', '5', 'important');
        }
        mainVideo.src = media.src;
        mainVideo.load();
        // Auto-reproducir el video al navegar hacia él
        mainVideo.play().catch(e => console.log('Auto-play bloqueado:', e));
      } else {
        mainVideo.pause();
        if (videoContainer) videoContainer.style.setProperty('display', 'none', 'important');
        mainImg.style.setProperty('display', 'block', 'important');
        mainImg.src = media.src;
      }

      counter.textContent = currentIndex + 1;
      thumbnails.forEach((thumb, i) => {
        thumb.classList.toggle('active', i === currentIndex);
      });
    };

    prevBtn.addEventListener('click', () => updateGallery(currentIndex - 1));
    nextBtn.addEventListener('click', () => updateGallery(currentIndex + 1));

    thumbnails.forEach((thumb, i) => {
      thumb.addEventListener('click', () => updateGallery(i));
    });

    // Teclado
    const handleKeyPress = (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') updateGallery(currentIndex - 1);
      if (e.key === 'ArrowRight') updateGallery(currentIndex + 1);
    };
    document.addEventListener('keydown', handleKeyPress);
    
    // Incrementar vistas al abrir modal
    incrementViews(car.id);
    
    // Verificar si el usuario ya dio like
    const savedUserLikes = await getUserLikes();
    const hasLiked = savedUserLikes.includes(car.id);
    const likeBtn = document.getElementById(`likeIcon-${profile.id}`);
    const likeText = document.getElementById(`likeText-${profile.id}`);
    
    if (hasLiked && likeBtn) {
      likeBtn.textContent = '❤️';
      likeBtn.closest('.like-btn').classList.add('liked');
      likeBtn.closest('.like-btn').setAttribute('data-liked', 'true');
    }
    
    // Limpiar event listener al cerrar
    const originalClose = closeModal;
    closeModal = () => {
      document.removeEventListener('keydown', handleKeyPress);
      originalClose();
    };
  };

  // Función auxiliar para toggle like dentro del modal
  window.toggleLikeInModal = (profileId) => {
    const isLiked = toggleLike(profileId);
    const likeIcon = document.getElementById(`likeIcon-${profileId}`);
    const likeBtn = likeIcon?.closest('.like-btn');
    
    if (likeBtn) {
      likeBtn.setAttribute('data-liked', isLiked);
      if (isLiked) {
        likeIcon.textContent = '❤️';
        likeBtn.classList.add('liked');
      } else {
        likeIcon.textContent = '🤍';
        likeBtn.classList.remove('liked');
      }
    }
  };

  // Exponer función globalmente
  window.openVIPModal = openVIPModal;

  // Si no hay perfiles luxury, ocultar sección pero mantener openVIPModal disponible
  if (featuredProfiles.length === 0) {
    const section = document.getElementById('featured-section');
    if (section) section.style.display = 'none';
    return;
  }

  // Renderizar tarjetas
  const renderCards = () => {
    carousel.innerHTML = featuredProfiles.map((car, index) => {
      // Usar foto real del perfil o placeholder
      const imgSrc = (car.profilePhotosData && car.profilePhotosData.length > 0) 
        ? (car.profilePhotosData[0].url || car.profilePhotosData[0].base64 || car.profilePhotosData[0]) 
        : (car.avatar || car.profilePhoto || '');
      return `
        <div class="featured-card vip-card" data-index="${index}" data-profile-id="${car.id}">
          <div class="featured-card-inner vip-card-inner">
            <img class="featured-card-img vip-card-image" src="${imgSrc}" alt="${car.displayName}" loading="${index === 0 ? 'eager' : 'lazy'}" />
            <div class="featured-card-overlay vip-card-overlay"></div>
            
            <div class="vip-badge-container" style="position: absolute; top: 16px; left: 16px; z-index: 10; display: flex; flex-direction: column; gap: 6px; max-width: 200px;">
              ${(() => {
                const types = car.profileTypes || [car.profileType] || ['vip'];
                // Filtrar "nuevo" si han pasado más de 7 días
                const validTypes = types.filter(type => {
                  if (type === 'nuevo' && car.createdAt) {
                    const daysPassed = (Date.now() - car.createdAt) / (1000 * 60 * 60 * 24);
                    return daysPassed <= 7;
                  }
                  return true;
                });
                const badgeMap = {
                  'vip': { icon: '👑', text: 'VIP' },
                  'luxury-exclusive': { icon: '💎', text: 'Luxury & Exclusive' },
                  'premium': { icon: '⭐', text: 'Premium' },
                  'nuevo': { icon: '✨', text: 'Nuevo' },
                  'en-promocion': { icon: '🏷️', text: 'En Promoción' }
                };
                return validTypes.map(type => {
                  const badge = badgeMap[type] || badgeMap['vip'];
                  const typeClass = type.replace('-', '');
                  return `<div class="vip-badge ${typeClass}-badge">
                    <span class="vip-badge-icon">${badge.icon}</span>
                    <span class="vip-badge-text">${badge.text}</span>
                  </div>`;
                }).join('');
              })()}
            </div>
            
            <div class="vip-card-info">
              <h3 class="vip-creator-name">
                ${car.displayName}
                ${car.verified ? '<span class="verified-badge">✔️</span>' : ''}
              </h3>
              <p class="vip-creator-bio">${car.physicalInfo.ethnicity || ''} · ${car.physicalInfo.age || ''} años · ${car.physicalInfo.height || ''}cm</p>
              ${car.commune ? `<p class="vip-location"><span class="location-pin">📍</span> ${car.commune}</p>` : ''}
              
              <div class="vip-stats">
                <div class="vip-stat">
                  <span class="vip-stat-icon">📸</span>
                  <span class="vip-stat-value">${car.photos}</span> fotos
                </div>
                <div class="vip-stat">
                  <span class="vip-stat-icon">🎬</span>
                  <span class="vip-stat-value">${car.videos}</span> videos
                </div>
                <div class="vip-stat">
                  <span class="vip-stat-icon">❤️</span>
                  <span class="vip-stat-value">${car.stats.likes}</span> me gusta
                </div>
              </div>
              
              ${car.price?.CLP ? `<div class="vip-price">$${car.price.CLP.toLocaleString('es-CL')} <span class="price-duration">1h</span></div>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar event listeners para abrir detalle
    carousel.querySelectorAll('.featured-card').forEach(card => {
      card.addEventListener('click', () => {
        const profileId = card.dataset.profileId;
        const prof = featuredProfiles.find(c => c.id === profileId);
        if (prof) {
          openVIPModal(prof);
        }
      });
    });
  };

  // Renderizar dots
  const renderDots = () => {
    if (!dotsContainer) return;
    
    // Limpiar dots existentes
    dotsContainer.innerHTML = '';
    
    // Crear un dot por cada perfil aprobado
    featuredProfiles.forEach((_, index) => {
      const dot = document.createElement('button');
      dot.className = `featured-dot ${index === 0 ? 'active' : ''}`;
      dot.setAttribute('data-index', index);
      dot.setAttribute('aria-label', `Ir a slide ${index + 1}`);
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index));
      });
      dotsContainer.appendChild(dot);
    });
  };

  // Navegar a slide específico
  const goToSlide = (index) => {
    currentSlide = index;
    
    // Obtener la primera tarjeta para calcular el ancho
    const card = carousel.querySelector('.featured-card');
    if (!card) return;
    
    // Calcular el ancho de una tarjeta incluyendo el gap
    const cardWidth = card.offsetWidth;
    const gap = 20; // Gap definido en CSS
    const scrollPosition = index * (cardWidth + gap);
    
    // Usar scroll suave para navegar
    carousel.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });

    // Actualizar dots
    if (dotsContainer) {
      dotsContainer.querySelectorAll('.featured-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    // Reiniciar autoplay
    resetAutoplay();
  };

  // Siguiente slide
  const nextSlide = () => {
    currentSlide = (currentSlide + 1) % featuredProfiles.length;
    goToSlide(currentSlide);
  };

  // Slide anterior
  const prevSlide = () => {
    currentSlide = (currentSlide - 1 + featuredProfiles.length) % featuredProfiles.length;
    goToSlide(currentSlide);
  };

  // Autoplay
  const startAutoplay = () => {
    autoplayInterval = setInterval(nextSlide, AUTOPLAY_DELAY);
  };

  const stopAutoplay = () => {
    if (autoplayInterval) {
      clearInterval(autoplayInterval);
      autoplayInterval = null;
    }
  };

  const resetAutoplay = () => {
    stopAutoplay();
    startAutoplay();
  };

  // Event listeners
  if (prevBtn) prevBtn.addEventListener('click', prevSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextSlide);

  // Pausar en hover
  carousel.addEventListener('mouseenter', stopAutoplay);
  carousel.addEventListener('mouseleave', startAutoplay);

  // Touch/swipe support
  let touchStartX = 0;
  let touchEndX = 0;

  carousel.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoplay();
  });

  carousel.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
    startAutoplay();
  });

  const handleSwipe = () => {
    const swipeThreshold = 50;
    if (touchStartX - touchEndX > swipeThreshold) {
      nextSlide();
    } else if (touchEndX - touchStartX > swipeThreshold) {
      prevSlide();
    }
  };

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') prevSlide();
    if (e.key === 'ArrowRight') nextSlide();
  });

  // Inicializar
  renderCards();
  renderDots();
  startAutoplay();

  // Limpiar al salir
  window.addEventListener('beforeunload', stopAutoplay);
  
  // Event listener para refrescar el carrusel Luxury (con filtros)
  document.addEventListener('refreshLuxury', () => {
    // Recargar perfiles con filtros aplicados
    const newFeaturedCars = getAllLuxuryProfiles();
    // Actualizar referencia local
    featuredProfiles.length = 0;
    featuredProfiles.push(...newFeaturedCars);
    
    // Si no hay resultados, ocultar sección
    const section = document.getElementById('featured-section');
    if (featuredProfiles.length === 0) {
      if (section) section.style.display = 'none';
    } else {
      if (section) section.style.display = 'block';
      currentSlide = 0;
      renderCards();
      renderDots();
    }
  });
})();

// Experiencias Grid
(async function setupExperienciasGrid() {
  const categoryMap = { premium: 'Premium', sport: 'Estándar', luxury: 'Luxury', classic: 'Estándar' };

  // Cargar perfiles aprobados desde AWS
  const approvedProfiles = await DataService.getApprovedProfiles() || [];
  
  // Cargar publicaciones creadas desde AWS
  const publicacionesCreadas = (await DataService.getProfiles() || []).map((p) => ({
    ...p,
    profileTypes: p.profileTypes || [p.profileType].filter(Boolean),
    price: p.price || { CLP: Number(p.precioCLP) || 0 },
    location: p.ubicacion || p.commune || null,
    availability: p.disponibilidad || null,
    category: p.categoria || null,
    services: p.servicios || [],
    popularity: p.popularidad || (p.stats?.views || 0),
    createdAt: p.createdAt || Date.now(),
  }));

  // Combinar perfiles aprobados con publicaciones creadas
  let ALL_PROFILES = [...approvedProfiles, ...publicacionesCreadas].map((p) => {
    return {
      ...p,
      profileTypes: p.profileTypes || [p.profileType].filter(Boolean),
      categoryNew: p.categoryNew || categoryMap[p.category] || null,
      services: p.services || [],
      availability: p.availability || null,
      location: p.location || p.commune || null,
      popularity: p.popularity || (p.stats?.views || 0),
      createdAt: p.createdAt || Date.now(),
    };
  });

  const grid = document.getElementById('experiencias-grid');
  const skeletonLoader = document.getElementById('skeleton-loader');

  // Detail modal refs
  const detailModal = document.getElementById('detail-modal');
  const detailOverlay = detailModal?.querySelector('.detail-overlay');
  const detailClose = document.getElementById('detail-close');
  const detailMain = document.getElementById('detail-main-media');
  const detailThumbs = document.getElementById('detail-thumbs');
  const detailCounter = document.getElementById('detail-counter');
  const detailTitle = document.getElementById('detail-title');
  const detailBadge = document.getElementById('detail-badge');
  const detailMeta = document.getElementById('detail-meta');
  const detailPrice = document.getElementById('detail-price');
  const detailDescription = document.getElementById('detail-description');
  const detailFeatures = document.getElementById('detail-features');
  const detailLocation = document.getElementById('detail-location');
  const detailHours = document.getElementById('detail-hours');
  const detailLanguages = document.getElementById('detail-languages');
  const detailMap = document.getElementById('detail-map');
  const detailWhatsapp = document.getElementById('detail-whatsapp');
  const detailTelegram = document.getElementById('detail-telegram');
  const detailCall = document.getElementById('detail-call');
  const detailForm = document.getElementById('detail-form');
  const detailFormName = document.getElementById('detail-form-name');
  const detailFormPhone = document.getElementById('detail-form-phone');
  const detailFormMsg = document.getElementById('detail-form-msg');
  let currentMedia = [];
  let currentMediaIndex = 0;

  let itemsLoaded = 0;
  const initialLoad = 8; // Carga inicial: 8 tarjetas siempre (2 filas desktop, 4 filas móvil)
  const itemsPerLoad = window.innerWidth >= 768 ? 8 : 6; // Desktop/Tablet: 8 (2 filas de 4), Móvil: 6 (3 filas de 2)

  let visibleProfiles = [];
  let currentViewMode = 'grid';

  const formatPrice = (price) => {
    return price >= 1000 ? `$${Math.round(price / 1000)}K CLP` : `$${price} CLP`;
  };

  const renderActiveChips = () => {
    activeChipsEl.innerHTML = '';
    const chips = [];

    if (filtersState.priceMin > 0 || filtersState.priceMax < 500) {
      chips.push({ key: 'price', label: `$${filtersState.priceMin * 1000} - $${filtersState.priceMax * 1000} CLP` });
    }
    if (filtersState.location) chips.push({ key: 'location', label: filtersState.location });
    if (filtersState.availability) chips.push({ key: 'availability', label: filtersState.availability });
    filtersState.categories.forEach(c => chips.push({ key: `cat-${c}`, label: c }));
    filtersState.services.forEach(s => chips.push({ key: `svc-${s}`, label: s === 'travel' ? 'Travel companion' : s.replace('-', ' ') }));
    if (filtersState.search) chips.push({ key: 'search', label: `“${filtersState.search}”` });

    chips.forEach(chip => {
      const el = document.createElement('div');
      el.className = 'active-chip';
      el.textContent = chip.label;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '×';
      btn.addEventListener('click', () => removeChip(chip.key));
      el.appendChild(btn);
      activeChipsEl.appendChild(el);
    });
  };

  const createCard = (cardProfile) => {
    const car = cardProfile; // alias para compatibilidad interna
    const div = document.createElement('div');
    div.className = 'experiencias-card animate';
    // Clase animate activa la animación CSS fadeInUp

    const img = new Image();
    // Usar foto real del perfil si existe
    const imgSrc = (car.profilePhotosData && car.profilePhotosData.length > 0) 
      ? (car.profilePhotosData[0].url || car.profilePhotosData[0].base64 || car.profilePhotosData[0]) 
      : (car.avatar || car.profilePhoto || null);
    img.src = imgSrc;
    img.className = 'experiencias-card-img';
    img.alt = car.title;

    const overlay = document.createElement('div');
    overlay.className = 'experiencias-overlay';

    const mediaBadge = document.createElement('div');
    mediaBadge.className = 'experiencias-badge';
    const hasPhotos = car.photos > 0;
    const hasVideos = car.videos > 0;
    if (hasPhotos && hasVideos) {
      mediaBadge.textContent = `📸 ${car.photos} 🎬 ${car.videos}`;
    } else if (hasPhotos) {
      mediaBadge.textContent = `📸 ${car.photos}`;
    } else {
      mediaBadge.textContent = `🎬 ${car.videos}`;
    }

    const badgeEl = document.createElement('div');
    badgeEl.className = 'experiencias-status-badge';
    badgeEl.textContent = '✓ Verificado';

    // Badge de tipo de perfil (VIP o Luxury & Exclusive)
    const profileTypes = car.profileTypes || [car.profileType] || ['vip'];

    // Filtrar "nuevo" si han pasado más de 7 días
    const validTypes = profileTypes.filter(type => {
      if (type === 'nuevo' && car.createdAt) {
        const daysPassed = (Date.now() - car.createdAt) / (1000 * 60 * 60 * 24);
        return daysPassed <= 7;
      }
      return true;
    });

    // Crear contenedor para múltiples badges
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'experiencias-badges-container';

    const badgeConfig = {
      'vip': { icon: '👑', text: 'VIP' },
      'luxury-exclusive': { icon: '💎', text: 'Luxury & Exclusive' },
      'premium': { icon: '⭐', text: 'Premium' },
      'nuevo': { icon: '✨', text: 'Nuevo' },
      'en-promocion': { icon: '🏷️', text: 'En Promoción' }
    };

    validTypes.forEach(type => {
      const profileTypeBadge = document.createElement('div');
      // Usar clase CSS que ya tiene los estilos de colores definidos
      profileTypeBadge.className = `vip-badge ${type.replace('-', '')}-badge`;

      const badge = badgeConfig[type] || badgeConfig['vip'];
      profileTypeBadge.innerHTML = `
        <span class="vip-badge-icon">${badge.icon}</span>
        <span class="vip-badge-text">${badge.text}</span>
      `;

      badgesContainer.appendChild(profileTypeBadge);
    });

    const info = document.createElement('div');
    info.className = 'experiencias-info';
    const price = document.createElement('div');
    price.className = 'experiencias-price';
    price.textContent = car.price?.CLP ? formatPrice(car.price.CLP) : '';

    info.appendChild(price);
    div.appendChild(img);
    div.appendChild(overlay);
    div.appendChild(badgeEl);
    div.appendChild(mediaBadge);
    div.appendChild(badgesContainer);
    div.appendChild(info);

    div.addEventListener('click', () => openDetail(car));

    return div;
  };

  const updateAllPrices = () => {
    document.querySelectorAll('.experiencias-card').forEach((card, i) => {
      const car = visibleProfiles[i];
      if (!car) return;
      const priceEl = card.querySelector('.experiencias-price');
      if (priceEl && car.price?.CLP) priceEl.textContent = formatPrice(car.price.CLP);
    });
  };

  const formatRelative = (timestamp) => {
    const diffH = Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
    if (diffH < 24) return `Actualizado hace ${diffH}h`;
    const d = Math.round(diffH / 24);
    return `Actualizado hace ${d} días`;
  };

  const buildMedia = (profileItem) => {
    // Usar fotos reales del perfil
    if (profileItem.profilePhotosData && profileItem.profilePhotosData.length > 0) {
      return profileItem.profilePhotosData.map(photo => ({
        type: 'image',
        src: photo.url || photo.base64 || photo
      }));
    }
    // Si no hay fotos, retornar array vacío
    return [];
  };

  const renderMedia = () => {
    if (!detailMain) return;
    detailMain.innerHTML = '';
    const item = currentMedia[currentMediaIndex];
    if (!item) return;
    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = 'media';
      detailMain.appendChild(img);
    } else {
      const video = document.createElement('video');
      video.src = item.src;
      video.controls = true;
      video.autoplay = true;
      video.muted = true;
      detailMain.appendChild(video);
    }
    if (detailCounter) detailCounter.textContent = `${currentMediaIndex + 1}/${currentMedia.length}`;
    if (detailThumbs) {
      detailThumbs.querySelectorAll('.detail-thumb').forEach((t, idx) => {
        t.classList.toggle('active', idx === currentMediaIndex);
      });
    }
  };

  const openDetail = (profileItem) => {
    if (!detailModal) return;

    // Cerrar modal anterior si existe
    const existingVipModal = document.getElementById('vip-modal');
    if (existingVipModal) {
      existingVipModal.remove();
      document.body.style.overflow = '';
    }

    // Abrir modal VIP con el perfil
    if (typeof window.openVIPModal === 'function') {
      window.openVIPModal(profileItem);
    }
  };

  const closeDetail = () => {
    if (!detailModal) return;
    detailModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    detailMain.innerHTML = '';
    detailThumbs.innerHTML = '';
    currentMedia = [];
  };

  detailClose?.addEventListener('click', closeDetail);
  detailOverlay?.addEventListener('click', closeDetail);

  detailForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Consulta enviada, te contactaremos pronto.');
    detailForm.reset();
  });

  const loadCards = (isInitial = false) => {
    if (!grid) return; // Verificar que grid existe
    const start = itemsLoaded;
    const loadAmount = isInitial ? initialLoad : itemsPerLoad;
    const availableCars = ALL_PROFILES;
    const end = Math.min(start + loadAmount, availableCars.length);
    for (let i = start; i < end; i++) {
      grid.appendChild(createCard(availableCars[i]));
    }
    itemsLoaded = end;
  };
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => loadCards(true), 100);
    });
  } else {
    setTimeout(() => loadCards(true), 100);
  }

  window.addEventListener('scroll', () => {
    const scrollThreshold = window.innerWidth >= 768 ? 400 : 200;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - scrollThreshold) {
      if (itemsLoaded < ALL_PROFILES.length) {
        loadCards();
      }
    }
  }, { passive: true });
})();

// Función helper para crear skeletons con elementos internos
function createSkeletonCard() {
  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton-card';
  skeleton.innerHTML = `
    <div class="skeleton-badge"></div>
    <div class="skeleton-price"></div>
  `;
  return skeleton;
}

// Stories System
(async function setupStories() {
  // Los stories/instantes se cargan solo desde los datos reales de las clientas
  // No hay datos de ejemplo

  // Función para cargar instantes de clientas registradas
  async function loadUserInstantes() {
    const globalInstantes = await DataService.getGlobalInstantes() || [];
    const now = new Date();

    // Filtrar instantes activos - usar duración real del plan, no hardcoded
    const activeInstantes = globalInstantes.filter(instante => {
      // Excluir estados que pudieron filtrarse
      if (instante.type === 'estado') return false;
      const createdAt = new Date(instante.createdAt);
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
      const maxDuration = instante.duration || 24; // Usar duración del plan o 24h por defecto
      return hoursAgo < maxDuration;
    });
    
    // Cargar perfiles aprobados una sola vez para resolver avatares
    const approvedProfiles = await DataService.getApprovedProfiles() || [];

    // Agrupar por usuario
    const userInstantesMap = {};
    for (const instante of activeInstantes) {
      if (!userInstantesMap[instante.userId]) {
        // Obtener avatar real del perfil aprobado si el instante no lo tiene
        let avatarSrc = instante.userAvatar || null;
        if (!avatarSrc || avatarSrc === 'null') {
          const userProfile = approvedProfiles.find(p => p.id === `profile-${instante.userId}` || p.odooId === instante.userId);
          if (userProfile) {
            avatarSrc = userProfile.profilePhotosData?.[0]?.url || userProfile.profilePhoto || userProfile.avatar || null;
          }
        }
        // Obtener WhatsApp actualizado del perfil aprobado (no del instante guardado)
        let currentWhatsapp = instante.whatsapp || '';
        const userProfile = approvedProfiles.find(p => p.id === `profile-${instante.userId}` || p.odooId === instante.userId);
        if (userProfile && userProfile.whatsapp) {
          currentWhatsapp = userProfile.whatsapp;
        }

        userInstantesMap[instante.userId] = {
          id: `clienta-${instante.userId}`,
          name: instante.userName,
          avatar: avatarSrc,
          whatsapp: currentWhatsapp,
          badge: instante.userBadge || 'premium',
          stories: [],
          latestStoryTime: instante.createdAt
        };
      }
      // Actualizar el timestamp si esta historia es más reciente
      if (instante.createdAt > userInstantesMap[instante.userId].latestStoryTime) {
        userInstantesMap[instante.userId].latestStoryTime = instante.createdAt;
      }

      // Duración: 5 segundos para imágenes, 15 segundos máximo para videos
      // mediaType distingue imagen/video; type puede ser 'instante'
      const resolvedMediaType = instante.mediaType || ((instante.type === 'video') ? 'video' : 'image');
      const duration = (resolvedMediaType === 'video') ? 15000 : 5000;

      const mediaType = resolvedMediaType;
      // La URL puede estar en .image, .media, o .src
      const mediaSrc = instante.image || instante.media || instante.src || null;

      userInstantesMap[instante.userId].stories.push({
        type: mediaType,
        src: mediaSrc,
        duration: duration,
        caption: instante.caption,
        createdAt: instante.createdAt
      });
    }
    
    return Object.values(userInstantesMap);
  }
  
  // Solo cargar instantes reales de usuarios (sin datos de ejemplo)
  let storiesData = await loadUserInstantes();

  // Ordenar stories por badge priority (coincide con sistema de profileTypes)
  const BADGE_PRIORITY = {
    'luxury-exclusive': 1,
    'vip': 2,
    'premium': 3,
    'nuevo': 4,
    'en-promocion': 5,
    'verified': 6,
    'none': 999
  };
  
  storiesData.sort((a, b) => {
    const priorityA = BADGE_PRIORITY[a.badge || 'none'] || 999;
    const priorityB = BADGE_PRIORITY[b.badge || 'none'] || 999;
    return priorityA - priorityB;
  });

  // Estado
  // viewedStories se guarda localmente para UX rápida (qué historias ya vió el usuario actual)
  let viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '{}');
  let currentUserIndex = 0;
  let currentStoryIndex = 0;
  let autoPlayTimer = null;
  let isPaused = false;
  
  // Función para verificar si un usuario tiene historias nuevas (no vistas)
  function hasUnviewedStories(user) {
    const lastViewedTime = viewedStories[user.id];
    
    // Si nunca se vio, tiene historias nuevas
    if (!lastViewedTime) return true;
    
    // Si tiene latestStoryTime (historias de clientas), comparar timestamps
    if (user.latestStoryTime) {
      return new Date(user.latestStoryTime) > new Date(lastViewedTime);
    }
    
    // Para historias base (demos), si ya se vio una vez, está vista
    return false;
  }
  
  // Función para marcar historias como vistas con timestamp actual
  function markStoriesAsViewed(userId) {
    viewedStories[userId] = new Date().toISOString();
    localStorage.setItem('viewedStories', JSON.stringify(viewedStories));
  }

  // Obtener elementos DOM una vez que se carga la página
  const carousel = document.getElementById('stories-carousel');
  const modal = document.getElementById('stories-modal');
  const closeBtn = modal?.querySelector('.stories-close-btn');
  const overlay = modal?.querySelector('.stories-overlay');
  const prevBtn = modal?.querySelector('.stories-nav-prev');
  const nextBtn = modal?.querySelector('.stories-nav-next');
  const contactBtn = document.getElementById('stories-contact-btn');
  const contentDiv = document.getElementById('stories-content');

  if (!carousel) {
    // Si no existe el carrusel, no ejecutar esta función
    return;
  }

  // Renderizar círculos de stories
  function renderCarousel() {
    if (!carousel) {
      return;
    }
    
    carousel.innerHTML = '';
    storiesData.forEach((user, index) => {
      const button = document.createElement('button');
      button.className = 'story-button';
      button.type = 'button';
      button.setAttribute('data-user-index', index);

      // Usar la nueva función para detectar historias no vistas
      const hasNewStories = hasUnviewedStories(user);

      const ring = document.createElement('div');
      ring.className = `story-ring ${hasNewStories ? '' : 'viewed'}`;

      const img = document.createElement('img');
      img.src = user.avatar || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSIjMzMzMzRkIi8+PHBhdGggZD0iTTEwMCAzNTBDMTAwIDI4MCAxNDAgMjMwIDIwMCAyMzBDMjYwIDIzMCAzMDAgMjgwIDMwMCAzNTAiIGZpbGw9IiMzMzMzNGQiLz48dGV4dCB4PSIyMDAiIHk9IjM4MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzY2NiIgZm9udC1zaXplPSIxNCI+U2luIGZvdG88L3RleHQ+PC9zdmc+';
      img.alt = user.name || 'Usuario';

      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'story-badge-container';
      
      const BADGE_EMOJIS = {
        'luxury-exclusive': '💎',
        'vip': '👑',
        'premium': '⭐',
        'nuevo': '✨',
        'en-promocion': '🏷️',
        'verified': '✓'
      };
      
      if (user.badge && BADGE_EMOJIS[user.badge]) {
        badgeContainer.textContent = BADGE_EMOJIS[user.badge];
        badgeContainer.style.display = 'flex';
      } else {
        badgeContainer.style.display = 'none';
      }
      img.className = 'story-avatar';

      const name = document.createElement('div');
      name.className = 'story-name';
      name.textContent = user.name;

      ring.appendChild(img);
      ring.appendChild(badgeContainer);
      button.appendChild(ring);
      button.appendChild(name);

      button.addEventListener('click', () => openStories(index, 0));

      carousel.appendChild(button);
    });
  }

  function openStories(userIndex, storyIndex = 0) {
    currentUserIndex = userIndex;
    currentStoryIndex = storyIndex;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    renderStory();
    startAutoPlay();
  }

  function closeStories() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    stopAutoPlay();
    contentDiv.innerHTML = '';
  }

  function renderStory() {
    const user = storiesData[currentUserIndex];
    const story = user.stories[currentStoryIndex];

    // Actualizar info del usuario
    document.getElementById('stories-user-name').textContent = user.name;
    const avatarEl = document.getElementById('stories-user-avatar');
    const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSIjMzMzMzRkIi8+PHBhdGggZD0iTTEwMCAzNTBDMTAwIDI4MCAxNDAgMjMwIDIwMCAyMzBDMjYwIDIzMCAzMDAgMjgwIDMwMCAzNTAiIGZpbGw9IiMzMzMzNGQiLz48L3N2Zz4=';
    avatarEl.src = user.avatar || defaultAvatar;

    // Calcular tiempo transcurrido
    const storyDate = new Date(story.createdAt);
    const minutesAgo = Math.floor((Date.now() - storyDate) / (1000 * 60));
    const hoursAgo = Math.floor(minutesAgo / 60);
    let timeText;
    if (minutesAgo < 1) {
      timeText = 'Hace un momento';
    } else if (minutesAgo < 60) {
      timeText = `Hace ${minutesAgo}min`;
    } else {
      timeText = `Hace ${hoursAgo}h`;
    }
    document.getElementById('stories-user-time').textContent = timeText;

    // Renderizar contenido
    contentDiv.innerHTML = '';
    if (story.src && story.type === 'image') {
      const img = document.createElement('img');
      img.src = story.src;
      img.alt = 'Story';
      contentDiv.appendChild(img);
      // Marca de agua CSS para imágenes
      const wmOverlay = document.createElement('div');
      wmOverlay.className = 'story-watermark-overlay';
      wmOverlay.innerHTML = '<span>SalaOscura</span>';
      contentDiv.appendChild(wmOverlay);
    } else if (story.src && story.type === 'video') {
      const video = document.createElement('video');
      video.src = story.src;
      video.autoplay = true;
      video.muted = false;
      video.controls = false;
      video.loop = false;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      contentDiv.appendChild(video);
      // Fallback: si autoplay con audio falla, intentar muted
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
      // Marca de agua CSS para videos
      const wmOverlay = document.createElement('div');
      wmOverlay.className = 'story-watermark-overlay';
      wmOverlay.innerHTML = '<span>SalaOscura</span>';
      contentDiv.appendChild(wmOverlay);
      // Botón de sonido
      const soundBtn = document.createElement('button');
      soundBtn.className = 'story-sound-toggle';
      soundBtn.innerHTML = video.muted ? '🔇' : '🔊';
      soundBtn.onclick = (e) => {
        e.stopPropagation();
        video.muted = !video.muted;
        soundBtn.innerHTML = video.muted ? '🔇' : '🔊';
      };
      contentDiv.appendChild(soundBtn);
    } else {
      contentDiv.innerHTML = '<p style="color:#999;text-align:center;padding:40px;">Contenido no disponible</p>';
    }

    // Actualizar barra de progreso
    updateProgressBar();

    // Marcar como vista con timestamp actual
    markStoriesAsViewed(user.id);
    renderCarousel();

    // Actualizar botones de navegación
    updateNavButtons();

    // Guardar el whatsapp en un atributo para usarlo luego
    contactBtn.dataset.whatsapp = user.whatsapp;
  }

  function updateProgressBar() {
    const user = storiesData[currentUserIndex];
    const progressDiv = document.getElementById('stories-progress');
    progressDiv.innerHTML = '';

    user.stories.forEach((story, index) => {
      const segment = document.createElement('div');
      segment.className = 'progress-segment';
      
      const fill = document.createElement('div');
      fill.className = 'progress-fill';
      
      if (index === currentStoryIndex) {
        // Historia actual - animar el relleno
        segment.classList.add('active');
        fill.style.animationDuration = `${story.duration}ms`;
      } else if (index < currentStoryIndex) {
        // Historias ya vistas - relleno completo
        segment.classList.add('completed');
      }
      // Historias futuras - sin relleno (estado por defecto)
      
      segment.appendChild(fill);
      progressDiv.appendChild(segment);
    });
  }

  function updateNavButtons() {
    prevBtn.classList.toggle('hidden', currentUserIndex === 0 && currentStoryIndex === 0);
    nextBtn.classList.toggle('hidden', currentUserIndex === storiesData.length - 1 && currentStoryIndex === storiesData[currentUserIndex].stories.length - 1);
  }

  function startAutoPlay() {
    stopAutoPlay();
    const user = storiesData[currentUserIndex];
    const story = user.stories[currentStoryIndex];
    autoPlayTimer = setTimeout(() => {
      if (!isPaused) {
        nextStory();
      } else {
        startAutoPlay();
      }
    }, story.duration);
  }

  function stopAutoPlay() {
    if (autoPlayTimer) {
      clearTimeout(autoPlayTimer);
      autoPlayTimer = null;
    }
  }

  function nextStory() {
    const user = storiesData[currentUserIndex];
    if (currentStoryIndex < user.stories.length - 1) {
      currentStoryIndex++;
      renderStory();
      startAutoPlay();
    } else if (currentUserIndex < storiesData.length - 1) {
      currentUserIndex++;
      currentStoryIndex = 0;
      renderStory();
      startAutoPlay();
    } else {
      closeStories();
    }
  }

  function prevStory() {
    if (currentStoryIndex > 0) {
      currentStoryIndex--;
      renderStory();
      startAutoPlay();
    } else if (currentUserIndex > 0) {
      currentUserIndex--;
      currentStoryIndex = storiesData[currentUserIndex].stories.length - 1;
      renderStory();
      startAutoPlay();
    }
  }

  // Event listeners
  closeBtn.addEventListener('click', closeStories);
  overlay.addEventListener('click', closeStories);
  prevBtn.addEventListener('click', prevStory);
  nextBtn.addEventListener('click', nextStory);

  // Click en el nombre o avatar del usuario para abrir su perfil
  const userNameEl = document.getElementById('stories-user-name');
  const userAvatarEl = document.getElementById('stories-user-avatar');
  
  async function openUserProfile() {
    const user = storiesData[currentUserIndex];
    if (!user) return;

    // Cerrar el modal de stories
    closeStories();

    // Buscar el perfil completo del usuario desde AWS
    const approvedProfiles = await DataService.getApprovedProfiles() || [];

    // Extraer el userId del id del usuario en stories (format: "clienta-XXX")
    const userId = user.id.replace('clienta-', '');
    const profile = approvedProfiles.find(p => p.id === `profile-${userId}` || p.originalRegistro?.id === userId);

    if (profile && typeof window.openVIPModal === 'function') {
      // Asegurar que el perfil tenga todos los campos necesarios para el modal
      profile.stats = profile.stats || { likes: 0, views: 0, recommendations: 0, experiences: 0, rating: 5.0 };
      profile.profileTypes = profile.profileTypes || (profile.profileType ? [profile.profileType] : (profile.selectedPlan ? [profile.selectedPlan] : ['premium']));
      profile.price = profile.price || { CLP: 0 };
      profile.photos = profile.photos || profile.profilePhotosData?.length || 0;
      profile.videos = profile.videos || profile.profileVideosData?.length || 0;
      profile.physicalInfo = profile.physicalInfo || {};
      profile.services = profile.services || [];

      // Pequeño delay para que se cierre el modal de stories primero
      setTimeout(() => {
        window.openVIPModal(profile);
      }, 100);
    }
  }
  
  if (userNameEl) {
    userNameEl.style.cursor = 'pointer';
    userNameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserProfile();
    });
  }
  
  if (userAvatarEl) {
    userAvatarEl.style.cursor = 'pointer';
    userAvatarEl.addEventListener('click', (e) => {
      e.stopPropagation();
      openUserProfile();
    });
  }

  // Navegación por tap en móvil
  modal.addEventListener('click', (e) => {
    if (e.target !== overlay && e.target !== contentDiv && e.target !== closeBtn && !closeBtn.contains(e.target)) return;
    
    const rect = modal.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const tapZone = width / 3;

    if (x < tapZone) prevStory();
    else if (x > width - tapZone) nextStory();
  });

  // Pausa al mantener presionado (mousedown/touchstart)
  const viewer = modal.querySelector('.stories-viewer');
  
  viewer.addEventListener('mousedown', (e) => {
    if (e.target === prevBtn || e.target === nextBtn || e.target === closeBtn || e.target === contactBtn) return;
    isPaused = true;
    stopAutoPlay();
  });

  viewer.addEventListener('mouseup', () => {
    isPaused = false;
    startAutoPlay();
  });

  viewer.addEventListener('mouseleave', () => {
    if (isPaused) {
      isPaused = false;
      startAutoPlay();
    }
  });

  // Touch events para móvil
  viewer.addEventListener('touchstart', (e) => {
    if (e.target === prevBtn || e.target === nextBtn || e.target === closeBtn || e.target === contactBtn) return;
    isPaused = true;
    stopAutoPlay();
  }, { passive: true });

  viewer.addEventListener('touchend', () => {
    isPaused = false;
    startAutoPlay();
  });

  // Cierre con ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('open')) {
      closeStories();
    }
  });

  // Botón Contáctame
  contactBtn.addEventListener('click', () => {
    const whatsapp = contactBtn.dataset.whatsapp;
    if (whatsapp) {
      const message = encodeURIComponent('Hola, me interesa tu servicio');
      window.open(`https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
      closeStories();
    }
  });

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCarousel);
  } else {
    setTimeout(renderCarousel, 100);
  }
})(); 

// ============================================
// Creators Carousel
(function setupCreatorsCarousel() {
  const carousel = document.getElementById('creators-carousel');
  const prevBtn = document.getElementById('creators-prev');
  const nextBtn = document.getElementById('creators-next');

  if (!carousel) {
    return;
  }

  // Función para cargar perfiles aprobados del admin para VIP Black
  const loadApprovedVIPProfiles = async () => {
    const approvedProfiles = await DataService.getApprovedProfiles() || [];
    // Solo mostrar perfiles que estén visibles, activos y con plan válido
    return approvedProfiles.filter(profile => {
      const isVisible = profile.profileVisible === true;
      const isActive = profile.isActive !== false; // Por defecto activo si no existe la propiedad
      const isVipBlack = profile.carouselType === 'vip-black';
      const today = new Date().toISOString().split('T')[0];
      const planNotExpired = !profile.planExpiry || profile.planExpiry >= today;
      
      // Aplicar filtros globales
      const passesFilter = window.profilePassesFilter ? window.profilePassesFilter(profile, window.currentGlobalFilters) : true;
      
      return isVisible && isActive && isVipBlack && planNotExpired && passesFilter;
    });
  };

  // Los perfiles se cargan desde approvedProfiles (no hay datos por defecto)

  // Combinar perfiles del admin con datos por defecto
  const getAllCreatorsData = async () => {
    const approvedProfiles = await loadApprovedVIPProfiles();
    const adminCreators = approvedProfiles.map(profile => ({
      id: profile.id,
      name: profile.displayName,
      title: 'VIP Black Member',
      avatar: (profile.profilePhotosData && profile.profilePhotosData.length > 0) 
        ? (profile.profilePhotosData[0].url || profile.profilePhotosData[0].base64 || profile.profilePhotosData[0]) 
        : (profile.avatar || profile.profilePhoto || null),
      profileTypes: profile.profileTypes,
      price: profile.price?.CLP || profile.prices?.hour?.CLP || (profile.originalRegistro?.priceHour ? parseInt(profile.originalRegistro.priceHour) : null),
      // Añadir datos físicos para mostrar en tarjeta
      age: profile.physicalInfo?.age || profile.age || profile.originalRegistro?.age || null,
      height: profile.physicalInfo?.height || profile.height || profile.originalRegistro?.altura || null,
      nationality: profile.physicalInfo?.ethnicity || profile.nationality || profile.originalRegistro?.nacionalidad || null,
      stats: profile.stats || {
        likes: 0,
        views: 0,
        rating: 5.0
      },
      isAdminProfile: true,
      fullProfile: profile
    }));

    // Solo retornar perfiles reales del admin
    return adminCreators;
  };

  const getProfileTypeBadge = (type) => {
    const badges = {
      'vip': { icon: '👑', text: 'VIP', color: '#FFFFFF' },
      'luxury-exclusive': { icon: '💎', text: 'Luxury & Exclusive', color: '#FFFFFF' },
      'premium': { icon: '⭐', text: 'Premium', color: '#FFFFFF' },
      'nuevo': { icon: '✨', text: 'Nuevo', color: '#FFFFFF' },
      'en-promocion': { icon: '🏷️', text: 'En Promoción', color: '#FFFFFF' }
    };
    return badges[type] || badges['vip'];
  };

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const createCreatorCard = (creator) => {
    const card = document.createElement('div');
    card.className = 'creator-card';

    // Imagen de portada que ocupa toda la tarjeta
    const coverImage = document.createElement('img');
    coverImage.src = creator.avatar || '';
    coverImage.alt = creator.name;
    coverImage.className = 'creator-cover-image';
    
    // Overlay para mejor legibilidad del texto
    const overlay = document.createElement('div');
    overlay.className = 'creator-overlay';

    // Badges posicionados arriba
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'creator-badge-container';
    
    creator.profileTypes.forEach(type => {
      const badge = getProfileTypeBadge(type);
      const badgeEl = document.createElement('div');
      badgeEl.className = `creator-profile-badge ${type.replace('-', '')}-badge`;
      badgeEl.innerHTML = `
        <span>${badge.icon}</span>
        <span>${badge.text}</span>
      `;
      badgesContainer.appendChild(badgeEl);
    });

    // Contenedor del contenido (nombre, título, stats)
    const content = document.createElement('div');
    content.className = 'creator-content';

    const name = document.createElement('h3');
    name.className = 'creator-name';
    name.textContent = creator.name;

    const title = document.createElement('p');
    title.className = 'creator-title';
    title.textContent = creator.title;

    // Información adicional (edad, altura, nacionalidad)
    const infoLine = document.createElement('div');
    infoLine.className = 'creator-info-line';
    const infoItems = [];
    if (creator.age) infoItems.push(`${creator.age} años`);
    if (creator.height) infoItems.push(`${creator.height} cm`);
    if (creator.nationality) infoItems.push(creator.nationality);
    if (infoItems.length > 0) {
      infoLine.innerHTML = `<span class="creator-info-text">${infoItems.join(' • ')}</span>`;
    } else {
      infoLine.style.display = 'none';
    }

    // Ubicación (comuna)
    const location = document.createElement('div');
    location.className = 'creator-location';
    if (creator.commune) {
      location.innerHTML = `<span class="location-pin">📍</span> ${creator.commune}`;
    } else {
      location.style.display = 'none';
    }

    const stats = document.createElement('div');
    stats.className = 'creator-stats';
    stats.innerHTML = `
      <div class="creator-stat">
        <div class="creator-stat-icon">❤️</div>
        <div class="creator-stat-value">${formatNumber(creator.stats.likes)}</div>
        <div class="creator-stat-label">Likes</div>
      </div>
      <div class="creator-stat">
        <div class="creator-stat-icon">👁️</div>
        <div class="creator-stat-value">${formatNumber(creator.stats.views)}</div>
        <div class="creator-stat-label">Views</div>
      </div>
      <div class="creator-stat">
        <div class="creator-stat-icon">⭐</div>
        <div class="creator-stat-value">${creator.stats.rating}</div>
        <div class="creator-stat-label">Rating</div>
      </div>
    `;

    // Precio estilizado (igual que Luxury)
    const price = document.createElement('div');
    price.className = 'vip-price';
    const priceValue = creator.price;
    if (priceValue) {
      price.innerHTML = `$${parseInt(priceValue).toLocaleString('es-CL')} <span class="price-duration">1h</span>`;
    } else {
      price.style.display = 'none';
    }

    // Agregar elementos al contenido
    content.appendChild(name);
    content.appendChild(title);
    content.appendChild(infoLine);
    content.appendChild(location);
    content.appendChild(stats);
    content.appendChild(price);

    // Agregar todo a la tarjeta
    card.appendChild(coverImage);
    card.appendChild(overlay);
    card.appendChild(badgesContainer);
    card.appendChild(content);

    // Click handler para abrir modal
    card.addEventListener('click', () => {
      let fullProfile;
      
      // Si es un perfil del admin, usar los datos completos
      if (creator.isAdminProfile && creator.fullProfile) {
        fullProfile = {
          ...creator.fullProfile,
          avatar: creator.avatar
        };
      } else {
        // Usar datos reales del creator
        fullProfile = {
          id: creator.id,
          displayName: creator.name,
          username: creator.username || creator.name?.toLowerCase().replace(/\s/g, '.'),
          title: creator.title,
          verified: creator.verified || false,
          profileTypes: creator.profileTypes,
          bio: creator.bio || '',
          whatsapp: creator.whatsapp || '',
          physicalInfo: creator.physicalInfo || null,
          attributes: creator.attributes || null,
          services: creator.services || [],
          prices: creator.prices || null,
          availabilityDetails: creator.availabilityDetails || null,
          availability: creator.availability || '',
          commune: creator.commune || '',
          city: creator.city || '',
          languages: creator.languages || [],
          photos: creator.photos || 0,
          videos: creator.videos || 0,
          stats: creator.stats,
          avatar: creator.avatar,
          profilePhotosData: creator.profilePhotosData || []
        };
      }
      
      // Usar openVIPModal con el perfil completo
      if (typeof window.openVIPModal === 'function') {
        window.openVIPModal(fullProfile);
      }
    });

    return card;
  };

  const renderCreators = async () => {
    if (!carousel) return;
    
    carousel.innerHTML = '';
    const allCreators = await getAllCreatorsData();
    if (!Array.isArray(allCreators)) {
      console.warn('getAllCreatorsData no retornó un array:', allCreators);
      return;
    }
    allCreators.forEach(creator => {
      carousel.appendChild(createCreatorCard(creator));
    });
  };

  let scrollPosition = 0;
  const cardWidth = 304; // 280px + 24px gap

  const scrollCarousel = (direction) => {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    if (direction === 'next') {
      scrollPosition = Math.min(scrollPosition + cardWidth, maxScroll);
    } else {
      scrollPosition = Math.max(scrollPosition - cardWidth, 0);
    }
    
    carousel.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  // Event listeners
  prevBtn?.addEventListener('click', () => scrollCarousel('prev'));
  nextBtn?.addEventListener('click', () => scrollCarousel('next'));

  // Event listener para refrescar el carrusel
  document.addEventListener('refreshCreators', async () => {
    await renderCreators();
  });

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      setTimeout(async () => await renderCreators(), 100);
    });
  } else {
    setTimeout(async () => await renderCreators(), 100);
  }
})(); 

// ============================================
// Premium Select Carousel
(function setupPremiumSelectCarousel() {
  const carousel = document.getElementById('premium-select-carousel');
  const prevBtn = document.getElementById('premium-select-prev');
  const nextBtn = document.getElementById('premium-select-next');

  if (!carousel) {
    // Si no existe el carrusel, no ejecutar esta función
    return;
  }

  // Los perfiles se cargan desde approvedProfiles (no hay datos por defecto)

  // Función para cargar perfiles aprobados del admin para Premium Select
  const loadApprovedPremiumProfiles = async () => {
    const approvedProfiles = await DataService.getApprovedProfiles() || [];
    // Solo mostrar perfiles que estén visibles, activos y con plan válido
    return approvedProfiles.filter(profile => {
      const isVisible = profile.profileVisible === true;
      const isActive = profile.isActive !== false; // Por defecto activo si no existe la propiedad
      const isPremiumSelect = profile.carouselType === 'premium-select';
      const today = new Date().toISOString().split('T')[0];
      const planNotExpired = !profile.planExpiry || profile.planExpiry >= today;
      
      // Aplicar filtros globales
      const passesFilter = window.profilePassesFilter ? window.profilePassesFilter(profile, window.currentGlobalFilters) : true;
      
      return isVisible && isActive && isPremiumSelect && planNotExpired && passesFilter;
    });
  };

  // Combinar perfiles del admin con datos por defecto
  const getAllPremiumSelectData = async () => {
    const approvedProfiles = await loadApprovedPremiumProfiles();
    const adminCreators = approvedProfiles.map(profile => ({
      id: profile.id,
      name: profile.displayName,
      title: 'Premium Select',
      avatar: (profile.profilePhotosData && profile.profilePhotosData.length > 0) 
        ? (profile.profilePhotosData[0].url || profile.profilePhotosData[0].base64 || profile.profilePhotosData[0]) 
        : (profile.avatar || profile.profilePhoto || null),
      profileTypes: profile.profileTypes,
      price: profile.price?.CLP || profile.prices?.hour?.CLP || (profile.originalRegistro?.priceHour ? parseInt(profile.originalRegistro.priceHour) : null),
      // Añadir datos físicos para mostrar en tarjeta
      age: profile.physicalInfo?.age || profile.age || profile.originalRegistro?.age || null,
      height: profile.physicalInfo?.height || profile.height || profile.originalRegistro?.altura || null,
      nationality: profile.physicalInfo?.ethnicity || profile.nationality || profile.originalRegistro?.nacionalidad || null,
      commune: profile.commune || profile.originalRegistro?.commune || null,
      stats: profile.stats || {
        likes: 0,
        views: 0,
        rating: 5.0
      },
      isAdminProfile: true,
      fullProfile: profile
    }));

    // Solo retornar perfiles reales del admin
    return adminCreators;
  };

  const getProfileTypeBadge = (type) => {
    const badges = {
      'vip': { icon: '👑', text: 'VIP', color: '#FFFFFF' },
      'luxury-exclusive': { icon: '💎', text: 'Luxury & Exclusive', color: '#FFFFFF' },
      'premium': { icon: '⭐', text: 'Premium', color: '#FFFFFF' },
      'nuevo': { icon: '✨', text: 'Nuevo', color: '#FFFFFF' },
      'en-promocion': { icon: '🏷️', text: 'En Promoción', color: '#FFFFFF' }
    };
    return badges[type] || badges['premium'];
  };

  const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const createPremiumSelectCard = (creator) => {
    const card = document.createElement('div');
    card.className = 'premium-select-card';

    // Imagen de portada que ocupa toda la tarjeta
    const coverImage = document.createElement('img');
    coverImage.src = creator.avatar || '';
    coverImage.alt = creator.name;
    coverImage.className = 'premium-select-cover-image';
    
    // Overlay para mejor legibilidad del texto
    const overlay = document.createElement('div');
    overlay.className = 'premium-select-overlay';

    // Badges posicionados arriba
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'premium-select-badge-container';
    
    creator.profileTypes.forEach(type => {
      const badge = getProfileTypeBadge(type);
      const badgeEl = document.createElement('div');
      badgeEl.className = `premium-select-profile-badge ${type.replace('-', '')}-badge`;
      badgeEl.innerHTML = `
        <span>${badge.icon}</span>
        <span>${badge.text}</span>
      `;
      badgesContainer.appendChild(badgeEl);
    });

    // Contenedor del contenido (nombre, título, stats)
    const content = document.createElement('div');
    content.className = 'premium-select-content';

    const name = document.createElement('h3');
    name.className = 'premium-select-name';
    name.textContent = creator.name;

    const title = document.createElement('p');
    title.className = 'premium-select-title-desc';
    title.textContent = creator.title;

    // Información adicional (edad, altura, nacionalidad)
    const infoLine = document.createElement('div');
    infoLine.className = 'premium-select-info-line';
    const infoItems = [];
    if (creator.age) infoItems.push(`${creator.age} años`);
    if (creator.height) infoItems.push(`${creator.height} cm`);
    if (creator.nationality) infoItems.push(creator.nationality);
    if (infoItems.length > 0) {
      infoLine.innerHTML = `<span class="premium-select-info-text">${infoItems.join(' • ')}</span>`;
    } else {
      infoLine.style.display = 'none';
    }

    // Ubicación (comuna)
    const location = document.createElement('div');
    location.className = 'premium-select-location';
    if (creator.commune) {
      location.innerHTML = `<span class="location-pin">📍</span> ${creator.commune}`;
    } else {
      location.style.display = 'none';
    }

    const stats = document.createElement('div');
    stats.className = 'premium-select-stats';
    stats.innerHTML = `
      <div class="premium-select-stat">
        <div class="premium-select-stat-icon">💖</div>
        <div class="premium-select-stat-value">${formatNumber(creator.stats.likes)}</div>
        <div class="premium-select-stat-label">Likes</div>
      </div>
      <div class="premium-select-stat">
        <div class="premium-select-stat-icon">👀</div>
        <div class="premium-select-stat-value">${formatNumber(creator.stats.views)}</div>
        <div class="premium-select-stat-label">Views</div>
      </div>
      <div class="premium-select-stat">
        <div class="premium-select-stat-icon">⭐</div>
        <div class="premium-select-stat-value">${creator.stats.rating}</div>
        <div class="premium-select-stat-label">Rating</div>
      </div>
    `;

    // Precio estilizado (igual que Luxury)
    const price = document.createElement('div');
    price.className = 'vip-price';
    const priceValue = creator.price;
    if (priceValue) {
      price.innerHTML = `$${parseInt(priceValue).toLocaleString('es-CL')} <span class="price-duration">1h</span>`;
    } else {
      price.style.display = 'none';
    }

    // Agregar elementos al contenido
    content.appendChild(name);
    content.appendChild(title);
    content.appendChild(infoLine);
    content.appendChild(location);
    content.appendChild(stats);
    content.appendChild(price);

    // Agregar todo a la tarjeta
    card.appendChild(coverImage);
    card.appendChild(overlay);
    card.appendChild(badgesContainer);
    card.appendChild(content);

    // Click handler para abrir modal completo
    card.addEventListener('click', () => {
      let fullProfile;
      
      // Si es un perfil del admin, usar los datos completos
      if (creator.isAdminProfile && creator.fullProfile) {
        fullProfile = {
          ...creator.fullProfile,
          avatar: creator.avatar
        };
      } else {
        // Usar datos reales del creator
        fullProfile = {
          id: creator.id,
          displayName: creator.name,
          username: creator.username || creator.name?.toLowerCase().replace(/\s/g, '.'),
          title: creator.title,
          verified: creator.verified || false,
          profileTypes: creator.profileTypes,
          bio: creator.bio || '',
          whatsapp: creator.whatsapp || '',
          physicalInfo: creator.physicalInfo || null,
          attributes: creator.attributes || null,
          services: creator.services || [],
          prices: creator.prices || null,
          availabilityDetails: creator.availabilityDetails || null,
          availability: creator.availability || '',
          commune: creator.commune || '',
          city: creator.city || '',
          languages: creator.languages || [],
          photos: creator.photos || 0,
          videos: creator.videos || 0,
          stats: creator.stats,
          avatar: creator.avatar,
          profilePhotosData: creator.profilePhotosData || []
        };
      }
      
      // Usar openVIPModal con el perfil completo
      if (typeof window.openVIPModal === 'function') {
        window.openVIPModal(fullProfile);
      }
    });

    return card;
  };

  const renderPremiumSelect = async () => {
    if (!carousel) return;
    
    carousel.innerHTML = '';
    const allPremiumSelect = await getAllPremiumSelectData();
    if (!Array.isArray(allPremiumSelect)) {
      console.warn('getAllPremiumSelectData no retornó un array:', allPremiumSelect);
      return;
    }
    allPremiumSelect.forEach(creator => {
      carousel.appendChild(createPremiumSelectCard(creator));
    });
  };

  let scrollPosition = 0;
  const cardWidth = 344; // 320px + 24px gap

  const scrollCarousel = (direction) => {
    const maxScroll = carousel.scrollWidth - carousel.clientWidth;
    
    if (direction === 'next') {
      scrollPosition = Math.min(scrollPosition + cardWidth, maxScroll);
    } else {
      scrollPosition = Math.max(scrollPosition - cardWidth, 0);
    }
    
    carousel.scrollTo({
      left: scrollPosition,
      behavior: 'smooth'
    });
  };

  // Event listeners
  prevBtn?.addEventListener('click', () => scrollCarousel('prev'));
  nextBtn?.addEventListener('click', () => scrollCarousel('next'));

  // Event listener para refrescar el carrusel
  document.addEventListener('refreshPremiumSelect', async () => {
    await renderPremiumSelect();
  });

  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
      setTimeout(async () => await renderPremiumSelect(), 100);
    });
  } else {
    setTimeout(async () => await renderPremiumSelect(), 100);
  }
})(); 

// ============================================
// Contact Modal
// Contact Modal - Manejar cierre y submit
(function setupContactModal() {
  const modal = document.getElementById('contact-modal');
  const closeBtn = document.getElementById('contact-close');
  const cancelBtn = document.getElementById('contact-cancel');
  const overlay = modal?.querySelector('.contact-overlay');
  const form = document.getElementById('contact-form');

  if (!modal || !form) return;

  const closeModal = () => {
    document.activeElement?.blur();
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    form.reset();
  };
  
  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  
  cancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
  });
  
  overlay?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Flag para prevenir envíos duplicados
  let isSubmitting = false;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Prevenir envíos duplicados
    if (isSubmitting) {
      console.log('Ya hay un envío en proceso, ignorando...');
      return;
    }

    isSubmitting = true;

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn?.textContent || 'Enviar mensaje';

    // Deshabilitar botón y mostrar feedback
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Enviando...';
      submitBtn.style.opacity = '0.6';
    }

    try {
      const formData = new FormData(form);
      const fileInput = document.getElementById('contact-archivos');

      // Convertir archivos a base64
      let archivosData = [];
      if (fileInput && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          const file = fileInput.files[i];
          try {
            const base64 = await fileToBase64(file);
            archivosData.push({
              nombre: file.name,
              tipo: file.type,
              tamaño: file.size,
              data: base64
            });
          } catch (err) {
            console.error('Error al procesar archivo:', err);
          }
        }
      }

      // Crear mensaje con ID único
      const mensaje = {
        id: Date.now() + Math.random().toString(36).slice(2, 11), // ID único con timestamp + random
        fecha: new Date().toISOString(),
        nombre: formData.get('nombre'),
        email: formData.get('email'),
        telefono: formData.get('telefono') || 'No proporcionado',
        mensaje: formData.get('mensaje'),
        archivos: archivosData,
        leido: false
      };

      console.log('📤 Enviando mensaje con ID:', mensaje.id);

      // Guardar mensaje usando la función con fallback
      await DataService.addContactMessage(mensaje);

      // Intentar enviar notificación por correo usando AWS SES
      enviarNotificacionCorreo(mensaje);

      alert('¡Mensaje enviado correctamente! Te responderemos pronto.');
      closeModal();
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error al enviar mensaje. Por favor intenta nuevamente.');
    } finally {
      // Re-habilitar botón
      isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
        submitBtn.style.opacity = '1';
      }
    }
  });

  // Función para enviar notificación por correo usando AWS SES
  async function enviarNotificacionCorreo(mensaje) {
    const emailConfig = await DataService.getEmailConfig() || {};
    
    if (!emailConfig.active || !emailConfig.provider || !emailConfig.to) {
      console.log('Notificaciones por correo no configuradas o desactivadas');
      return;
    }

    // Preparar el contenido del correo
    const fecha = new Date(mensaje.fecha).toLocaleString('es-CL');
    const subject = (emailConfig.subject || 'Nuevo mensaje de contacto - {nombre}')
      .replace('{nombre}', mensaje.nombre)
      .replace('{email}', mensaje.email)
      .replace('{telefono}', mensaje.telefono)
      .replace('{fecha}', fecha);

    const body = (emailConfig.template || 'Nuevo mensaje de {nombre}')
      .replace('{nombre}', mensaje.nombre)
      .replace('{email}', mensaje.email)
      .replace('{telefono}', mensaje.telefono)
      .replace('{mensaje}', mensaje.mensaje)
      .replace('{fecha}', fecha);

    // NOTA: El envío real de correo requiere un backend.
    // Esta es la estructura de datos que se enviaría:
    const emailData = {
      provider: emailConfig.provider,
      from: emailConfig.from,
      to: emailConfig.to,
      cc: emailConfig.cc,
      subject: subject,
      body: body,
      config: emailConfig.provider === 'smtp' || emailConfig.provider === 'gmail' || emailConfig.provider === 'outlook' 
        ? emailConfig.smtp 
        : emailConfig.api
    };

    console.log('📧 Datos para envío de correo:', emailData);
    
    // Enviar al backend
    try {
      const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001/api' 
        : '/api';
      
      const response = await fetch(`${API_URL}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendContactNotification',
          message: mensaje,
          config: emailConfig
        })
      });
      
      if (response.ok) {
        console.log('✅ Correo enviado exitosamente');
      } else {
        console.warn('⚠️ No se pudo enviar el correo, pero el mensaje se guardó localmente');
      }
    } catch (err) {
      console.warn('⚠️ Backend no disponible, el mensaje se guardó localmente:', err.message);
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
})();

// ============================================
// Testimonials Slider
// ============================================

(async function setupTestimonials() {
  const section = document.getElementById('testimonials-section');
  const slider = document.getElementById('testimonials-slider');
  const track = document.getElementById('ts-track');
  const dots = document.getElementById('ts-dots');
  const prevBtn = slider?.querySelector('.ts-prev');
  const nextBtn = slider?.querySelector('.ts-next');

  if (!section || !slider || !track || !dots) return;

  // Testimonios se cargan desde la BD - sin datos de muestra

  const loadApproved = async () => {
    const arr = await DataService.getTestimonials() || [];
    return arr.filter(t => t.approved);
  };

  let currentIndex = 0;
  let itemsPerView = 3;
  let autoplayId = null;
  const AUTOPLAY_MS = 6000;
  let currentList = await loadApproved();

  const getItemsPerView = () => {
    if (window.innerWidth <= 640) return 1;
    if (window.innerWidth <= 991) return 2;
    return 3;
  };

  const initials = (name) => name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase();
  const stars = (n) => '★★★★★'.slice(0, Math.max(0, Math.min(5, n)));
  const formatDate = (iso) => {
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  const renderCards = (list) => {
    track.innerHTML = list.map(t => `
      <div class="ts-card" data-id="${t.id}">
        <span class="ts-quote">“</span>
        <div class="ts-header">
          <div class="ts-avatar">${initials(t.name)}</div>
          <div class="ts-name">${t.name}</div>
        </div>
        <div class="ts-rating">${stars(t.rating)}</div>
        <div class="ts-text">${t.text}</div>
        <div class="ts-date">${formatDate(t.date)}</div>
      </div>
    `).join('');
  };

  const pageCount = () => Math.max(1, Math.ceil(currentList.length / itemsPerView));

  const renderDots = () => {
    const pages = pageCount();
    dots.innerHTML = Array.from({ length: pages }, (_, i) => `<button class="ts-dot ${i===0?'active':''}" data-page="${i}" aria-label="Ir a página ${i+1}"></button>`).join('');
    dots.querySelectorAll('.ts-dot').forEach(dot => {
      dot.addEventListener('click', () => goToPage(parseInt(dot.dataset.page)));
    });
  };

  const updateDots = () => {
    const pages = pageCount();
    const activePage = Math.floor(currentIndex / itemsPerView);
    dots.querySelectorAll('.ts-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === activePage);
    });
  };

  const slideToIndex = (index) => {
    const cards = track.children;
    if (!cards.length) return;
    const clamped = Math.max(0, Math.min(index, cards.length - 1));
    const target = cards[clamped];
    const offset = target.offsetLeft;
    track.style.transform = `translateX(${-offset}px)`;
    currentIndex = clamped;
    updateDots();
    resetAutoplay();
  };

  const nextPage = () => slideToIndex(currentIndex + itemsPerView);
  const prevPage = () => slideToIndex(currentIndex - itemsPerView);

  const startAutoplay = () => {
    stopAutoplay();
    autoplayId = setInterval(() => {
      const next = currentIndex + itemsPerView;
      if (next >= currentList.length) {
        slideToIndex(0);
      } else {
        slideToIndex(next);
      }
    }, AUTOPLAY_MS);
  };
  const stopAutoplay = () => { if (autoplayId) { clearInterval(autoplayId); autoplayId = null; } };
  const resetAutoplay = () => { stopAutoplay(); startAutoplay(); };

  const goToPage = (page) => slideToIndex(page * itemsPerView);

  const recalc = () => {
    itemsPerView = getItemsPerView();
    renderDots();
    slideToIndex(Math.floor(currentIndex / itemsPerView) * itemsPerView);
  };

  const setList = async (list) => {
    currentList = list && list.length ? list : await loadApproved();
    itemsPerView = getItemsPerView();
    renderCards(currentList);
    renderDots();
    slideToIndex(0);
  };

  // Expose setter for detail modal linkage
  async function setTestimonialsForProfile(profile) {
    if (!profile) return;
    const approved = await loadApproved();
    const filtered = approved.filter(t => t.profileId === profile.id);
    await setList(filtered.length ? filtered : approved.slice(0, 6));
  }
  window.setTestimonialsForProfile = setTestimonialsForProfile;

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        setList(loadApproved());
        startAutoplay();
      }, 100);
    });
  } else {
    setTimeout(() => {
      setList(loadApproved());
      startAutoplay();
    }, 100);
  }

  // Events
  prevBtn?.addEventListener('click', prevPage);
  nextBtn?.addEventListener('click', nextPage);
  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  window.addEventListener('resize', recalc, { passive: true });
})();

// Detectar si llegó desde un link compartido
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get('profile');

  if (profileId) {
    // Iniciar la carga del perfil INMEDIATAMENTE en paralelo
    const profilePromise = (async () => {
      const approvedProfiles = await DataService.getApprovedProfiles() || [];
      let profile = approvedProfiles.find(p => p.id === profileId);
      if (!profile) {
        const publicacionesCreadas = await DataService.getProfiles() || [];
        profile = publicacionesCreadas.find(p => p.status === 'aprobado' && (p.id === profileId || p.id === parseInt(profileId)));
      }
      return profile;
    })();

    // Esperar a que openVIPModal esté disponible en paralelo
    const waitForModal = () => new Promise((resolve, reject) => {
      let attempts = 0;
      const check = () => {
        if (typeof window.openVIPModal === 'function') {
          resolve();
        } else if (++attempts >= 150) {
          reject(new Error('openVIPModal no disponible'));
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    // Ejecutar ambos en paralelo y abrir modal cuando ambos estén listos
    Promise.all([profilePromise, waitForModal()]).then(([profile]) => {
      if (profile) {
        if (typeof window.incrementViews === 'function') {
          window.incrementViews(profileId);
        }
        window.openVIPModal(profile);
      } else {
        alert('El perfil que buscas no está disponible o ha sido eliminado.');
      }
    }).catch(err => {
      console.error('Error abriendo perfil compartido:', err);
    });
  }
});

// ========================================
// CARRUSEL DE ESTADOS/DISPONIBILIDAD
// ========================================
(async function setupEstadosCarousel() {
  const carousel = document.getElementById('estados-carousel');
  if (!carousel) return;
  
  async function loadEstados() {
    const globalEstados = await DataService.getEstados() || [];
    const now = new Date();

    // Filtrar estados activos (no vencidos)
    const activeEstados = globalEstados.filter(estado => {
      const createdAt = new Date(estado.createdAt);
      const hoursAgo = (now - createdAt) / (1000 * 60 * 60);
      return hoursAgo < estado.duration;
    });

    // Resolver avatares faltantes desde approvedProfiles
    const approvedProfilesForAvatars = await DataService.getApprovedProfiles() || [];
    for (const estado of activeEstados) {
      if (!estado.userAvatar || estado.userAvatar === 'null' || estado.userAvatar === '') {
        const userProfile = approvedProfilesForAvatars.find(p =>
          p.id === `profile-${estado.userId}` || p.odooId === estado.userId
        );
        if (userProfile) {
          estado.userAvatar = userProfile.profilePhotosData?.[0]?.url || userProfile.profilePhoto || userProfile.avatar || null;
        }
      }
    }

    // Ordenar: disponible primero, luego por fecha
    activeEstados.sort((a, b) => {
      if (a.type === 'disponible' && b.type !== 'disponible') return -1;
      if (b.type === 'disponible' && a.type !== 'disponible') return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    if (activeEstados.length === 0) {
      // Mostrar estados de ejemplo si no hay estados reales
      carousel.innerHTML = renderExampleEstados();
    } else {
      carousel.innerHTML = activeEstados.map(estado => renderEstadoCard(estado)).join('');
    }
    
    // Agregar event listeners
    carousel.querySelectorAll('.estado-contact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const whatsapp = btn.dataset.whatsapp;
        if (whatsapp) {
          window.open(`https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, '_blank');
        }
      });
    });
    
    // Agregar click para abrir perfil al hacer click en la card
    carousel.querySelectorAll('.estado-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        // Si el click fue en el botón de contactar, no abrir el perfil
        if (e.target.closest('.estado-contact-btn')) return;
        
        const userId = card.dataset.userId;
        const username = card.dataset.username;
        const userName = card.querySelector('.estado-user-name')?.textContent?.trim()?.split('\n')[0]?.trim();
        console.log('🔍 Click en estado - userId:', userId, 'username:', username, 'userName:', userName);
        
        // Buscar el perfil en AWS approvedProfiles usando múltiples criterios
        const approvedProfiles = await DataService.getApprovedProfiles() || [];
        const approvedUsers = await DataService.getApprovedUsers() || [];
        
        // Primero buscar en approvedProfiles (tiene datos completos: fotos, videos, stats)
        let profile = null;

        if (userId) {
          // Los IDs de perfiles tienen formato "profile-{userId}"
          profile = approvedProfiles.find(p =>
            p.id === `profile-${userId}` || p.id === userId || p.odooId === userId
          );
        }

        // Si no se encuentra por userId, buscar por username
        if (!profile && username) {
          profile = approvedProfiles.find(p => p.username === username);
        }

        // Si no, buscar por displayName
        if (!profile && userName) {
          profile = approvedProfiles.find(p =>
            p.displayName === userName ||
            p.title === userName ||
            p.displayName?.toLowerCase().trim() === userName?.toLowerCase().trim()
          );
        }

        // Último recurso: buscar en approvedUsers y enriquecer con datos de profile
        if (!profile) {
          let userFromApproved = null;
          if (userId) userFromApproved = approvedUsers.find(u => u.id === userId);
          if (!userFromApproved && username) userFromApproved = approvedUsers.find(u => u.username === username);
          if (!userFromApproved && userName) userFromApproved = approvedUsers.find(u =>
            u.displayName?.toLowerCase().trim() === userName?.toLowerCase().trim()
          );
          if (userFromApproved) {
            // Buscar perfil asociado en approvedProfiles para obtener fotos/videos
            const enrichedProfile = approvedProfiles.find(p => p.id === `profile-${userFromApproved.id}`);
            profile = enrichedProfile || userFromApproved;
          }
        }

        if (profile) {
          // Asegurar que el perfil tenga toda la información necesaria para el modal
          profile.stats = profile.stats || { likes: 0, views: 0, recommendations: 0, experiences: 0, rating: 5.0 };
          profile.profileTypes = profile.profileTypes || (profile.profileType ? [profile.profileType] : (profile.selectedPlan ? [profile.selectedPlan] : ['premium']));
          profile.price = profile.price || { CLP: 0 };
          profile.photos = profile.photos || profile.profilePhotosData?.length || 0;
          profile.videos = profile.videos || profile.profileVideosData?.length || 0;
          profile.physicalInfo = profile.physicalInfo || {};
          profile.services = profile.services || [];

          if (typeof window.openVIPModal === 'function') {
            window.openVIPModal(profile);
          }
        }
      });
    });
  }
  
  function renderEstadoCard(estado) {
    const statusLabels = {
      'disponible': '🟢 Disponible',
      'novedad': '✨ Novedad',
      'promo': '🔥 Promo',
      'ocupada': '🔴 Ocupada'
    };
    
    const createdAt = new Date(estado.createdAt);
    const hoursAgo = Math.floor((new Date() - createdAt) / (1000 * 60 * 60));
    const timeText = hoursAgo === 0 ? 'Hace unos minutos' : `Hace ${hoursAgo}h`;
    
    return `
      <div class="estado-card ${estado.type}" data-user-id="${estado.userId || ''}" data-username="${estado.username || ''}">
        <div class="estado-card-header">
          <img class="estado-avatar" src="${estado.userAvatar || estado.profilePhoto || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSIjMzMzMzRkIi8+PHBhdGggZD0iTTEwMCAzNTBDMTAwIDI4MCAxNDAgMjMwIDIwMCAyMzBDMjYwIDIzMCAzMDAgMjgwIDMwMCAzNTAiIGZpbGw9IiMzMzMzNGQiLz48L3N2Zz4='}" alt="${estado.userName}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxYTFhMmUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjYwIiBmaWxsPSIjMzMzMzRkIi8+PHBhdGggZD0iTTEwMCAzNTBDMTAwIDI4MCAxNDAgMjMwIDIwMCAyMzBDMjYwIDIzMCAzMDAgMjgwIDMwMCAzNTAiIGZpbGw9IiMzMzMzNGQiLz48L3N2Zz4='" />
          <div class="estado-user-info">
            <div class="estado-user-name">
              ${estado.userName}
              <span class="estado-status-badge ${estado.type}">${statusLabels[estado.type] || estado.type}</span>
            </div>
            <div class="estado-user-location">${estado.commune || ''}, ${estado.city || ''}</div>
          </div>
        </div>
        <div class="estado-message">${estado.message}</div>
        <div class="estado-card-footer">
          <span class="estado-time">${timeText}</span>
          ${estado.type !== 'ocupada' ? `
            <button class="estado-contact-btn" data-whatsapp="${estado.whatsapp || ''}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z"/></svg>
              Contactar
            </button>
          ` : ''}}
        </div>
      </div>
    `;
  }
  
  function renderExampleEstados() {
    // No mostrar estados de ejemplo - solo estados reales publicados por clientas
    return '';
  }
  
  // Cargar estados al iniciar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadEstados);
  } else {
    loadEstados();
  }
  
  // Actualizar estados cada minuto
  setInterval(loadEstados, 60000);
})();

// ========================================
// ESTILOS MÓVILES - Solo ocultar elementos innecesarios
// ========================================
// NOTA: Los estilos móviles se manejan 100% en CSS (styles.css)
// con @media (max-width: 768px) y reglas !important
// No se necesita JavaScript para ocultar/mostrar elementos
// ========================================

// ===========================================
// SISTEMA DE FOTOS EXPANDIBLES PARA MÓVIL
// ===========================================
(function() {
  let currentPhotoIndex = 0;
  let currentPhotos = []; // Array of { src, type: 'photo'|'video' }
  let expandOverlay = null;

  // Crear el overlay de expansión
  function createExpandOverlay() {
    if (expandOverlay) return;

    expandOverlay = document.createElement('div');
    expandOverlay.className = 'photo-expand-overlay';
    expandOverlay.innerHTML = `
      <div class="photo-expand-content">
        <button class="photo-expand-close">×</button>
        <button class="photo-expand-nav prev">‹</button>
        <img src="" alt="Foto expandida" id="expanded-photo">
        <video src="" id="expanded-video" controls playsinline style="display:none; max-width:100%; max-height:90vh; object-fit:contain;"></video>
        <button class="photo-expand-nav next">›</button>
        <div class="photo-expand-counter"><span id="photo-current">1</span> / <span id="photo-total">1</span></div>
      </div>
    `;
    document.body.appendChild(expandOverlay);
    
    // Event listeners
    expandOverlay.querySelector('.photo-expand-close').addEventListener('click', closeExpandedPhoto);
    expandOverlay.querySelector('.photo-expand-nav.prev').addEventListener('click', () => navigatePhoto(-1));
    expandOverlay.querySelector('.photo-expand-nav.next').addEventListener('click', () => navigatePhoto(1));
    expandOverlay.addEventListener('click', (e) => {
      if (e.target === expandOverlay) closeExpandedPhoto();
    });
    
    // Swipe para móvil
    let touchStartX = 0;
    expandOverlay.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
    });
    expandOverlay.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 50) {
        navigatePhoto(diff > 0 ? 1 : -1);
      }
    });
    
    // Teclas
    document.addEventListener('keydown', (e) => {
      if (!expandOverlay.classList.contains('active')) return;
      if (e.key === 'Escape') closeExpandedPhoto();
      if (e.key === 'ArrowLeft') navigatePhoto(-1);
      if (e.key === 'ArrowRight') navigatePhoto(1);
    });
  }
  
  // Expandir foto/video
  // photos puede ser array de strings (URLs) o array de { src, type }
  function expandPhoto(photos, index) {
    createExpandOverlay();
    // Normalizar: si es array de strings, convertir a objetos
    currentPhotos = photos.map(p => typeof p === 'string' ? { src: p, type: 'photo' } : p);
    currentPhotoIndex = index;
    updateExpandedPhoto();
    expandOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  // Actualizar foto/video mostrado
  function updateExpandedPhoto() {
    const img = expandOverlay.querySelector('#expanded-photo');
    const video = expandOverlay.querySelector('#expanded-video');
    const media = currentPhotos[currentPhotoIndex];

    if (media.type === 'video') {
      img.style.display = 'none';
      video.style.display = 'block';
      video.src = media.src;
      video.load();
    } else {
      video.pause();
      video.style.display = 'none';
      img.style.display = 'block';
      img.src = media.src;
    }

    expandOverlay.querySelector('#photo-current').textContent = currentPhotoIndex + 1;
    expandOverlay.querySelector('#photo-total').textContent = currentPhotos.length;

    // Ocultar/mostrar navegación
    expandOverlay.querySelector('.photo-expand-nav.prev').style.display = currentPhotoIndex === 0 ? 'none' : 'flex';
    expandOverlay.querySelector('.photo-expand-nav.next').style.display = currentPhotoIndex === currentPhotos.length - 1 ? 'none' : 'flex';
  }
  
  // Navegar entre fotos
  function navigatePhoto(direction) {
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < currentPhotos.length) {
      currentPhotoIndex = newIndex;
      updateExpandedPhoto();
    }
  }
  
  // Cerrar foto/video expandido
  function closeExpandedPhoto() {
    if (expandOverlay) {
      const video = expandOverlay.querySelector('#expanded-video');
      if (video) { video.pause(); video.src = ''; }
      expandOverlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
  
  // Agregar click a las imágenes de la galería del modal
  function setupGalleryExpand() {
    // Solo en móvil
    if (window.innerWidth > 768) return;
    
    document.addEventListener('click', (e) => {
      // Buscar si clickeó en una imagen expandible
      const mainImage = e.target.closest('.modal-main-image, #modal-main-img');
      const galleryImage = e.target.closest('.modal-gallery-image');
      const thumbnail = e.target.closest('.modal-thumbnail');
      
      // Función auxiliar para recopilar media (fotos + videos) de thumbnails
      function collectMediaFromModal(modal) {
        const allThumbnails = modal.querySelectorAll('.modal-thumbnail');
        const media = [];
        allThumbnails.forEach((thumb) => {
          const img = thumb.querySelector('img');
          const vid = thumb.querySelector('video');
          const thumbType = thumb.dataset.type || 'photo';
          if (thumbType === 'video' && vid && vid.src) {
            media.push({ src: vid.src, type: 'video' });
          } else if (img && img.src) {
            media.push({ src: img.src, type: 'photo' });
          }
        });
        return media;
      }

      // Si clickeó en la imagen principal del modal o el video principal
      if (mainImage || e.target.closest('#modal-main-video')) {
        const clickedEl = mainImage || e.target.closest('#modal-main-video');
        const modal = clickedEl.closest('.vip-modal-container, .vip-modal-overlay');
        if (!modal) return;

        const media = collectMediaFromModal(modal);

        // Si no hay thumbnails, usar la imagen/video principal
        if (media.length === 0) {
          if (mainImage && mainImage.src) {
            media.push({ src: mainImage.src, type: 'photo' });
          }
          const mainVid = modal.querySelector('#modal-main-video');
          if (mainVid && mainVid.src && mainVid.style.display !== 'none') {
            media.push({ src: mainVid.src, type: 'video' });
          }
        }

        // Encontrar índice actual basado en el contador
        let currentIndex = 0;
        const counter = modal.querySelector('#modal-counter');
        if (counter) {
          currentIndex = parseInt(counter.textContent) - 1 || 0;
        }

        if (media.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          expandPhoto(media, currentIndex);
        }
        return;
      }

      // Si clickeó en un thumbnail del modal
      if (thumbnail) {
        const modal = thumbnail.closest('.vip-modal-container, .vip-modal-overlay');
        if (!modal) return;

        const media = collectMediaFromModal(modal);
        let clickedIndex = 0;
        const allThumbnails = modal.querySelectorAll('.modal-thumbnail');
        allThumbnails.forEach((thumb, i) => {
          if (thumb === thumbnail && i < media.length) {
            clickedIndex = i;
          }
        });

        if (media.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          expandPhoto(media, clickedIndex);
        }
        return;
      }
      
      if (!galleryImage) return;
      
      // Recopilar todas las fotos de la galería
      const gallery = galleryImage.closest('.modal-gallery-section, .modal-gallery-grid, .modal-gallery');
      if (!gallery) return;
      
      const allImages = gallery.querySelectorAll('.modal-gallery-image img, .modal-gallery-image');
      const photos = [];
      let clickedIndex = 0;
      
      allImages.forEach((img, i) => {
        let src = '';
        if (img.tagName === 'IMG') {
          src = img.src;
        } else {
          const innerImg = img.querySelector('img');
          if (innerImg) src = innerImg.src;
          else if (img.style.backgroundImage) {
            src = img.style.backgroundImage.replace(/url\(['"]?([^'"]+)['"]?\)/i, '$1');
          }
        }
        if (src) {
          photos.push(src);
          if (img === galleryImage || img.contains(e.target)) {
            clickedIndex = photos.length - 1;
          }
        }
      });
      
      if (photos.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        expandPhoto(photos, clickedIndex);
      }
    });
  }
  
  // Exponer función global
  window.expandPhoto = expandPhoto;
  
  // Inicializar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGalleryExpand);
  } else {
    setupGalleryExpand();
  }
})();