// Admin Panel Logic
const ADMIN_PASSWORD = 'admin2026'; // TODO: cambiar a variable de entorno

const loginScreen = document.getElementById('login-screen');
const adminContent = document.getElementById('admin-content');
const adminHeader = document.querySelector('.admin-header');
const passwordInput = document.getElementById('admin-password');
const loginBtn = document.getElementById('admin-login-btn');
const logoutBtn = document.getElementById('admin-logout-btn');
const adminGrid = document.getElementById('admin-grid');
const emptyState = document.getElementById('empty-state');
const deleteAllBtn = document.getElementById('delete-all-demos');
const confirmModal = document.getElementById('confirm-modal');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmDelete = document.getElementById('confirm-delete');
const confirmTitle = document.getElementById('confirm-title');

let isLoggedIn = false;
let pendingDeleteId = null;
let deletedDemos = JSON.parse(localStorage.getItem('deletedDemos') || '[]');

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

// CARS data (igual que en app.js)
const CARS = [
  { id: 'ferrari-f8', title: 'Ferrari F8 Tributo', photos: 12, videos: 2, price: { CLP: 285000, USD: 350 } },
  { id: 'lamborghini-huracán', title: 'Lamborghini Huracán', photos: 10, videos: 3, price: { CLP: 260000, USD: 320 } },
  { id: 'porsche-911-gt3', title: 'Porsche 911 GT3', photos: 15, videos: 1, price: { CLP: 228000, USD: 280 } },
  { id: 'mclaren-720s', title: 'McLaren 720S', photos: 8, videos: 4, price: { CLP: 310000, USD: 380 } },
  { id: 'aston-martin-db11', title: 'Aston Martin DB11', photos: 11, videos: 2, price: { CLP: 236000, USD: 290 } },
  { id: 'mercedes-amg-gt', title: 'Mercedes-AMG GT', photos: 14, videos: 1, price: { CLP: 203000, USD: 250 } },
  { id: 'bentley-continental', title: 'Bentley Continental GT', photos: 9, videos: 3, price: { CLP: 342000, USD: 420 } },
  { id: 'bmw-m8', title: 'BMW M8 Competition', photos: 13, videos: 2, price: { CLP: 220000, USD: 270 } },
  { id: 'audi-r8', title: 'Audi R8 V10', photos: 10, videos: 3, price: { CLP: 244000, USD: 300 } },
  { id: 'chevrolet-corvette', title: 'Chevrolet Corvette C8', photos: 16, videos: 2, price: { CLP: 146000, USD: 180 } },
  { id: 'nissan-gt-r', title: 'Nissan GT-R Nismo', photos: 12, videos: 4, price: { CLP: 179000, USD: 220 } },
  { id: 'jaguar-f-type', title: 'Jaguar F-Type R', photos: 11, videos: 1, price: { CLP: 195000, USD: 240 } },
  { id: 'maserati-mc20', title: 'Maserati MC20', photos: 8, videos: 3, price: { CLP: 293000, USD: 360 } },
  { id: 'alfa-romeo-giulia', title: 'Alfa Romeo Giulia QV', photos: 14, videos: 2, price: { CLP: 155000, USD: 190 } },
  { id: 'lexus-lc-500', title: 'Lexus LC 500', photos: 10, videos: 1, price: { CLP: 211000, USD: 260 } },
  { id: 'dodge-challenger', title: 'Dodge Challenger SRT', photos: 15, videos: 2, price: { CLP: 130000, USD: 160 } },
];

let currentCurrency = 'CLP';

const formatPrice = (price) => {
  if (currentCurrency === 'USD') return `$${price}`;
  return price >= 1000 ? `$${Math.round(price / 1000)}K` : `$${price}`;
};

