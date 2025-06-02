    const API_BASE = 'https://lidermedforms.com.br/api';

    function saveTokens({ access, refresh }) {
        localStorage.setItem('access', access);
        localStorage.setItem('refresh', refresh);
    }

    function getAccessToken() {
        return localStorage.getItem('access');
    }

    function getRefreshToken() {
        return localStorage.getItem('refresh');
    }

    function clearTokens() {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
    }

    function logoutUser() {
        clearTokens();
        window.location.href = '/index.html';
    }

    function showModal(message, type = 'errorModal') {
        if (document.readyState !== 'complete') {
            window.addEventListener('DOMContentLoaded', () => showModal(message, type));
            return;
        }

        const modal = document.getElementById('modal-overlay');
        const box = document.getElementById('modal-box');
        const msg = document.getElementById('modal-message');

        if (!modal || !box || !msg) {
            alert(message);
            return;
        }

        msg.textContent = message;
        box.classList.remove('success', 'errorModal');
        box.classList.add(type);
        modal.classList.remove('hidden');
    }

    async function loginUser(email, password) {
        try {
            const res = await fetch(`${API_BASE}/users/login/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) {
                const msg = await res.text();
                throw new Error(`Login falhou: ${msg}`);
            }

            const data = await res.json();
            saveTokens(data);
        } catch (err) {
            const msg = err.message === 'Failed to fetch'
                ? 'Servidor indisponível no momento. Verifique sua conexão ou tente novamente mais tarde.'
                : err.message || 'Erro desconhecido no login';
            showModal(msg);
            throw err;
        }
    }

    async function refreshToken() {
        const refresh = getRefreshToken();
        if (!refresh) throw new Error('Sem refresh token');

        const res = await fetch(`${API_BASE}/token/refresh/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh })
        });

        if (!res.ok) {
            throw new Error('Sessão expirada. Faça login novamente.');
        }

        const data = await res.json();
        saveTokens({ access: data.access, refresh });
        return data.access;
    }   



    function parseErrorResponse(res) {
        return res.json()
        .then(data => {
            if (typeof data === 'object') {
            return Object.entries(data)
                .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                .join('\n');
            }
            return JSON.stringify(data);
        })
        .catch(() => res.text().catch(() => res.statusText || 'Erro desconhecido'));
    }

async function authFetch(url, options = {}, { suppress400 = false } = {}) {
  const token = getAccessToken();
  if (!token) {
    showModal('Sessão expirada. Faça login novamente.');
    setTimeout(() => logoutUser(), 3000);
    return;
  }

  options.headers = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  try {
    let res = await fetch(url, options);

    if (res.status === 401) {
      // tenta refresh
      try {
        const newToken = await refreshToken();
        options.headers.Authorization = `Bearer ${newToken}`;
        res = await fetch(url, options);
      } catch (refreshErr) {
        // se for erro de rede, deixa passar para o catch externo
        if (refreshErr.message === 'Failed to fetch') {
          throw refreshErr;
        }
        // caso contrário, é erro de refresh (HTTP não-ok → expirou)
        showModal('Sessão expirada. Faça login novamente.');
        setTimeout(() => logoutUser(), 3000);
        throw refreshErr;
      }
    }

    // validações 400
    if (res.status === 400) {
      if (!suppress400) showModal('Erro de validação. Verifique os campos.');
      return res;
    }

    // outros erros >=400
    if (!res.ok) {
      const detalhes = await parseErrorResponse(res);
      showModal(detalhes);
      throw new Error(detalhes);
    }

    return res;
  } catch (err) {
    // erro de rede, JSON inválido, etc.
    const msg = err.message.includes('Failed to fetch')
      ? 'Servidor indisponível. Verifique sua conexão.'
      : err.message;
    showModal(msg);
    throw err;
  }
}



    function isAuthenticated() {
        return Boolean(getAccessToken());
    }

    function requireAuth() {
        if (!isAuthenticated()) {
            window.location.href = '/index.html';
        }
    }

    window.auth = {
        loginUser,
        logoutUser,
        authFetch,
        requireAuth
    };

