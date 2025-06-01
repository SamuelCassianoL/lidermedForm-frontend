document.addEventListener('DOMContentLoaded', () => {
  const formLogin = document.getElementById('login-form');
  const mensagem  = document.getElementById('mensagem');
  const btn       = document.getElementById('loginButton');

  formLogin.addEventListener('submit', async (event) => {
    event.preventDefault();
    mensagem.textContent = 'Carregando...';   // ← mensagem de loading
    btn.disabled       = true;                // opcional: desabilita o botão
    btn.textContent    = 'Entrando…';         // opcional: muda texto do botão

    const email    = document.getElementById('user').value.trim();
    const password = document.getElementById('password').value;

    try {
      await auth.loginUser(email, password);
      // sucesso: redireciona
      window.location.href = '/gerenciarEmpresas.html';
    } catch (error) {
      // monta mensagem de erro
      let textoErro;
      if (error instanceof TypeError || error.message.includes('fetch')) {
        textoErro = 'Servidor indisponível. Verifique sua conexão.';
      } else if (error.message.startsWith('Login falhou:')) {
        try {
          const json = JSON.parse(error.message.replace('Login falhou: ', ''));
          textoErro = json.detail || 'Credenciais inválidas.';
        } catch {
          textoErro = 'Credenciais inválidas.';
        }
      } else {
        textoErro = error.message;
      }
      mensagem.textContent = textoErro;
    } finally {
      // reabilita botão e, se quiser, limpa o texto de loading
      btn.disabled    = false;
      btn.textContent = 'Entrar';
    }
  });
});
