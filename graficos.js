const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=tsv';

let dados = [];
let chartBarras = null;
let chartPizza = null;
let chartLinha = null;

async function carregarDados() {
  try {
    const response = await fetch(url);
    const tsv = await response.text();
    const linhas = tsv.trim().split('\n').map(l => l.split('\t'));
    const cabecalho = linhas.shift();
    dados = linhas.map(l => Object.fromEntries(l.map((v, i) => [cabecalho[i], v])));

    popularFiltros();
    aplicarFiltro();
  } catch (e) {
    console.error('Erro ao carregar dados:', e);
  }
}

function popularFiltros() {
  const clientes = [...new Set(dados.map(d => d.CLIENTE))].sort();
  const select = document.getElementById('filtroCliente');
  select.innerHTML = '<option value="">Todos os clientes</option>' +
    clientes.map(c => `<option value="${c}">${c}</option>`).join('');
}

function aplicarFiltro() {
  console.log('aplicarFiltro executado');
  const cliente = document.getElementById('filtroCliente').value;
  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;

  let filtrado = [...dados];
  if (cliente) filtrado = filtrado.filter(d => d.CLIENTE === cliente);
  if (dataInicio) filtrado = filtrado.filter(d => new Date(d.DATA) >= new Date(dataInicio));
  if (dataFim) filtrado = filtrado.filter(d => new Date(d.DATA) <= new Date(dataFim));

  atualizarCardsFixos(filtrado);
  atualizarCardsDinamicos(filtrado, cliente);
  gerarGraficos(filtrado);
}

function atualizarCardsFixos(filtrado) {
  const clienteMaisMovimenta = maisFrequente(filtrado.map(d => d.CLIENTE)) || '-';
  const totalDivergencias = filtrado.filter(d => d['HOUVE DIVERGENCIA?'].toLowerCase() === 'sim').length;
  const totalClientes = new Set(filtrado.map(d => d.CLIENTE)).size;

  document.getElementById('cliente-top').innerText = clienteMaisMovimenta;
  document.getElementById('total-divergencias').innerText = totalDivergencias;
  document.getElementById('total-clientes').innerText = totalClientes;
}

function atualizarCardsDinamicos(filtrado, clienteFiltro) {
  const container = document.querySelector('.cards-dinamicos');
  container.innerHTML = '';

  if (clienteFiltro) {
    const rankingOperacoes = contarOcorrencias(filtrado.map(d => d.OPERAÇÃO));
    const rankingOperacoesHTML = rankingOperacoes.map(([op, qtd]) => `<li>${op}: ${qtd}</li>`).join('');

    const divergenciasCliente = filtrado.filter(d => d['HOUVE DIVERGENCIA?'].toLowerCase() === 'sim');
    const rankingDivergencias = contarOcorrencias(divergenciasCliente.map(d => d.OPERAÇÃO));
    const rankingDivergenciasHTML = rankingDivergencias.length > 0
      ? rankingDivergencias.map(([op, qtd]) => `<li>${op}: ${qtd}</li>`).join('')
      : '<li>Sem divergências</li>';

    const hoje = new Date();
    const dias15 = new Date(hoje.getTime() - (15 * 24 * 60 * 60 * 1000));
    const operacoesRecentes = filtrado.filter(d => new Date(d.DATA) >= dias15);
    const teveOperacaoRecente = operacoesRecentes.length > 0 ? 'Sim' : 'Não';

    container.innerHTML = `
      <div class="card" style="min-width: 300px;">
        <h2>Ranking de Operações</h2>
        <ul>${rankingOperacoesHTML}</ul>
      </div>
      <div class="card" style="min-width: 300px;">
        <h2>Divergências do Cliente</h2>
        <ul>${rankingDivergenciasHTML}</ul>
      </div>
      <div class="card" style="min-width: 300px;">
        <h2>Operação nos últimos 15 dias</h2>
        <p>${teveOperacaoRecente}</p>
      </div>
    `;
  } else if (document.getElementById('filtroDataInicio').value || document.getElementById('filtroDataFim').value) {
    const clientesRanking = contarOcorrencias(filtrado.map(d => d.CLIENTE));
    const clientesRankingHTML = clientesRanking.map(([cli, qtd]) => `<li>${cli}: ${qtd}</li>`).join('');

    const avarias = filtrado.filter(d => d.AVARIAS && d.AVARIAS.trim() !== '');

    let avariasHTML = '';
    if (avarias.length > 0) {
      const avariasPorCliente = {};
      avarias.forEach(a => {
        if (!avariasPorCliente[a.CLIENTE]) avariasPorCliente[a.CLIENTE] = [];
        avariasPorCliente[a.CLIENTE].push(a.AVARIAS);
      });
      avariasHTML = Object.entries(avariasPorCliente)
        .map(([cli, avs]) => `<li><strong>${cli}:</strong> ${avs.join(', ')}</li>`)
        .join('');
    } else {
      avariasHTML = '<li>Sem avarias registradas</li>';
    }

    container.innerHTML = `
      <div class="card" style="min-width: 300px;">
        <h2>Ranking de Clientes na Data</h2>
        <ul>${clientesRankingHTML}</ul>
      </div>
      <div class="card" style="min-width: 300px;">
        <h2>Avarias Registradas</h2>
        <ul>${avariasHTML}</ul>
      </div>
    `;
  } else {
    container.innerHTML = `<p style="text-align:center; color:#ffa500;">Use os filtros para mostrar informações detalhadas.</p>`;
  }
}

