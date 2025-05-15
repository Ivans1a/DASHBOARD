// Novo código JS com dados carregando corretamente, layout ajustado e novos campos

const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=tsv';

let dados = [];

async function carregarDados() {
  const response = await fetch(url);
  const tsv = await response.text();
  const linhas = tsv.trim().split('\n').map(l => l.split('\t'));
  const cabecalho = linhas.shift();
  dados = linhas.map(l => Object.fromEntries(l.map((v, i) => [cabecalho[i], v])));
  atualizarFiltros();
  atualizarDashboard();
  
}

function atualizarFiltros() {
  const clientes = [...new Set(dados.map(d => d.CLIENTE))];
  const select = document.getElementById('filtroCliente');
  select.innerHTML = '<option value="">Todos os clientes</option>' +
    clientes.map(c => `<option value="${c}">${c}</option>`).join('');
}

function aplicarFiltro() {
  const cliente = document.getElementById('filtroCliente').value;
  const dataInicio = document.getElementById('filtroDataInicio').value;
  const dataFim = document.getElementById('filtroDataFim').value;

  let filtrado = [...dados];

  if (cliente) filtrado = filtrado.filter(d => d.CLIENTE === cliente);
  if (dataInicio) filtrado = filtrado.filter(d => new Date(d.DATA) >= new Date(dataInicio));
  if (dataFim) filtrado = filtrado.filter(d => new Date(d.DATA) <= new Date(dataFim));

  atualizarDashboard(filtrado);
}

function atualizarDashboard(filtrado = dados) {
  const totalClientes = new Set(filtrado.map(d => d.CLIENTE)).size;
  const clienteMaisFrequente = filtrarMaisFrequente(filtrado.map(d => d.CLIENTE));
  const operacaoMaisComum = filtrarMaisFrequente(filtrado.map(d => d.OPERAÇÃO));
  const totalDivergencias = filtrado.filter(d => d['HOUVE DIVERGENCIA?'].toLowerCase() === 'sim').length;

  document.getElementById('cardTotalClientes').innerText = totalClientes;
  document.getElementById('cardClienteFrequente').innerText = clienteMaisFrequente;
  document.getElementById('cardOperacaoComum').innerText = operacaoMaisComum;
  document.getElementById('cardTotalDivergencias').innerText = totalDivergencias;

  gerarGraficos(filtrado);
}

function filtrarMaisFrequente(lista) {
  return lista.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {});
}

function gerarGraficos(filtrado) {
  const ctx1 = document.getElementById('grafico1').getContext('2d');
  const ctx2 = document.getElementById('grafico2').getContext('2d');

  const operacoes = filtrado.reduce((acc, val) => {
    acc[val.OPERAÇÃO] = (acc[val.OPERAÇÃO] || 0) + 1;
    return acc;
  }, {});

  const divergencias = filtrado.reduce((acc, val) => {
    if (val['HOUVE DIVERGENCIA?'].toLowerCase() === 'sim') {
      acc[val.OPERAÇÃO] = (acc[val.OPERAÇÃO] || 0) + 1;
    }
    return acc;
  }, {});

  if (window.grafico1) window.grafico1.destroy();
  if (window.grafico2) window.grafico2.destroy();

  window.grafico1 = new Chart(ctx1, {
    type: 'bar',
    data: {
      labels: Object.keys(operacoes),
      datasets: [{
        label: 'Operações por tipo',
        data: Object.values(operacoes),
        backgroundColor: '#238636'
      }]
    }
  });

  window.grafico2 = new Chart(ctx2, {
    type: 'pie',
    data: {
      labels: Object.keys(divergencias),
      datasets: [{
        label: 'Divergências por operação',
        data: Object.values(divergencias),
        backgroundColor: ['#f87171', '#fbbf24', '#34d399', '#60a5fa']
      }]
    }
  });
}

document.getElementById('aplicarFiltro').addEventListener('click', aplicarFiltro);

window.onload = carregarDados;
