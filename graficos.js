let dadosResumo = [];

async function carregarDados() {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=tsv'; // substitua pela URL correta
  const resposta = await fetch(url);
  const texto = await resposta.text();
  const linhas = texto.trim().split('\n');
  const cabecalhos = linhas[0].split(',');
  dadosResumo = linhas.slice(1).map(linha => {
    const valores = linha.split(',');
    return cabecalhos.reduce((obj, col, i) => {
      obj[col.trim()] = valores[i]?.trim();
      return obj;
    }, {});
  });

  preencherFiltros();
  extrairTotais();
  gerarGraficos(dadosResumo);
}

function preencherFiltros() {
  const clienteSelect = document.getElementById('filtroCliente');
  const clientesUnicos = [...new Set(dadosResumo.map(l => l['CLIENTE']))].sort();
  clientesUnicos.forEach(cliente => {
    const opt = document.createElement('option');
    opt.value = cliente;
    opt.textContent = cliente;
    clienteSelect.appendChild(opt);
  });
}

function extrairTotais() {
  const totalClientes = new Set(dadosResumo.map(l => l['CLIENTE'])).size;
  const clienteMais = maisFrequente(dadosResumo.map(l => l['CLIENTE']));
  const operacaoMais = maisFrequente(dadosResumo.map(l => l['OPERAÇÃO']));
  const totalAvarias = dadosResumo.filter(l => l['HOUVE DIVERGENCIA?']?.toLowerCase() === 'sim').length;

  document.getElementById('totalClientes').innerText = totalClientes;
  document.getElementById('clienteMaisOpera').innerText = clienteMais;
  document.getElementById('operacaoMaisComum').innerText = operacaoMais;
  document.getElementById('totalAvarias').innerText = totalAvarias;
}

function maisFrequente(lista) {
  const contagem = {};
  lista.forEach(item => contagem[item] = (contagem[item] || 0) + 1);
  return Object.entries(contagem).sort((a, b) => b[1] - a[1])[0]?.[0] || '--';
}

function aplicarFiltros() {
  const cliente = document.getElementById('filtroCliente').value;
  const data = document.getElementById('filtroData').value;
  const processo = document.getElementById('filtroProcesso').value.toLowerCase();

  let filtrado = dadosResumo;

  if (cliente) filtrado = filtrado.filter(l => l['CLIENTE'] === cliente);
  if (data) filtrado = filtrado.filter(l => l['DATA'] === data);
  if (processo) filtrado = filtrado.filter(l => l['DESCRICAO']?.toLowerCase().includes(processo));

  gerarGraficos(filtrado);
}

function gerarGraficos(data) {
  gerarGraficoRanking('graficoCliente', data.map(l => l['CLIENTE']), 'Ranking por Cliente');
  gerarGraficoRanking('graficoOperacao', data.map(l => l['OPERAÇÃO']), 'Ranking por Operação');
  gerarGraficoAvaria(data);
}

function gerarGraficoRanking(canvasId, lista, titulo) {
  const ctx = document.getElementById(canvasId).getContext('2d');
  const contagem = {};
  lista.forEach(i => contagem[i] = (contagem[i] || 0) + 1);
  const labels = Object.keys(contagem);
  const valores = Object.values(contagem);

  if (window[canvasId]) window[canvasId].destroy();

  window[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: titulo,
        data: valores,
        backgroundColor: '#4f46e5'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: titulo }
      }
    }
  });
}

function gerarGraficoAvaria(data) {
  const ctx = document.getElementById('graficoAvarias').getContext('2d');
  const sim = data.filter(l => l['HOUVE DIVERGENCIA?']?.toLowerCase() === 'sim').length;
  const nao = data.length - sim;

  if (window['graficoAvarias']) window['graficoAvarias'].destroy();

  window['graficoAvarias'] = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['Com Avaria', 'Sem Avaria'],
      datasets: [{
        data: [sim, nao],
        backgroundColor: ['#ef4444', '#10b981']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Distribuição de Avarias'
        }
      }
    }
  });
}

document.getElementById('aplicarFiltros').addEventListener('click', aplicarFiltros);
document.getElementById('toggleTheme').addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  document.body.classList.toggle('light-mode');
});

window.onload = carregarDados;
