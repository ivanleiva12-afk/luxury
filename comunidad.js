// Foro de la Comunidad - JavaScript

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
  const interactive = document.querySelectorAll('a, button, .interactive, .forum-tab, .thread-card, .btn-like, .btn-reply-main');
  interactive.forEach(el => {
    el.addEventListener('mouseenter', () => setHover(true));
    el.addEventListener('mouseleave', () => setHover(false));
  });
}

// Estado global
let threads = JSON.parse(localStorage.getItem('forumThreads') || '[]');
let currentUser = { username: 'Usuario', avatar: 'https://ui-avatars.com/api/?name=U&background=D4AF37&color=0A0A0A' };
let currentTab = 'todos';
let selectedTags = [];

// Cargar creadoras desde localStorage
const loadCreators = () => {
  const demos = [
    { id: 'ferrari-f8', title: 'Ferrari F8 Tributo' },
    { id: 'lamborghini-huracán', title: 'Lamborghini Huracán' },
    { id: 'bentley-continental', title: 'Bentley Continental GT' },
    { id: 'maserati-mc20', title: 'Maserati MC20' },
    { id: 'porsche-911-gt3', title: 'Porsche 911 GT3' },
    { id: 'aston-martin-db11', title: 'Aston Martin DB11' },
    { id: 'bmw-m8', title: 'BMW M8 Competition' },
    { id: 'audi-r8', title: 'Audi R8 V10' }
  ];
  const publicaciones = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]');
  return [...demos, ...publicaciones.map(p => ({ id: p.id, title: p.title }))];
};

// Poblar select de creadoras
const populateCreatorsSelect = () => {
  const select = document.getElementById('tema-creadora');
  const creators = loadCreators();
  creators.forEach(creator => {
    const option = document.createElement('option');
    option.value = creator.id;
    option.textContent = creator.title;
    select.appendChild(option);
  });
};

// Formatear tiempo relativo
const timeAgo = (timestamp) => {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Hace un momento';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} horas`;
  return `Hace ${Math.floor(seconds / 86400)} días`;
};

// Obtener icono de categoría
const getCategoryIcon = (category) => {
  const icons = {
    opinion: '💬',
    pregunta: '❓',
    recomendacion: '⭐',
    advertencia: '⚠️',
    experiencia: '📝'
  };
  return icons[category] || '💬';
};

// Renderizar lista de temas
const renderThreads = () => {
  const threadsList = document.getElementById('threads-list');
  const emptyState = document.getElementById('foro-empty');
  
  let filteredThreads = [...threads];
  
  // Filtrar según tab activo
  if (currentTab === 'populares') {
    filteredThreads.sort((a, b) => (b.replies?.length || 0) - (a.replies?.length || 0));
  } else if (currentTab === 'recientes') {
    filteredThreads.sort((a, b) => b.timestamp - a.timestamp);
  } else if (currentTab === 'sin-responder') {
    filteredThreads = filteredThreads.filter(t => !t.replies || t.replies.length === 0);
  }
  
  if (filteredThreads.length === 0) {
    threadsList.style.display = 'none';
    emptyState.style.display = 'flex';
    return;
  }
  
  threadsList.style.display = 'block';
  emptyState.style.display = 'none';
  
  const creators = loadCreators();
  
  threadsList.innerHTML = filteredThreads.map(thread => {
    const creator = creators.find(c => c.id === thread.creatorId);
    const creatorName = creator ? creator.title : thread.creatorId;
    const repliesCount = thread.replies?.length || 0;
    const views = thread.views || 0;
    
    return `
      <article class="thread-card" data-id="${thread.id}">
        <img src="${thread.author.avatar}" alt="${thread.author.username}" class="thread-avatar" />
        
        <div class="thread-content">
          <h3 class="thread-title">${thread.title}</h3>
          <div class="thread-metadata">
            <span>Por <a href="#" class="thread-author">@${thread.author.username}</a></span>
            <span>•</span>
            <span>${timeAgo(thread.timestamp)}</span>
            <span>•</span>
            <span>en <strong>${creatorName}</strong></span>
          </div>
          <p class="thread-preview">${thread.content}</p>
          ${thread.tags && thread.tags.length > 0 ? `
            <div class="thread-tags">
              ${thread.tags.map(tag => `<span class="thread-tag">${tag}</span>`).join('')}
            </div>
          ` : ''}
        </div>
        
        <div class="thread-stats">
          <div class="thread-replies">
            <span class="thread-replies-count">${repliesCount}</span>
            <span class="thread-replies-label">respuestas</span>
          </div>
          <div class="thread-views">👁️ ${views}</div>
          <div class="thread-last-activity">Último: ${timeAgo(thread.lastActivity || thread.timestamp)}</div>
        </div>
      </article>
    `;
  }).join('');
  
  // Agregar event listeners a las tarjetas
  document.querySelectorAll('.thread-card').forEach(card => {
    card.addEventListener('click', () => {
      const threadId = card.dataset.id;
      openThread(threadId);
    });
  });
};

