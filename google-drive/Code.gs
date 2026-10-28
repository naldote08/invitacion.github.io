// Pega este archivo en un proyecto de Google Apps Script y publícalo como aplicación web.
// Ejecutar como: Yo. Acceso: Cualquier persona.
const FILE_NAME = 'invitados.txt';
const FILE_ID_PROPERTY = 'INVITADOS_FILE_ID';
const PRIVATE_FILE_NAME = 'defensa-privada.txt';
const PRIVATE_FILE_ID_PROPERTY = 'DEFENSA_PRIVADA_FILE_ID';

function guestFile_(eventType) {
  const isPrivate = eventType === 'defensa-privada';
  const fileName = isPrivate ? PRIVATE_FILE_NAME : FILE_NAME;
  const propertyName = isPrivate ? PRIVATE_FILE_ID_PROPERTY : FILE_ID_PROPERTY;
  const properties = PropertiesService.getScriptProperties();
  const savedId = properties.getProperty(propertyName);
  if (savedId) {
    try {
      return DriveApp.getFileById(savedId);
    } catch (error) {
      properties.deleteProperty(propertyName);
    }
  }
  const file = DriveApp.createFile(fileName, '', MimeType.PLAIN_TEXT);
  properties.setProperty(propertyName, file.getId());
  return file;
}

function guests_(eventType) {
  return guestFile_(eventType).getBlob().getDataAsString('UTF-8')
    .split(/\r?\n/).map(function (line) { return line.trim(); }).filter(Boolean);
}

function validName_(value, maxLength) {
  if (typeof value !== 'string') return null;
  const name = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (name.length < 1 || name.length > (maxLength || 60)) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '\-’]*$/u.test(name)) return null;
  return name;
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  const action = event.parameter.action;
  if (action !== 'list' && action !== 'list-private' && action !== 'private-check') {
    return ContentService.createTextOutput('Servicio de invitados activo.');
  }
  const callback = event.parameter.callback || '';
  if (!/^[A-Za-z_$][\w$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput('Callback inválido.');
  }
  let result;
  if (action === 'list-private') {
    result = { privateRsvp: true, guests: guests_('defensa-privada') };
  } else if (action === 'private-check') {
    const name = validName_(event.parameter.name, 121);
    if (!name) return ContentService.createTextOutput('Nombre inválido.');
    result = {
      privateRsvp: true,
      exists: guests_('defensa-privada').some(function (guest) {
        return guest.toLocaleLowerCase('es') === name.toLocaleLowerCase('es');
      })
    };
  } else {
    result = { guests: guests_('incorporacion') };
  }
  const payload = JSON.stringify(result);
  return ContentService.createTextOutput(callback + '(' + payload + ');')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(event) {
  const eventType = event.parameter.eventType || 'incorporacion';
  if (eventType !== 'incorporacion' && eventType !== 'defensa-privada') {
    return json_({ ok: false, error: 'Evento inválido.' });
  }
  const firstName = validName_(event.parameter.firstName);
  const lastName = validName_(event.parameter.lastName);
  if (!firstName || !lastName) {
    return json_({ ok: false, error: 'Nombre o apellido inválido.' });
  }
  const fullName = firstName + ' ' + lastName;
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const file = guestFile_(eventType);
    const current = guests_(eventType);
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
  Logger.log('Incorporación: ' + guestFile_('incorporacion').getUrl());
  Logger.log('Defensa Privada: ' + guestFile_('defensa-privada').getUrl());
}
