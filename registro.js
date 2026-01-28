/* ===================================
   REGISTRO - JAVASCRIPT
   =================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // Almacenamiento de archivos acumulados por input
  const accumulatedFiles = {};
  
  // Elements
  const form = document.getElementById('registro-form');
  const steps = document.querySelectorAll('.form-step');
  const progressSteps = document.querySelectorAll('.progress-step');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  
  let currentStep = 1;
  const totalSteps = 5;

  // Initialize
  updateNavigation();
  setupBioCounter();
  setupFileUploads();
  setupPlanSelection();
  setupCitySelector();
  setupNationalitySelector();
  setupPriceValidation();
  setYear();
  setupBirthdateCalculation();
  
  // Setup auto-username with slight delay to ensure elements are available
  setTimeout(() => {
    setupAutoUsername();
  }, 100);

  // Set current year in footer
  function setYear() {
    const yearEl = document.getElementById('year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }

  // Navigation functions
  function showStep(step) {
    steps.forEach(s => s.classList.remove('active'));
    progressSteps.forEach(p => {
      p.classList.remove('active');
      if (parseInt(p.dataset.step) < step) {
        p.classList.add('completed');
      } else {
        p.classList.remove('completed');
      }
      if (parseInt(p.dataset.step) === step) {
        p.classList.add('active');
      }
    });
    
    const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
    if (targetStep) {
      targetStep.classList.add('active');
    }
    
    // Scroll to top of form
    document.querySelector('.registro-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function updateNavigation() {
    prevBtn.style.display = currentStep === 1 ? 'none' : 'block';
    
    if (currentStep === totalSteps) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'block';
    } else {
      nextBtn.style.display = 'block';
      submitBtn.style.display = 'none';
    }
  }

  function validateStep(step) {
    const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
    const requiredFields = currentStepEl.querySelectorAll('[required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      // Skip validation for hidden fields (inside hidden sections)
      const isVisible = field.offsetParent !== null || field.closest('[style*="display: none"]') === null;
      if (!isVisible) return;
      
      if (!field.value || (field.type === 'checkbox' && !field.checked)) {
        isValid = false;
        field.classList.add('error');
        field.addEventListener('input', () => field.classList.remove('error'), { once: true });
      }
    });
    
    // Specific validations
    if (step === 1) {
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if (password.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres');
        isValid = false;
      }
      
      if (password !== confirmPassword) {
        alert('Las contraseñas no coinciden');
        isValid = false;
      }
    }
    
    if (step === 2) {
      const birthdate = document.getElementById('birthdate').value;
      if (!birthdate) {
        alert('Por favor ingresa tu fecha de nacimiento');
        isValid = false;
      } else {
        const today = new Date();
        const birth = new Date(birthdate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        if (age < 18) {
          alert('Debes ser mayor de 18 años para registrarte');
          isValid = false;
        }
      }
    }
    
    if (step === 4) {
      const photosFiles = accumulatedFiles['photosUpload'] || [];
      if (photosFiles.length !== 2) {
        alert('Debes subir exactamente 2 fotos de verificación para continuar');
        isValid = false;
      }
    }
    
    if (step === 5) {
      const selectedPlan = document.getElementById('selectedPlan').value;
      if (!selectedPlan) {
        alert('Por favor selecciona un plan');
        isValid = false;
      }
      
      const legalCheckboxes = ['ageConfirm', 'termsAccept', 'fraudDisclaimer', 'contentOwnership'];
      legalCheckboxes.forEach(id => {
        const checkbox = document.getElementById(id);
        if (!checkbox.checked) {
          isValid = false;
          checkbox.closest('.checkbox-legal').classList.add('error');
        }
      });
      
      if (!isValid) {
        alert('Debes aceptar todos los términos legales para continuar');
      }
    }
    
    return isValid;
  }

  // Event Listeners
  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      currentStep++;
      showStep(currentStep);
      updateNavigation();
      
      // Apply plan restrictions when entering step 5
      if (currentStep === 5) {
        applyPlanRestrictions();
      }
    }
  });

  prevBtn.addEventListener('click', () => {
    currentStep--;
    showStep(currentStep);
    updateNavigation();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Formulario enviado - Validando paso', currentStep);
    
    if (!validateStep(currentStep)) {
      console.log('Validación fallida');
      return;
    }
    
    console.log('Validación exitosa - Procesando datos');
    
    // Collect all form data
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
      if (data[key]) {
        if (Array.isArray(data[key])) {
          data[key].push(value);
        } else {
          data[key] = [data[key], value];
        }
      } else {
        data[key] = value;
      }
    }
    
    // Generate unique ID
    const registroId = Date.now();
    
    // Create registro object with all info
    const registro = {
      id: registroId,
      status: 'pendiente',
      date: new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      
      // Credentials
      password: data.password || '',
      
      // Personal Info
      displayName: data.displayName || '',
      username: data.username || generateUsername(data.displayName || ''),
      email: data.email || '',
      whatsapp: data.whatsapp || '',
      city: data.city === 'Otra' ? data.otherCity : data.city,
      commune: data.commune || '',
      bio: data.bio || '',
      nationality: data.nationality === 'Otra' ? data.otherNationality : data.nationality,
      languages: Array.isArray(data.languages) ? data.languages : [data.languages].filter(Boolean),
      
      // Physical Info
      birthdate: data.birthdate || '', // Fecha de nacimiento
      age: data.age || '',
      height: data.height || '',
      weight: data.weight || '',
      measurements: data.measurements || '',
      hairColor: data.hairColor || '',
      eyeColor: data.eyeColor || '',
      bodyType: data.bodyType || '',
      skinTone: data.skinTone || '',
      
      // Services & Rates
      services: Array.isArray(data.services) ? data.services : [data.services].filter(Boolean),
      attentionType: Array.isArray(data.attentionType) ? data.attentionType : [data.attentionType].filter(Boolean),
      schedule: data.schedule || '',
      priceHour: data.priceHour || '',
      originalPriceHour: data.priceHour || '', // Precio original de registro para promociones
      priceTwoHours: data.priceTwoHours || '',
      priceOvernight: data.priceOvernight || '',
      
      // Disponibilidad
      incall: data.incall === 'true',
      outcall: data.outcall === 'true',
      travel: data.travel === 'true',
      availability: data.availability || '',
      
      // Plan & Payment
      selectedPlan: data.selectedPlan || '',
      planDuration: parseInt(data.selectedDuration) || 30, // Duración en días (7-30)
      appliedDiscount: data.appliedDiscount || '',
      finalPrice: data.finalPrice || '',
      payAfterInterview: data.payAfterInterview === 'on',
      
      // Interview
      interviewDate: data.interviewDate || '',
      interviewTime: data.interviewTime || '',
      interviewStatus: 'pendiente', // pendiente, confirmada, completada, cancelada
      
      // Files (stored as names/indicators - actual files would go to server)
      hasProfilePhotos: !!data.profilePhotos,
      hasVerificationSelfie: !!data.verificationSelfie,
      hasIdDocument: !!data.idDocument,
      hasTransferReceipt: !!data.transferReceipt,
      
      // Fotos de verificación (no se pueden eliminar - uso interno)
      verificationPhotosCount: document.getElementById('photosUpload')?.files?.length || 0,
      verificationPhotosLocked: true, // Marca interna: estas fotos no se pueden eliminar
      
      // Estado del perfil (inactivo por defecto hasta que la clienta lo active)
      profileVisible: false,
      
      // Legal confirmations
      ageConfirm: data.ageConfirm === 'on',
      termsAccept: data.termsAccept === 'on',
      privacyAccept: data.privacyAccept === 'on',
      contentResponsibility: data.contentResponsibility === 'on'
    };
    
    // Convertir archivos a base64 para almacenamiento
    const filesPromises = [];
    
    console.log('📁 Procesando archivos...', { accumulatedFiles });
    
    // Documento ID
    const docInput = document.getElementById('docUpload');
    if (docInput?.files?.[0]) {
      console.log('📄 Procesando documento ID');
      filesPromises.push(
        fileToBase64(docInput.files[0])
          .then(base64 => {
            registro.idDocumentData = base64;
            registro.idDocumentName = docInput.files[0].name;
            registro.hasIdDocument = true;
            console.log('✅ Documento ID procesado');
          })
          .catch(error => {
            console.error('❌ Error procesando documento ID:', error);
            throw new Error('Error al procesar documento de identidad');
          })
      );
    }
    
    // Selfie de verificación
    const selfieInput = document.getElementById('selfieUpload');
    if (selfieInput?.files?.[0]) {
      console.log('📸 Procesando selfie');
      filesPromises.push(
        fileToBase64(selfieInput.files[0], 400, 400, 0.8) // Selfie: max 400x400px, calidad 80%
          .then(base64 => {
            registro.verificationSelfieData = base64;
            registro.verificationSelfieName = selfieInput.files[0].name;
            registro.hasVerificationSelfie = true;
            console.log('✅ Selfie procesado');
          })
          .catch(error => {
            console.error('❌ Error procesando selfie:', error);
            throw new Error('Error al procesar selfie de verificación');
          })
      );
    }
    
    // Fotos de perfil (hasta 5) - usar archivos acumulados
    const photosFiles = accumulatedFiles['photosUpload'] || [];
    console.log('🖼️ Fotos acumuladas encontradas:', photosFiles.length);
    
    if (photosFiles.length > 0) {
      const photosArray = photosFiles.slice(0, 5);
      console.log('📷 Procesando fotos de perfil:', photosArray.length);
      
      const photoPromises = photosArray.map((file, index) => 
        fileToBase64(file, 600, 600, 0.7) // Comprimir fotos: max 600x600px, calidad 70%
          .then(base64 => {
            console.log(`✅ Foto ${index + 1} procesada`);
            return { index, base64, name: file.name };
          })
          .catch(error => {
            console.error(`❌ Error procesando foto ${index + 1}:`, error);
            throw new Error(`Error al procesar foto ${index + 1}`);
          })
      );
      
      filesPromises.push(
        Promise.all(photoPromises)
          .then(photos => {
            registro.profilePhotosData = photos.sort((a, b) => a.index - b.index).map(p => ({ base64: p.base64, name: p.name }));
            registro.hasProfilePhotos = true;
            console.log('✅ Todas las fotos procesadas correctamente');
          })
          .catch(error => {
            console.error('❌ Error procesando conjunto de fotos:', error);
            throw new Error('Error al procesar fotos de perfil');
          })
      );
    }
    
    // Comprobante de pago
    const receiptInput = document.getElementById('transferReceipt');
    if (receiptInput?.files?.[0]) {
      console.log('🧾 Procesando comprobante');
      filesPromises.push(
        fileToBase64(receiptInput.files[0])
          .then(base64 => {
            registro.transferReceiptData = base64;
            registro.transferReceiptName = receiptInput.files[0].name;
            registro.hasTransferReceipt = true;
            console.log('✅ Comprobante procesado');
          })
          .catch(error => {
            console.error('❌ Error procesando comprobante:', error);
            throw new Error('Error al procesar comprobante de pago');
          })
      );
    }
    
    console.log('⏳ Esperando procesamiento de', filesPromises.length, 'archivos...');
    
    // Esperar a que todos los archivos se conviertan
    if (filesPromises.length === 0) {
      // No hay archivos que procesar, guardar directamente
      console.log('ℹ️ No hay archivos para procesar, guardando registro...');
      saveRegistration(registro);
    } else {
      Promise.all(filesPromises)
        .then(() => {
          console.log('✅ Todos los archivos procesados correctamente');
          saveRegistration(registro);
        })
        .catch(error => {
          console.error('❌ Error final al procesar archivos:', error);
          alert(`Hubo un error al procesar los archivos: ${error.message}\n\nPor favor, verifica que todos los archivos sean válidos e intenta de nuevo.`);
        });
    }
  });
  
  // Función para guardar el registro
  async function saveRegistration(registro) {
    try {
      // Limpiar localStorage antes de intentar guardar
      await cleanupLocalStorage();
      
      // Verificar tamaño aproximado del registro
      const registroSize = JSON.stringify(registro).length;
      console.log(`📦 Tamaño del registro: ${(registroSize/1024).toFixed(0)}KB`);
      
      if (registroSize > 2 * 1024 * 1024) { // 2MB
        throw new Error('El registro es demasiado grande. Por favor, usa imágenes más pequeñas.');
      }
      
      // Guardar directamente usando addPendingRegistro
      console.log('💾 Guardando registro con ID:', registro.id);
      await DataService.addPendingRegistro(registro);
      
      // Log censurado sin información sensible
      const registroForLog = { ...registro };
      delete registroForLog.password;
      delete registroForLog.idDocumentData; // También ocultar datos binarios largos
      delete registroForLog.verificationSelfieData;
      delete registroForLog.profilePhotosData;
      
      console.log('💾 Registro guardado exitosamente (ID:', registro.id, ')');
      console.log('📋 Datos del registro (censurados):', registroForLog);
      showSuccessMessage();
      
    } catch (error) {
      console.error('❌ Error al guardar registro:', error);
      
      if (error.name === 'QuotaExceededError') {
        // Error específico de cuota excedida
        alert(`❌ Error de almacenamiento\n\n` +
          `El navegador no tiene suficiente espacio para guardar tu registro.\n\n` +
          `Soluciones:\n` +
          `• Usa imágenes más pequeñas (máximo 500KB cada una)\n` +
          `• Comprime las imágenes antes de subirlas\n` +
          `• Limpia la caché del navegador\n\n` +
          `Si el problema persiste, contacta a soporte.`);
      } else {
        alert(`❌ Error al guardar el registro: ${error.message}\n\nPor favor, intenta de nuevo.`);
      }
    }
  }
  
  // Función para convertir archivo a base64 con compresión
  function fileToBase64(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        // Para archivos no-imagen, usar FileReader normal
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }
      
      // Para imágenes, comprimir
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calcular nuevas dimensiones manteniendo proporción
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a base64 con calidad reducida
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        
        console.log(`🗜️ Imagen comprimida: ${file.name} (${(file.size/1024).toFixed(0)}KB → ${(compressedBase64.length*0.75/1024).toFixed(0)}KB)`);
        resolve(compressedBase64);
      };
      
      img.onerror = reject;
      
      // Crear URL para la imagen
      img.src = URL.createObjectURL(file);
    });
  }
  
  // Función para limpiar datos antes de guardar
  async function cleanupLocalStorage() {
    try {
      // Limpiar tokens de recuperación expirados
      const recoveryRequests = await DataService.getPasswordRecoveryRequests() || [];
      const validRequests = recoveryRequests.filter(r => r.expiry > Date.now());
      if (validRequests.length !== recoveryRequests.length) {
        await DataService.savePasswordRecoveryRequests(validRequests);
        console.log('🧹 Limpiados tokens de recuperación expirados');
      }
      
      // Nota: La limpieza de instantes ahora se maneja en el backend/DataService
      console.log('✅ Limpieza completada');
    } catch (error) {
      console.warn('⚠️ Error durante limpieza:', error);
    }
  }

  // City selector - show/hide manual input for "Otra"
  function setupCitySelector() {
    const citySelect = document.getElementById('city');
    const otherCityGroup = document.getElementById('otherCityGroup');
    const otherCityInput = document.getElementById('otherCity');
    
    if (citySelect && otherCityGroup) {
      citySelect.addEventListener('change', () => {
        if (citySelect.value === 'Otra') {
          otherCityGroup.style.display = 'block';
          otherCityInput.required = true;
        } else {
          otherCityGroup.style.display = 'none';
          otherCityInput.required = false;
          otherCityInput.value = '';
        }
      });
    }
  }

  // Nationality selector - show/hide manual input for "Otra"
  function setupNationalitySelector() {
    const nationalitySelect = document.getElementById('nationality');
    const otherNationalityGroup = document.getElementById('otherNationalityGroup');
    const otherNationalityInput = document.getElementById('otherNationality');
    
    if (nationalitySelect && otherNationalityGroup) {
      nationalitySelect.addEventListener('change', () => {
        if (nationalitySelect.value === 'Otra') {
          otherNationalityGroup.style.display = 'block';
          otherNationalityInput.required = true;
        } else {
          otherNationalityGroup.style.display = 'none';
          otherNationalityInput.required = false;
          otherNationalityInput.value = '';
        }
      });
    }
  }

  // Auto-generate username from display name
  function setupAutoUsername() {
    console.log('🔄 Intentando configurar auto-username...');
    
    const displayNameInput = document.getElementById('displayName');
    const usernameInput = document.getElementById('username');
    
    if (!displayNameInput) {
      console.error('❌ No se encontró el campo displayName');
      return;
    }
    
    if (!usernameInput) {
      console.error('❌ No se encontró el campo username');
      return;
    }
    
    console.log('✅ Campos encontrados, configurando eventos...');
    
    // Generate username when display name changes (but wait for complete input)
    displayNameInput.addEventListener('input', () => {
      const displayValue = displayNameInput.value.trim();
      
      // If display name is empty, clear auto-generated username
      if (!displayValue) {
        if (!usernameInput.value.trim() || usernameInput.dataset.autoGenerated === 'true') {
          usernameInput.value = '';
          usernameInput.placeholder = 'tu.usuario';
          usernameInput.dataset.autoGenerated = 'false';
          console.log('🧹 Username limpiado porque el nombre está vacío');
        }
        return;
      }
      
      // Update placeholder with live suggestion
      if (!usernameInput.value.trim() && displayValue.length >= 2) {
        const suggested = generateUsername(displayValue);
        usernameInput.placeholder = suggested || 'tu.usuario';
      }
    });
    
    // Generate final username when user finishes typing (blur event)
    displayNameInput.addEventListener('blur', async () => {
      const displayValue = displayNameInput.value.trim();
      
      // Only generate if username field is empty and display name has content
      if (!usernameInput.value.trim() && displayValue.length >= 2) {
        const generated = await generateUsername(displayValue);
        usernameInput.value = generated;
        usernameInput.dataset.autoGenerated = 'true';
        console.log('🎯 Username generado automáticamente:', generated);
      }
    });
    
    console.log('✅ Auto-username configurado correctamente');
  }
  
  async function generateUsername(displayName) {
    if (!displayName) return '';
    
    // Convert to lowercase
    let username = displayName.toLowerCase().trim();
    
    // Remove accents/diacritics
    username = username.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Replace spaces with dots (for multiple names)
    username = username.replace(/\s+/g, '.');
    
    // Remove special characters, keep only letters, numbers, dots and underscores
    username = username.replace(/[^a-z0-9._]/g, '');
    
    // Remove consecutive dots
    username = username.replace(/\.{2,}/g, '.');
    
    // Remove leading/trailing dots
    username = username.replace(/^\.+|\.+$/g, '');
    
    // Check if username already exists in pending registrations
    const pendingRegistros = await DataService.getPendingRegistros() || [];
    const approvedUsers = await DataService.getApprovedUsers() || [];
    const allUsers = [...pendingRegistros, ...approvedUsers];
    
    let finalUsername = username;
    let counter = 1;
    
    // Keep checking until we find a unique username
    while (allUsers.some(user => user.username === finalUsername)) {
      finalUsername = `${username}.${counter}`;
      counter++;
    }
    
    return finalUsername;
  }

  // Price validation - minimum $100.000 CLP
  function setupPriceValidation() {
    const priceHourInput = document.getElementById('priceHour');
    const priceWarning = document.getElementById('priceWarning');
    const MIN_PRICE = 100000;
    
    if (!priceHourInput || !priceWarning) return;
    
    priceHourInput.addEventListener('input', () => {
      const value = parseInt(priceHourInput.value) || 0;
      
      if (value > 0 && value < MIN_PRICE) {
        priceWarning.style.display = 'block';
        priceHourInput.style.borderColor = '#DC2626';
      } else {
        priceWarning.style.display = 'none';
        priceHourInput.style.borderColor = '';
      }
    });
    
    priceHourInput.addEventListener('blur', () => {
      const value = parseInt(priceHourInput.value) || 0;
      
      if (value > 0 && value < MIN_PRICE) {
        priceWarning.style.display = 'block';
        priceHourInput.style.borderColor = '#DC2626';
      }
    });
  }

  // Birthdate calculation - auto calculate age from birthdate
  function setupBirthdateCalculation() {
    const birthdateInput = document.getElementById('birthdate');
    const ageInput = document.getElementById('age');
    
    if (!birthdateInput || !ageInput) return;
    
    // Set max date to 18 years ago (minimum age requirement)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    birthdateInput.max = maxDate.toISOString().split('T')[0];
    
    // Set min date (e.g., 80 years ago for reasonable limit)
    const minDate = new Date(today.getFullYear() - 80, today.getMonth(), today.getDate());
    birthdateInput.min = minDate.toISOString().split('T')[0];
    
    birthdateInput.addEventListener('change', () => {
      const birthdate = new Date(birthdateInput.value);
      if (birthdateInput.value && !isNaN(birthdate)) {
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
          age--;
        }
        ageInput.value = age;
        
        if (age < 18) {
          birthdateInput.classList.add('error');
          ageInput.style.borderColor = '#DC2626';
        } else {
          birthdateInput.classList.remove('error');
          ageInput.style.borderColor = '#10B981';
        }
      } else {
        ageInput.value = '';
        ageInput.style.borderColor = '';
      }
    });
  }

  // Bio character counter
  function setupBioCounter() {
    const bio = document.getElementById('bio');
    const counter = document.getElementById('bioCount');
    
    if (bio && counter) {
      bio.addEventListener('input', () => {
        const length = bio.value.length;
        counter.textContent = length;
        
        if (length > 500) {
          bio.value = bio.value.substring(0, 500);
          counter.textContent = 500;
        }
        
        if (length > 450) {
          counter.style.color = '#EF4444';
        } else {
          counter.style.color = 'rgba(255, 255, 255, 0.5)';
        }
      });
    }
  }

  // File uploads
  function setupFileUploads() {
    // Document upload
    setupSingleUpload('docUploadZone', 'docUpload', 'docPreview');
    
    // Selfie upload
    setupSingleUpload('selfieUploadZone', 'selfieUpload', 'selfiePreview');
    
    // Photos upload (multiple) - with main photo selection - max 2 (verification photos)
    setupMultipleUpload('photosUploadZone', 'photosUpload', 'photosPreview', true, 2);
  }

  function setupSingleUpload(zoneId, inputId, previewId, isVideo = false) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!zone || !input) return;
    
    zone.addEventListener('click', (e) => {
      if (!e.target.closest('.upload-preview-grid') && !e.target.closest('.video-preview')) {
        input.click();
      }
    });
    
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      
      if (e.dataTransfer.files.length) {
        const file = e.dataTransfer.files[0];
        if (isVideo) {
          handleVideoPreview(file, preview);
        } else {
          input.files = e.dataTransfer.files;
          handleFilePreview(file, preview);
        }
      }
    });
    
    input.addEventListener('change', () => {
      if (input.files.length) {
        if (isVideo) {
          handleVideoPreview(input.files[0], preview);
        } else {
          handleFilePreview(input.files[0], preview);
        }
      }
    });
  }
  
  function handleVideoPreview(file, previewEl) {
    if (!file || !file.type.startsWith('video/')) {
      alert('Por favor selecciona un archivo de video válido (MP4, MOV)');
      return;
    }
    
    if (file.size > 50 * 1024 * 1024) {
      alert('El video no puede superar los 50MB');
      return;
    }
    
    previewEl.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'video-preview';
    div.innerHTML = `<span style="font-size: 32px;">🎬</span><small style="color: var(--gold); margin-top: 8px;">${file.name}</small><small style="color: var(--muted); font-size: 11px;">${(file.size / 1024 / 1024).toFixed(1)}MB</small>`;
    div.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(212,175,55,0.1); border-radius: 12px; padding: 20px; border: 1px solid rgba(212,175,55,0.3);';
    previewEl.appendChild(div);
  }


  function setupMultipleUpload(zoneId, inputId, previewId, isPhotos = false, maxFiles = 20) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    
    if (!zone || !input) return;
    
    // Inicializar array de archivos acumulados
    accumulatedFiles[inputId] = [];
    
    zone.addEventListener('click', (e) => {
      if (!e.target.closest('.upload-preview-grid') && !e.target.closest('.photo-preview-wrapper')) {
        input.click();
      }
    });
    
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });
    
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });
    
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      
      if (e.dataTransfer.files.length) {
        addFilesToAccumulated(inputId, e.dataTransfer.files, maxFiles);
        handleMultiplePreviewAccumulated(inputId, preview, isPhotos, maxFiles);
      }
    });
    
    input.addEventListener('change', () => {
      if (input.files.length) {
        addFilesToAccumulated(inputId, input.files, maxFiles);
        handleMultiplePreviewAccumulated(inputId, preview, isPhotos, maxFiles);
      }
    });
  }
  
  function addFilesToAccumulated(inputId, newFiles, maxFiles) {
    const currentFiles = accumulatedFiles[inputId] || [];
    const newFilesArray = Array.from(newFiles);
    
    // Agregar solo hasta el máximo permitido
    for (const file of newFilesArray) {
      if (currentFiles.length >= maxFiles) {
        alert(`Solo puedes subir un máximo de ${maxFiles} fotos.`);
        break;
      }
      // Evitar duplicados por nombre
      if (!currentFiles.some(f => f.name === file.name && f.size === file.size)) {
        currentFiles.push(file);
      }
    }
    
    accumulatedFiles[inputId] = currentFiles;
  }
  
  function removeFromAccumulated(inputId, index, previewId, isPhotos, maxFiles) {
    accumulatedFiles[inputId].splice(index, 1);
    const preview = document.getElementById(previewId);
    handleMultiplePreviewAccumulated(inputId, preview, isPhotos, maxFiles);
  }



  function handleFilePreview(file, previewEl) {
    if (!file) return;
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewEl.innerHTML = `<img src="${e.target.result}" alt="Preview" />`;
        previewEl.querySelector('img').style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      previewEl.innerHTML = `<p style="color: #D4AF37;">📄 ${file.name}</p>`;
    }
  }

  function handleMultiplePreviewAccumulated(inputId, previewEl, isPhotos = false, maxFiles = 20) {
    previewEl.innerHTML = '';
    const mainPhotoIndexInput = document.getElementById('mainPhotoIndex');
    const mainPhotoInfo = document.getElementById('mainPhotoInfo');
    const photosCountEl = document.getElementById('photosCount');
    
    const files = accumulatedFiles[inputId] || [];
    
    // Update counter
    if (isPhotos && photosCountEl) {
      photosCountEl.textContent = files.length;
      const counter = photosCountEl.parentElement;
      if (files.length === 2) {
        counter.style.color = '#10B981';
      } else if (files.length > 0) {
        counter.style.color = '#F59E0B';
      } else {
        counter.style.color = 'var(--muted)';
      }
    }
    
    // Show info about selecting main photo
    if (isPhotos && mainPhotoInfo && files.length > 0) {
      mainPhotoInfo.style.display = 'block';
    } else if (mainPhotoInfo) {
      mainPhotoInfo.style.display = 'none';
    }
    
    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const wrapper = document.createElement('div');
          wrapper.className = 'photo-preview-wrapper';
          wrapper.dataset.index = index;
          wrapper.style.cssText = 'position: relative; cursor: pointer; border-radius: 8px; overflow: hidden; transition: all 200ms ease;';
          
          const img = document.createElement('img');
          img.src = e.target.result;
          img.alt = 'Preview';
          img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
          
          if (isPhotos) {
            // Main photo badge
            const badge = document.createElement('div');
            badge.className = 'main-photo-badge';
            badge.style.cssText = 'position: absolute; top: 4px; left: 4px; background: #10B981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; display: ' + (index === 0 ? 'block' : 'none') + ';';
            badge.textContent = '⭐ PRINCIPAL';
            
            // Delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'photo-delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.style.cssText = 'position: absolute; top: 4px; right: 4px; background: rgba(220,38,38,0.9); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 10;';
            deleteBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              removeFromAccumulated(inputId, index, previewEl.id, isPhotos, maxFiles);
            });
            
            wrapper.appendChild(img);
            wrapper.appendChild(badge);
            wrapper.appendChild(deleteBtn);
            
            // Add border to first image (main by default)
            if (index === 0) {
              wrapper.style.border = '3px solid #10B981';
              wrapper.style.boxShadow = '0 0 10px rgba(16,185,129,0.5)';
            }
            
            // Click handler for selecting main photo
            wrapper.addEventListener('click', (e) => {
              if (e.target.classList.contains('photo-delete-btn')) return;
              
              // Remove selection from all
              previewEl.querySelectorAll('.photo-preview-wrapper').forEach(w => {
                w.style.border = 'none';
                w.style.boxShadow = 'none';
                const badgeEl = w.querySelector('.main-photo-badge');
                if (badgeEl) badgeEl.style.display = 'none';
              });
              
              // Add selection to clicked
              wrapper.style.border = '3px solid #10B981';
              wrapper.style.boxShadow = '0 0 10px rgba(16,185,129,0.5)';
              wrapper.querySelector('.main-photo-badge').style.display = 'block';
              
              // Update hidden input
              if (mainPhotoIndexInput) {
                mainPhotoIndexInput.value = index;
              }
            });
          } else {
            wrapper.appendChild(img);
          }
          
          previewEl.appendChild(wrapper);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const div = document.createElement('div');
        div.className = 'video-preview';
        div.innerHTML = `<span>🎬</span><small>${file.name}</small>`;
        div.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(212,175,55,0.1); border-radius: 8px; padding: 10px;';
        previewEl.appendChild(div);
      }
    });
  }

  // Load plans from config (set by admin)
  async function loadPlansFromStorage() {
    const stored = await DataService.getConfig('luxuryPlans');
    console.log('📋 Registro - Cargando planes desde config:', stored ? 'encontrado' : 'no encontrado');
    
    if (!stored) {
      // Si no hay planes configurados, inicializar con valores básicos
      console.log('🔧 Registro - Inicializando planes básicos...');
      const basicPlans = {
        vip: {
          name: 'VIP Black',
          prices: { 7: 19990, 15: 34990, 30: 49990 },
          features: ['Perfil verificado', 'Badge VIP exclusivo', 'Hasta 10 fotos', '2 videos'],
          active: true
        },
        premium: {
          name: 'Premium Select',
          prices: { 7: 29990, 15: 54990, 30: 79990 },
          features: ['Todo lo de VIP', 'Badge Premium dorado', 'Hasta 15 fotos', '4 videos'],
          active: true,
          featured: true
        },
        luxury: {
          name: 'Luxury & Exclusive',
          prices: { 7: 59990, 15: 99990, 30: 149990 },
          features: ['Todo lo de Premium', 'Badge Luxury diamante', 'Fotos ilimitadas', 'Videos ilimitados'],
          active: true
        }
      };
      
      try {
        await DataService.setConfig('luxuryPlans', basicPlans);
        console.log('✅ Registro - Planes básicos inicializados');
        updatePlanCards(basicPlans);
      } catch (error) {
        console.error('❌ Error inicializando planes:', error);
        // Continue with HTML defaults if AWS fails
      }
      return; 
    }
    
    const plans = stored;
    console.log('📋 Registro - Planes cargados:', plans);
    updatePlanCards(plans);
  }
  
  function updatePlanCards(plans) {
    // Update VIP plan
    updatePlanCard('vip', plans.vip);
    
    // Update Premium plan
    updatePlanCard('premium', plans.premium);
    
    // Update Luxury plan
    updatePlanCard('luxury', plans.luxury);
  }
  
  function updatePlanCard(planId, planData) {
    const card = document.querySelector(`.plan-card[data-plan="${planId}"]`);
    if (!card || !planData) return;
    
    console.log(`📋 Actualizando plan ${planId}:`, planData);
    
    // Hide card if plan is not active
    if (!planData.active) {
      card.style.display = 'none';
      return;
    }
    
    card.style.display = '';
    
    // Update price (use 30 days as default display)
    const priceEl = card.querySelector('.price-amount');
    if (priceEl) {
      const price = planData.prices ? planData.prices[30] : planData.price;
      const formattedPrice = price >= 1000 
        ? `$${price.toLocaleString('es-CL')}`
        : `$${price}`;
      priceEl.textContent = formattedPrice;
    }
    
    // Update features
    const featuresList = card.querySelector(`.plan-features[data-plan="${planId}"]`);
    console.log(`📋 Features list para ${planId}:`, featuresList, 'Features data:', planData.features);
    if (featuresList && planData.features) {
      featuresList.innerHTML = planData.features.map(f => `<li>✓ ${f}</li>`).join('');
      console.log(`✅ Features actualizadas para ${planId}`);
    }
    
    // Handle Premium "featured" badge
    if (planId === 'premium') {
      const popularBadge = card.querySelector('.plan-popular');
      if (popularBadge) {
        popularBadge.style.display = planData.featured ? '' : 'none';
      }
    }
    
    // Handle Luxury "limited" badge
    if (planId === 'luxury') {
      const limitedBadge = card.querySelector('.plan-limited');
      if (limitedBadge) {
        limitedBadge.style.display = planData.limited ? '' : 'none';
      }
    }
  }
  
  // Setup duration selector buttons
  function setupDurationSelectors() {
    const durationBtns = document.querySelectorAll('.duration-btn');
    const selectedDurationInput = document.getElementById('selectedDuration');
    
    durationBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const planId = btn.dataset.plan;
        const days = parseInt(btn.dataset.days);
        
        // Update active state for this plan's duration buttons
        const planCard = btn.closest('.plan-card');
        planCard.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Update price display for this plan
        updatePlanPriceDisplay(planId, days);
        
        // If this plan is selected, update the amount to transfer
        const selectedPlan = document.getElementById('selectedPlan').value;
        if (selectedPlan === planId) {
          selectedDurationInput.value = days;
          updateAmountToTransfer(planId, days);
        }
      });
    });
  }
  
  // Update price display when duration changes
  async function updatePlanPriceDisplay(planId, days) {
    const plans = await DataService.getConfig('luxuryPlans') || {};
    const planData = plans[planId];
    
    // Default prices if no admin config
    const defaultPrices = {
      vip: { 7: 19990, 15: 34990, 30: 49990 },
      premium: { 7: 29990, 15: 54990, 30: 79990 },
      luxury: { 7: 59990, 15: 99990, 30: 149990 }
    };
    
    let price;
    if (planData && planData.prices && planData.prices[days]) {
      price = planData.prices[days];
    } else if (defaultPrices[planId]) {
      price = defaultPrices[planId][days];
    } else {
      price = 0;
    }
    
    // Update price display
    const priceEl = document.querySelector(`.price-amount[data-plan="${planId}"]`);
    const periodEl = document.querySelector(`.price-period[data-plan="${planId}"]`);
    
    if (priceEl) {
      priceEl.textContent = `$${price.toLocaleString('es-CL')}`;
    }
    if (periodEl) {
      periodEl.textContent = `/${days} días`;
    }
  }

  // Apply plan restrictions based on hourly rate
  async function applyPlanRestrictions() {
    const priceHour = parseInt(document.getElementById('priceHour')?.value) || 0;
    const planCards = document.querySelectorAll('.plan-card');
    const restrictionMessage = document.getElementById('planRestrictionMessage');
    const restrictionText = document.getElementById('planRestrictionText');
    
    // Reset all plans to visible and enabled
    planCards.forEach(card => {
      card.style.display = '';
      card.style.opacity = '1';
      card.style.pointerEvents = 'auto';
      card.classList.remove('plan-disabled');
      // Remove any disabled overlays
      const overlay = card.querySelector('.plan-disabled-overlay');
      if (overlay) overlay.remove();
    });
    
    const vipCard = document.querySelector('.plan-card[data-plan="vip"]');
    const premiumCard = document.querySelector('.plan-card[data-plan="premium"]');
    const luxuryCard = document.querySelector('.plan-card[data-plan="luxury"]');
    
    // Get plan restrictions from config (configured by admin)
    const plans = await DataService.getConfig('luxuryPlans') || {};
    const vipTarifaMin = plans.vip?.tarifaMin || 100000;
    const vipTarifaMax = plans.vip?.tarifaMax || 199999;
    const premiumTarifaMin = plans.premium?.tarifaMin || 200000;
    const premiumTarifaMax = plans.premium?.tarifaMax || 999999999;
    
    // Check if tariff is in VIP range (but not Premium range)
    const canSelectVip = priceHour >= vipTarifaMin && priceHour <= vipTarifaMax;
    // Check if tariff is in Premium range
    const canSelectPremium = priceHour >= premiumTarifaMin && priceHour <= premiumTarifaMax;
    // Luxury is always available for all tariffs >= 100000
    const canSelectLuxury = priceHour >= 100000;
    
    // Apply restrictions based on price
    if (priceHour >= 100000 && !canSelectPremium && canSelectVip) {
      // Solo VIP Black o Luxury (Premium bloqueado)
      if (premiumCard) {
        premiumCard.style.opacity = '0.4';
        premiumCard.style.pointerEvents = 'none';
        premiumCard.classList.add('plan-disabled');
        // Add disabled overlay
        if (!premiumCard.querySelector('.plan-disabled-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'plan-disabled-overlay';
          overlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; border-radius: 16px; z-index: 10;';
          overlay.innerHTML = '<span style="color: #F87171; font-weight: 600; text-align: center; padding: 20px;">❌ No disponible para tu tarifa</span>';
          premiumCard.style.position = 'relative';
          premiumCard.appendChild(overlay);
        }
      }
      
      if (restrictionMessage && restrictionText) {
        restrictionMessage.style.display = 'block';
        restrictionText.innerHTML = ' Con una tarifa de <strong>$' + priceHour.toLocaleString('es-CL') + '/hora</strong>, puedes elegir entre <strong>VIP Black</strong> o <strong>Luxury & Exclusive</strong>.';
      }
      
    } else if (priceHour >= premiumTarifaMin && canSelectPremium) {
      // Solo Premium Select o Luxury (VIP bloqueado)
      if (vipCard) {
        vipCard.style.opacity = '0.4';
        vipCard.style.pointerEvents = 'none';
        vipCard.classList.add('plan-disabled');
        // Add disabled overlay
        if (!vipCard.querySelector('.plan-disabled-overlay')) {
          const overlay = document.createElement('div');
          overlay.className = 'plan-disabled-overlay';
          overlay.style.cssText = 'position: absolute; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; border-radius: 16px; z-index: 10;';
          overlay.innerHTML = '<span style="color: #F87171; font-weight: 600; text-align: center; padding: 20px;">❌ No disponible para tu tarifa</span>';
          vipCard.style.position = 'relative';
          vipCard.appendChild(overlay);
        }
      }
      
      if (restrictionMessage && restrictionText) {
        restrictionMessage.style.display = 'block';
        restrictionText.innerHTML = ' Con una tarifa de <strong>$' + priceHour.toLocaleString('es-CL') + '/hora</strong> o superior, puedes elegir entre <strong>Premium Select</strong> o <strong>Luxury & Exclusive</strong>.';
      }
      
    } else {
      // No restrictions or price below minimum
      if (restrictionMessage) {
        restrictionMessage.style.display = 'none';
      }
    }
  }

  // Plan selection
  function setupPlanSelection() {
    // First, load any custom plans from admin
    loadPlansFromStorage();
    
    // Setup duration selectors
    setupDurationSelectors();
    
    // Load payment options and bank data
    loadPaymentConfig();
    
    const planCards = document.querySelectorAll('.plan-card');
    const planButtons = document.querySelectorAll('.plan-select-btn');
    const selectedPlanInput = document.getElementById('selectedPlan');
    
    planCards.forEach(card => {
      card.addEventListener('click', () => {
        // Check if plan is disabled
        if (card.classList.contains('plan-disabled')) {
          return;
        }
        selectPlan(card.dataset.plan);
      });
    });
    
    planButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Check if parent plan card is disabled
        const parentCard = btn.closest('.plan-card');
        if (parentCard && parentCard.classList.contains('plan-disabled')) {
          return;
        }
        selectPlan(btn.dataset.plan);
      });
    });
    
    function selectPlan(plan) {
      // Double check plan is not disabled
      const selectedCard = document.querySelector(`.plan-card[data-plan="${plan}"]`);
      if (selectedCard && selectedCard.classList.contains('plan-disabled')) {
        return;
      }
      
      planCards.forEach(c => c.classList.remove('selected'));
      if (selectedCard) {
        selectedCard.classList.add('selected');
        selectedPlanInput.value = plan;
        
        // Get selected duration for this plan
        const activeDurationBtn = selectedCard.querySelector('.duration-btn.active');
        const duration = activeDurationBtn ? parseInt(activeDurationBtn.dataset.days) : 30;
        document.getElementById('selectedDuration').value = duration;
        
        // Update button text
        planButtons.forEach(btn => {
          if (btn.dataset.plan === plan) {
            btn.textContent = '✓ Seleccionado';
          } else {
            const planName = btn.dataset.plan.charAt(0).toUpperCase() + btn.dataset.plan.slice(1);
            btn.textContent = `Seleccionar ${planName}`;
          }
        });
        
        // Show payment section
        showPaymentSection(plan);
        
        // Reset discount when plan changes
        resetDiscount();
        
        // Update amount to transfer with duration
        updateAmountToTransfer(plan, duration);
      }
    }
    
    // Setup discount code functionality
    setupDiscountCode();
    
    // Setup transfer upload
    setupTransferUpload();
    
    // Setup pay later checkbox
    setupPayLaterCheckbox();
    
    // Setup interview date minimum
    setupInterviewDate();
  }
  
  // Load payment configuration from config
  async function loadPaymentConfig() {
    // Load bank data
    const bankData = await DataService.getConfig('luxuryBankData');
    if (bankData) {
      const bankNameEl = document.getElementById('bankName');
      const accountTypeEl = document.getElementById('accountType');
      const accountNumberEl = document.getElementById('accountNumber');
      const accountRutEl = document.getElementById('accountRut');
      const accountHolderEl = document.getElementById('accountHolder');
      const accountEmailEl = document.getElementById('accountEmail');
      
      if (bankNameEl) bankNameEl.textContent = bankData.bankName;
      if (accountTypeEl) accountTypeEl.textContent = bankData.accountType;
      if (accountNumberEl) accountNumberEl.textContent = bankData.accountNumber;
      if (accountRutEl) accountRutEl.textContent = bankData.rut;
      if (accountHolderEl) accountHolderEl.textContent = bankData.holder;
      if (accountEmailEl) accountEmailEl.textContent = bankData.email;
    }
    
    // Load payment options
    const options = await DataService.getConfig('luxuryPaymentOptions');
    if (options) {
      
      // Show/hide pay later option
      const payLaterOption = document.getElementById('payLaterOption');
      if (payLaterOption) {
        payLaterOption.style.display = options.allowPayLater ? 'block' : 'none';
      }
      
      // Show/hide interview section based on option
      const interviewSection = document.querySelector('.interview-section');
      if (interviewSection && !options.requireInterview) {
        interviewSection.style.display = 'none';
        // Remove required from interview fields
        const dateEl = document.getElementById('interviewDate');
        const timeEl = document.getElementById('interviewTime');
        if (dateEl) dateEl.required = false;
        if (timeEl) timeEl.required = false;
      }
    }
  }
  
  // Show payment section when plan is selected
  function showPaymentSection(plan) {
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
      paymentSection.style.display = 'block';
      
      // Load bank data and payment options
      loadPaymentConfig();
      
      // Load interview times when showing payment section
      loadInterviewTimes();
      
      // Smooth scroll to payment section
      setTimeout(() => {
        paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }
  
  // Load interview times from admin configuration
  async function loadInterviewTimes() {
    const timeSelect = document.getElementById('interviewTime');
    if (!timeSelect) return;
    
    // Clear existing options (except first)
    timeSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    const schedule = await DataService.getConfig('luxuryInterviewSchedule');
    let times = [];
    
    if (schedule) {
      times = schedule.times || [];
    } else {
      // Default times if no configuration
      times = [
        { value: '10:00', label: '10:00 AM' },
        { value: '10:30', label: '10:30 AM' },
        { value: '11:00', label: '11:00 AM' },
        { value: '11:30', label: '11:30 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '14:00', label: '02:00 PM' },
        { value: '14:30', label: '02:30 PM' },
        { value: '15:00', label: '03:00 PM' },
        { value: '15:30', label: '03:30 PM' },
        { value: '16:00', label: '04:00 PM' },
        { value: '16:30', label: '04:30 PM' },
        { value: '17:00', label: '05:00 PM' },
        { value: '17:30', label: '05:30 PM' },
        { value: '18:00', label: '06:00 PM' },
        { value: '18:30', label: '06:30 PM' },
        { value: '19:00', label: '07:00 PM' },
        { value: '19:30', label: '07:30 PM' },
        { value: '20:00', label: '08:00 PM' }
      ];
    }
    
    times.forEach(time => {
      const option = document.createElement('option');
      option.value = time.value;
      option.textContent = time.label;
      timeSelect.appendChild(option);
    });
  }
  
  // Update amount to transfer based on selected plan and duration
  async function updateAmountToTransfer(plan, duration = 30) {
    const amountEl = document.getElementById('amountToTransfer');
    if (!amountEl) return;
    
    // Default prices by duration
    const defaultPrices = {
      vip: { 7: 19990, 15: 34990, 30: 49990 },
      premium: { 7: 29990, 15: 54990, 30: 79990 },
      luxury: { 7: 59990, 15: 99990, 30: 149990 }
    };
    
    const plans = await DataService.getConfig('luxuryPlans') || {};
    const planData = plans[plan];
    
    let price;
    
    // Try to get price from admin config
    if (planData && planData.prices && planData.prices[duration]) {
      price = planData.prices[duration];
    } else if (defaultPrices[plan] && defaultPrices[plan][duration]) {
      price = defaultPrices[plan][duration];
    } else {
      price = 0;
    }
    
    amountEl.textContent = `$${price.toLocaleString('es-CL')}`;
    amountEl.dataset.originalPrice = price;
    amountEl.dataset.duration = duration;
    
    // Also update the finalPrice hidden input
    const finalPriceInput = document.getElementById('finalPrice');
    if (finalPriceInput) {
      finalPriceInput.value = price;
    }
  }
  
  // Setup transfer receipt upload
  function setupTransferUpload() {
    const uploadZone = document.getElementById('transferUploadZone');
    const fileInput = document.getElementById('transferReceipt');
    
    if (!uploadZone || !fileInput) return;
    
    uploadZone.addEventListener('click', () => fileInput.click());
    
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '#D4AF37';
      uploadZone.style.background = 'rgba(212,175,55,0.1)';
    });
    
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.style.borderColor = 'rgba(212,175,55,0.3)';
      uploadZone.style.background = 'transparent';
    });
    
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = 'rgba(212,175,55,0.3)';
      uploadZone.style.background = 'transparent';
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleTransferFile(files[0]);
      }
    });
    
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleTransferFile(fileInput.files[0]);
      }
    });
  }
  
  function handleTransferFile(file) {
    const uploadZone = document.getElementById('transferUploadZone');
    const placeholder = uploadZone.querySelector('.upload-placeholder');
    const preview = uploadZone.querySelector('.upload-preview');
    const fileName = document.getElementById('transferFileName');
    
    // Validate file
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor sube un archivo PNG, JPG o PDF');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      alert('El archivo no debe superar los 5MB');
      return;
    }
    
    // Show preview
    placeholder.style.display = 'none';
    preview.style.display = 'block';
    fileName.textContent = file.name;
    
    uploadZone.style.borderColor = '#10B981';
    uploadZone.style.background = 'rgba(16,185,129,0.1)';
  }
  
  // Setup pay later checkbox
  function setupPayLaterCheckbox() {
    const payLaterCheckbox = document.getElementById('payAfterInterview');
    const transferSection = document.querySelector('.transfer-section');
    const transferUploadZone = document.getElementById('transferUploadZone');
    
    if (!payLaterCheckbox) return;
    
    payLaterCheckbox.addEventListener('change', async () => {
      if (payLaterCheckbox.checked) {
        // Hide transfer upload requirement
        if (transferUploadZone) {
          transferUploadZone.style.opacity = '0.5';
          transferUploadZone.style.pointerEvents = 'none';
        }
        // Update transfer section appearance
        const receiptInput = document.getElementById('transferReceipt');
        if (receiptInput) receiptInput.required = false;
      } else {
        // Show transfer upload requirement
        if (transferUploadZone) {
          transferUploadZone.style.opacity = '1';
          transferUploadZone.style.pointerEvents = 'auto';
        }
        // Check if receipt is required
        const options = await DataService.getConfig('luxuryPaymentOptions');
        if (options) {
          const receiptInput = document.getElementById('transferReceipt');
          if (receiptInput && options.requireTransferReceipt) {
            receiptInput.required = true;
          }
        }
      }
    });
  }
  
  // Setup interview date with minimum date (tomorrow) and load time slots
  function setupInterviewDate() {
    const dateInput = document.getElementById('interviewDate');
    const timeSelect = document.getElementById('interviewTime');
    
    if (!dateInput) return;
    
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    dateInput.min = minDate;
    
    // Set maximum date to 30 days from now
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    dateInput.max = maxDate.toISOString().split('T')[0];
    
    // Load interview time slots from admin configuration
    loadInterviewTimeSlots(timeSelect);
  }
  
  // Load interview time slots from config (set by admin)
  async function loadInterviewTimeSlots(timeSelect) {
    if (!timeSelect) return;
    
    const schedule = await DataService.getConfig('luxuryInterviewSchedule');
    let times = [];
    
    if (schedule) {
      times = schedule.times || [];
    } else {
      // Default times if no admin configuration
      times = [
        { value: '10:00', label: '10:00 AM' },
        { value: '10:30', label: '10:30 AM' },
        { value: '11:00', label: '11:00 AM' },
        { value: '11:30', label: '11:30 AM' },
        { value: '12:00', label: '12:00 PM' },
        { value: '14:00', label: '02:00 PM' },
        { value: '14:30', label: '02:30 PM' },
        { value: '15:00', label: '03:00 PM' },
        { value: '15:30', label: '03:30 PM' },
        { value: '16:00', label: '04:00 PM' },
        { value: '16:30', label: '04:30 PM' },
        { value: '17:00', label: '05:00 PM' },
        { value: '17:30', label: '05:30 PM' },
        { value: '18:00', label: '06:00 PM' },
        { value: '18:30', label: '06:30 PM' },
        { value: '19:00', label: '07:00 PM' },
        { value: '19:30', label: '07:30 PM' },
        { value: '20:00', label: '08:00 PM' }
      ];
    }
    
    // Clear existing options except first one
    timeSelect.innerHTML = '<option value="">Selecciona una hora</option>';
    
    // Add time options
    times.forEach(time => {
      const option = document.createElement('option');
      option.value = time.value;
      option.textContent = time.label;
      timeSelect.appendChild(option);
    });
  }
  
  // Discount code functionality
  function setupDiscountCode() {
    const applyBtn = document.getElementById('applyDiscountBtn');
    const codeInput = document.getElementById('discountCode');
    
    if (applyBtn && codeInput) {
      applyBtn.addEventListener('click', applyDiscountCode);
      
      codeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          applyDiscountCode();
        }
      });
    }
  }
  
  async function applyDiscountCode() {
    const codeInput = document.getElementById('discountCode');
    const messageEl = document.getElementById('discountMessage');
    const appliedDiscountInput = document.getElementById('appliedDiscount');
    const finalPriceInput = document.getElementById('finalPrice');
    const selectedPlanInput = document.getElementById('selectedPlan');
    
    const code = codeInput.value.trim().toUpperCase();
    const selectedPlan = selectedPlanInput.value;
    
    if (!code) {
      showDiscountMessage('Por favor ingresa un código', 'error');
      return;
    }
    
    if (!selectedPlan) {
      showDiscountMessage('Primero selecciona un plan', 'error');
      return;
    }
    
    // Load discount codes from config
    const codes = await DataService.getConfig('luxuryDiscountCodes');
    if (!codes) {
      showDiscountMessage('Código inválido', 'error');
      return;
    }
    
    const discountCode = codes.find(c => c.code === code && c.active);
    
    if (!discountCode) {
      showDiscountMessage('Código inválido o inactivo', 'error');
      return;
    }
    
    // Check if expired
    if (discountCode.expiry && new Date(discountCode.expiry) < new Date()) {
      showDiscountMessage('Este código ha expirado', 'error');
      return;
    }
    
    // Check max uses
    if (discountCode.maxUses > 0 && (discountCode.usedCount || 0) >= discountCode.maxUses) {
      showDiscountMessage('Este código ya no tiene usos disponibles', 'error');
      return;
    }
    
    // Check if applies to selected plan
    if (discountCode.plans !== 'all' && discountCode.plans !== selectedPlan) {
      showDiscountMessage(`Este código solo aplica al plan ${discountCode.plans.toUpperCase()}`, 'error');
      return;
    }
    
    // Get plan price según la duración seleccionada
    const selectedDurationInput = document.getElementById('selectedDuration');
    const selectedDuration = selectedDurationInput ? parseInt(selectedDurationInput.value) : 30;

    // IMPORTANTE: Obtener la duración del botón activo del plan seleccionado como respaldo
    const selectedCard = document.querySelector(`.plan-card[data-plan="${selectedPlan}"]`);
    const activeDurationBtn = selectedCard ? selectedCard.querySelector('.duration-btn.active') : null;
    const actualDuration = activeDurationBtn ? parseInt(activeDurationBtn.dataset.days) : selectedDuration;

    console.log('🎯 Aplicando cupón:', {
      selectedPlan,
      selectedDurationFromInput: selectedDuration,
      actualDurationFromButton: actualDuration,
      finalDuration: actualDuration
    });

    const plans = await DataService.getConfig('luxuryPlans') || {};
    const planData = plans[selectedPlan];

    // Default prices by duration (fallback si no hay config de admin)
    const defaultPrices = {
      vip: { 7: 19990, 15: 34990, 30: 49990 },
      premium: { 7: 29990, 15: 54990, 30: 79990 },
      luxury: { 7: 59990, 15: 99990, 30: 149990 }
    };

    let originalPrice;

    // Intentar obtener el precio de la configuración del admin usando la duración real del botón activo
    if (planData && planData.prices && planData.prices[actualDuration]) {
      originalPrice = planData.prices[actualDuration];
      console.log(`✅ Usando precio de admin: ${originalPrice} para ${actualDuration} días`);
    } else if (defaultPrices[selectedPlan] && defaultPrices[selectedPlan][actualDuration]) {
      // Usar precio por defecto si no hay config de admin
      originalPrice = defaultPrices[selectedPlan][actualDuration];
      console.log(`✅ Usando precio por defecto: ${originalPrice} para ${actualDuration} días`);
    } else {
      console.error('❌ No se encontró precio para:', { selectedPlan, actualDuration, planData, defaultPrices: defaultPrices[selectedPlan] });
      showDiscountMessage('Error al obtener precio del plan', 'error');
      return;
    }

    // Actualizar el campo selectedDuration con el valor real
    if (selectedDurationInput) {
      selectedDurationInput.value = actualDuration;
    }

    const discountValue = discountCode.value;
    const finalPrice = Math.round(originalPrice * (1 - discountValue / 100));
    
    // Save applied discount
    appliedDiscountInput.value = JSON.stringify({
      code: discountCode.code,
      codeId: discountCode.id,
      discountPercent: discountValue,
      originalPrice: originalPrice,
      finalPrice: finalPrice
    });
    finalPriceInput.value = finalPrice;
    
    // Update amount to transfer display
    const amountEl = document.getElementById('amountToTransfer');
    if (amountEl) {
      if (discountValue === 100) {
        amountEl.textContent = '$0 (GRATIS)';
        amountEl.style.color = '#10B981';
      } else {
        amountEl.innerHTML = `<s style="color: var(--muted); font-size: 14px;">$${originalPrice.toLocaleString('es-CL')}</s> $${finalPrice.toLocaleString('es-CL')}`;
      }
    }
    
    // Show success message
    if (discountValue === 100) {
      showDiscountMessage(`✓ ¡Código aplicado! Tu plan ${selectedPlan.toUpperCase()} será <strong>GRATIS</strong>`, 'success');
    } else {
      const savings = originalPrice - finalPrice;
      showDiscountMessage(`✓ ¡${discountValue}% de descuento aplicado! Precio final: <strong>$${finalPrice.toLocaleString('es-CL')}</strong> (Ahorras $${savings.toLocaleString('es-CL')})`, 'success');
    }
    
    // Update UI to show discount applied
    codeInput.disabled = true;
    const applyBtn = document.getElementById('applyDiscountBtn');
    applyBtn.textContent = '✓ Aplicado';
    applyBtn.disabled = true;
    applyBtn.style.background = 'rgba(16,185,129,0.2)';
    applyBtn.style.color = '#10B981';
    applyBtn.style.borderColor = '#10B981';
  }
  
  function resetDiscount() {
    const codeInput = document.getElementById('discountCode');
    const messageEl = document.getElementById('discountMessage');
    const appliedDiscountInput = document.getElementById('appliedDiscount');
    const finalPriceInput = document.getElementById('finalPrice');
    const applyBtn = document.getElementById('applyDiscountBtn');
    
    if (codeInput) {
      codeInput.value = '';
      codeInput.disabled = false;
    }
    if (messageEl) {
      messageEl.style.display = 'none';
    }
    if (appliedDiscountInput) {
      appliedDiscountInput.value = '';
    }
    if (finalPriceInput) {
      finalPriceInput.value = '';
    }
    if (applyBtn) {
      applyBtn.textContent = 'Aplicar código';
      applyBtn.disabled = false;
      applyBtn.style.background = 'rgba(212,175,55,0.2)';
      applyBtn.style.color = '#D4AF37';
      applyBtn.style.borderColor = '#D4AF37';
    }
  }
  
  function showDiscountMessage(text, type) {
    const messageEl = document.getElementById('discountMessage');
    if (messageEl) {
      messageEl.innerHTML = text;
      messageEl.style.display = 'block';
      messageEl.style.padding = '12px 16px';
      messageEl.style.borderRadius = '8px';
      messageEl.style.fontWeight = '500';
      
      if (type === 'success') {
        messageEl.style.background = 'rgba(16,185,129,0.15)';
        messageEl.style.color = '#10B981';
        messageEl.style.border = '1px solid rgba(16,185,129,0.3)';
      } else {
        messageEl.style.background = 'rgba(220,38,38,0.15)';
        messageEl.style.color = '#DC2626';
        messageEl.style.border = '1px solid rgba(220,38,38,0.3)';
      }
    }
  }

  // Success message
  function showSuccessMessage() {
    const container = document.querySelector('.registro-container');
    container.innerHTML = `
      <div class="success-message" style="text-align: center; padding: 80px 40px;">
        <div style="font-size: 80px; margin-bottom: 24px;">⏳</div>
        <h2 style="font-family: 'Playfair Display', serif; font-size: 36px; color: #fff; margin-bottom: 16px;">
          ¡Registro Recibido!
        </h2>
        <p style="color: rgba(255,255,255,0.7); font-size: 18px; margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">
          Tu solicitud ha sido enviada exitosamente y está pendiente de aprobación por nuestro equipo.
        </p>
        <div style="background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.4); border-radius: 12px; padding: 20px; max-width: 450px; margin: 0 auto 24px;">
          <p style="color: #8B5CF6; margin: 0; font-size: 15px; line-height: 1.5;">
            📅 <strong>Próximo paso:</strong> Tu entrevista está agendada.<br>
            Te contactaremos por WhatsApp para confirmar los detalles.
          </p>
        </div>
        <div style="background: rgba(212,175,55,0.1); border: 1px solid rgba(212,175,55,0.3); border-radius: 12px; padding: 20px; max-width: 450px; margin: 0 auto 32px;">
          <p style="color: #D4AF37; margin: 0; font-size: 14px;">
            ✨ Una vez aprobado tu perfil, recibirás acceso a tu panel de control donde podrás subir fotos, videos y gestionar tu perfil completo.
          </p>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
          <a href="home" class="btn cta-gold" style="display: inline-block; padding: 16px 40px; font-size: 16px; text-decoration: none;">
            Volver al Inicio
          </a>
        </div>
      </div>
    `;
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Add error styles
  const style = document.createElement('style');
  style.textContent = `
    .form-group input.error,
    .form-group select.error,
    .form-group textarea.error {
      border-color: #EF4444 !important;
      background: rgba(239, 68, 68, 0.05) !important;
    }
    .checkbox-legal.error {
      border-color: #EF4444 !important;
      background: rgba(239, 68, 68, 0.05) !important;
    }
  `;
  document.head.appendChild(style);
});