// Abrir modal de crear tema
const openCreateModal = () => {
  document.getElementById('modal-crear-tema').style.display = 'flex';
};

// Cerrar modal de crear tema
const closeCreateModal = () => {
  document.getElementById('modal-crear-tema').style.display = 'none';
  document.getElementById('form-crear-tema').reset();
  selectedTags = [];
  document.getElementById('tags-list').innerHTML = '';
  document.querySelectorAll('.chip-option input').forEach(input => input.checked = false);
};

// Manejar envío de nuevo tema
const handleSubmitTema = (e) => {
  e.preventDefault();
  
  const creatorId = document.getElementById('tema-creadora').value;
  const title = document.getElementById('tema-titulo').value;
  const content = document.getElementById('tema-contenido').value;
  const category = document.querySelector('input[name="categoria"]:checked').value;
  
  const newThread = {
    id: 'thread-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
    creatorId,
    title,
    content,
    category,
    tags: selectedTags,
    author: currentUser,
    timestamp: Date.now(),
    lastActivity: Date.now(),
    views: 0,
    replies: [],
    likes: 0
  };
  
  threads.unshift(newThread);
  localStorage.setItem('forumThreads', JSON.stringify(threads));
  
  closeCreateModal();
  renderThreads();
  
  // Mostrar mensaje de éxito
  alert('¡Tema creado exitosamente!');
};

