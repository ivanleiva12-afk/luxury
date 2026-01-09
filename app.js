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
  // Cerrar todos los modals primero
  document.getElementById('login-modal')?.setAttribute('aria-hidden', 'true');
  document.getElementById('contact-modal')?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  
  // Abrir el modal seleccionado
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    alert(`Ingreso con: ${email}`);
    closeModal();
    form.reset();
  });

  signupLink?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Redirigiendo a crear cuenta...');
    closeModal();
  });
})();

// Featured Carousel / Destacados
(function setupFeaturedCarousel() {
  const carousel = document.getElementById('featured-carousel');
  const dotsContainer = document.getElementById('featured-dots');
  const prevBtn = document.getElementById('featured-prev');
  const nextBtn = document.getElementById('featured-next');

  if (!carousel) return;

  let currentSlide = 0;
  let autoplayInterval = null;
  const AUTOPLAY_DELAY = 5000; // 5 segundos

  // Obtener publicaciones destacadas (con featured: 'destacado' o badge elite/trending)
  const getFeaturedCars = () => {
    const allCars = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]');
    const demoCars = [
      { id: 'ferrari-f8', title: 'Ferrari F8 Tributo', photos: 12, videos: 2, price: { CLP: 285000, USD: 350 }, category: 'premium', featured: 'destacado', location: 'Las Condes', badge: 'elite' },
      { id: 'lamborghini-huracán', title: 'Lamborghini Huracán', photos: 10, videos: 3, price: { CLP: 260000, USD: 320 }, category: 'premium', featured: 'destacado', location: 'Vitacura', badge: 'trending' },
      { id: 'bentley-continental', title: 'Bentley Continental GT', photos: 9, videos: 3, price: { CLP: 342000, USD: 420 }, category: 'luxury', featured: 'destacado', location: 'Las Condes', badge: 'elite' },
      { id: 'maserati-mc20', title: 'Maserati MC20', photos: 8, videos: 3, price: { CLP: 293000, USD: 360 }, category: 'premium', featured: 'destacado', location: 'Vitacura', badge: 'elite' },
    ];

    const combined = [...demoCars, ...allCars];
    // Filtrar solo destacados y limitar a 8
    return combined
      .filter(car => car.featured === 'destacado' || ['elite', 'trending'].includes(car.badge))
      .slice(0, 8);
  };

  const featuredCars = getFeaturedCars();

  if (featuredCars.length === 0) {
    // Ocultar sección si no hay destacados
    const section = document.getElementById('featured-section');
    if (section) section.style.display = 'none';
    return;
  }

  // Generar imagen aleatoria
  const getRandomImage = (id, index) => {
    const seed = id ? id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : Math.random() * 1000;
    return `https://source.unsplash.com/1200x675/?luxury,car,${Math.floor(seed + index)}`;
  };

  // Renderizar tarjetas
  const renderCards = () => {
    carousel.innerHTML = featuredCars.map((car, index) => {
      const imgSrc = getRandomImage(car.id, index);
      return `
        <div class="featured-card" data-index="${index}" data-car-id="${car.id}">
          <img class="featured-card-img" src="${imgSrc}" alt="${car.title}" loading="${index === 0 ? 'eager' : 'lazy'}" />
          <div class="featured-card-overlay">
            <div class="featured-badge">⭐ Destacado</div>
            <div class="featured-card-info">
              <h3 class="featured-card-title">${car.title}</h3>
              <div class="featured-card-meta">
                <div class="featured-card-price">$${car.price.USD.toLocaleString()} USD</div>
                <div class="featured-card-location">${car.location || 'Santiago'}</div>
              </div>
              <div class="featured-card-features">
                <span class="featured-card-feature">📸 ${car.photos} fotos</span>
                <span class="featured-card-feature">🎬 ${car.videos} videos</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Agregar event listeners para abrir detalle
    carousel.querySelectorAll('.featured-card').forEach(card => {
      card.addEventListener('click', () => {
        const carId = card.dataset.carId;
        const car = featuredCars.find(c => c.id === carId);
        if (car && typeof window.openDetail === 'function') {
          window.openDetail(car);
        }
      });
    });
  };

  // Renderizar dots
  const renderDots = () => {
    dotsContainer.innerHTML = featuredCars.map((_, index) => 
      `<button class="featured-dot ${index === 0 ? 'active' : ''}" data-index="${index}" aria-label="Ir a slide ${index + 1}"></button>`
    ).join('');

    dotsContainer.querySelectorAll('.featured-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        goToSlide(parseInt(dot.dataset.index));
      });
    });
  };

  // Navegar a slide específico
  const goToSlide = (index) => {
    currentSlide = index;
    const offset = -index * 100;
    carousel.style.transform = `translateX(${offset}%)`;

    // Actualizar dots
    dotsContainer.querySelectorAll('.featured-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });

    // Reiniciar autoplay
    resetAutoplay();
  };

  // Siguiente slide
  const nextSlide = () => {
    currentSlide = (currentSlide + 1) % featuredCars.length;
    goToSlide(currentSlide);
  };

  // Slide anterior
  const prevSlide = () => {
    currentSlide = (currentSlide - 1 + featuredCars.length) % featuredCars.length;
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
})();

// Experiencias Grid
(function setupExperienciasGrid() {
  const categoryMap = { premium: 'Premium', sport: 'Estándar', luxury: 'Elite', classic: 'Estándar' };

  const BADGE_PRIORITY = {
    'elite': 1,
    'trending': 2,
    'premium': 3,
    'nuevo': 4,
    'top-rated': 5,
    'verified': 6,
    'none': 999
  };

  const BADGE_CONFIG = {
    'elite': { label: '💎 Elite', color: '#B9F2FF', bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    'trending': { label: '🔥 Trending', color: '#FF6B6B', bg: 'linear-gradient(135deg, #f12711 0%, #f5af19 100%)' },
    'premium': { label: '👑 Premium', color: '#FFD700', bg: 'linear-gradient(135deg, #D4AF37, #F4D03F)' },
    'nuevo': { label: '🆕 Nuevo', color: '#51CF66', bg: 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)' },
    'top-rated': { label: '⭐ Top Rated', color: '#FFD700', bg: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' },
    'verified': { label: '✓ Verificado', color: '#D4AF37', bg: 'linear-gradient(135deg, #D4AF37, #F4D03F)' },
  };

  let CARS = [
    { id: 'ferrari-f8', title: 'Ferrari F8 Tributo', photos: 12, videos: 2, price: { CLP: 285000, USD: 350 }, category: 'premium', featured: 'destacado', location: 'Las Condes', availability: 'Disponible ahora', services: ['in-call', 'out-call'], popularity: 96, createdAt: Date.now() - 1000 * 60 * 60 * 12, badge: 'elite' },
    { id: 'lamborghini-huracán', title: 'Lamborghini Huracán', photos: 10, videos: 3, price: { CLP: 260000, USD: 320 }, category: 'premium', featured: 'nuevo', location: 'Vitacura', availability: '24/7', services: ['out-call', 'travel'], popularity: 90, createdAt: Date.now() - 1000 * 60 * 60 * 20, badge: 'trending' },
    { id: 'porsche-911-gt3', title: 'Porsche 911 GT3', photos: 15, videos: 1, price: { CLP: 228000, USD: 280 }, category: 'sport', featured: '', location: 'Providencia', availability: 'Programar', services: ['in-call'], popularity: 75, createdAt: Date.now() - 1000 * 60 * 60 * 36, badge: 'verified' },
    { id: 'mclaren-720s', title: 'McLaren 720S', photos: 8, videos: 4, price: { CLP: 310000, USD: 380 }, category: 'premium', featured: 'popular', location: 'Lo Barnechea', availability: '24/7', services: ['out-call', 'travel'], popularity: 88, createdAt: Date.now() - 1000 * 60 * 60 * 8, badge: 'premium' },
    { id: 'aston-martin-db11', title: 'Aston Martin DB11', photos: 11, videos: 2, price: { CLP: 236000, USD: 290 }, category: 'luxury', featured: '', location: 'Providencia', availability: 'Programar', services: ['in-call'], popularity: 70, createdAt: Date.now() - 1000 * 60 * 60 * 60, badge: 'top-rated' },
    { id: 'mercedes-amg-gt', title: 'Mercedes-AMG GT', photos: 14, videos: 1, price: { CLP: 203000, USD: 250 }, category: 'sport', featured: 'nuevo', location: 'Ñuñoa', availability: 'Disponible ahora', services: ['in-call', 'out-call'], popularity: 68, createdAt: Date.now() - 1000 * 60 * 60 * 6, badge: 'nuevo' },
    { id: 'bentley-continental', title: 'Bentley Continental GT', photos: 9, videos: 3, price: { CLP: 342000, USD: 420 }, category: 'luxury', featured: 'destacado', location: 'Las Condes', availability: '24/7', services: ['out-call', 'travel'], popularity: 92, createdAt: Date.now() - 1000 * 60 * 60 * 4, badge: 'elite' },
    { id: 'bmw-m8', title: 'BMW M8 Competition', photos: 13, videos: 2, price: { CLP: 220000, USD: 270 }, category: 'sport', featured: '', location: 'Santiago Centro', availability: 'Disponible ahora', services: ['in-call'], popularity: 64, createdAt: Date.now() - 1000 * 60 * 60 * 28, badge: 'verified' },
    { id: 'audi-r8', title: 'Audi R8 V10', photos: 10, videos: 3, price: { CLP: 244000, USD: 300 }, category: 'premium', featured: '', location: 'Providencia', availability: 'Programar', services: ['in-call', 'out-call'], popularity: 72, createdAt: Date.now() - 1000 * 60 * 60 * 10, badge: 'trending' },
    { id: 'chevrolet-corvette', title: 'Chevrolet Corvette C8', photos: 16, videos: 2, price: { CLP: 146000, USD: 180 }, category: 'sport', featured: 'nuevo', location: 'Ñuñoa', availability: 'Disponible ahora', services: ['in-call'], popularity: 60, createdAt: Date.now() - 1000 * 60 * 60 * 16, badge: 'nuevo' },
    { id: 'nissan-gt-r', title: 'Nissan GT-R Nismo', photos: 12, videos: 4, price: { CLP: 179000, USD: 220 }, category: 'sport', featured: 'popular', location: 'Providencia', availability: '24/7', services: ['out-call'], popularity: 78, createdAt: Date.now() - 1000 * 60 * 60 * 3, badge: 'premium' },
    { id: 'jaguar-f-type', title: 'Jaguar F-Type R', photos: 11, videos: 1, price: { CLP: 195000, USD: 240 }, category: 'classic', featured: '', location: 'Santiago Centro', availability: 'Programar', services: ['in-call'], popularity: 55, createdAt: Date.now() - 1000 * 60 * 60 * 72, badge: 'verified' },
    { id: 'maserati-mc20', title: 'Maserati MC20', photos: 8, videos: 3, price: { CLP: 293000, USD: 360 }, category: 'premium', featured: 'destacado', location: 'Vitacura', availability: '24/7', services: ['out-call', 'travel'], popularity: 85, createdAt: Date.now() - 1000 * 60 * 60 * 18, badge: 'elite' },
    { id: 'alfa-romeo-giulia', title: 'Alfa Romeo Giulia QV', photos: 14, videos: 2, price: { CLP: 155000, USD: 190 }, category: 'classic', featured: '', location: 'Providencia', availability: 'Disponible ahora', services: ['in-call'], popularity: 58, createdAt: Date.now() - 1000 * 60 * 60 * 30, badge: 'verified' },
    { id: 'lexus-lc-500', title: 'Lexus LC 500', photos: 10, videos: 1, price: { CLP: 211000, USD: 260 }, category: 'luxury', featured: 'nuevo', location: 'Las Condes', availability: 'Programar', services: ['in-call', 'out-call'], popularity: 66, createdAt: Date.now() - 1000 * 60 * 60 * 14, badge: 'top-rated' },
    { id: 'dodge-challenger', title: 'Dodge Challenger SRT', photos: 15, videos: 2, price: { CLP: 130000, USD: 160 }, category: 'classic', featured: '', location: 'Santiago Centro', availability: 'Disponible ahora', services: ['in-call'], popularity: 50, createdAt: Date.now() - 1000 * 60 * 60 * 80, badge: 'verified' },
  ];

  // Cargar publicaciones creadas desde admin con defaults
  const publicacionesCreadas = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]').map((p, idx) => ({
    ...p,
    price: p.price || { CLP: Number(p.precioCLP) || 0, USD: Number(p.precioUSD) || 0 },
    location: p.ubicacion || 'Santiago Centro',
    availability: p.disponibilidad || 'Programar',
    category: p.categoria || 'premium',
    featured: p.featured || 'nuevo',
    services: p.servicios || ['in-call'],
    popularity: p.popularidad || 45 + idx,
    createdAt: p.createdAt || Date.now() - idx * 3600 * 1000,
    badge: p.badge || 'verified',
  }));

  CARS = CARS.concat(publicacionesCreadas).map((car, i) => {
    let badge = car.badge || 'verified';
    // Si es nuevo y ya pasaron 24h, revertir a verified
    if (badge === 'nuevo' && car.createdAt && (Date.now() - car.createdAt > 24 * 60 * 60 * 1000)) {
      badge = 'verified';
    }
    return {
      ...car,
      badge,
      categoryNew: car.categoryNew || categoryMap[car.category] || 'Estándar',
      services: car.services || ['in-call'],
      availability: car.availability || 'Disponible ahora',
      location: car.location || 'Santiago Centro',
      popularity: car.popularity || 50 + i,
      createdAt: car.createdAt || Date.now() - i * 7200000,
    };
  });

  let currentCurrency = 'CLP';
  const grid = document.getElementById('experiencias-grid');
  const currencyBtn = document.getElementById('currency-toggle');
  const skeletonLoader = document.getElementById('skeleton-loader');
  const counterEl = document.getElementById('filters-counter');
  const activeChipsEl = document.getElementById('active-chips');

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
  const detailCurrencyToggle = document.getElementById('detail-currency-toggle');
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
  let detailCurrency = 'CLP';
  let currentMedia = [];
  let currentMediaIndex = 0;

  // Nuevas referencias de filtros
  const locationSelect = document.getElementById('filter-location');
  const availabilityGroup = document.getElementById('filter-availability');
  const categoryGroup = document.getElementById('filter-category-chips');
  const servicesGroup = document.getElementById('filter-services');
  const searchInput = document.getElementById('filter-search');
  const nameDatalist = document.getElementById('names-datalist');
  const sortSelect = document.getElementById('filter-sort');
  const resetFiltersBtn = document.getElementById('reset-filters');
  let itemsLoaded = 0;
  const itemsPerLoad = window.innerWidth >= 1400 ? 16 : window.innerWidth >= 768 ? 12 : 10;

  const deletedDemos = JSON.parse(localStorage.getItem('deletedDemos') || '[]');
  let visibleCars = [];
  let currentViewMode = 'grid';

  // Estado de filtros básicos
  const filtersState = {
    location: '',
    availability: '',
    categories: new Set(),
    services: new Set(),
    search: '',
    sort: 'recent'
  };

  const formatPrice = (price) => {
    if (currentCurrency === 'USD') return `$${price}`;
    return price >= 1000 ? `$${Math.round(price / 1000)}K` : `$${price}`;
  };

  const renderCounter = (total, filtered) => {
    counterEl.textContent = `Mostrando ${filtered} de ${total} servicios`;
  };

  const renderActiveChips = () => {
    activeChipsEl.innerHTML = '';
    const chips = [];

    if (filtersState.priceMin > 0 || filtersState.priceMax < 500) {
      chips.push({ key: 'price', label: `USD ${filtersState.priceMin} - ${filtersState.priceMax}` });
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

  const removeChip = (key) => {
    if (key === 'location') {
      filtersState.location = ''; locationSelect.value = '';
    } else if (key === 'availability') {
      filtersState.availability = ''; availabilityGroup?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    } else if (key === 'search') {
      filtersState.search = ''; searchInput.value = '';
    } else if (key.startsWith('cat-')) {
      const val = key.replace('cat-',''); filtersState.categories.delete(val);
      categoryGroup?.querySelectorAll('.pill').forEach(p => { if (p.dataset.value === val) p.classList.remove('active'); });
    } else if (key.startsWith('svc-')) {
      const val = key.replace('svc-',''); filtersState.services.delete(val);
      servicesGroup?.querySelectorAll('.pill').forEach(p => { if (p.dataset.value === val) p.classList.remove('active'); });
    }
    applyFilters();
  };

  const buildNameDatalist = () => {
    nameDatalist.innerHTML = '';
    CARS.forEach(car => {
      const opt = document.createElement('option');
      opt.value = car.title;
      nameDatalist.appendChild(opt);
    });
  };

  const createCard = (car, index) => {
    const div = document.createElement('div');
    div.className = 'experiencias-card';
    div.style.animation = `fadeUp 500ms ease ${index * 80}ms forwards`;
    div.style.opacity = '0';

    const img = new Image();
    const query = `${car.title},luxury-car`;
    img.src = `https://source.unsplash.com/400x400/?${encodeURIComponent(query)}`;
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
    const badgeInfo = BADGE_CONFIG[car.badge || 'verified'];
    if (badgeInfo) {
      badgeEl.textContent = badgeInfo.label;
      badgeEl.style.background = badgeInfo.bg;
    }

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
    div.appendChild(badgeEl);
    div.appendChild(mediaBadge);
    div.appendChild(info);

    currency.addEventListener('click', (e) => {
      e.stopPropagation();
      currentCurrency = currentCurrency === 'CLP' ? 'USD' : 'CLP';
      updateAllPrices();
    });

    div.addEventListener('click', () => openDetail(car));

    return div;
  };

  const updateAllPrices = () => {
    document.querySelectorAll('.experiencias-card').forEach((card, i) => {
      const car = visibleCars[i];
      if (!car) return;
      const priceEl = card.querySelector('.experiencias-price');
      const currencyEl = card.querySelector('.experiencias-currency');
      if (priceEl) priceEl.textContent = formatPrice(currentCurrency === 'CLP' ? car.price.CLP : car.price.USD);
      if (currencyEl) currencyEl.textContent = currentCurrency === 'CLP' ? 'CLP | USD' : 'USD | CLP';
    });
    currencyBtn.querySelector('.currency-label').textContent = currentCurrency;
  };

  const formatRelative = (timestamp) => {
    const diffH = Math.max(1, Math.round((Date.now() - timestamp) / (1000 * 60 * 60)));
    if (diffH < 24) return `Actualizado hace ${diffH}h`;
    const d = Math.round(diffH / 24);
    return `Actualizado hace ${d} días`;
  };

  const buildMedia = (car) => {
    const base = encodeURIComponent(car.title || 'premium');
    return [
      { type: 'image', src: `https://source.unsplash.com/900x600/?${base}` },
      { type: 'image', src: `https://source.unsplash.com/900x600/?${base},interior` },
      { type: 'image', src: `https://source.unsplash.com/900x600/?${base},luxury` },
      { type: 'video', src: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4' }
    ];
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

  const openDetail = (car) => {
    if (!detailModal) return;
    detailCurrency = currentCurrency;
    currentMedia = buildMedia(car);
    currentMediaIndex = 0;

    detailTitle.textContent = car.title;
    const badgeInfo = BADGE_CONFIG[car.badge || 'verified'];
    if (badgeInfo) {
      detailBadge.style.display = 'inline-flex';
      detailBadge.textContent = badgeInfo.label;
      detailBadge.style.background = badgeInfo.bg;
    } else {
      detailBadge.style.display = 'none';
    }
    detailMeta.textContent = `${car.location} · ${car.availability} · ${formatRelative(car.createdAt)} · ${car.popularity || 0} vistas`;
    detailPrice.textContent = detailCurrency === 'CLP' ? `$${car.price.CLP}` : `$${car.price.USD}`;
    detailDescription.innerHTML = `<p>Servicio exclusivo ${car.categoryNew || car.category}. Experiencia completa, atención personalizada, ambiente seguro y discreto.</p><p>Incluye acompañamiento, presentación premium y opciones adicionales bajo coordinación previa.</p>`;
    detailFeatures.innerHTML = '';
    const feats = [
      '✅ Ambiente discreto y seguro',
      '🕒 Disponibilidad flexible',
      '💬 Confirmación rápida',
      '💎 Presentación impecable'
    ];
    feats.forEach(f => {
      const li = document.createElement('li');
      li.textContent = f;
      detailFeatures.appendChild(li);
    });

    detailLocation.textContent = `Ubicación referencial: ${car.location}`;
    detailHours.textContent = `Horarios: ${car.availability === '24/7' ? '24/7' : '10:00 - 22:00'}`;
    detailLanguages.textContent = 'Idiomas: Español, Inglés';
    detailMap.textContent = `Zona aproximada: ${car.location}`;

    detailWhatsapp.href = `https://wa.me/56912345678?text=${encodeURIComponent('Hola, me interesa tu servicio: ' + car.title)}`;
    detailTelegram.href = 'https://t.me/';
    detailCall.href = 'tel:+56912345678';

    detailThumbs.innerHTML = '';
    currentMedia.forEach((m, idx) => {
      const t = document.createElement('div');
      t.className = `detail-thumb ${idx === 0 ? 'active' : ''}`;
      if (m.type === 'image') {
        const img = document.createElement('img');
        img.src = m.src;
        t.appendChild(img);
      } else {
        const v = document.createElement('video');
        v.src = m.src;
        v.muted = true;
        t.appendChild(v);
      }
      t.addEventListener('click', () => { currentMediaIndex = idx; renderMedia(); });
      detailThumbs.appendChild(t);
    });

    renderMedia();
    // Vincular testimonios del perfil seleccionado
    if (typeof window.setTestimonialsForCar === 'function') {
      window.setTestimonialsForCar(car);
    }

    detailModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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
  detailCurrencyToggle?.addEventListener('click', () => {
    detailCurrency = detailCurrency === 'CLP' ? 'USD' : 'CLP';
    detailCurrencyToggle.querySelector('.currency-label').textContent = detailCurrency;
    const price = visibleCars.find(c => c.title === detailTitle.textContent)?.price;
    if (price) detailPrice.textContent = detailCurrency === 'CLP' ? `$${price.CLP}` : `$${price.USD}`;
  });

  detailForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Consulta enviada, te contactaremos pronto.');
    detailForm.reset();
  });

  const sortCars = (arr) => {
    const list = [...arr];
    // Primero ordenar por badge priority
    list.sort((a, b) => {
      const priorityA = BADGE_PRIORITY[a.badge || 'none'] || 999;
      const priorityB = BADGE_PRIORITY[b.badge || 'none'] || 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Mismo badge, ordenar según filtro seleccionado
      switch (filtersState.sort) {
        case 'price-desc':
          return b.price.USD - a.price.USD;
        case 'price-asc':
          return a.price.USD - b.price.USD;
        case 'popular':
          return b.popularity - a.popularity;
        case 'recent':
        default:
          return b.createdAt - a.createdAt;
      }
    });
    return list;
  };

  const matchesServices = (carServices, required) => {
    if (!required.size) return true;
    return Array.from(required).some(svc => carServices?.includes(svc));
  };

  const applyFilters = () => {
    visibleCars = CARS.filter(car => {
      if (deletedDemos.includes(car.id)) return false;

      if (filtersState.location && car.location !== filtersState.location) return false;
      if (filtersState.availability && car.availability !== filtersState.availability) return false;
      if (filtersState.categories.size && !filtersState.categories.has(car.categoryNew)) return false;
      if (!matchesServices(car.services, filtersState.services)) return false;
      if (filtersState.search && !car.title.toLowerCase().includes(filtersState.search.toLowerCase())) return false;
      return true;
    });

    visibleCars = sortCars(visibleCars);

    itemsLoaded = 0;
    grid.innerHTML = '';
    loadCards();
    renderCounter(CARS.length - deletedDemos.length, visibleCars.length);
    renderActiveChips();
  };

  const loadCards = () => {
    const start = itemsLoaded;
    const end = Math.min(start + itemsPerLoad, visibleCars.length);
    for (let i = start; i < end; i++) {
      grid.appendChild(createCard(visibleCars[i], i - start));
    }
    itemsLoaded = end;
  };

  // Handlers
  locationSelect?.addEventListener('change', () => { filtersState.location = locationSelect.value; applyFilters(); });

  availabilityGroup?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const val = btn.dataset.value;
    const isActive = btn.classList.contains('active');
    availabilityGroup.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    if (isActive) {
      filtersState.availability = '';
    } else {
      filtersState.availability = val;
      btn.classList.add('active');
    }
    applyFilters();
  });

  categoryGroup?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const val = btn.dataset.value;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      filtersState.categories.delete(val);
    } else {
      btn.classList.add('active');
      filtersState.categories.add(val);
    }
    applyFilters();
  });

  servicesGroup?.addEventListener('click', (e) => {
    const btn = e.target.closest('.pill');
    if (!btn) return;
    const val = btn.dataset.value;
    if (btn.classList.contains('active')) {
      btn.classList.remove('active');
      filtersState.services.delete(val);
    } else {
      btn.classList.add('active');
      filtersState.services.add(val);
    }
    applyFilters();
  });

  searchInput?.addEventListener('input', () => {
    filtersState.search = searchInput.value.trim();
    applyFilters();
  });

  sortSelect?.addEventListener('change', () => {
    filtersState.sort = sortSelect.value;
    applyFilters();
  });

  document.getElementById('reset-filters')?.addEventListener('click', () => {
    filtersState.location = '';
    filtersState.availability = '';
    filtersState.categories.clear();
    filtersState.services.clear();
    filtersState.search = '';
    filtersState.sort = 'recent';

    locationSelect.value = '';
    availabilityGroup?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    categoryGroup?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    servicesGroup?.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    searchInput.value = '';
    sortSelect.value = 'recent';

    applyFilters();
  });

  currencyBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    currentCurrency = currentCurrency === 'CLP' ? 'USD' : 'CLP';
    updateAllPrices();
  });

  buildNameDatalist();
  applyFilters();

  window.addEventListener('scroll', () => {
    const scrollThreshold = window.innerWidth >= 768 ? 300 : 150;
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - scrollThreshold) {
      if (itemsLoaded < visibleCars.length) {
        loadCards();
      }
    }
  }, { passive: true });
})();

