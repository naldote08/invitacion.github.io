# Invitación de incorporación

La invitación se publica en **GitHub Pages**. Los invitados confirman sin iniciar sesión. Un pequeño proyecto de Google Apps Script guarda los nombres en un archivo `invitados.txt` dentro de tu Google Drive y permite mostrar la lista pública.

## Activar las confirmaciones

1. Entra a [Google Apps Script](https://script.google.com/) con la cuenta de Google donde quieres conservar el TXT. Crea un **Nuevo proyecto**.
2. Borra el código inicial y pega el contenido completo de [`google-drive/Code.gs`](google-drive/Code.gs). Guarda el proyecto.
3. En la barra superior, selecciona la función **`prepararArchivo`** y pulsa **Ejecutar**. Google pedirá que autorices el acceso a Drive. El script creará `invitados.txt` en tu Drive. Si aparece una advertencia de aplicación no verificada, comprueba que estás autorizando tu propio proyecto.
4. Pulsa **Implementar → Nueva implementación → Aplicación web**. En **Ejecutar como** elige **Yo**. En **Quién tiene acceso** elige **Cualquier persona**. Implementa y copia la URL que termina en `/exec`.
5. Abre [`config.js`](config.js) y pega esa URL entre las comillas de `window.RSVP_GOOGLE_SCRIPT_URL`.
6. Publica en GitHub Pages los archivos `index.html`, `invitados.html`, `config.js`, `rsvp-data.js` y las imágenes `foto_traje.jpg`, `foto_graduacion.jpg`, `meme_base_clean.png`, `meme_jaw_clean.png`.
7. Abre la invitación publicada, confirma un nombre de prueba y pulsa **Ver invitados**. Debe aparecer en la lista y en el TXT de tu Drive.

La lista de nombres es pública para quien tenga el enlace, tal como solicitaste. El TXT en tu Drive no necesita compartirse públicamente: el script muestra solo los nombres por medio de la página de invitados.

## Probar sin Google Apps Script

Puedes abrir [`iniciar.bat`](iniciar.bat) y entrar a `http://localhost:3000`. Este servidor de prueba guarda los nombres en el `invitados.txt` de esta carpeta. No hace falta instalar paquetes. Esta modalidad es local; la publicación en GitHub Pages usa Google Apps Script.

## Si cambias el script

Después de editar `Code.gs`, crea una nueva versión en **Implementar → Administrar implementaciones** para que el sitio publicado use el código actualizado. Comprueba que la URL `/exec` de `config.js` siga siendo la de la implementación activa.