// Abrir vista de tema individual
const openThread = (threadId) => {
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;
  
  // Incrementar vistas
  thread.views = (thread.views || 0) + 1;
  localStorage.setItem('forumThreads', JSON.stringify(threads));
  
  const modal = document.getElementById('modal-tema-view');
  const content = document.getElementById('thread-content');
  const creators = loadCreators();
  const creator = creators.find(c => c.id === thread.creatorId);
  
  document.getElementById('breadcrumb-creadora').textContent = creator ? creator.title : thread.creatorId;
  document.getElementById('breadcrumb-titulo').textContent = thread.title;
  
  content.innerHTML = `
    <div class="thread-view-header">
      <div class="thread-view-category-badge">${getCategoryIcon(thread.category)} ${thread.category}</div>
      <h2 class="thread-view-title">${thread.title}</h2>
      <div class="thread-view-meta">
        <img src="${thread.author.avatar}" class="thread-view-avatar" />
        <div>
          <div class="thread-view-author">@${thread.author.username} <span class="op-badge">OP</span></div>
          <div class="thread-view-time">${timeAgo(thread.timestamp)}</div>
        </div>
        <div class="thread-view-stats-inline">
          💬 ${thread.replies?.length || 0} respuestas | 👁️ ${thread.views || 0} vistas
        </div>
      </div>
    </div>
    
    <div class="thread-view-content">
      <p>${thread.content}</p>
    </div>
    
    <div class="thread-view-actions">
      <button class="btn-like" data-id="${thread.id}">
        <span class="like-icon">👍</span>
        <span class="like-count">${thread.likes || 0}</span>
      </button>
      <button class="btn-reply-main">💬 Responder</button>
    </div>
    
    <div class="thread-replies-section">
      <h3 class="replies-title">${thread.replies?.length || 0} Respuestas</h3>
      <div id="replies-list"></div>
    </div>
    
    <div class="reply-form-container" id="reply-form-main" style="display:none;">
      <form class="reply-form" data-thread-id="${thread.id}">
        <img src="${currentUser.avatar}" class="reply-form-avatar" />
        <div class="reply-form-input-wrapper">
          <textarea class="reply-form-textarea" placeholder="Escribe tu respuesta..." required></textarea>
          <div class="reply-form-actions">
            <button type="button" class="btn-reply-cancel">Cancelar</button>
            <button type="submit" class="btn-reply-submit">Publicar</button>
          </div>
        </div>
      </form>
    </div>
  `;
  
  // Renderizar respuestas si existen
  if (thread.replies && thread.replies.length > 0) {
    renderReplies(thread.replies, document.getElementById('replies-list'), thread.id);
  }
  
  modal.style.display = 'flex';
  
  // Event listeners
  modal.querySelector('.btn-reply-main').addEventListener('click', () => {
    document.getElementById('reply-form-main').style.display = 'block';
  });
  
  modal.querySelectorAll('.btn-reply-cancel').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.target.closest('.reply-form-container').style.display = 'none';
    });
  });
  
  modal.querySelectorAll('.reply-form').forEach(form => {
    form.addEventListener('submit', handleReplySubmit);
  });
};

// Renderizar respuestas
const renderReplies = (replies, container, threadId, level = 0) => {
  if (!replies || replies.length === 0) return;
  
  container.innerHTML = replies.map(reply => `
    <div class="reply-item" style="margin-left: ${level * 40}px">
      <div class="reply-header">
        <img src="${reply.author.avatar}" class="reply-avatar" />
        <div class="reply-author-info">
          <div class="reply-author">@${reply.author.username}</div>
          <div class="reply-time">${timeAgo(reply.timestamp)}</div>
        </div>
        <button class="reply-options">⋮</button>
      </div>
      <div class="reply-content">${reply.content}</div>
      <div class="reply-actions">
        <button class="btn-like-reply" data-id="${reply.id}">
          👍 ${reply.likes || 0}
        </button>
        <button class="btn-reply-to" data-reply-id="${reply.id}">💬 Responder</button>
      </div>
      <div class="reply-form-container reply-nested" data-reply-id="${reply.id}" style="display:none;"></div>
      ${reply.replies && reply.replies.length > 0 ? `<div class="nested-replies" data-parent="${reply.id}"></div>` : ''}
    </div>
  `).join('');
  
  // Renderizar respuestas anidadas
  replies.forEach(reply => {
    if (reply.replies && reply.replies.length > 0 && level < 4) {
      const nestedContainer = container.querySelector(`.nested-replies[data-parent="${reply.id}"]`);
      if (nestedContainer) {
        renderReplies(reply.replies, nestedContainer, threadId, level + 1);
      }
    }
  });
};

// Manejar respuesta
const handleReplySubmit = (e) => {
  e.preventDefault();
  const form = e.target;
  const threadId = form.dataset.threadId;
  const replyId = form.dataset.replyId;
  const content = form.querySelector('textarea').value;
  
  const newReply = {
    id: 'reply-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
    author: currentUser,
    content,
    timestamp: Date.now(),
    likes: 0,
    replies: []
  };
  
  const thread = threads.find(t => t.id === threadId);
  if (!thread) return;
  
  if (replyId) {
    // Responder a una respuesta específica (anidada)
    const addNestedReply = (replies) => {
      for (let reply of replies) {
        if (reply.id === replyId) {
          if (!reply.replies) reply.replies = [];
          reply.replies.push(newReply);
          return true;
        }
        if (reply.replies && addNestedReply(reply.replies)) return true;
      }
      return false;
    };
    addNestedReply(thread.replies);
  } else {
    // Respuesta principal
    if (!thread.replies) thread.replies = [];
    thread.replies.push(newReply);
  }
  
  thread.lastActivity = Date.now();
  localStorage.setItem('forumThreads', JSON.stringify(threads));
  
  // Recargar vista del tema
  openThread(threadId);
};

