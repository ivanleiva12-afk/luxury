# Sala Oscura — Sitio de Servicios

Sitio web estático para presentar y vender servicios (diseño web, branding y gestión de redes). Incluye secciones de Hero, Servicios, Sobre nosotros y Contacto con formulario (mailto).

## Estructura

- `index.html`: página principal con todas las secciones
- `styles.css`: estilos modernos, responsive y accesibles
- `app.js`: navegación móvil, smooth scroll y envío de formulario por mailto
- `assets/logo.svg`: logotipo simple

## Personalización rápida

- Texto y precios: edita las tarjetas en `index.html` (sección "Nuestros Servicios").
- Correo de destino: cambia `to` en `app.js` por tu email real.
- Marca: reemplaza `assets/logo.svg` por tu logotipo.

## Cómo probar

Opción 1: abrir directamente

- Doble clic sobre `index.html` para abrir en el navegador.

Opción 2: servidor local (recomendado)

Si tienes Python instalado:

```powershell
cd "c:\Users\186926932\Desktop\salaoscura"
python -m http.server 5173
```

Luego visita: http://localhost:5173

Con Node.js y `npx`:

```powershell
cd "c:\Users\186926932\Desktop\salaoscura"
npx serve -p 5173
```

> Alternativa: usa la extensión "Live Server" de VS Code para servir la carpeta.

## Próximos pasos (sugeridos)

- SEO: agrega meta-etiquetas y contenido más detallado.
- Analítica: integra Google Analytics o similar.
- Formulario real: conecta a un backend (p. ej. Formspree, Netlify Forms, Firebase) si no quieres usar mailto.
- Internacionalización: soporte multi-idioma si lo necesitas.
