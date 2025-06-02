document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const link = urlParams.get('link');
  
    if (!link) {
      document.getElementById('titulo').textContent = 'Link de pesquisa inválido.';
      showModal('Link de pesquisa inválido.', 'errorModal');
      return;
    }
  
    try {
      const res = await fetch(`https://lidermedforms.com.br/api/forms/surveys/${link}/`, {
        headers: { 'Content-Type': 'application/json' }
      });
  

      if (!res.ok) {
        let msg = 'Link de pesquisa inválido.';

        if (res.status === 404) {
          msg = 'Pesquisa não encontrada (erro 404). Verifique o link.';
        } else {
          const contentType = res.headers.get('content-type');

          try {
            if (contentType && contentType.includes('application/json')) {
              const data = await res.json();
              if (data.error) msg = data.error;
            } else {
              const raw = await res.text();
              const match = raw.match(/<title>(.*?)<\/title>/i);
              if (match) msg = match[1];
            }
          } catch (e) {
            msg = 'Erro desconhecido ao carregar a pesquisa.';
          }
        }

        document.getElementById('titulo').textContent = msg;
        showModal(msg, 'errorModal');
        return;
      }
  
      const data = await res.json();  
      const { survey, sections } = data;
  
      // Cabeçalho
      document.getElementById('titulo').textContent = survey.title;
      document.getElementById('descricao').textContent = survey.description;
      document.getElementById('nome-empresa').textContent = survey.company;
  
      const dataExpiracao = new Date(survey.expiration_date);
      document.getElementById('data-expiracao').textContent = dataExpiracao.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
  
      const perguntasDiv = document.getElementById('perguntas');
      perguntasDiv.innerHTML = ''; // limpa conteúdo anterior
  
      // Renderizar seções e perguntas
      sections.forEach((section, sectionIndex) => {

        // Bloco da seção
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('bloco-secao');
  
        const tituloSecao = document.createElement('h2');
        tituloSecao.className = 'titulo-secao';
        tituloSecao.textContent = section.title;
  
        const descSecao = document.createElement('p');
        descSecao.className = 'descricao-secao';
        descSecao.textContent = section.description;
  
        sectionDiv.appendChild(tituloSecao);
        sectionDiv.appendChild(descSecao);
  
        // Renderizar perguntas da seção
        section.questions.forEach((q, index) => {
          const div = document.createElement('div');
          div.classList.add('pergunta');
          div.dataset.questionId = q.id;
  
          let respostaHTML = '';
  
          if (q.question_type === 'text') {
            respostaHTML = `
              <div class="textarea-wrapper">
                <textarea
                  id="resposta-text-${q.id}"
                  name="resposta-text-${q.id}"
                  rows="4"
                  cols="50"
                  maxlength="30"
                  placeholder="Digite sua resposta..."
                  class="textarea-question"
                  oninput="document.getElementById('contador-${q.id}').textContent = this.value.length + '/30'"></textarea>
                <div class="contador-caracteres" id="contador-${q.id}">0/30</div>
              </div>
            `;
          } else if (q.question_type === 'multiple_choice') {
            respostaHTML = `
              <div class="botoes-multipla-escolha">
                ${[1, 2, 3, 4, 5].map(i => `
                  <button type="button" class="btn-opcao" data-pergunta="${q.id}" data-valor="${i}">
                    ${i}
                  </button>
                `).join('')}
              </div>
            `;
          }
  
          const perguntaHTML = `
            <div class="container-question">
              <p class="value-question">${q.text}</p>
              ${respostaHTML}
            </div>
          `;
  
          div.innerHTML = perguntaHTML;
          sectionDiv.appendChild(div);
        });
  
        perguntasDiv.appendChild(sectionDiv);
      });
  


      // Botão de envio
      const btnEnviar = document.createElement('button');
      btnEnviar.textContent = 'Enviar Respostas';
      btnEnviar.className = 'btn-enviar-respostas';
      perguntasDiv.appendChild(btnEnviar);
  
      // Marcar apenas 1 botão por pergunta
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-opcao')) {
          const perguntaId = e.target.dataset.pergunta;
  
          document.querySelectorAll(`.btn-opcao[data-pergunta="${perguntaId}"]`)
            .forEach(btn => btn.classList.remove('selecionado'));
  
          e.target.classList.add('selecionado');
        }
      });
  
      // Enviar respostas
      btnEnviar.addEventListener('click', async () => {
        const respostas = [];
  
        document.querySelectorAll('.pergunta').forEach((div) => {
          const perguntaId = parseInt(div.dataset.questionId);
          const textarea = div.querySelector('textarea');
          const botaoSelecionado = div.querySelector('.btn-opcao.selecionado');
  
          let resposta = null;
          if (textarea) resposta = textarea.value.trim();
          else if (botaoSelecionado) resposta = botaoSelecionado.dataset.valor;
  
          if (resposta) {
            respostas.push({ question: perguntaId, response: resposta });
          }
        });
  
      const totalPerguntas = document.querySelectorAll('.pergunta').length;

      if (respostas.length < totalPerguntas) {
        showModal('Responda todas as perguntas antes de enviar.', 'errorModal');
        return;
      }
  
      try {
        const envio = await fetch('https://lidermedforms.com.br/api/forms/answers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ survey: survey.id, answers: respostas })
        });

            if (!envio.ok) {
              const contentType = envio.headers.get("content-type");

              // Tenta extrair JSON
              let msg = 'Erro ao enviar respostas.';
              if (contentType && contentType.includes("application/json")) {
                const data = await envio.json();
                if (data.error) msg = data.error;
              } else {
                msg = await envio.text(); // fallback
              }

              showModal(msg, 'errorModal');
              return;
            }

            showModal('Respostas enviadas com sucesso!', 'success');
          } catch (err) {
            showModal('Erro inesperado ao enviar as respostas.', 'errorModal');
          }
      });
  
    } catch (err) {
      document.getElementById('titulo').textContent = 'Link de pesquisa inválido.';
      showModal('Erro inesperado ao acesso da pesquisa', 'errorModal');
    }
  });
  