// Contadores de caracteres
const setupCharCounters = () => {
  const titleInput = document.getElementById('tema-titulo');
  const contentInput = document.getElementById('tema-contenido');
  const titleCounter = document.getElementById('titulo-counter');
  const contentCounter = document.getElementById('contenido-counter');
  
  if (titleInput) {
    titleInput.addEventListener('input', () => {
      titleCounter.textContent = titleInput.value.length;
    });
  }
  
  if (contentInput) {
    contentInput.addEventListener('input', () => {
      contentCounter.textContent = contentInput.value.length;
    });
  }
};

// Manejar tags
const setupTagsInput = () => {
  const tagsInput = document.getElementById('tema-tags');
  const tagsList = document.getElementById('tags-list');
  
  tagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const tag = tagsInput.value.trim();
      if (tag && selectedTags.length < 5 && !selectedTags.includes(tag)) {
        selectedTags.push(tag);
        renderTags();
        tagsInput.value = '';
      }
    }
  });
  
  const renderTags = () => {
    tagsList.innerHTML = selectedTags.map((tag, index) => `
      <span class="tag-chip">
        ${tag}
        <button type="button" class="tag-remove" data-index="${index}">×</button>
      </span>
    `).join('');
    
    tagsList.querySelectorAll('.tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedTags.splice(btn.dataset.index, 1);
        renderTags();
      });
    });
  };
};

// Manejar categorías (chips)
const setupCategoryChips = () => {
  document.querySelectorAll('.chip-option input').forEach(input => {
    input.addEventListener('change', () => {
      document.querySelectorAll('.chip-option').forEach(chip => {
        chip.classList.remove('selected');
      });
      if (input.checked) {
        input.closest('.chip-option').classList.add('selected');
      }
    });
  });
};

// Tabs de navegación
const setupTabs = () => {
  document.querySelectorAll('.foro-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.foro-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTab = tab.dataset.tab;
      renderThreads();
    });
  });
};

// Búsqueda
const setupSearch = () => {
  const searchInput = document.getElementById('foro-search');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      renderThreads();
      return;
    }
    
    const filtered = threads.filter(t =>
      t.title.toLowerCase().includes(query) ||
      t.content.toLowerCase().includes(query) ||
      t.author.username.toLowerCase().includes(query)
    );
    
    threads = filtered;
    renderThreads();
    threads = JSON.parse(localStorage.getItem('forumThreads') || '[]');
  });
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  populateCreatorsSelect();
  renderThreads();
  setupCharCounters();
  setupTagsInput();
  setupCategoryChips();
  setupTabs();
  setupSearch();
  
  // Modals
  document.getElementById('btn-nuevo-tema').addEventListener('click', openCreateModal);
  document.querySelectorAll('.btn-nuevo-tema-secondary').forEach(btn => {
    btn.addEventListener('click', openCreateModal);
  });
  document.getElementById('modal-close').addEventListener('click', closeCreateModal);
  document.getElementById('btn-cancelar-tema').addEventListener('click', closeCreateModal);
  document.getElementById('form-crear-tema').addEventListener('submit', handleSubmitTema);
  
  document.getElementById('modal-thread-close').addEventListener('click', () => {
    document.getElementById('modal-tema-view').style.display = 'none';
  });
  
  // Click outside to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  });
});
