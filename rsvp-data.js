(function () {
  const googleUrl = (window.RSVP_GOOGLE_SCRIPT_URL || '').trim();
  const apiBase = (window.RSVP_API_BASE || '').trim().replace(/\/$/, '');

  function googleGuests() {
    return new Promise((resolve, reject) => {
      const callback = `__rsvpGuests${Date.now()}${Math.floor(Math.random() * 1000000)}`;
      const script = document.createElement('script');
      const url = new URL(googleUrl);
      url.searchParams.set('action', 'list');
      url.searchParams.set('callback', callback);
      url.searchParams.set('v', String(Date.now()));
      let done = false;
      const timeout = setTimeout(() => finish(new Error('La lista tardó demasiado en responder.')), 15000);
      function finish(error, guests) {
        if (done) return;
        done = true;
        clearTimeout(timeout);
        script.remove();
        delete window[callback];
        if (error) reject(error);
        else resolve(guests);
      }
      window[callback] = payload => {
        if (!Array.isArray(payload?.guests)) {
          finish(new Error('La respuesta de la lista no es válida.'));
          return;
        }
        finish(null, payload.guests);
      };
      script.onerror = () => finish(new Error('No se pudo cargar la lista de invitados.'));
      script.src = url.href;
      document.head.append(script);
    });
  }

  async function listGuests() {
    if (googleUrl) return googleGuests();
    const response = await fetch(`${apiBase}/api/guests`, { cache: 'no-store' });
    if (!response.ok) throw new Error('La lista aún no está disponible.');
    const result = await response.json();
    if (!Array.isArray(result.guests)) throw new Error('La respuesta de la lista no es válida.');
    return result.guests;
  }

  async function saveGuest(firstName, lastName) {
    if (googleUrl) {
      const fullName = `${firstName} ${lastName}`.replace(/\s+/g, ' ').trim();
      const existing = await googleGuests();
      if (existing.some(name => name.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es'))) {
        return { already: true };
      }
      try {
        await fetch(googleUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: new URLSearchParams({ firstName, lastName })
        });
      } catch (error) {
        // La respuesta es opaca entre dominios; comprobamos el resultado leyendo la lista.
      }
      for (let attempt = 0; attempt < 5; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 700));
        const guests = await googleGuests();
        if (guests.some(name => name.toLocaleLowerCase('es') === fullName.toLocaleLowerCase('es'))) {
          return { ok: true };
        }
      }
      throw new Error('No se pudo verificar tu confirmación. Inténtalo de nuevo.');
    }
    const response = await fetch(`${apiBase}/api/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName, lastName })
    });
    const result = await response.json().catch(() => {
      throw new Error('No se pudo conectar con la lista de invitados.');
    });
    if (!response.ok) throw new Error(result.error || 'No se pudo guardar la confirmación.');
    return result;
  }

  window.rsvpData = { listGuests, saveGuest };
})();
