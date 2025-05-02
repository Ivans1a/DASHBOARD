const resumoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=csv";
const programacaoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=839921770&single=true&output=csv";

function csvToJson(csv) {
  const lines = csv.trim().split('\n');
  const headers = lines.shift().split(',').map(h => h.trim());
  return lines.map(line => {
    const values = line.split(',').map(v => v.trim());
    return headers.reduce((obj, header, i) => {
      obj[header] = values[i] || "";
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

function getAmanha(date) {
  const d = new Date(date);
  if (d.getDay() === 5) d.setDate(d.getDate() + 3);
  else d.setDate(d.getDate() + 1);
  return d;
}

document.addEventListener("DOMContentLoaded", () => {
  const hoje = new Date();
  const amanha = getAmanha(hoje);
  const formatarData = (data) => data.toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });

  document.getElementById("data-atual").textContent = `Hoje: ${formatarData(hoje)}`;
  document.getElementById("data-amanha").textContent = `Amanhã: ${formatarData(amanha)}`;

  carregarDashboard();
});

async function fetchComTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(id);
  }
}

async function fetchComRetry(url, tentativas = 3) {
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fetchComTimeout(url);
    } catch (erro) {
      if (i === tentativas - 1) throw erro;
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function carregarDashboard() {
  const containerResumo = document.getElementById("resumoCards");
  const containerProg = document.getElementById("programacaoCards");
  const loading = document.getElementById("loadingWrapper");

  containerResumo.innerHTML = "";
  containerProg.innerHTML = "";
  loading.classList.remove("hidden");

  try {
    const [resumoCSV, programacaoCSV] = await Promise.all([
      fetchComRetry(resumoUrl),
      fetchComRetry(programacaoUrl)
    ]);

    const resumoData = csvToJson(resumoCSV);
    const programacaoData = csvToJson(programacaoCSV);

    const hoje = new Date();
    const amanha = getAmanha(hoje);
    const hojeFormatada = formatDate(hoje);
    const amanhaFormatada = formatDate(amanha);

    const resumoHoje = resumoData.filter(item => item["DATA"] === hojeFormatada);
    const programacaoAmanha = programacaoData.filter(item => item["DATA"] === amanhaFormatada);

    renderCards("resumoCards", resumoHoje, true);
    renderCards("programacaoCards", programacaoAmanha, false);
  } catch (erro) {
    console.error("Erro ao carregar dados:", erro);
    containerResumo.innerHTML = "<p style='color: red;'>Erro ao carregar o resumo.</p>";
    containerProg.innerHTML = "<p style='color: red;'>Erro ao carregar a programação.</p>";
  } finally {
    loading.classList.add("hidden");
  }
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

    card.addEventListener("click", () => abrirModal(item));
    container.appendChild(card);
  });
}

function abrirModal(item) {
  document.getElementById("modalOperacao").textContent = item["OPERAÇÃO"];
  document.getElementById("modalCliente").textContent = item["CLIENTE"];
  document.getElementById("modalData").textContent = item["DATA"];
  document.getElementById("modalDivergencia").textContent = item["HOUVE DIVERGENCIA?"] || "Indefinido";
  document.getElementById("modalDescricao").textContent = item["DESCRICAO"] || "Nenhuma divergência registrada.";
  mostrarAba("info");

  const modal = document.getElementById("modal");
  modal.classList.remove("hidden");
  modal.addEventListener("click", function (e) {
    if (e.target === modal) fecharModal();
  });
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

document.getElementById("inputDivergencia").addEventListener("change", atualizarCampoDescricao);

function atualizarCampoDescricao() {
  const valor = document.getElementById("inputDivergencia").value.toLowerCase();
  const campoDescricao = document.getElementById("campoDescricao");
  if (valor === "sim") campoDescricao.classList.remove("hidden");
  else {
    campoDescricao.classList.add("hidden");
    document.getElementById("inputDescricao").value = "";
  }
}

async function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const logo = document.getElementById("logo");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  canvas.width = logo.naturalWidth;
  canvas.height = logo.naturalHeight;
  ctx.drawImage(logo, 0, 0);
  const imgData = canvas.toDataURL("image/png");
  const pageWidth = doc.internal.pageSize.getWidth();
  const imgWidth = 60;
  const imgHeight = (logo.naturalHeight / logo.naturalWidth) * imgWidth;
  const x = (pageWidth - imgWidth) / 2;
  doc.addImage(imgData, "PNG", x, 10, imgWidth, imgHeight);
  let currentY = 10 + imgHeight + 10;
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  doc.text("Relatório Diário de Operações", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  const hoje = new Date();
  const amanha = getAmanha(hoje);
  const dataHoje = hoje.toLocaleDateString("pt-BR");
  const dataAmanha = amanha.toLocaleDateString("pt-BR");

  const resumoHeaders = ["Data", "Cliente", "Operação", "Divergência"];
  const programacaoHeaders = ["Data", "Cliente", "Operação"];

  try {
    const [resumoCSV, programacaoCSV] = await Promise.all([
      fetchComRetry(resumoUrl),
      fetchComRetry(programacaoUrl),
    ]);
    const resumoData = csvToJson(resumoCSV);
    const programacaoData = csvToJson(programacaoCSV);

    const hojeFormatada = formatDate(hoje);
    const amanhaFormatada = formatDate(amanha);

    const resumoHoje = resumoData.filter(item => item["DATA"] === hojeFormatada);
    const programacaoAmanha = programacaoData.filter(item => item["DATA"] === amanhaFormatada);

    const resumoBody = resumoHoje.map(item => [
      item["DATA"],
      item["CLIENTE"],
      item["OPERAÇÃO"],
      item["HOUVE DIVERGENCIA?"] || "Indefinido",
    ]);

    const programacaoBody = programacaoAmanha.map(item => [
      item["DATA"],
      item["CLIENTE"],
      item["OPERAÇÃO"],
    ]);

    currentY += 5;
    doc.setFontSize(14);
    doc.text(`Resumo - ${dataHoje}`, 14, currentY);
    currentY += 4;
    doc.autoTable({
      startY: currentY,
      head: [resumoHeaders],
      body: resumoBody,
      theme: "striped",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [33, 66, 99],
        textColor: [255, 255, 255],
      },
      margin: { left: 14, right: 14 }
    });

    currentY = doc.autoTable.previous.finalY + 10;
    doc.setFontSize(14);
    doc.text(`Programação - ${dataAmanha}`, 14, currentY);
    currentY += 4;
    doc.autoTable({
      startY: currentY,
      head: [programacaoHeaders],
      body: programacaoBody,
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [255, 153, 0],
        textColor: [0, 0, 0],
      },
      margin: { left: 14, right: 14 }
    });

    doc.save(`relatorio_${dataHoje.replace(/\//g, "-")}.pdf`);

  } catch (erro) {
    console.error("Erro ao gerar PDF:", erro);
    alert("Erro ao gerar o PDF. Verifique sua conexão.");
  }
}