// Stories System
(function setupStories() {
  // Datos de ejemplo
  let storiesData = [
    {
      id: 'user-1',
      name: 'Carlos Martínez',
      avatar: 'https://source.unsplash.com/36x36/?portrait,man,1',
      whatsapp: '+56912345678',
      badge: 'elite',
      stories: [
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,1', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,2', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,3', duration: 5000 }
      ]
    },
    {
      id: 'user-2',
      name: 'Sofia García',
      avatar: 'https://source.unsplash.com/36x36/?portrait,woman,1',
      whatsapp: '+56987654321',
      badge: 'trending',
      stories: [
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,4', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,5', duration: 5000 }
      ]
    },
    {
      id: 'user-3',
      name: 'Miguel Torres',
      avatar: 'https://source.unsplash.com/36x36/?portrait,man,2',
      whatsapp: '+56912111222',
      badge: 'premium',
      stories: [
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,6', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,7', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,8', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,9', duration: 5000 }
      ]
    },
    {
      id: 'user-4',
      name: 'Andrea López',
      avatar: 'https://source.unsplash.com/36x36/?portrait,woman,2',
      whatsapp: '+56912333444',
      badge: 'verified',
      stories: [
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,10', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,11', duration: 5000 }
      ]
    },
    {
      id: 'user-5',
      name: 'Diego Rodríguez',
      avatar: 'https://source.unsplash.com/36x36/?portrait,man,3',
      whatsapp: '+56912555666',
      badge: 'top-rated',
      stories: [
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,12', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,13', duration: 5000 },
        { type: 'image', src: 'https://source.unsplash.com/400x700/?luxury,car,14', duration: 5000 }
      ]
    }
  ];

  // Ordenar stories por badge priority (usar BADGE_PRIORITY global)
  const BADGE_PRIORITY = {
    'elite': 1,
    'trending': 2,
    'premium': 3,
    'nuevo': 4,
    'top-rated': 5,
    'verified': 6,
    'none': 999
  };
  
  storiesData.sort((a, b) => {
    const priorityA = BADGE_PRIORITY[a.badge || 'none'] || 999;
    const priorityB = BADGE_PRIORITY[b.badge || 'none'] || 999;
    return priorityA - priorityB;
  });

  // Estado
  let viewedStories = JSON.parse(localStorage.getItem('viewedStories') || '{}');
  let currentUserIndex = 0;
  let currentStoryIndex = 0;
  let autoPlayTimer = null;
  let isPaused = false;

  const carousel = document.getElementById('stories-carousel');
  const modal = document.getElementById('stories-modal');
  const closeBtn = document.querySelector('.stories-close-btn');
  const overlay = document.querySelector('.stories-overlay');
  const prevBtn = document.querySelector('.stories-nav-prev');
  const nextBtn = document.querySelector('.stories-nav-next');
  const contactBtn = document.getElementById('stories-contact-btn');
  const contentDiv = document.getElementById('stories-content');

  // Renderizar círculos de stories
  function renderCarousel() {
    carousel.innerHTML = '';
    storiesData.forEach((user, index) => {
      const button = document.createElement('button');
      button.className = 'story-button';
      button.type = 'button';
      button.setAttribute('data-user-index', index);

      const hasViewed = viewedStories[user.id] || false;

      const ring = document.createElement('div');
      ring.className = `story-ring ${hasViewed ? 'viewed' : ''}`;

      const img = document.createElement('img');
      img.src = user.avatar;
      img.alt = user.name;

      const badgeContainer = document.createElement('div');
      badgeContainer.className = 'story-badge-container';
      
      const BADGE_EMOJIS = {
        'elite': '💎',
        'trending': '🔥',
        'premium': '👑',
        'nuevo': '🆕',
        'top-rated': '⭐',
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
    document.getElementById('stories-user-avatar').src = user.avatar;
    document.getElementById('stories-user-time').textContent = 'Hace 2h';

    // Renderizar contenido
    contentDiv.innerHTML = '';
    if (story.type === 'image') {
      const img = document.createElement('img');
      img.src = story.src;
      img.alt = 'Story';
      contentDiv.appendChild(img);
    } else if (story.type === 'video') {
      const video = document.createElement('video');
      video.src = story.src;
      video.autoplay = true;
      video.muted = true;
      video.controls = false;
      video.loop = false;
      contentDiv.appendChild(video);
    }

    // Actualizar barra de progreso
    updateProgressBar();

    // Marcar como vista
    viewedStories[user.id] = true;
    localStorage.setItem('viewedStories', JSON.stringify(viewedStories));
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

    user.stories.forEach((_, index) => {
      const segment = document.createElement('div');
      segment.className = 'progress-segment';
      if (index === currentStoryIndex) {
        segment.classList.add('active');
        const story = user.stories[index];
        segment.style.animation = `progressBar ${story.duration}ms linear forwards`;
      } else if (index < currentStoryIndex) {
        segment.style.background = 'var(--gold)';
      }
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

  // Pausa al hover
  modal.addEventListener('mouseenter', () => {
    stopAutoPlay();
    isPaused = true;
  });

  modal.addEventListener('mouseleave', () => {
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

  // Inicializar
  renderCarousel();
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

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

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

    // Crear mensaje
    const mensaje = {
      id: Date.now(),
      fecha: new Date().toISOString(),
      nombre: formData.get('nombre'),
      email: formData.get('email'),
      telefono: formData.get('telefono') || 'No proporcionado',
      mensaje: formData.get('mensaje'),
      archivos: archivosData,
      leido: false
    };

    // Guardar en localStorage
    const mensajes = JSON.parse(localStorage.getItem('contactMessages') || '[]');
    mensajes.unshift(mensaje);
    localStorage.setItem('contactMessages', JSON.stringify(mensajes));

    alert('¡Mensaje enviado correctamente! Te responderemos pronto.');
    closeModal();
  });

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

(function setupTestimonials() {
  const section = document.getElementById('testimonials-section');
  const slider = document.getElementById('testimonials-slider');
  const track = document.getElementById('ts-track');
  const dots = document.getElementById('ts-dots');
  const prevBtn = slider?.querySelector('.ts-prev');
  const nextBtn = slider?.querySelector('.ts-next');

  if (!section || !slider || !track || !dots) return;

  const SAMPLE = [
    { id: 's1', carId: 'ferrari-f8', name: 'Carlos M.', rating: 5, text: 'Experiencia impecable, atención de primer nivel. 100% recomendado.', date: '2025-01-02' },
    { id: 's2', carId: 'lamborghini-huracán', name: 'Sofía G.', rating: 5, text: 'Profesionalismo y puntualidad. Superó mis expectativas.', date: '2024-12-18' },
    { id: 's3', carId: 'bentley-continental', name: 'Andrés T.', rating: 4, text: 'Presentación premium y ambiente seguro. Muy buena experiencia.', date: '2025-01-05' },
    { id: 's4', carId: 'maserati-mc20', name: 'Valentina R.', rating: 5, text: 'Atención personalizada y discreta. Servicio de alta calidad.', date: '2024-11-30' },
    { id: 's5', carId: 'porsche-911-gt3', name: 'Miguel D.', rating: 4, text: 'Excelente trato y confirmación rápida. Volveré.', date: '2025-01-07' },
    { id: 's6', carId: 'aston-martin-db11', name: 'Lucía P.', rating: 5, text: 'Ambiente muy cómodo y elegante, todo perfecto.', date: '2024-12-02' },
  ];

  const loadApproved = () => {
    const arr = JSON.parse(localStorage.getItem('testimonials') || '[]');
    return arr.filter(t => t.approved);
  };

  let currentIndex = 0;
  let itemsPerView = 3;
  let autoplayId = null;
  const AUTOPLAY_MS = 6000;
  let currentList = loadApproved();
  if (!currentList.length) currentList = SAMPLE.slice(0,6);

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

  const setList = (list) => {
    currentList = list && list.length ? list : (loadApproved().length ? loadApproved() : SAMPLE.slice(0,6));
    itemsPerView = getItemsPerView();
    renderCards(currentList);
    renderDots();
    slideToIndex(0);
  };

  // Expose setter for detail modal linkage
  function setTestimonialsForCar(car) {
    if (!car) return;
    const approved = loadApproved();
    const filtered = approved.filter(t => t.carId === car.id);
    setList(filtered.length ? filtered : approved.slice(0, 6));
  }
  window.setTestimonialsForCar = setTestimonialsForCar;

  // Init
  setList(loadApproved());

  // Events
  prevBtn?.addEventListener('click', prevPage);
  nextBtn?.addEventListener('click', nextPage);
  slider.addEventListener('mouseenter', stopAutoplay);
  slider.addEventListener('mouseleave', startAutoplay);
  window.addEventListener('resize', recalc, { passive: true });

  startAutoplay();
})();