// --- script.js ---

const resumoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=csv";
const programacaoUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=839921770&single=true&output=csv";

let resumoData = [];
let programacaoData = [];

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

function getDatasParaDashboard(tipo) {
  const hoje = new Date();
  const datas = [];

  const diaSemana = hoje.getDay(); // 0 = domingo, 1 = segunda, ..., 5 = sexta

  if (tipo === "resumo") {
    if (diaSemana === 1) {
      // Segunda-feira: mostra sábado, domingo e segunda
      const sabado = new Date(hoje);
      sabado.setDate(hoje.getDate() - 2);
      const domingo = new Date(hoje);
      domingo.setDate(hoje.getDate() - 1);
      datas.push(sabado, domingo, hoje);
    } else {
      datas.push(hoje);
    }
  }

  if (tipo === "programacao") {
    const amanha = new Date(hoje);
    if (diaSemana === 5) {
      // Sexta-feira: mostra sábado, domingo e segunda
      const sabado = new Date(hoje);
      sabado.setDate(hoje.getDate() + 1);
      const domingo = new Date(hoje);
      domingo.setDate(hoje.getDate() + 2);
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + 3);
      datas.push(sabado, domingo, segunda);
    } else {
      amanha.setDate(hoje.getDate() + 1);
      datas.push(amanha);
    }
  }

  return datas.map(formatDate);
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

  const botao = document.getElementById("exportarPdf");
  if (botao) {
    botao.addEventListener("click", () => {
      if (typeof gerarPDF === "function") {
        const datasResumo = getDatasParaDashboard("resumo");
const datasProgramacao = getDatasParaDashboard("programacao");

const resumoHoje = resumoData.filter(item => datasResumo.includes(item["DATA"]));
const programacaoAmanha = programacaoData.filter(item => datasProgramacao.includes(item["DATA"]));


gerarPDF(resumoHoje, programacaoAmanha);
      } else {
        alert("Função de exportação ainda não carregada.");
      }
    });
  }
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

    resumoData = csvToJson(resumoCSV);
    programacaoData = csvToJson(programacaoCSV);

const datasResumo = getDatasParaDashboard("resumo");
const datasProgramacao = getDatasParaDashboard("programacao");

const resumoHoje = resumoData.filter(item => datasResumo.includes(item["DATA"]));
const programacaoAmanha = programacaoData.filter(item => datasProgramacao.includes(item["DATA"]));

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

document.getElementById("inputDivergencia")?.addEventListener("change", atualizarCampoDescricao);

function atualizarCampoDescricao() {
  const valor = document.getElementById("inputDivergencia").value.toLowerCase();
  const campoDescricao = document.getElementById("campoDescricao");
  if (valor === "sim") campoDescricao.classList.remove("hidden");
  else {
    campoDescricao.classList.add("hidden");
    document.getElementById("inputDescricao").value = "";
  }
}
function gerarPDF(resumoHoje, programacaoAmanha) {
  const doc = new jspdf.jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const hojeFormatado = formatDate(new Date());

  const img = new Image();
  img.src = "logo.png";

  img.onload = () => {
    // === TOPO COM LOGO E TÍTULO ===
    doc.addImage(img, "PNG", 110, 10, 65, 15); // logo centralizada

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(33, 33, 33);
    doc.text("RELATÓRIO OPERACIONAL", 148.5, 35, { align: "center" });

    doc.setDrawColor(200);
    doc.line(14, 40, 283, 40); // linha divisória

    // === SEÇÃO: RESUMO DE HOJE ===
    const resumoColumns = ["OPERAÇÃO", "CLIENTE", "DATA", "DIVERGÊNCIA"];
    const resumoRows = resumoHoje.map(item => [
      item["OPERAÇÃO"],
      item["CLIENTE"],
      item["DATA"],
      item["DESCRICAO"] || "-"
    ]);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0); // preto
    doc.text("Resumo", 14, 48);

    doc.autoTable({
      startY: 52,
      head: [resumoColumns],
      body: resumoRows,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: 255,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 10
      },
      styles: {
        lineColor: [220],
        lineWidth: 0.2,
        minCellHeight: 8
      }
    });

    // === SEÇÃO: PROGRAMAÇÃO DE AMANHÃ ===
    const progColumns = ["OPERAÇÃO", "CLIENTE", "DATA"];
    const progRows = programacaoAmanha.map(item => [
      item["OPERAÇÃO"],
      item["CLIENTE"],
      item["DATA"]
    ]);

    const posY = doc.lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0); // preto
    doc.text("Programação", 14, posY);

    doc.autoTable({
      startY: posY + 4,
      head: [progColumns],
      body: progRows,
      margin: { left: 14, right: 14 },
      theme: "striped",
      headStyles: {
        fillColor: [243, 156, 18],
        textColor: 255,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: {
        halign: 'center',
        valign: 'middle',
        fontSize: 10
      },
      styles: {
        lineColor: [220],
        lineWidth: 0.2,
        minCellHeight: 8
      }
    });

    // === RODAPÉ COM DATA DE EMISSÃO ===
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text(`Emitido em: ${hojeFormatado}`, 283 - 10, pageHeight - 10, { align: 'right' });

    doc.save(`relatorio_operacional_${hojeFormatado.replace(/\//g, "-")}.pdf`);
  };

  img.onerror = () => {
    alert("Erro ao carregar logo. Verifique se 'logo.png' está no diretório do projeto.");
  };
}

function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
