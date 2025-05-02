const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=tsv";

function formatarDataBR(data) {
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

async function carregarDados() {
  const resposta = await fetch(url);
  const texto = await resposta.text();
  const linhas = texto.split("\n").map(l => l.trim()).filter(l => l !== "");
  const colunas = linhas.slice(1).map(linha => linha.split("\t"));
  return colunas.map(linha => ({
    operacao: linha[0],
    cliente: linha[1],
    divergencia: linha[2],
    descricao: linha[3],
    data: linha[5],
    obs: linha[6]
  }));
}

async function filtrarPorData() {
  const dataInput = document.getElementById("dataInput").value;
  const aviso = document.getElementById("aviso");
  const resultados = document.getElementById("resultados");

  aviso.innerText = "";
  resultados.innerHTML = "";

  if (!dataInput) {
    aviso.innerText = "Selecione uma data.";
    return;
  }

  const dataBR = formatarDataBR(dataInput);
  const dados = await carregarDados();
  const filtrados = dados.filter(item => item.data === dataBR);

  if (filtrados.length === 0) {
    aviso.innerText = "Nenhum resultado encontrado para essa data.";
    return;
  }

  filtrados.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <h3>${item.operacao}</h3>
      <p><strong>Cliente:</strong> ${item.cliente}</p>
      <p><strong>Divergência?</strong> ${item.divergencia}</p>
      <p><strong>Descrição:</strong> ${item.descricao}</p>
      <p><strong>Data:</strong> ${item.data}</p>
      <p><strong>Obs:</strong> ${item.obs}</p>
    `;
    resultados.appendChild(card);
  });
}
