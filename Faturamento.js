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
    loadingIndicator: document.createElement('div'),
  };

  if (!elements.invoicesContainer || !elements.applyFiltersBtn || !elements.refreshBtn) {
    console.error('Elementos HTML não encontrados.');
    return;
  }

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
    let d = new Date(dateStr);
    if (!isNaN(d)) return d;
    const parts = dateStr.split('/');
    if (parts.length === 3) return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    return null;
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

  elements.applyFiltersBtn?.addEventListener('click', applyCurrentFilters);
  elements.refreshBtn?.addEventListener('click', loadData);

  loadData();
  setInterval(loadData, config.refreshInterval);
});
