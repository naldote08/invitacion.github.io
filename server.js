const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = __dirname;
const guestFile = process.env.GUEST_FILE || path.join(root, 'invitados.txt');
const privateGuestFile = process.env.PRIVATE_GUEST_FILE || path.join(root, 'defensa-privada.txt');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';
const publicFiles = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/invitados.html', ['invitados.html', 'text/html; charset=utf-8']],
  ['/config.js', ['config.js', 'text/javascript; charset=utf-8']],
  ['/rsvp-data.js', ['rsvp-data.js', 'text/javascript; charset=utf-8']],
  ['/foto_traje.jpg', ['foto_traje.jpg', 'image/jpeg']],
  ['/foto_graduacion.jpg', ['foto_graduacion.jpg', 'image/jpeg']],
  ['/meme_base_clean.png', ['meme_base_clean.png', 'image/png']],
  ['/meme_jaw_clean.png', ['meme_jaw_clean.png', 'image/png']]
]);

let saveQueue = Promise.resolve();

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  response.end(JSON.stringify(data));
}

function setCors(request, response) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin && request.headers.origin === allowedOrigin) {
    response.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    response.setHeader('Vary', 'Origin');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

function normalizeName(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 60) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '\-’]*$/u.test(name)) return null;
  return name;
}

async function readGuests(file = guestFile) {
  const text = await fs.readFile(file, 'utf8');
  return text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
}

async function readJson(request) {
  let body = '';
  request.setEncoding('utf8');
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4096) throw new Error('Solicitud demasiado grande.');
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error('Solicitud inválida.');
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    setCors(request, response);
    if (url.pathname.startsWith('/api/') && request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (url.pathname === '/api/guests' && request.method === 'GET') {
      const eventType = url.searchParams.get('eventType') || 'incorporacion';
      if (eventType !== 'incorporacion' && eventType !== 'defensa-privada') {
        sendJson(response, 400, { error: 'Evento inválido.' });
        return;
      }
      const guests = await readGuests(eventType === 'defensa-privada' ? privateGuestFile : guestFile);
      sendJson(response, 200, { guests });
      return;
    }

    if (url.pathname === '/api/guests.txt' && request.method === 'GET') {
      const text = await fs.readFile(guestFile, 'utf8');
      response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': 'attachment; filename="invitados.txt"',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(text);
      return;
    }

    if (url.pathname === '/api/rsvp' && request.method === 'POST') {
      if (!request.headers['content-type']?.startsWith('application/json')) {
        sendJson(response, 415, { error: 'Envía los datos en formato JSON.' });
        return;
      }
      const data = await readJson(request);
      const eventType = data?.eventType || 'incorporacion';
      if (eventType !== 'incorporacion' && eventType !== 'defensa-privada') {
        sendJson(response, 400, { error: 'Evento inválido.' });
        return;
      }
      const targetFile = eventType === 'defensa-privada' ? privateGuestFile : guestFile;
      const firstName = normalizeName(data?.firstName);
      const lastName = normalizeName(data?.lastName);
      if (!firstName || !lastName) {
        sendJson(response, 400, { error: 'Escribe un nombre y apellido válidos.' });
        return;
      }
      const fullName = `${firstName} ${lastName}`;
      const save = saveQueue.then(async () => {
        const guests = await readGuests(targetFile);
        if (guests.some(guest => guest.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es'))) {
          return false;
        }
        await fs.appendFile(targetFile, `${fullName}\n`, 'utf8');
        return true;
      });
      saveQueue = save.catch(() => {});
      const created = await save;
      if (!created) {
        sendJson(response, 200, { ok: true, already: true });
        return;
      }
      sendJson(response, 201, { ok: true, guest: fullName });
      return;
    }

    if (request.method === 'GET' && publicFiles.has(url.pathname)) {
      const [fileName, contentType] = publicFiles.get(url.pathname);
      const content = await fs.readFile(path.join(root, fileName));
      response.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': fileName.endsWith('.html') ? 'no-cache' : 'public, max-age=3600',
        'X-Content-Type-Options': 'nosniff'
      });
      response.end(content);
      return;
    }

    sendJson(response, 404, { error: 'Página no encontrada.' });
  } catch (error) {
    if (error.message === 'Solicitud demasiado grande.' || error.message === 'Solicitud inválida.') {
      sendJson(response, 400, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: 'No se pudo completar la solicitud.' });
  }
});

Promise.all([guestFile, privateGuestFile].map(async filePath => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const file = await fs.open(filePath, 'a');
  await file.close();
}))
  .then(() => {
  server.listen(port, host, () => {
    console.log(`Invitación disponible en http://localhost:${server.address().port}`);
    console.log(`Lista de incorporación guardada en ${guestFile}`);
    console.log(`Lista de defensa privada guardada en ${privateGuestFile}`);
  });
}).catch(error => {
  console.error('No se pudieron abrir los archivos de invitados:', error);
  process.exitCode = 1;
});