const createAdminCard = (car, index) => {
  const isDeleted = deletedDemos.includes(car.id);
  const div = document.createElement('div');
  div.className = 'experiencias-card';
  div.dataset.carId = car.id;
  if (isDeleted) div.style.display = 'none';
  div.style.animation = `fadeUp 500ms ease ${index * 80}ms forwards`;
  div.style.opacity = '0';

  const img = new Image();
  const query = `${car.title},luxury-car`;
  img.src = `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}`;
  img.className = 'experiencias-card-img';
  img.alt = car.title;

  const overlay = document.createElement('div');
  overlay.className = 'experiencias-overlay';

  // Demo badge
  const demoBadge = document.createElement('div');
  demoBadge.className = 'demo-badge';
  demoBadge.textContent = 'DEMO';

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'demo-delete-btn';
  deleteBtn.textContent = '×';
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pendingDeleteId = car.id;
    confirmTitle.textContent = `¿Eliminar "${car.title}"?`;
    confirmModal.classList.add('open');
  });

  const info = document.createElement('div');
  info.className = 'experiencias-info';
  const price = document.createElement('div');
  price.className = 'experiencias-price';
  price.textContent = formatPrice(currentCurrency === 'CLP' ? car.price.CLP : car.price.USD);

  const currency = document.createElement('div');
  currency.className = 'experiencias-currency';
  currency.textContent = currentCurrency === 'CLP' ? 'CLP | USD' : 'USD | CLP';

  info.appendChild(price);
  info.appendChild(currency);
  div.appendChild(img);
  div.appendChild(overlay);
  div.appendChild(demoBadge);
  div.appendChild(deleteBtn);
  div.appendChild(info);

  currency.addEventListener('click', (e) => {
    e.stopPropagation();
    currentCurrency = currentCurrency === 'CLP' ? 'USD' : 'CLP';
    updateAllAdminPrices();
  });

  return div;
};

const updateAllAdminPrices = () => {
  document.querySelectorAll('.experiencias-price').forEach((el) => {
    const card = el.closest('.experiencias-card');
    const carId = card?.dataset.carId;
    const car = CARS.find(c => c.id === carId);
    if (car) el.textContent = formatPrice(currentCurrency === 'CLP' ? car.price.CLP : car.price.USD);
  });
  document.querySelectorAll('.experiencias-currency').forEach((el) => {
    el.textContent = currentCurrency === 'CLP' ? 'CLP | USD' : 'USD | CLP';
  });
};

const loadAdminGrid = () => {
  adminGrid.innerHTML = '';
  const visibleCars = CARS.filter(car => !deletedDemos.includes(car.id));
  if (visibleCars.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';
  visibleCars.forEach((car, index) => {
    adminGrid.appendChild(createAdminCard(car, index));
  });
};

const deleteDemo = () => {
  if (!pendingDeleteId) return;
  const card = document.querySelector(`[data-car-id="${pendingDeleteId}"]`);
  if (card) {
    card.style.animation = 'fadeOut 400ms ease forwards';
    setTimeout(() => {
      card.style.display = 'none';
      if (!deletedDemos.includes(pendingDeleteId)) {
        deletedDemos.push(pendingDeleteId);
        localStorage.setItem('deletedDemos', JSON.stringify(deletedDemos));
      }
      if (adminGrid.querySelectorAll('[data-car-id]:not([style*="display: none"])').length === 0) {
        emptyState.style.display = 'block';
      }
      pendingDeleteId = null;
    }, 400);
  }
};

const deleteAllDemos = () => {
  confirmTitle.textContent = '¿Eliminar TODAS las publicaciones de muestra?';
  pendingDeleteId = 'DELETE_ALL';
  confirmModal.classList.add('open');
};

// Auth
loginBtn.addEventListener('click', () => {
  if (passwordInput.value === ADMIN_PASSWORD) {
    isLoggedIn = true;
    loginScreen.style.display = 'none';
    adminContent.style.display = 'block';
    adminHeader.style.display = 'block';
    loadAdminGrid();
    renderRegistros();
    renderPublicaciones();
    // Render testimonios pendientes inmediatamente tras el login
    // para asegurar que el administrador los vea al cambiar de pestaña.
    renderTestimonios();
  } else {
    alert('Contraseña incorrecta');
  }
});

passwordInput.addEventListener('keyup', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

logoutBtn.addEventListener('click', () => {
  isLoggedIn = false;
  loginScreen.style.display = 'flex';
  adminContent.style.display = 'none';
  adminHeader.style.display = 'none';
  passwordInput.value = '';
});

// Confirmations
confirmCancel.addEventListener('click', () => {
  confirmModal.classList.remove('open');
  pendingDeleteId = null;
});

confirmDelete.addEventListener('click', () => {
  if (pendingDeleteId === 'DELETE_ALL') {
    deletedDemos = [...CARS.map(c => c.id)];
    localStorage.setItem('deletedDemos', JSON.stringify(deletedDemos));
    adminGrid.innerHTML = '';
    emptyState.style.display = 'block';
  } else {
    deleteDemo();
  }
  confirmModal.classList.remove('open');
  pendingDeleteId = null;
});

deleteAllBtn.addEventListener('click', deleteAllDemos);

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
  });
});

