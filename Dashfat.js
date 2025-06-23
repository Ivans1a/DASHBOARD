document.addEventListener('DOMContentLoaded', () => {
  const cfg = {
    key: 'AIzaSyDqcPnUmFzA9NHcIJ_jeizomo4IxFM3pbA',
    sheetId: '1j6NfB6H2YPYrxxuENU-PC61tuyLpvomOAb-rC2bo9lA',
    sheetName: 'FATURAMENTO',
    refreshInterval: 300000,
  };

  const elems = {
    client: document.getElementById('filter-client'),
    type: document.getElementById('filter-type'),
    year: document.getElementById('filter-year'),
    apply: document.getElementById('apply-filters'),
  };

  let raw = [], charts = {};

  async function fetchData() {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cfg.sheetId}/values/${cfg.sheetName}?key=${cfg.key}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Erro HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json.values || json.values.length < 2) throw new Error('Planilha sem dados');
    const [hdr, ...rows] = json.values;
    const keys = hdr.map(h =>
      h.toLowerCase().trim().replace(/[^a-z0-9]/gi, '')
    );
    raw = rows.map(r => {
      const obj = {};
      keys.forEach((k, i) => obj[k] = r[i] || '');
      obj.datafaturamento = parseDate(obj.datafaturamento);
      obj.valor = 1; // Cada linha conta como 1 faturamento
      obj.tipo = obj.tipo || '—';
      obj.cliente = obj.cliente || 'Desconhecido';
      return obj;
    });
    console.log('Dados processados:', raw);
  }

  function parseDate(str) {
    if (!str) return null;
    const parts = str.split('/');
    return parts.length === 3
      ? new Date(+parts[2], +parts[1] - 1, +parts[0])
      : new Date(str);
  }

  function formatMonthYear(date) {
    return date?.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) || '';
  }

  function initFilters() {
    elems.client.innerHTML = '<option value="all">Todos</option>';
    elems.type.innerHTML = '<option value="all">Todos</option>';
    elems.year.innerHTML = '<option value="all">Todos</option>';

    new Set(raw.map(r => r.cliente).filter(Boolean)).forEach(v =>
      elems.client.append(new Option(v, v))
    );
    new Set(raw.map(r => r.tipo).filter(Boolean)).forEach(v =>
      elems.type.append(new Option(v, v))
    );
    new Set(raw.map(r => r.datafaturamento?.getFullYear()).filter(Boolean)).forEach(v =>
      elems.year.append(new Option(v, v))
    );

    elems.apply.addEventListener('click', () => applyAndDraw(false));
  }

  function filterData() {
    const c = elems.client.value;
    const t = elems.type.value;
    const y = elems.year.value;

    return raw.filter(r => {
      if (c !== 'all' && r.cliente !== c) return false;
      if (t !== 'all' && r.tipo !== t) return false;
      if (y !== 'all' && (!r.datafaturamento || r.datafaturamento.getFullYear().toString() !== y)) return false;
      return true;
    });
  }

  function applyAndDraw(defaultToQuinzena = false) {
    const data = filterData();
    drawClientChart(data);
    drawTypeChart(data);
    drawMonthlyChart(data, defaultToQuinzena);
  }

  function drawClientChart(data) {
    const agg = data.reduce((acc, r) => {
      acc[r.cliente] = (acc[r.cliente] || 0) + r.valor;
      return acc;
    }, {});
    const labels = Object.keys(agg);
    const values = Object.values(agg);
    updateChart('chart-clientes', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Qtd. Faturamentos',
          data: values,
          backgroundColor: '#3B82F6'
        }]
      },
      options: {
        animation: { duration: 800 },
        plugins: { title: { display: true, text: 'Ranking por Cliente' } },
        responsive: true
      }
    });
  }

  function drawTypeChart(data) {
    const agg = data.reduce((acc, r) => {
      acc[r.tipo] = (acc[r.tipo] || 0) + r.valor;
      return acc;
    }, {});
    const labels = Object.keys(agg);
    const values = Object.values(agg);
    updateChart('chart-tipos', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          label: 'Distribuição por Tipo',
          data: values,
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6366F1']
        }]
      },
      options: {
        animation: { duration: 800 },
        plugins: { title: { display: true, text: 'Distribuição por Tipo' } },
        responsive: true
      }
    });
  }

  function drawMonthlyChart(data, defaultToQuinzena) {
    if (
      defaultToQuinzena &&
      elems.client.value === 'all' &&
      elems.type.value === 'all' &&
      elems.year.value === 'all'
    ) {
      const now = new Date();
      const m = now.getMonth(), y = now.getFullYear();
      const filtered = raw.filter(r =>
        r.datafaturamento?.getFullYear() === y && r.datafaturamento?.getMonth() === m
      );
      const sum = [0, 0];
      filtered.forEach(r => {
        if (!r.datafaturamento) return;
        const d = r.datafaturamento.getDate();
        if (d <= 15) sum[0] += r.valor;
        else sum[1] += r.valor;
      });

      updateChart('chart-mensal', {
        type: 'pie',
        data: {
          labels: ['1ª Quinzena', '2ª Quinzena'],
          datasets: [{
            data: sum,
            backgroundColor: ['#06B6D4', '#FBBF24']
          }]
        },
        options: {
          plugins: { title: { display: true, text: 'Último Mês por Quinzena' } },
          responsive: true
        }
      });
    } else {
      const monthly = {};
      data.forEach(r => {
        if (!r.datafaturamento) return;
        const key = formatMonthYear(r.datafaturamento);
        monthly[key] = (monthly[key] || 0) + r.valor;
      });
      const labels = Object.keys(monthly);
      const values = Object.values(monthly);
      updateChart('chart-mensal', {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Qtd. Faturamentos',
            data: values,
            borderColor: '#8B5CF6',
            backgroundColor: '#DDD6FE',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          plugins: { title: { display: true, text: 'Faturamento Mensal' } },
          responsive: true
        }
      });
    }
  }

  function updateChart(id, config) {
    const ctx = document.getElementById(id).getContext('2d');
    charts[id]?.destroy();
    charts[id] = new Chart(ctx, config);
  }

  function setupAndStart() {
    fetchData()
      .then(() => {
        initFilters();
        applyAndDraw(true);
      })
      .catch(err => console.error(err) || alert(err));
    setInterval(() => fetchData().then(() => applyAndDraw(true)), cfg.refreshInterval);
  }

  setupAndStart();
});
