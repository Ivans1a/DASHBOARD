const resumoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=csv";
const programacaoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=839921770&single=true&output=csv";

function csvToJson(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines.shift().split(',');

  return lines.map(line => {
    const values = line.split(',');
    return headers.reduce((obj, header, i) => {
      obj[header.trim()] = values[i]?.trim() || "";
      return obj;
    }, {});
  });
}

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

document.addEventListener("DOMContentLoaded", () => {
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);

  const formatarData = (data) => data.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  document.getElementById("data-atual").textContent = `Hoje: ${formatarData(hoje)}`;
  document.getElementById("data-amanha").textContent = `Amanhã: ${formatarData(amanha)}`;

  carregarDashboard();
});

async function carregarDashboard() {
  const [resumoResp, progResp] = await Promise.all([
    fetch(resumoUrl),
    fetch(programacaoUrl)
  ]);
  const [resumoCSV, programacaoCSV] = await Promise.all([
    resumoResp.text(),
    progResp.text()
  ]);

  const resumoData = csvToJson(resumoCSV);
  const programacaoData = csvToJson(programacaoCSV);

  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);

  const hojeFormatada = formatDate(hoje);
  const amanhaFormatada = formatDate(amanha);

  const resumoHoje = resumoData.filter(item => item["DATA"] === hojeFormatada);
  const programacaoAmanha = programacaoData.filter(item => item["DATA"] === amanhaFormatada);

  renderCards("resumoCards", resumoHoje, true);
  renderCards("programacaoCards", programacaoAmanha, false);
}

function renderCards(containerId, data, isResumo) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (data.length === 0) {
    container.innerHTML = "<p style='color:#ccc'>Nenhum registro encontrado.</p>";
    return;
  }

  data.forEach(item => {
    const card = document.createElement("div");
    card.className = "card";

    const operacao = document.createElement("h3");
    operacao.textContent = item["OPERAÇÃO"];

    const cliente = document.createElement("p");
    cliente.innerHTML = `<strong>Cliente:</strong> ${item["CLIENTE"]}`;

    const dataField = document.createElement("p");
    dataField.innerHTML = `<strong>Data:</strong> ${item["DATA"]}`;

    const obsField = document.createElement("p");
    obsField.innerHTML = `<strong>Obs:</strong> ${item["OBS"] || "Nenhuma observação."}`;

    card.appendChild(operacao);
    card.appendChild(cliente);
    card.appendChild(dataField);
    card.appendChild(obsField);

    if (isResumo) {
      const status = item["HOUVE DIVERGENCIA?"]?.toLowerCase().trim();
      const divergencia = document.createElement("span");

      if (status === "sim") {
        divergencia.className = "divergencia";
        divergencia.textContent = "Divergência";
      } else if (status === "não" || status === "nao") {
        divergencia.className = "sem-divergencia";
        divergencia.textContent = "Sem Divergência";
      } else {
        divergencia.className = "sem-divergencia";
        divergencia.textContent = "Indefinido";
      }

      card.appendChild(divergencia);
    }

    card.addEventListener("click", () => {
      abrirModal(item);
    });

    container.appendChild(card);
  });
}

function abrirModal(item) {
  document.getElementById("modalOperacao").textContent = item["OPERAÇÃO"];
  document.getElementById("modalCliente").textContent = item["CLIENTE"];
  document.getElementById("modalData").textContent = item["DATA"];
  document.getElementById("modalDivergencia").textContent = item["HOUVE DIVERGENCIA?"] || "Indefinido";
  document.getElementById("modalObs").textContent = item["OBS"] || "Nenhuma observação.";

  document.getElementById("inputDivergencia").value = item["HOUVE DIVERGENCIA?"] || "";
  document.getElementById("inputDescricao").value = item["DESCRICAO"] || "";

  mostrarAba("info");
  atualizarCampoDescricao();

  const modal = document.getElementById("modal");
  modal.classList.remove("hidden");

  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      fecharModal();
    }
  });

  document.getElementById("inputDivergencia").addEventListener("change", atualizarCampoDescricao);
}

function atualizarCampoDescricao() {
  const valor = document.getElementById("inputDivergencia").value.toLowerCase();
  const campoDescricao = document.getElementById("campoDescricao");

  if (valor === "sim") {
    campoDescricao.classList.remove("hidden");
  } else {
    campoDescricao.classList.add("hidden");
    document.getElementById("inputDescricao").value = "";
  }
}

function fecharModal() {
  document.getElementById("modal").classList.add("hidden");
}

function mostrarAba(aba) {
  document.getElementById("tab-info").classList.remove("active");
  document.getElementById("tab-div").classList.remove("active");
  document.getElementById("modalInfo").classList.add("hidden");
  document.getElementById("modalDiv").classList.add("hidden");

  if (aba === "info") {
    document.getElementById("tab-info").classList.add("active");
    document.getElementById("modalInfo").classList.remove("hidden");
  } else {
    document.getElementById("tab-div").classList.add("active");
    document.getElementById("modalDiv").classList.remove("hidden");
  }
}

function enviarDivergencia() {
  const operacao = document.getElementById("modalOperacao").textContent;
  const cliente = document.getElementById("modalCliente").textContent;
  const data = document.getElementById("modalData").textContent;
  const divergencia = document.getElementById("inputDivergencia").value.trim().toLowerCase();
  const descricao = document.getElementById("inputDescricao").value.trim();

  const observacao = divergencia === "sim" ? descricao : "";

  fetch('https://script.google.com/macros/s/AKfycbyIiSs3KB2BQr4U2QFTrLW8nR_-0HQwTB_wBIsUXobGhEM9XSC5VLXu2iw7zZmifCTU/exec', {
    method: 'POST',
    mode: 'no-cors',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operacao: operacao,
      cliente: cliente,
      data: data,
      divergencia: divergencia,
      observacao: observacao
    })
  })
  .then(() => {
    alert("Divergência registrada (sem confirmação de resposta devido ao no-cors).");
    fecharModal();
    carregarDashboard();
  })
  .catch(err => {
    console.error("Erro ao enviar:", err);
    alert("Erro ao enviar divergência. Verifique a conexão ou tente novamente.");
  });
}


