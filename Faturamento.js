document.addEventListener('DOMContentLoaded', function () {
  const config = {
    sheetsApiKey: 'AIzaSyDqcPnUmFzA9NHcIJ_jeizomo4IxFM3pbA',
    spreadsheetId: '1j6NfB6H2YPYrxxuENU-PC61tuyLpvomOAb-rC2bo9lA',
    sheetName: 'FATURAMENTO',
    refreshInterval: 300000,
  };

  const elements = {
    invoicesContainer: document.getElementById('invoices-container'),
    startDate: document.getElementById('start-date'),
    endDate: document.getElementById('end-date'),
    clientFilter: document.getElementById('client-filter'),
    statusFilter: document.getElementById('status-filter'),
    searchInput: document.getElementById('search-input'),
    updateTime: document.getElementById('update-time'),
    refreshBtn: document.getElementById('refresh-btn'),
    applyFiltersBtn: document.getElementById('apply-filters'),
    exportPdfBtn: document.getElementById('export-pdf'),
    loadingIndicator: document.createElement('div'),
  };

  elements.loadingIndicator.innerHTML = `
    <div style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255,255,255,0.8);
      display: flex; justify-content: center; align-items: center;
      z-index: 1000;">
      <div style="
        border: 5px solid #f3f3f3;
        border-top: 5px solid #4a90e2;
        border-radius: 50%;
        width: 50px;
        height: 50px;
        animation: spin 1s linear infinite;
      "></div>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
  document.body.appendChild(elements.loadingIndicator);
  elements.loadingIndicator.style.display = 'none';

  let fullData = [];

  async function loadData() {
    try {
      toggleLoading(true);
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${config.spreadsheetId}/values/${config.sheetName}?key=${config.sheetsApiKey}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
      const data = await response.json();
      if (!data.values || data.values.length < 2) throw new Error('Planilha sem dados úteis');
      fullData = processSheetData(data.values);
      updateClientOptions(fullData);
      applyCurrentFilters();
      updateTime();
    } catch (error) {
      showError(error.message);
    } finally {
      toggleLoading(false);
    }
  }

  function processSheetData(values) {
    const headers = values[0].map(h => h.toLowerCase().trim().replace(/\s/g, ''));
    const rows = values.slice(1);
    return rows.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] || '';
      });
      obj.status = obj.dataenvio?.trim() ? 'sent' : 'pending';
      obj.datafaturamento = parseDate(obj.datafaturamento);
      obj.dataenvio = parseDate(obj.dataenvio);
      return obj;
    });
  }

  function updateClientOptions(data) {
    const clients = [...new Set(data.map(d => d.cliente).filter(Boolean))].sort();
    if (elements.clientFilter) {
      elements.clientFilter.innerHTML = `<option value="all">Todos os Clientes</option>` +
        clients.map(c => `<option value="${c}">${c}</option>`).join('');
    }
  }

  function applyFilters(data) {
    const startDateVal = elements.startDate?.value ? new Date(elements.startDate.value) : null;
    const endDateVal = elements.endDate?.value ? new Date(elements.endDate.value) : null;
    const client = elements.clientFilter?.value || 'all';
    const status = elements.statusFilter?.value || 'all';
    const search = elements.searchInput?.value?.trim().toLowerCase() || '';

    return data.filter(item => {
      if (startDateVal && (!item.datafaturamento || item.datafaturamento < startDateVal)) return false;
      if (endDateVal && (!item.datafaturamento || item.datafaturamento > endDateVal)) return false;
      if (client !== 'all' && item.cliente !== client) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (search && !(
        (item.processo?.toLowerCase().includes(search)) ||
        (item.cliente?.toLowerCase().includes(search))
      )) return false;
      return true;
    });
  }

  function renderInvoices(data) {
    if (!elements.invoicesContainer) return;
    if (data.length === 0) {
      elements.invoicesContainer.innerHTML = `<div class="no-data">Nenhum faturamento encontrado</div>`;
      return;
    }
    elements.invoicesContainer.innerHTML = data.map(item => `
      <div class="invoice-card">
        <div class="invoice-header">
          <span class="invoice-id">#${item.processo || 'N/A'}</span>
          <span class="invoice-status status-${item.status}">
            ${item.status === 'sent' ? 'Enviado' : 'Pendente'}
          </span>
        </div>
        <div class="invoice-details">
          <div class="detail-item">
            <div class="detail-label">Cliente</div>
            <div class="detail-value">${item.cliente || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Tipo</div>
            <div class="detail-value">${item.tipo || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Data Faturamento</div>
            <div class="detail-value">${formatDate(item.datafaturamento) || '-'}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Data Envio</div>
            <div class="detail-value">${formatDate(item.dataenvio) || 'Pendente'}</div>
          </div>
        </div>
      </div>
    `).join('');
  }

  function parseDate(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
    return new Date(dateStr);
  }

  function formatDate(date) {
    if (!date) return null;
    return date.toLocaleDateString('pt-BR');
  }

  function showError(msg) {
    const el = document.createElement('div');
    el.className = 'error-toast';
    el.textContent = msg;
    Object.assign(el.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#ef4444',
      color: 'white',
      padding: '12px 18px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      zIndex: 10000,
      fontWeight: '700',
    });
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  function toggleLoading(show) {
    elements.loadingIndicator.style.display = show ? 'flex' : 'none';
  }

  function updateTime() {
    if (elements.updateTime) {
      elements.updateTime.textContent = `Atualizado em: ${new Date().toLocaleString('pt-BR')}`;
    }
  }

  function applyCurrentFilters() {
    const filtered = applyFilters(fullData);
    renderInvoices(filtered);
  }

  async function exportPDF() {
  const filtered = applyFilters(fullData);
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  // Logo carregada e calculada proporcionalmente
  const logo = new Image();
  logo.src = 'logo.png';
  await new Promise((resolve) => { logo.onload = resolve; });

  const pageWidth = doc.internal.pageSize.getWidth();
  const logoWidth = 60; // maior que antes
  const logoHeight = (logo.height / logo.width) * logoWidth;
  const logoX = (pageWidth - logoWidth) / 2;
  const logoY = 10;

  doc.addImage(logo, 'PNG', logoX, logoY, logoWidth, logoHeight);

  // Título centralizado logo abaixo da logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleY = logoY + logoHeight + 10;
  doc.text('Relatório de Faturamento', pageWidth / 2, titleY, { align: 'center' });

  let y = titleY + 10;
  const cardWidth = 92; // duas colunas
  const cardHeight = 35;
  const gap = 6;
  let col = 0;

  filtered.forEach((item, index) => {
    const x = 12 + col * (cardWidth + gap);

    if (y + cardHeight > 270) { // deixa espaço para rodapé
      addFooter(doc);
      doc.addPage();
      y = 20;
    }

    // Card com fundo e borda
    doc.setFillColor(245, 247, 255); // azul claro
    doc.setDrawColor(200, 200, 255); // borda
    doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

    // Dados do card
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 37, 41);
    doc.text(`Processo:`, x + 5, y + 8);
    doc.text(`Cliente:`, x + 5, y + 15);
    doc.text(`Faturamento:`, x + 5, y + 22);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(item.processo || '—', x + 30, y + 8);
    doc.text(item.cliente || '—', x + 30, y + 15);
    doc.text(formatDate(item.datafaturamento) || '—', x + 30, y + 22);

    // Status colorido
    const statusText = item.status === 'sent' ? 'ENVIADO' : 'PENDENTE';
    const statusColor = item.status === 'sent' ? [46, 204, 113] : [231, 76, 60];

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...statusColor);
    doc.text(`Status: ${statusText}`, x + 5, y + 30);

    col++;
    if (col > 1) {
      col = 0;
      y += cardHeight + 5;
    }
  });

  addFooter(doc);
  doc.save('relatorio_faturamento.pdf');
}

// Função para adicionar rodapé com data de emissão
function addFooter(doc) {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const now = new Date();
  const formattedDate = now.toLocaleString('pt-BR');

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(`Emitido em: ${formattedDate}`, pageWidth - 10, pageHeight - 10, { align: 'right' });
}


  elements.applyFiltersBtn?.addEventListener('click', applyCurrentFilters);
  elements.refreshBtn?.addEventListener('click', loadData);
  elements.exportPdfBtn?.addEventListener('click', exportPDF);

  loadData();
  setInterval(loadData, config.refreshInterval);
});