// Registros (Usuarios pendientes de aprobación)
let registros = JSON.parse(localStorage.getItem('pendingRegistros') || '[]');

const crearRegistroDemo = () => {
  const names = ['Carlos López', 'María García', 'Juan Pérez', 'Sofia Rodriguez', 'Miguel Torres'];
  const emails = ['carlos@example.com', 'maria@example.com', 'juan@example.com', 'sofia@example.com', 'miguel@example.com'];
  if (registros.length < 5) {
    registros.push({
      id: Date.now(),
      name: names[Math.floor(Math.random() * names.length)],
      email: emails[Math.floor(Math.random() * emails.length)],
      date: new Date().toLocaleDateString('es-ES'),
      status: 'pendiente'
    });
    localStorage.setItem('pendingRegistros', JSON.stringify(registros));
  }
};

const renderRegistros = () => {
  const list = document.getElementById('registros-list');
  const empty = document.getElementById('registros-empty');
  const pendingOnly = registros.filter(r => r.status === 'pendiente');
  
  if (pendingOnly.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  list.innerHTML = pendingOnly.map(reg => `
    <div class="admin-item" data-reg-id="${reg.id}">
      <div class="admin-item-content">
        <div class="admin-item-name">${reg.name}</div>
        <div class="admin-item-email">${reg.email}</div>
        <div class="admin-item-date">Registrado: ${reg.date}</div>
      </div>
      <div class="admin-item-actions">
        <button class="admin-item-btn admin-approve" onclick="approveRegistro(${reg.id})">Aprobar</button>
        <button class="admin-item-btn admin-reject" onclick="rejectRegistro(${reg.id})">Rechazar</button>
      </div>
    </div>
  `).join('');
};

window.approveRegistro = (id) => {
  const reg = registros.find(r => r.id === id);
  if (reg) {
    reg.status = 'aprobado';
    localStorage.setItem('pendingRegistros', JSON.stringify(registros));
    renderRegistros();
  }
};

window.rejectRegistro = (id) => {
  registros = registros.filter(r => r.id !== id);
  localStorage.setItem('pendingRegistros', JSON.stringify(registros));
  renderRegistros();
};

// Publicaciones pendientes de aprobación
let publicacionesPendientes = JSON.parse(localStorage.getItem('pendingPublicaciones') || '[]');

const renderPublicaciones = () => {
  const list = document.getElementById('publicaciones-list');
  const empty = document.getElementById('publicaciones-empty');
  const pendingOnly = publicacionesPendientes.filter(p => p.status === 'pendiente');
  
  if (pendingOnly.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  
  empty.style.display = 'none';
  list.innerHTML = pendingOnly.map(pub => `
    <div class="admin-item" data-pub-id="${pub.id}">
      <div class="admin-item-content">
        <div class="admin-item-name">${pub.title}</div>
        <div class="admin-item-email">Por: ${pub.author}</div>
        <div class="admin-item-date">Enviado: ${pub.date}</div>
      </div>
      <div class="admin-item-actions">
        <button class="admin-item-btn admin-approve" onclick="approvePublicacion(${pub.id})">Aprobar</button>
        <button class="admin-item-btn admin-reject" onclick="rejectPublicacion(${pub.id})">Rechazar</button>
      </div>
    </div>
  `).join('');
};

window.approvePublicacion = (id) => {
  const pub = publicacionesPendientes.find(p => p.id === id);
  if (pub) {
    pub.status = 'aprobado';
    localStorage.setItem('pendingPublicaciones', JSON.stringify(publicacionesPendientes));
    renderPublicaciones();
  }
};

window.rejectPublicacion = (id) => {
  publicacionesPendientes = publicacionesPendientes.filter(p => p.id !== id);
  localStorage.setItem('pendingPublicaciones', JSON.stringify(publicacionesPendientes));
  renderPublicaciones();
};

// Inicializar demos de registros y publicaciones
crearRegistroDemo();
publicacionesPendientes.push({
  id: Date.now() + 1,
  title: 'Ferrari F40 Edición Especial',
  author: 'Fernando Martínez',
  date: new Date().toLocaleDateString('es-ES'),
  status: 'pendiente'
}, {
  id: Date.now() + 2,
  title: 'Lamborghini Aventador SVJ',
  author: 'Ricardo Sánchez',
  date: new Date().toLocaleDateString('es-ES'),
  status: 'pendiente'
});
localStorage.setItem('pendingPublicaciones', JSON.stringify(publicacionesPendientes));

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

// Crear/Editar Publicaciones
let publicacionesCreadas = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]');
let editingPublicacionId = null;

const publicacionForm = document.getElementById('publicacion-form');
const formResetBtn = document.getElementById('form-reset-btn');
const formMessage = document.getElementById('form-message');

const resetPublicacionForm = () => {
  publicacionForm.reset();
  editingPublicacionId = null;
  document.getElementById('form-submit-btn').textContent = 'Crear Publicación';
  formMessage.style.display = 'none';
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
  return 'pub-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
};

publicacionForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('pub-title').value.trim();
  const category = document.getElementById('pub-category').value;
  const featured = document.getElementById('pub-featured').value;
  const badge = document.getElementById('pub-badge').value;
  const priceCLP = parseInt(document.getElementById('pub-price-clp').value);
  const priceUSD = parseInt(document.getElementById('pub-price-usd').value);
  const whatsapp = document.getElementById('pub-whatsapp').value.trim();
  const location = document.getElementById('pub-location').value.trim();
  const socials = document.getElementById('pub-socials').value.trim();
  const photos = parseInt(document.getElementById('pub-photos').value);
  const videos = parseInt(document.getElementById('pub-videos').value);

  if (!title || !category || !featured || !location) {
    showFormMessage('Por favor completa todos los campos requeridos', 'error');
    return;
  }

  if (editingPublicacionId) {
    // Editar existente
    const index = publicacionesCreadas.findIndex(p => p.id === editingPublicacionId);
    if (index !== -1) {
      publicacionesCreadas[index] = {
        ...publicacionesCreadas[index],
        title,
        category,
        featured,
        badge,
        price: { CLP: priceCLP, USD: priceUSD },
        whatsapp,
        location,
        socials,
        photos,
        videos
      };
      showFormMessage('Publicación actualizada exitosamente', 'success');
      editingPublicacionId = null;
      document.getElementById('form-submit-btn').textContent = 'Crear Publicación';
    }
  } else {
    // Crear nueva
    const newPublicacion = {
      id: generatePublicacionId(),
      title,
      category,
      featured,
      badge,
      price: { CLP: priceCLP, USD: priceUSD },
      whatsapp,
      location,
      socials,
      photos,
      videos,
      author: 'Admin',
      date: new Date().toLocaleDateString('es-ES'),
      createdAt: Date.now()
    };
    publicacionesCreadas.push(newPublicacion);
    showFormMessage('Publicación creada exitosamente', 'success');
  }

  localStorage.setItem('publicacionesCreadas', JSON.stringify(publicacionesCreadas));
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
    const priceDisplay = `CLP $${pub.price.CLP.toLocaleString('es-CL')} / USD $${pub.price.USD}`;
    return `
      <div class="admin-item publicacion-item" data-pub-id="${pub.id}">
        <div class="publicacion-item-info">
          <div class="publicacion-item-title">${pub.title}</div>
          <div class="publicacion-item-details">
            <div class="publicacion-item-detail"><strong>Categoría:</strong> ${pub.category}</div>
            <div class="publicacion-item-detail"><strong>Estado:</strong> ${pub.featured}</div>
            <div class="publicacion-item-detail"><strong>Precio:</strong> ${priceDisplay}</div>
            <div class="publicacion-item-detail"><strong>Ubicación:</strong> ${pub.location}</div>
            ${pub.whatsapp ? `<div class="publicacion-item-detail"><strong>WhatsApp:</strong> ${pub.whatsapp}</div>` : ''}
            ${pub.socials ? `<div class="publicacion-item-detail"><strong>Redes:</strong> ${pub.socials}</div>` : ''}
            <div class="publicacion-item-detail"><strong>Fotos:</strong> ${pub.photos} | <strong>Videos:</strong> ${pub.videos}</div>
          </div>
        </div>
        <div class="publicacion-item-actions">
          <button class="admin-edit-btn" onclick="editPublicacion('${pub.id}')">Editar</button>
          <button class="admin-delete-pub-btn" onclick="deletePublicacion('${pub.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
};

window.editPublicacion = (id) => {
  const pub = publicacionesCreadas.find(p => p.id === id);
  if (!pub) return;

  editingPublicacionId = id;
  document.getElementById('pub-title').value = pub.title;
  document.getElementById('pub-category').value = pub.category;
  document.getElementById('pub-featured').value = pub.featured;
  document.getElementById('pub-badge').value = pub.badge || 'verified';
  document.getElementById('pub-price-clp').value = pub.price.CLP;
  document.getElementById('pub-price-usd').value = pub.price.USD;
  document.getElementById('pub-whatsapp').value = pub.whatsapp || '';
  document.getElementById('pub-location').value = pub.location;
  document.getElementById('pub-socials').value = pub.socials || '';
  document.getElementById('pub-photos').value = pub.photos;
  document.getElementById('pub-videos').value = pub.videos;

  document.getElementById('form-submit-btn').textContent = 'Guardar Cambios';

  // Scroll al formulario
  document.getElementById('publicacion-form').scrollIntoView({ behavior: 'smooth' });
};

window.deletePublicacion = (id) => {
  if (confirm('¿Estás seguro de que deseas eliminar esta publicación?')) {
    publicacionesCreadas = publicacionesCreadas.filter(p => p.id !== id);
    localStorage.setItem('publicacionesCreadas', JSON.stringify(publicacionesCreadas));
    renderPublicacionesCreadas();
    showFormMessage('Publicación eliminada', 'success');
  }
};

// Inicializar vista de publicaciones creadas
renderPublicacionesCreadas();
// ============================================
// Tab: Mensajes de Contacto
// ============================================
const mensajesTab = document.getElementById('mensajes-tab');
const mensajesList = document.getElementById('mensajes-list');
const mensajesEmpty = document.getElementById('mensajes-empty');

function renderMensajes() {
  const mensajes = JSON.parse(localStorage.getItem('contactMessages') || '[]');
  
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
          <strong>Archivos:</strong> ${msg.archivos.map(a => `<a href="${a.data}" download="${a.nombre}" style="color: var(--gold); text-decoration: underline;">${a.nombre}</a>`).join(', ')}
        </div>`
      : '';

    return `
      <div class="admin-item" style="flex-direction: column; align-items: start; gap: 12px; ${msg.leido ? 'opacity: 0.7;' : ''}">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div class="admin-item-name">${msg.nombre}</div>
            <div class="admin-item-email">${msg.email}</div>
            <div class="admin-item-date">${fechaFormato}</div>
          </div>
          <span class="admin-item-status ${msg.leido ? 'status-aprobado' : 'status-pendiente'}">
            ${msg.leido ? 'Leído' : 'Nuevo'}
          </span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <div class="publicacion-item-details">
            <div class="publicacion-item-detail"><strong>Teléfono:</strong> ${msg.telefono}</div>
            <div class="publicacion-item-detail" style="margin-top: 8px;"><strong>Mensaje:</strong></div>
            <div style="color: var(--text); margin-top: 4px; white-space: pre-wrap;">${msg.mensaje}</div>
            ${archivosHTML}
          </div>
        </div>
        <div class="admin-item-actions" style="width: 100%; justify-content: flex-end;">
          ${!msg.leido ? `<button class="admin-item-btn admin-approve" onclick="marcarLeido('${msg.id}')">Marcar como leído</button>` : ''}
          <button class="admin-item-btn admin-reject" onclick="eliminarMensaje('${msg.id}')">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

window.marcarLeido = (id) => {
  const mensajes = JSON.parse(localStorage.getItem('contactMessages') || '[]');
  const mensaje = mensajes.find(m => m.id == id);
  if (mensaje) {
    mensaje.leido = true;
    localStorage.setItem('contactMessages', JSON.stringify(mensajes));
    renderMensajes();
  }
};

window.eliminarMensaje = (id) => {
  if (confirm('¿Estás seguro de que deseas eliminar este mensaje?')) {
    let mensajes = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    mensajes = mensajes.filter(m => m.id != id);
    localStorage.setItem('contactMessages', JSON.stringify(mensajes));
    renderMensajes();
  }
};

// Renderizar cuando se selecciona la pestaña
const mensajesTabBtn = document.querySelector('.admin-tab[data-tab="mensajes"]');
if (mensajesTabBtn) {
  mensajesTabBtn.addEventListener('click', renderMensajes);
}

// ============================================
// Testimonios Moderación
// ============================================
const testimoniosTabBtn = document.querySelector('.admin-tab[data-tab="testimonios"]');
const testimoniosList = document.getElementById('testimonios-list');
const testimoniosEmpty = document.getElementById('testimonios-empty');

function loadTestimonials() {
  return JSON.parse(localStorage.getItem('testimonials') || '[]');
}
function saveTestimonials(arr) {
  localStorage.setItem('testimonials', JSON.stringify(arr));
}

function renderTestimonios() {
  let testimonios = loadTestimonials();
  const pendientes = testimonios.filter(t => !t.approved);

  if (pendientes.length === 0) {
    testimoniosList.innerHTML = '';
    testimoniosEmpty.style.display = 'block';
    return;
  }
  testimoniosEmpty.style.display = 'none';

  // construir mapa de perfiles
  const demoCars = [
    { id: 'ferrari-f8', title: 'Ferrari F8 Tributo' },
    { id: 'lamborghini-huracán', title: 'Lamborghini Huracán' },
    { id: 'bentley-continental', title: 'Bentley Continental GT' },
    { id: 'maserati-mc20', title: 'Maserati MC20' },
    { id: 'porsche-911-gt3', title: 'Porsche 911 GT3' },
    { id: 'aston-martin-db11', title: 'Aston Martin DB11' },
    { id: 'bmw-m8', title: 'BMW M8 Competition' },
    { id: 'audi-r8', title: 'Audi R8 V10' }
  ];
  const publicaciones = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]').map(p => ({ id: p.id, title: p.title }));
  const perfiles = [...demoCars, ...publicaciones];

  testimoniosList.innerHTML = pendientes.map(t => {
    const perfilName = perfiles.find(p => p.id === t.carId)?.title || t.carId;
    const fecha = new Date(t.date).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric' });
    const stars = '★★★★★'.slice(0, Math.max(1, Math.min(5, t.rating)));
    return `
      <div class="admin-item" data-t-id="${t.id}" style="flex-direction: column; align-items: start; gap: 12px;">
        <div style="width: 100%; display: flex; justify-content: space-between; align-items: start;">
          <div style="flex: 1;">
            <div class="admin-item-name">${t.name} · <span class="admin-item-date">${fecha}</span></div>
            <div class="admin-item-email">Perfil: ${perfilName}</div>
          </div>
          <span class="admin-item-status status-pendiente">Pendiente</span>
        </div>
        <div style="width: 100%; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px;">
          <div class="publicacion-item-details">
            <div class="publicacion-item-detail"><strong>Rating:</strong> <span style="color: var(--gold);">${stars}</span></div>
            <div class="publicacion-item-detail" style="margin-top: 8px;"><strong>Testimonio:</strong></div>
            <div style="color: var(--text); margin-top: 4px; white-space: pre-wrap;">${t.text}</div>
          </div>
        </div>
        <div class="admin-item-actions" style="width: 100%; justify-content: flex-end;">
          <button class="admin-item-btn admin-approve" onclick="approveTestimonio('${t.id}')">Aprobar</button>
          <button class="admin-item-btn admin-reject" onclick="rejectTestimonio('${t.id}')">Rechazar</button>
        </div>
      </div>
    `;
  }).join('');
}

window.approveTestimonio = (id) => {
  const arr = loadTestimonials();
  const t = arr.find(x => x.id === id);
  if (t) {
    t.approved = true;
    saveTestimonials(arr);
    renderTestimonios();
    alert('Testimonio aprobado. Aparecerá en la página principal.');
  }
};

window.rejectTestimonio = (id) => {
  let arr = loadTestimonials();
  arr = arr.filter(x => x.id !== id);
  saveTestimonials(arr);
  renderTestimonios();
};

if (testimoniosTabBtn) {
  testimoniosTabBtn.addEventListener('click', renderTestimonios);
}