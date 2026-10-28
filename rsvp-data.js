(function () {
  const googleUrl = (window.RSVP_GOOGLE_SCRIPT_URL || '').trim();
  const apiBase = (window.RSVP_API_BASE || '').trim().replace(/\/$/, '');

  function googleRequest(action, params = {}, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const callback = `__rsvpData${Date.now()}${Math.floor(Math.random() * 1000000)}`;
      const script = document.createElement('script');
      const url = new URL(googleUrl);
      url.searchParams.set('action', action);
      for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
      url.searchParams.set('callback', callback);
      url.searchParams.set('v', String(Date.now()));
      let done = false;
      const timeout = setTimeout(() => finish(new Error('El servicio tardó demasiado en responder.')), timeoutMs);
      function finish(error, result) {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        script.remove();
        delete window[callback];
        if (error) reject(error);
        else resolve(result);
      }
      window[callback] = payload => finish(null, payload);
      script.onerror = () => finish(new Error('No se pudo conectar con el servicio de invitados.'));
      script.src = url.href;
      document.head.append(script);
    });
  }

  async function googleGuests(eventType = 'incorporacion') {
    const isPrivate = eventType === 'defensa-privada';
    let result;
    try {
      result = await googleRequest(isPrivate ? 'list-private' : 'list', {}, isPrivate ? 6000 : 15000);
    } catch (error) {
      if (isPrivate) throw new Error('La lista privada aún no está disponible. Actualiza la implementación de Google Apps Script.');
      throw error;
    }
    if (!Array.isArray(result?.guests) || (isPrivate && result.privateRsvp !== true)) {
      throw new Error('La respuesta de la lista no es válida.');
    }
    return result.guests;
  }

  async function privateGuestExists(fullName) {
    let result;
    try {
      result = await googleRequest('private-check', { name: fullName }, 6000);
    } catch {
      throw new Error('La reserva privada aún no está disponible. Actualiza la implementación de Google Apps Script.');
    }
    if (result?.privateRsvp !== true || typeof result.exists !== 'boolean') {
      throw new Error('La reserva privada aún no está disponible. Actualiza la implementación de Google Apps Script.');
    }
    return result.exists;
  }

  async function listGuests(eventType = 'incorporacion') {
    if (eventType !== 'incorporacion' && eventType !== 'defensa-privada') throw new Error('Evento inválido.');
    if (googleUrl) return googleGuests(eventType);
    const response = await fetch(`${apiBase}/api/guests?eventType=${encodeURIComponent(eventType)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('La lista aún no está disponible.');
    const result = await response.json();
    if (!Array.isArray(result.guests)) throw new Error('La respuesta de la lista no es válida.');
    return result.guests;
  }

  async function saveGuest(firstName, lastName, eventType = 'incorporacion') {
    if (eventType !== 'incorporacion' && eventType !== 'defensa-privada') {
      throw new Error('Evento inválido.');
    }
    if (googleUrl) {
      const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
      const isPrivate = eventType === 'defensa-privada';
      const existing = isPrivate
        ? await privateGuestExists(fullName)
        : (await googleGuests()).some(name => name.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es'));
      if (existing) {
        return { already: true };
      }
      try {
        await fetch(googleUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: new URLSearchParams({ firstName, lastName, eventType })
        });
      } catch (error) {
        // La respuesta es opaca entre dominios; comprobamos el resultado leyendo la lista.
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 700));
        const saved = isPrivate
          ? await privateGuestExists(fullName)
          : (await googleGuests()).some(name => name.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es'));
        if (saved) {
          return { ok: true };
        }
      }
      throw new Error('No se pudo verificar tu confirmación. Inténtalo de nuevo.');
    }
    const response = await fetch(`${apiBase}/api/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName, eventType })
    });
    const result = await response.json().catch(() => {
      throw new Error('No se pudo conectar con la lista de invitados.');
    });
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar la confirmación.');
    return result;
  }

  window.rsvpData = { listGuests, saveGuest };
})();
