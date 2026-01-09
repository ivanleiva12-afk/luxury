# Sistema de Stories (Historias) - Documentación

## Resumen
Se ha implementado un sistema completo de Stories tipo Instagram que se posiciona entre la sección del Hero y el Grid de Experiencias Premium.

## Componentes Implementados

### 1. **Carrusel de Stories** (Línea 140-147 en index.html)
- Ubicación: Entre Hero Section y Grid de Publicaciones
- Espaciado: 60px top, 48px bottom (desktop); 40px top, 32px bottom (móvil)
- Título: "Historias" con tipografía Playfair Display semibold 20px
- Scroll horizontal suave con overflow-x auto
- Scrollbar oculto con CSS

### 2. **Story Circles** - Elementos Visuales
```
Desktop: 90px diámetro
Móvil: 75px diámetro
Espaciado entre circles: 20px (desktop), 12px (móvil)
```

**Estructura de cada Circle:**
- Anillo dorado con gradiente: `linear-gradient(45deg, #D4AF37, #F4D03F, #D4AF37)`
- Border: 3px solid con border-image
- Imagen de perfil centrada (78px desktop / 63px móvil)
- Nombre de usuario debajo
- Animación pulsante sutil (storyPulse 2s)

**Estados:**
- **Sin ver:** Anillo dorado brillante con animación de pulso
- **Visto:** Anillo gris (#666666), imagen con opacidad 0.6, sin animaciones
- **Hover (Desktop):** translateY(-4px) con box-shadow

### 3. **Modal Visor de Stories** (Línea 149-174 en index.html)
**Estructura:**
- Position: fixed, z-index: 10000
- Full-screen overlay negro (#000000)
- Contenedor centrado: 400px × 700px (desktop), 100vw × 100vh (móvil)

#### 3.1 Header (Top)
- Barra de progreso con segmentos por historia
- Avatar pequeño (36px), nombre y tiempo de publicación
- Botón cerrar (X) en esquina superior derecha

#### 3.2 Content (Centro)
- Soporte para imágenes y videos
- Object-fit: contain para mantener proporción
- Fondo negro

#### 3.3 Botón "Contáctame"
- Posicionado en bottom: 80px (desktop) / 100px (móvil)
- Gradiente dorado (#D4AF37 a #F4D03F)
- Abre WhatsApp con mensaje preformateado

#### 3.4 Navegación
**Desktop:**
- Botones flechas laterales (‹ ›)
- 50px × 50px, background rgba(0,0,0,0.5)
- Se ocultan con clase .hidden en primero/último

**Móvil:**
- Tap zones invisibles:
  - Izquierda 30%: historia anterior
  - Centro 40%: pausar/reproducir
  - Derecha 30%: historia siguiente

### 4. **Funcionalidades JavaScript** (app.js líneas 424-636)

#### Datos de Ejemplo
5 usuarios con historias:
- Carlos Martínez: 3 historias
- Sofia García: 2 historias
- Miguel Torres: 4 historias
- Andrea López: 2 historias
- Diego Rodríguez: 3 historias

#### Sistema de Reproducción
- **Auto-play:** 5 segundos por imagen, duración del video por video
- **Progresión:** Al terminar, avanza a siguiente. Último cierra automáticamente
- **Pausa al hover (Desktop):** Al pasar mouse, pausa. Al salir, reanuda
- **Transiciones:** Fade-in 200ms para modal

#### Control de Visuación
- `localStorage` almacena `viewedStories`
- Marca usuarios como vistos
- Circles se actualizan visual y automáticamente

#### Interacciones
1. **Click en circle:** Abre modal con primer historia del usuario
2. **Tecla ESC:** Cierra modal
3. **Click en X:** Cierra modal
4. **Click en overlay:** Cierra modal
5. **Click derecha:** Siguiente historia
6. **Click izquierda:** Historia anterior
7. **Botón Contáctame:** Abre WhatsApp con mensaje

### 5. **Estilos CSS** (styles.css líneas 253-329)

**Variables utilizadas:**
- `--gold: #D4AF37`
- `--gold-2: #F4D03F`
- `--bg: #0A0A0A`
- `--text: #FFFFFF`
- `--muted: #E8E8E8`

**Animaciones:**
- `storyPulse`: 2s ease-in-out infinite (escala 1 a 1.02)
- `progressBar`: Linear (duración variable 5000ms típicamente)
- `fadeIn`: 200ms para modal

**Clases principales:**
- `.stories-section` - Contenedor principal
- `.stories-carousel` - Scroll horizontal
- `.story-button` - Botón de cada historia
- `.story-ring` - Anillo dorado
- `.story-avatar` - Imagen de perfil
- `.stories-modal` - Modal full-screen
- `.stories-viewer` - Contenedor del visor
- `.stories-header` - Info del usuario y progreso
- `.progress-segment` - Barra de progreso
- `.stories-contact-btn` - Botón Contáctame
- `.stories-nav` - Botones de navegación

## Responsive Design

### Desktop (> 768px)
- Circles: 90px × 90px
- Gap: 20px
- Modal: 400px × 700px (razón 9:16)
- Padding: 40px
- Navegación: Botones flechas visibles

### Móvil (≤ 768px)
- Circles: 75px × 75px
- Gap: 12px
- Modal: 100vw × 100vh (full screen)
- Padding: 16px
- Navegación: Tap zones
- Contact button: bottom 100px

## Datos Técnicos

### Storage
- Key: `viewedStories` en localStorage
- Formato: `{ "user-1": true, "user-2": false, ... }`

### Imágenes
- Todas de Unsplash API
- Avatares: `https://source.unsplash.com/36x36/?portrait`
- Contenido: `https://source.unsplash.com/400x700/?luxury,car`

### Flujos de Navegación

**Hacia Adelante:**
```
Historia 0 User 0 → Historia 1 User 0 → ... → Historia N User 0 
→ Historia 0 User 1 → ... → Historia N User M → Cierra
```

**Hacia Atrás:**
```
Historia 1 User 0 ← Historia 0 User 0 ← Historia N User -1 ...
```

## Estados del Modal

1. **Cerrado:** `aria-hidden="true"`, display: none
2. **Abierto:** `aria-hidden="false"`, display: flex, animación fadeIn
3. **Reproduciendo:** Auto-play activo, progress bar animada
4. **En pausa:** Timer detenido, isPaused = true

## Integración con el Sistema Actual

- Se insertó entre Hero Section y Grid de Experiencias
- Usa el mismo sistema de colores y tipografías
- Compatible con responsive design existente
- No interfiere con otros componentes

## Próximas Mejoras Posibles

1. Cargar stories desde backend/API
2. Permitir usuarios crear sus propias stories
3. Agregar reacciones/comentarios en stories
4. Analytics de visualización
5. Duración variable según tipo de contenido
6. Efecto de transición de deslizamiento (swipe)
7. Indicador de pausa visual
8. Sonido en videos (muted: true por defecto)

## Testing Checklist

- [ ] Carrusel se renderiza correctamente
- [ ] Circles muestran estado visto/no visto
- [ ] Click abre modal con historia correcta
- [ ] Barra de progreso anima correctamente
- [ ] Auto-play avanza historias
- [ ] Navegación prev/next funciona
- [ ] Botón Contáctame abre WhatsApp
- [ ] Pausa al hover funciona
- [ ] ESC cierra modal
- [ ] Responsive en móvil
- [ ] localStorage persiste estado
