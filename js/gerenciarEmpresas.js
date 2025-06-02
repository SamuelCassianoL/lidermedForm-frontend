// gerenciarEmpresas.js

let empresaSelecionada = null;
let empresas = [];

// Função reutilizável para extrair detalhes de erro de validação (status 400)
async function parseErrorResponse(res) {
  return res.json()
    .then(data => {
      if (typeof data === 'object') {
        return Object.entries(data)
          .map(([campo, msgs]) =>
            `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`
          )
          .join('\n');
      }
      return JSON.stringify(data);
    })
    .catch(() => res.text().catch(() => res.statusText || 'Erro desconhecido'));
}

document.addEventListener('DOMContentLoaded', async () => {
  const listaEl = document.getElementById('lista-empresas');
  const btnDeletar = document.getElementById('btn-deletar-empresa');
  const form = document.getElementById('form-criar-empresa');

  // 1) Carrega e exibe lista de empresas (modal automático em 401/500/etc)
  async function carregarEmpresas() {
    try {
      const res = await auth.authFetch('https://lidermedforms.com.br/companies/list');
      const data = await res.json();
      empresas = data;
      preencherLista();
    } catch (err) {
      // modal já exibido pelo authFetch para erros críticos
    }
  }

  function preencherLista() {
    listaEl.innerHTML = '';
    empresas.forEach(empresa => {
      const div = document.createElement('div');
      div.className = 'empresa-item';
      div.textContent = empresa.nome;
      div.dataset.id = empresa.id;

      div.addEventListener('click', () => {
        document.querySelectorAll('.empresa-item').forEach(i => i.classList.remove('selecionada'));
        div.classList.add('selecionada');
        empresaSelecionada = empresa;
      });

      listaEl.appendChild(div);
    });
  }

  await carregarEmpresas();

  // 2) Deletar empresa (modal automático para erros críticos e 400)
  btnDeletar.addEventListener('click', async () => {
    if (!empresaSelecionada) {
      showModal('Selecione uma empresa para deletar.');
      return;
    }
    if (!confirm(`Deseja realmente desativar "${empresaSelecionada.nome}"?`)) return;

    try {
      const url = `https://lidermedforms.com.br/companies/desactivate/${empresaSelecionada.id}/`;
      const res = await auth.authFetch(url, { method: 'DELETE' });
      // Se não for ok, authFetch já mostrou modal e lançou erro
      // Se chegou aqui, status 2xx
      empresas = empresas.filter(e => e.id !== empresaSelecionada.id);
      empresaSelecionada = null;
      preencherLista();
      showModal('Empresa desativada com sucesso!', 'success');
    } catch (err) {
      // modal já exibido para network/401/5xx
    }
  });

  // 3) Criar empresa (tratamento manual de 400, automático para 401/5xx)
  form.addEventListener('submit', async ev => {
    ev.preventDefault();

    const nome    = document.getElementById('input-nome').value.trim();
    const cnpj    = document.getElementById('input-cnpj').value.replace(/\D/g, '');
    const plano   = document.getElementById('input-plano').value.trim();
    const funcs   = parseInt(document.getElementById('input-funcionarios').value.trim(), 10);

    if (!nome || !cnpj || !plano || isNaN(funcs)) {
      showModal('Preencha todos os campos corretamente.');
      return;
    }

    const payload = { nome, cnpj, plano, quantidade_funcionarios: funcs };

    try {
      // suppress400: true → o authFetch NÃO mostra modal em 400, retorna o res
      const res = await auth.authFetch(
        'https://lidermedforms.com.br/companies/create/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        },
        { suppress400: true }
      );

      if (res.status === 400) {
        // validação do servidor: mostra modal com detalhes
        const detalhes = await parseErrorResponse(res);
        showModal(`Erro ao criar empresa:\n${detalhes}`);
        return;
      }

      // status 2xx
      const nova = await res.json();
      empresas.push(nova);
      preencherLista();
      form.reset();
      showModal(`Empresa "${nova.nome}" criada com sucesso!`, 'success');

    } catch (err) {
      // modal automático já exibido para network/401/5xx
    }
  });
});
