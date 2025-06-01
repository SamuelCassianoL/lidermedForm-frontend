// novaPesquisa.js

document.addEventListener('DOMContentLoaded', async () => {
  let empresaSelecionada = null;
  let modeloSelecionado = null;
  let selectedTempo = null;

  const listaEmpresasEl   = document.getElementById('lista-empresas');
  const modelosContainerEl= document.getElementById('modelos-container');
  const listaTemposEl     = document.getElementById('lista-tempos');
  const botaoCriar        = document.getElementById('btn-criar-pesquisa');
  const popupLink         = document.getElementById('popup-link');
  const linkElement       = document.getElementById('link-pesquisa');
  const closePopupLink    = document.getElementById('close-popup-link');

  // Reusar parseErrorResponse do auth.js se importado; se não,
  // copie a função conhecida aqui também.

  // 1) Carregar Empresas (modal automático para erros críticos)
  async function carregarEmpresas() {
    try {
      const res = await auth.authFetch('http://31.97.131.14/companies/list');
      const empresas = await res.json();
      listaEmpresasEl.innerHTML = '';
      empresas.forEach(empresa => {
        const div = document.createElement('div');
        div.className = 'empresa-item';
        div.textContent = empresa.nome;
        div.dataset.id = empresa.id;
        div.addEventListener('click', () => {
          document.querySelectorAll('#lista-empresas .empresa-item')
            .forEach(i => i.classList.remove('selecionada'));
          div.classList.add('selecionada');
          empresaSelecionada = empresa;
        });
        listaEmpresasEl.appendChild(div);
      });
    } catch (err) {
      // modal exibido automaticamente para 401/5xx/rede
    }
  }

  // 2) Carregar Modelos (idem)
  async function carregarModelos() {
    try {
      const res = await auth.authFetch('http://31.97.131.14/api/forms/form-models/');
      const modelos = await res.json();
      modelosContainerEl.innerHTML = '';
      modelos.forEach(modelo => {
        const wrapper = document.createElement('div');
        wrapper.className = 'modelo-opcao';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'modelo';
        input.id = `modelo-${modelo.id}`;
        input.value = modelo.id;
        input.addEventListener('change', () => {
          modeloSelecionado = modelo;
        });

        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.innerHTML = `<strong><em>${modelo.name}</em></strong><br>${modelo.description}`;

        wrapper.append(input, label);
        modelosContainerEl.appendChild(wrapper);
      });
    } catch (err) {
    }
  }

  // 3) Carregar Tempos (client-side)
  function carregarTempos() {
    const tempos = ["15 min","30 min","45 min","60 min"];
    listaTemposEl.innerHTML = '';
    tempos.forEach(tempo => {
      const div = document.createElement('div');
      div.className = 'empresa-item';
      div.textContent = tempo;
      div.dataset.tempo = tempo;
      div.addEventListener('click', () => {
        document.querySelectorAll('#lista-tempos .empresa-item')
          .forEach(i => i.classList.remove('selecionada'));
        div.classList.add('selecionada');
        selectedTempo = tempo;
      });
      listaTemposEl.appendChild(div);
    });
  }

  // Executa carregamentos iniciais
  await carregarEmpresas();
  await carregarModelos();
  carregarTempos();

  // 4) Criar Pesquisa
  botaoCriar.addEventListener('click', async (e) => {
    e.preventDefault();

    const titulo    = document.getElementById('input-titulo').value.trim();
    const descricao = document.getElementById('input-descricao').value.trim();
    const maxSub    = parseInt(document.getElementById('input-max-sub').value.trim(), 10);

    if (!empresaSelecionada || !modeloSelecionado || !selectedTempo
        || !titulo || !descricao || isNaN(maxSub)) {
      showModal("Preencha todos os campos obrigatórios antes de continuar.");
      return;
    }

    const tempoMin = parseInt(selectedTempo.split(' ')[0], 10);
    const expirationDate = new Date(Date.now() + tempoMin * 60000).toISOString();

    const payload = {
      company: empresaSelecionada.id,
      form_model: modeloSelecionado.id,
      expiration_date: expirationDate,
      title: titulo,
      description: descricao,
      max_submissions: maxSub
    };

    try {
      // suppress400→captura JSON de validação, sem modal automático
      const res = await auth.authFetch(
        'http://31.97.131.14/api/forms/surveys/',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        },
        { suppress400: true }
      );

      if (res.status === 400) {
        const detalhes = await parseErrorResponse(res);
        showModal(`Erro ao criar pesquisa:\n${detalhes}`);
        return;
      }

      // status 2xx
      const data = await res.json();
      const uuid = data.link;
      const finalURL = `visualizarPesquisa.html?link=${uuid}`;

      linkElement.href = finalURL;
      linkElement.innerText = finalURL;
      linkElement.target = '_blank';
      popupLink.classList.remove('hidden');

      // Atualiza texto de expiração
      const expEl = document.querySelector('.textexpiration-popuplink');
      const dt = new Date(expirationDate);
      expEl.textContent = `Esta pesquisa poderá ser respondida até ` +
        `${String(dt.getDate()).padStart(2,'0')}/` +
        `${String(dt.getMonth()+1).padStart(2,'0')}/` +
        `${dt.getFullYear()} às ${String(dt.getHours()).padStart(2,'0')}:` +
        `${String(dt.getMinutes()).padStart(2,'0')}!`;


    } catch (err) {
    }
  });

  // 5) Fechar popup de link
  closePopupLink.addEventListener('click', () => {
    popupLink.classList.add('hidden');
  });
});