function maisFrequente(array) {
  if (!array.length) return null;
  const freq = {};
  array.forEach(x => freq[x] = (freq[x] || 0) + 1);
  return Object.entries(freq).sort((a,b) => b[1] - a[1])[0][0];
}

function contarOcorrencias(array) {
  const freq = {};
  array.forEach(x => freq[x] = (freq[x] || 0) + 1);
  return Object.entries(freq).sort((a,b) => b[1] - a[1]);
}

function gerarGraficos(filtrado) {
  if (chartBarras) chartBarras.destroy();
  if (chartPizza) chartPizza.destroy();
  if (chartLinha) chartLinha.destroy();

  // Gráfico de Barras
  const dadosPorCliente = {};
  filtrado.forEach(d => {
    dadosPorCliente[d.CLIENTE] = (dadosPorCliente[d.CLIENTE] || 0) + 1;
  });
  const ctxBarras = document.getElementById('graficoBarras').getContext('2d');
  chartBarras = new Chart(ctxBarras, {
    type: 'bar',
    data: {
      labels: Object.keys(dadosPorCliente),
      datasets: [{
        label: 'Operações por Cliente',
        data: Object.values(dadosPorCliente),
        backgroundColor: 'rgba(30,144,255,0.8)',
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.2)' } },
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.2)' } }
      }
    }
  });

  // Gráfico de Pizza
  const dadosPorOperacao = {};
  filtrado.filter(d => d['HOUVE DIVERGENCIA?'].toLowerCase() === 'sim')
    .forEach(d => { dadosPorOperacao[d.OPERAÇÃO] = (dadosPorOperacao[d.OPERAÇÃO] || 0) + 1 });
  const ctxPizza = document.getElementById('graficoPizza').getContext('2d');
  chartPizza = new Chart(ctxPizza, {
    type: 'doughnut',
    data: {
      labels: Object.keys(dadosPorOperacao),
      datasets: [{
        label: 'Divergências por Operação',
        data: Object.values(dadosPorOperacao),
        backgroundColor: ['#ffa500', '#ffb347', '#ffcc80', '#ffdbac', '#ffe4c4', '#ff9f43', '#ff6f61'],
        borderWidth: 1,
        borderColor: '#333'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: { enabled: true }
      }
    }
  });

  // Gráfico de Linha
  const dadosPorData = {};
  filtrado.forEach(d => { dadosPorData[d.DATA] = (dadosPorData[d.DATA] || 0) + 1 });
  const labelsLinha = Object.keys(dadosPorData).sort((a,b) => new Date(a) - new Date(b));
  const dadosLinha = labelsLinha.map(d => dadosPorData[d]);
  const ctxLinha = document.getElementById('graficoLinha').getContext('2d');
  chartLinha = new Chart(ctxLinha, {
    type: 'line',
    data: {
      labels: labelsLinha,
      datasets: [{
        label: 'Operações por Dia',
        data: dadosLinha,
        borderColor: '#ffa500',
        backgroundColor: 'rgba(255,165,0,0.3)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#fff' } },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.2)' } },
        x: { ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.2)' } }
      }
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  const botaoFiltro = document.getElementById('aplicarFiltro');
  if (botaoFiltro) {
    botaoFiltro.addEventListener('click', () => {
      aplicarFiltro(); // só dispara quando o botão é clicado
    });
  }
});

window.addEventListener('DOMContentLoaded', () => {
  carregarDados();
  const botaoFiltro = document.getElementById('aplicarFiltro');
  if (botaoFiltro) {
    botaoFiltro.addEventListener('click', aplicarFiltro);
  }
});

