// dashboard.js

// Variáveis de estado
let selectedCompanyId = null;
let selectedSurveyId  = null;

// Reuso de parseErrorResponse do auth.js
async function parseErrorResponse(res) {
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

// Controla visibilidade das seções
function showSection(id) {
  document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// Etapa 1: Listar empresas
async function fetchCompanies() {
  try {
    // modal automático para 401/5xx/rede
    const res = await auth.authFetch('https://lidermedforms.com.br/companies/list');
    // Se status 400, não faz sentido aqui → trata nos catch
    if (!res.ok) throw new Error('Erro ao carregar empresas.');
    const companies = await res.json();

    const container = document.getElementById('companies-container');
    container.innerHTML = '';
    companies.forEach(c => {
      const card = document.createElement('div');
      card.className = 'card';
      card.textContent = c.nome;
      card.onclick = () => selectCompany(c.id);
      container.appendChild(card);
    });
  } catch (err) {
  }
}

// Etapa 1→2: Selecionar empresa
async function selectCompany(companyId) {
  selectedCompanyId = companyId;
  await fetchSurveys(companyId);
  showSection('select-survey');
}

// Etapa 2: Listar pesquisas da empresa
async function fetchSurveys(companyId) {
  try {
    // modal automático para 401/5xx/rede
    const res = await auth.authFetch(
      `https://lidermedforms.com.br/api/forms/surveys/company/${companyId}`
    );
    if (!res.ok) throw new Error('Erro ao carregar pesquisas da empresa.');
    const surveys = await res.json();

    const container = document.getElementById('surveys-container');
    container.innerHTML = '';

    if (!surveys.length) {
      container.innerHTML =
        `<h5 class="no-surveys-message">Nenhuma pesquisa cadastrada para esta empresa.</h5>`;
      return;
    }

    surveys.forEach(s => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML =
        `<div class="title-pequisasDashboard">${s.title}</div>` +
        `<div class="description-pequisasDashboard">${s.description}</div>`;
      card.onclick = () => selectSurvey(s.id);
      container.appendChild(card);
    });
  } catch (err) {
    showModal(err.message || 'Erro inesperado ao carregar pesquisas.');
  }
}

// Etapa 2→3: Selecionar pesquisa
async function selectSurvey(surveyId) {
  selectedSurveyId = surveyId;
  await fetchSurveyResults(surveyId);
  showSection('view-results');
}

// Etapa 3: Buscar resultados da pesquisa
async function fetchSurveyResults(surveyId) {
  try {
    // modal automático para 401/5xx/rede
    const res = await auth.authFetch(
      `https://lidermedforms.com.br/api/dashboard/survey/${surveyId}`
    );
    if (!res.ok) {
      // se 404, pode querer mensagem do backend
      if (res.status === 404) {
        const msg = await parseErrorResponse(res);
        showModal(msg);
      } else {
        throw new Error('Erro ao buscar resultados da pesquisa.');
      }
      return;
    }

    const data = await res.json();
    renderSurveyResults(data);

  } catch (err) {
  }
}

// Renderiza o HTML + gráficos
function renderSurveyResults(data) {
  const container = document.getElementById('results-container');
  container.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'pesquisa-header';
  hdr.innerHTML = `
    <div class="pesquisa-info">
      <h3>${data.dados_pesquisa.form_model}</h3>
      <p>Empresa: ${data.dados_pesquisa.empresa}</p>
    </div>
    <div class="pesquisa-respostas">
      <span>${data.dados_pesquisa.total_respostas} submissões</span>
    </div>`;
  container.appendChild(hdr);

  // Seções e perguntas
  data.secoes.forEach(section => {
    const secEl = document.createElement('div');
    secEl.className = 'secao-container';
    secEl.innerHTML = `
      <div class="secao-header">
        <h4>${section.section_title}</h4>
        <p>${section.section_description}</p>
      </div>`;
    
    section.questions.forEach(q => {
      const qDiv = document.createElement('div');
      qDiv.className = 'card-section';
      qDiv.innerHTML = `<p><strong>${q.question_text}</strong></p>`;

      // Se houver estatísticas, cria gráfico
      if (q.statistics?.respostas_agrupadas) {
        const canvas = document.createElement('canvas');
        const chartId = `chart-${q.question_id}`;
        canvas.id = chartId;
        const wrapper = document.createElement('div');
        wrapper.style.height = '320px';
        wrapper.style.position = 'relative';
        wrapper.appendChild(canvas);
        qDiv.appendChild(wrapper);

        const labels = Object.keys(q.statistics.respostas_agrupadas);
        const values = Object.values(q.statistics.respostas_agrupadas);
        const percentuais = labels.map(l => q.statistics.percentuais[l] || 0);

        // Roda após append (evita missing context)
        setTimeout(() => {
          const ctx = document.getElementById(chartId).getContext('2d');
          new Chart(ctx, {
            type: 'bar',
            data: { labels: labels.map(l => `Nota ${l}`),
                    datasets: [{ data: values, backgroundColor: '#43A7A5', borderRadius: 20 }] },
            options: {
              indexAxis: 'y', responsive: true, maintainAspectRatio: false,
              layout: {
                padding: {
                right: 40   // ajusta conforme o tamanho dos rótulos
                }
              },
              plugins: {
                legend: { display: false },
                tooltip:{enabled:false},
                datalabels:{
                  anchor:'end', align:'top', color:'#fdfdfd',
                  backgroundColor:'#237775', borderRadius:4, padding:4,
                  formatter:(value,i)=>`${value} (${percentuais[i.dataIndex].toFixed(1)}%)`
                }
              },
              scales: {
                x:{ beginAtZero:true },
                y:{ grid:{ display:false } }
              }
            },
            plugins:[ChartDataLabels]
          });
        }, 0);
      }

      // Toggle respostas individuais
      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'resposta-toggle-btn';
      toggleBtn.textContent = 'Exibir Respostas Individuais';
      const responseList = document.createElement('ul');
      responseList.style.display = 'none';
      responseList.className = 'resposta-lista';

      toggleBtn.onclick = () => {
        if (responseList.style.display === 'none') {
          responseList.innerHTML = '';
          const answers = q.answers?.length ? q.answers : [{ resposta: 'Sem respostas registradas.' }];
          answers.forEach(ans => {
            const li = document.createElement('li');
            li.textContent = ans.resposta;
            responseList.appendChild(li);
          });
          responseList.style.display = 'block';
          toggleBtn.textContent = 'Ocultar Respostas Individuais';
        } else {
          responseList.style.display = 'none';
          toggleBtn.textContent = 'Exibir Respostas Individuais';
        }
      };

      qDiv.append(toggleBtn, responseList);
      secEl.append(qDiv);
    });

    container.append(secEl);
  });
}

// Voltar navegadores
document.getElementById('btn-back-to-companies')
  .addEventListener('click', () => showSection('select-company'));
document.getElementById('btn-back-to-surveys')
  .addEventListener('click', () => showSection('select-survey'));

// Inicialização
window.addEventListener('load', () => {
  fetchCompanies().catch(err => {
    showModal('Erro ao iniciar dashboard.', 'errorModal');
    auth.logoutUser();
  });
});
