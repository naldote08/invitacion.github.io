# Invitación de incorporación

La invitación se publica en **GitHub Pages**. Los invitados confirman sin iniciar sesión. Google Apps Script guarda las confirmaciones de la Incorporación en `invitados.txt` y las de la Defensa Privada en `defensa-privada.txt`, ambos en tu Google Drive. Cada evento muestra su propia lista en una ventana de la invitación.

## Activar las confirmaciones

1. Entra a [Google Apps Script](https://script.google.com/) con la cuenta de Google donde quieres conservar el TXT. Crea un **Nuevo proyecto**.
2. Borra el código inicial y pega el contenido completo de [`google-drive/Code.gs`](google-drive/Code.gs). Guarda el proyecto.
3. En la barra superior, selecciona la función **`prepararArchivo`** y pulsa **Ejecutar**. Google pedirá que autorices el acceso a Drive. El script creará los dos archivos TXT en tu Drive. Si aparece una advertencia de aplicación no verificada, comprueba que estás autorizando tu propio proyecto.
4. Pulsa **Implementar → Nueva implementación → Aplicación web**. En **Ejecutar como** elige **Yo**. En **Quién tiene acceso** elige **Cualquier persona**. Implementa y copia la URL que termina en `/exec`.
5. Abre [`config.js`](config.js) y pega esa URL entre las comillas de `window.RSVP_GOOGLE_SCRIPT_URL`.
6. Publica en GitHub Pages los archivos `index.html`, `invitados.html`, `config.js`, `rsvp-data.js` y las imágenes `foto_traje.jpg`, `foto_graduacion.jpg`, `meme_base_clean.png`, `meme_jaw_clean.png`.
7. Abre la invitación publicada. Prueba una confirmación en cada evento y pulsa **Ver invitados** en cada página. Cada nombre debe aparecer solo en la lista y el TXT de su evento.

Las listas de ambos eventos son visibles para quien tenga el enlace de la invitación. Ninguno de los TXT necesita compartirse públicamente en Drive.

## Actualizar un proyecto de Apps Script ya implementado

1. Sustituye el código del proyecto de Apps Script por el contenido actualizado de [`google-drive/Code.gs`](google-drive/Code.gs) y guárdalo.
2. Ejecuta **`prepararArchivo`** para crear `defensa-privada.txt` y comprobar los enlaces de ambos archivos en el registro.
3. En **Implementar → Administrar implementaciones**, edita la implementación de la aplicación web, selecciona **Nueva versión** y pulsa **Implementar**. La URL `/exec` de `config.js` debe seguir siendo la misma.

Hasta completar esta actualización, el formulario y la lista de la Defensa Privada mostrarán que aún no están disponibles. El formulario no enviará nombres al archivo de la Incorporación.

## Probar sin Google Apps Script

Puedes abrir [`iniciar.bat`](iniciar.bat) y entrar a `http://localhost:3000`. Este servidor de prueba guarda los nombres en el `invitados.txt` de esta carpeta. No hace falta instalar paquetes. Esta modalidad es local; la publicación en GitHub Pages usa Google Apps Script.

## Si cambias el script

Después de editar `Code.gs`, crea una nueva versión en **Implementar → Administrar implementaciones** para que el sitio publicado use el código actualizado. Comprueba que la URL `/exec` de `config.js` siga siendo la de la implementación activa.
