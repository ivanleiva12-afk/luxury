// Foro de Experiencias
(function foroInit(){
  const form = document.getElementById('foro-form');
  const msg = document.getElementById('foro-msg');
  const perfilSelect = document.getElementById('t-perfil');
  const listDiv = document.getElementById('foro-list');
  const emptyDiv = document.getElementById('foro-empty');

  // Build perfiles options (demos + creadas)
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
  const publicaciones = JSON.parse(localStorage.getItem('publicacionesCreadas') || '[]');
  const perfiles = [...demoCars, ...publicaciones.map(p => ({ id: p.id, title: p.title }))];
  perfiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.title;
    perfilSelect.appendChild(opt);
  });

  const loadTestimonials = () => JSON.parse(localStorage.getItem('testimonials') || '[]');
  const saveTestimonials = (arr) => localStorage.setItem('testimonials', JSON.stringify(arr));



  const showMsg = (text, type='success') => {
    msg.textContent = text;
    msg.className = type === 'success' ? 'success-msg' : 'error-msg';
    msg.style.display = 'block';
    setTimeout(() => { msg.style.display = 'none'; }, 3000);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('t-nombre').value.trim();
    const carId = perfilSelect.value;
    const rating = parseInt(document.getElementById('t-rating').value);
    const text = document.getElementById('t-texto').value.trim();

    if (!name || !carId || !rating || !text) {
      showMsg('Por favor completa todos los campos.', 'error');
      return;
    }

    const testimonials = loadTestimonials();
    testimonials.push({
      id: 't-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
      carId,
      name,
      rating,
      text,
      date: new Date().toISOString(),
      approved: false
    });
    saveTestimonials(testimonials);

    form.reset();
    showMsg('¡Testimonio enviado! Quedará pendiente hasta aprobación del administrador.');
  });
})();