// Pega este archivo en un proyecto de Google Apps Script y publícalo como aplicación web.
// Ejecutar como: Yo. Acceso: Cualquier persona.
const FILE_NAME = 'invitados.txt';
const FILE_ID_PROPERTY = 'INVITADOS_FILE_ID';

function guestFile_() {
  const properties = PropertiesService.getScriptProperties();
  const savedId = properties.getProperty(FILE_ID_PROPERTY);
  if (savedId) {
    try {
      return DriveApp.getFileById(savedId);
    } catch (error) {
      properties.deleteProperty(FILE_ID_PROPERTY);
    }
  }
  const file = DriveApp.createFile(FILE_NAME, '', MimeType.PLAIN_TEXT);
  properties.setProperty(FILE_ID_PROPERTY, file.getId());
  return file;
}

function guests_() {
  return guestFile_().getBlob().getDataAsString('UTF-8')
    .split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
}

function validName_(value) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > 60) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '\-’]*$/u.test(name)) return null;
  return name;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  if (event.parameter.action !== 'list') {
    return ContentService.createTextOutput('Servicio de invitados activo.');
  }
  const callback = event.parameter.callback || '';
  if (!/^[A-Za-z_$][\w$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput('Callback inválido.');
  }
  const payload = JSON.stringify({ guests: guests_() });
  return ContentService.createTextOutput(callback + '(' + payload + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(event) {
  const firstName = validName_(event.parameter.firstName);
  const lastName = validName_(event.parameter.lastName);
  if (!firstName || !lastName) {
    return json_({ ok: false, error: 'Nombre o apellido inválido.' });
  }
  const fullName = firstName + ' ' + lastName;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const file = guestFile_();
    const current = guests_();
    if (current.some(function (name) {
      return name.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es');
    })) {
      return json_({ ok: true, already: true });
    }
    file.setContent(current.concat(fullName).join('\n') + '\n');
    return json_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Ejecuta esta función una vez en el editor para autorizar el acceso a Drive
// y obtener el enlace del TXT en el registro de ejecución.
function prepararArchivo() {
  Logger.log(guestFile_().getUrl());
}
