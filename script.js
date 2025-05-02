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

function getAmanha(date) {
  const d = new Date(date);
  if (d.getDay() === 5) d.setDate(d.getDate() + 3); // sexta-feira -> segunda
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

async function carregarDashboard() {
  const [resumoResp, progResp] = await Promise.all([fetch(resumoUrl), fetch(programacaoUrl)]);
  const [resumoCSV, programacaoCSV] = await Promise.all([resumoResp.text(), progResp.text()]);

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

import("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js").then(jsPDFModule => {
  import("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.25/jspdf.plugin.autotable.min.js").then(() => {
    document.getElementById('exportarPDF').addEventListener('click', async () => {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      const imgLogo = new Image();
      imgLogo.src = 'logo.png';

      imgLogo.onload = async () => {
        const pageWidth = doc.internal.pageSize.getWidth();

        const logoWidth = 50;
        const logoHeight = 20;
        const logoX = (pageWidth - logoWidth) / 2;
        doc.addImage(imgLogo, 'PNG', logoX, 10, logoWidth, logoHeight);

        doc.setFontSize(18);
        doc.setTextColor('#1A237E');
        doc.text("📌 Relatório Operacional", pageWidth / 2, 35, { align: 'center' });

        const formatarData = (d) => d.toLocaleDateString('pt-BR');

        const hoje = new Date();
        const amanha = new Date();
        amanha.setDate(hoje.getDate() + 1);
        const incluirFds = hoje.getDay() === 5;

        const dataHoje = formatarData(hoje);
        const dataAmanha = formatarData(amanha);
        const dataSabado = formatarData(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 1));
        const dataSegunda = formatarData(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3));

        const urlResumo = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=0&single=true&output=csv';
        const urlProg = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTyRRusn-fwNRzkeA5RKEZFDM3MnTCi-YFzM5oXvr6ZtG23PTgIJK3ubi9zJyIRZqBmFEysexyvk8lQ/pub?gid=839921770&single=true&output=csv';

        const carregar = async (url) => {
          const res = await fetch(url);
          const csv = await res.text();
          const linhas = csv.trim().split('\n').map(l => l.split(','));
          const header = linhas.shift();
          return linhas.map(l => Object.fromEntries(l.map((v, i) => [header[i].trim(), v.trim()])));
        };

        const dadosResumo = (await carregar(urlResumo)).filter(l =>
          l['DATA'] === dataHoje || (incluirFds && l['DATA'] === dataSabado)
        );
        const dadosProg = (await carregar(urlProg)).filter(l =>
          l['DATA'] === dataAmanha || (incluirFds && l['DATA'] === dataSegunda)
        );

        let y = 45;
        doc.setFontSize(14);
        doc.setTextColor('#FF6F00');
        doc.text(`📅 Resumo - ${dataHoje}${incluirFds ? ' + Sábado' : ''}`, 14, y);

        doc.autoTable({
          startY: y + 5,
          head: [['Data', 'Cliente', 'Operação', 'Divergência?', 'Descrição']],
          body: dadosResumo.map(d => [
            d['DATA'], d['CLIENTE'], d['OPERAÇÃO'], d['HOUVE DIVERGENCIA?'], d['DESCRICAO']
          ]),
          styles: { fontSize: 10 },
          headStyles: {
            fillColor: [26, 35, 126],
            textColor: 255,
            halign: 'center',
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 10, left: 14, right: 14 },
        });

        y = doc.lastAutoTable.finalY + 10;
        doc.setTextColor('#FF6F00');
        doc.text(`📅 Programação - ${dataAmanha}${incluirFds ? ' + Segunda' : ''}`, 14, y);

        doc.autoTable({
          startY: y + 5,
          head: [['Data', 'Cliente', 'Operação']],
          body: dadosProg.map(d => [d['DATA'], d['CLIENTE'], d['OPERAÇÃO']]),
          styles: { fontSize: 10 },
          headStyles: {
            fillColor: [26, 35, 126],
            textColor: 255,
            halign: 'center',
          },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { top: 10, left: 14, right: 14 },
        });

        doc.save(`Relatorio-${dataHoje}.pdf`);
      }; // <-- fechamento correto de imgLogo.onload
    }); // <-- fechamento de addEventListener
  }); // <-- fechamento do segundo import
}); // <-- fechamento do primeiro import
