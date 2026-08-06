// renderers.js - Funções de renderização de KPIs, tabelas e gráficos

function renderExecutiveKPIs(seriesTotal) {
  const focusYear = state.focusMonth ? Number(state.focusMonth.slice(0, 4)) : null;
  const projection = computeYearProjection(seriesTotal, focusYear);
  const budget = focusYear ? state.budgetMap.get(focusYear) : null;

  const gapBudget = budget != null ? projection - budget : null;

  const metaMonth = state.metaMap.get(state.focusMonth);
  const metaMonthTotal = metaMonth ? metaMonth.total : null;

  const focusSeries = seriesTotal.find(s => s.key === state.focusMonth) || {
    trend: 0
  };

  const monthAttainment = metaMonthTotal ? focusSeries.trend / metaMonthTotal - 1 : null;

  const focusAgg = state.agg.get(state.focusMonth) || {
    ids: new Set()
  };

  const demandantes = focusAgg.ids.size;
  const gapDemandantes = state.metaDemandantes > 0 ? demandantes - state.metaDemandantes : null;

  setText('kpiProjecao', fmtBR(projection));
  setText('kpiOrcamento', budget != null ? fmtBR(budget) : '-');
  setText('kpiGapOrcamento', gapBudget != null ? fmtBR(gapBudget) : '-');
  setText('kpiMetaMes', metaMonthTotal != null ? fmtBR(metaMonthTotal) : '-');
  setText('kpiAtingimentoMes', monthAttainment != null ? fmtPct(monthAttainment) : '-');
  setText('kpiMetaDemandantes', state.metaDemandantes > 0 ? fmtInt(state.metaDemandantes) : '-');
  setText('kpiGapDemandantes', gapDemandantes != null ? fmtInt(gapDemandantes) : '-');

  return {
    focusYear,
    projection,
    budget,
    gapBudget
  };
}

function renderKPIs(seriesTotal) {
  const focusSeries = seriesTotal.find(s => s.key === state.focusMonth) || {
    realized: 0,
    trend: 0,
    robDu: 0
  };

  const focusAgg = state.agg.get(state.focusMonth) || {
    custo: 0,
    ids: new Set()
  };

  const margem = focusSeries.realized - focusAgg.custo;
  const margemPct = focusSeries.realized ? margem / focusSeries.realized : null;

  setText('kpiRealizado', fmtBR(focusSeries.realized));
  setText('kpiTendencia', fmtBR(focusSeries.trend));
  setText('kpiRobDu', fmtBR(focusSeries.robDu));
  setText('kpiCusto', fmtBR(focusAgg.custo));
  setText('kpiMargem', fmtBR(margem));
  setText('kpiMargemPct', fmtPct(margemPct));
  setText('kpiDemandantes', fmtInt(focusAgg.ids.size));
}

function renderTrendTable(seriesTotal) {
  const visibleKeys = getVisibleKeys();

  const rows = seriesTotal
    .filter(item => visibleKeys.includes(item.key))
    .map(item => [
      cell(item.label),
      cell(fmtBR(item.realized), 'num'),
      cell(fmtBR(item.open), 'num'),
      cell(fmtBR(item.closed), 'num'),
      cell(fmtBR(item.robDu), 'num'),
      cell(fmtBR(item.trend), 'num'),
      cell(fmtPctArrow(item.growth), 'num')
    ]);

  renderTable('trendTable', [
    'Mês',
    'Realizado',
    'DU aberto',
    'DU fechado',
    'Receita / DU aberto',
    'Tendência',
    'Crescimento'
  ], rows);
}

function renderRdiMtgTable(seriesRDI, seriesMTG) {
  const visibleKeys = getVisibleKeys();

  const mtgMap = new Map(seriesMTG.map(item => [item.key, item]));

  const rows = seriesRDI
    .filter(item => visibleKeys.includes(item.key))
    .map(rdi => {
      const mtg = mtgMap.get(rdi.key) || {
        trend: 0,
        growth: null
      };

      const total = rdi.trend + mtg.trend;
      const partRdi = total ? rdi.trend / total : null;
      const partMtg = total ? mtg.trend / total : null;

      return [
        cell(rdi.label),
        cell(fmtBR(rdi.trend), 'num'),
        cell(fmtBR(mtg.trend), 'num'),
        cell(fmtBR(total), 'num'),
        cell(fmtPctArrow(rdi.growth), 'num'),
        cell(fmtPctArrow(mtg.growth), 'num'),
        cell(fmtPct(partRdi), 'num'),
        cell(fmtPct(partMtg), 'num')
      ];
    });

  renderTable('rdiMtgTable', [
    'Mês',
    'Tendência RDI',
    'Tendência MTG',
    'Total',
    'Crescimento RDI',
    'Crescimento MTG',
    'Participação RDI',
    'Participação MTG'
  ], rows);
}

function renderMarginTable() {
  const visibleKeys = getVisibleKeys();

  const rows = visibleKeys.map(key => {
    const monthAgg = state.agg.get(key) || {
      receita: 0,
      custo: 0
    };

    const receita = monthAgg.receita || 0;
    const custo = monthAgg.custo || 0;
    const margem = receita - custo;
    const margemPct = receita ? margem / receita : null;

    return [
      cell(monthLabelFromKey(key)),
      cell(fmtBR(receita), 'num'),
      cell(fmtBR(custo), 'num'),
      cell(fmtBR(margem), 'num'),
      cell(fmtPct(margemPct), 'num')
    ];
  });

  renderTable('marginTable', [
    'Mês',
    'Receita',
    'Custo',
    'Margem',
    'Margem %'
  ], rows);
}

function renderRegionalMetaTable() {
  const focusMeta = state.metaMap.get(state.focusMonth);
  const monthAgg = state.agg.get(state.focusMonth);

  const open = getOpenWeight(state.focusMonth, state.cutoff);
  const closed = getClosedWeight(state.focusMonth);

  const regionalMap = new Map();

  if (focusMeta) {
    focusMeta.regionals.forEach((value, normKey) => {
      regionalMap.set(normKey, {
        label: value.label,
        realized: 0,
        trend: 0,
        meta: value.value,
        ids: 0
      });
    });
  }

  if (monthAgg) {
    monthAgg.regional.forEach((reg, label) => {
      const normKey = normalizeKey(label);

      if (!regionalMap.has(normKey)) {
        regionalMap.set(normKey, {
          label,
          realized: 0,
          trend: 0,
          meta: 0,
          ids: 0
        });
      }

      const item = regionalMap.get(normKey);
      item.realized = reg.receita;
      item.trend = open > 0 ? (reg.receita / open) * closed : 0;
      item.ids = reg.ids.size;
    });
  }

  const data = [...regionalMap.values()].sort((a, b) => b.trend - a.trend);

  const rows = data.map(item => {
    const gap = item.trend - item.meta;
    const attainment = item.meta ? item.trend / item.meta - 1 : null;

    return [
      cell(item.label),
      cell(fmtBR(item.realized), 'num'),
      cell(fmtBR(item.trend), 'num'),
      cell(fmtBR(item.meta), 'num'),
      cell(fmtBR(gap), 'num'),
      cell(fmtPctArrow(attainment), 'num')
    ];
  });

  renderTable('regionalMetaTable', [
    'Regional',
    'Realizado',
    'Tendência',
    'Meta',
    'Gap',
    'Atingimento'
  ], rows);

  return data;
}

function renderServiceMetaTable() {
  const monthAgg = state.agg.get(state.focusMonth);
  const open = getOpenWeight(state.focusMonth, state.cutoff);
  const closed = getClosedWeight(state.focusMonth);

  const services = [];

  if (monthAgg) {
    monthAgg.servicos.forEach((value, label) => {
      const trend = open > 0 ? (value.receita / open) * closed : 0;

      services.push({
        label,
        trend
      });
    });
  }

  services.sort((a, b) => b.trend - a.trend);

  const total = services.reduce((sum, item) => sum + item.trend, 0);
  const metaTotal = state.metaMap.get(state.focusMonth)?.total || 0;

  const rows = services.map(item => [
    cell(item.label),
    cell(fmtBR(item.trend), 'num'),
    cell(fmtPct(total ? item.trend / total : null), 'num')
  ]);

  rows.push([
    cell('Total'),
    cell(fmtBR(total), 'num'),
    cell('100%')
  ]);

  rows.push([
    cell('Meta'),
    cell(fmtBR(metaTotal), 'num'),
    cell(fmtPct(metaTotal ? total / metaTotal : null), 'num')
  ]);

  renderTable('serviceMetaTable', [
    'Serviço',
    'Tendência',
    'Participação'
  ], rows);
}

function renderFunnelTable() {
  if (!state.funnelMap.size || !state.focusMonth) {
    renderTable('funnelTable', [
      'CNPJ',
      'Razão Social',
      'Receita mês anterior',
      'Receita mês foco (tendência)',
      'Potencial',
      'Gap',
      'Gap %'
    ], []);
    return;
  }

  const prevKey = shiftMonthKey(state.focusMonth, -1);

  const focusCnpjMap = state.agg.get(state.focusMonth)?.cnpj || new Map();
  const prevCnpjMap = state.agg.get(prevKey)?.cnpj || new Map();

  const open = getOpenWeight(state.focusMonth, state.cutoff);
  const closed = getClosedWeight(state.focusMonth);

  const cnpjSet = new Set([
    ...focusCnpjMap.keys(),
    ...prevCnpjMap.keys()
  ]);

  const rowsData = [];

  cnpjSet.forEach(cnpjDigits => {
    const funnel = state.funnelMap.get(cnpjDigits);

    if (!funnel) return;

    const previousReal = prevCnpjMap.get(cnpjDigits)?.receita || 0;
    const focusReal = focusCnpjMap.get(cnpjDigits)?.receita || 0;
    const focusTrend = open > 0 ? (focusReal / open) * closed : 0;

    const potential = funnel.potencial || 0;
    const gap = focusTrend - potential;
    const gapPct = potential ? focusTrend / potential : null;

    rowsData.push({
      cnpj: funnel.cnpjFormatted,
      razao: funnel.razao || funnel.nomeFantasia || '-',
      previousReal,
      focusTrend,
      potential,
      gap,
      gapPct
    });
  });

  rowsData.sort((a, b) => b.potential - a.potential);

  const rows = rowsData.slice(0, 100).map(item => [
    cell(item.cnpj),
    cell(item.razao),
    cell(fmtBR(item.previousReal), 'num'),
    cell(fmtBR(item.focusTrend), 'num'),
    cell(fmtBR(item.potential), 'num'),
    cell(fmtBR(item.gap), 'num'),
    cell(fmtPct(item.gapPct), 'num')
  ]);

  renderTable('funnelTable', [
    'CNPJ',
    'Razão Social',
    'Receita mês anterior',
    'Receita mês foco (tendência)',
    'Potencial',
    'Gap',
    'Gap %'
  ], rows);
}

function renderDemandMonthTable() {
  const visibleKeys = getVisibleKeys();

  const rows = visibleKeys.map(key => {
    const monthAgg = state.agg.get(key);

    const combo = comboCounts(monthAgg ? monthAgg.idService : new Map());

    return [
      cell(monthLabelFromKey(key)),
      cell(fmtInt(combo.total), 'num'),
      cell(fmtInt(combo.rdiOnly), 'num'),
      cell(fmtInt(combo.mtgOnly), 'num'),
      cell(fmtInt(combo.both), 'num')
    ];
  });

  renderTable('demandMonthTable', [
    'Mês',
    'IDs únicos',
    'Somente RDI',
    'Somente MTG',
    'RDI + MTG'
  ], rows);
}

function renderRegionalTable() {
  const monthAgg = state.agg.get(state.focusMonth);

  if (!monthAgg) {
    renderTable('regionalTable', ['Regional', 'Realizado', 'Tendência', 'IDs', 'Participação'], []);
    return;
  }

  const open = getOpenWeight(state.focusMonth, state.cutoff);
  const closed = getClosedWeight(state.focusMonth);

  const regionals = [];

  monthAgg.regional.forEach((reg, name) => {
    const trend = open > 0 ? (reg.receita / open) * closed : 0;

    regionals.push({
      name,
      realized: reg.receita,
      trend,
      ids: reg.ids.size
    });
  });

  regionals.sort((a, b) => b.trend - a.trend);

  const totalTrend = regionals.reduce((sum, item) => sum + item.trend, 0);

  const rows = regionals.map(item => [
    cell(item.name),
    cell(fmtBR(item.realized), 'num'),
    cell(fmtBR(item.trend), 'num'),
    cell(fmtInt(item.ids), 'num'),
    cell(fmtPct(totalTrend ? item.trend / totalTrend : null), 'num')
  ]);

  renderTable('regionalTable', [
    'Regional',
    'Realizado',
    'Tendência',
    'IDs',
    'Participação'
  ], rows);
}

function renderServiceCombo() {
  const monthAgg = state.agg.get(state.focusMonth);
  const container = document.getElementById('serviceCombo');

  if (!monthAgg) {
    container.innerHTML = '<div class="muted">Sem dados para o mês foco.</div>';
    return;
  }

  const combo = comboCounts(monthAgg.idService);

  container.innerHTML = `
    <div class="kpis" style="margin-bottom:0;">
      <div class="card kpi">
        <div class="label">Total</div>
        <div class="value">${fmtInt(combo.total)}</div>
      </div>

      <div class="card kpi">
        <div class="label">Somente RDI</div>
        <div class="value">${fmtInt(combo.rdiOnly)}</div>
      </div>

      <div class="card kpi">
        <div class="label">Somente MTG</div>
        <div class="value">${fmtInt(combo.mtgOnly)}</div>
      </div>

      <div class="card kpi">
        <div class="label">RDI + MTG</div>
        <div class="value">${fmtInt(combo.both)}</div>
      </div>
    </div>
  `;
}

function renderDailyIds() {
  const daily = computeDailyCumulative(state.focusMonth);

  const rows = daily.labels.map((label, index) => [
    cell(label),
    cell(fmtInt(daily.values[index]), 'num')
  ]);

  renderTable('dailyIdsTable', [
    'Dia',
    'IDs acumulados'
  ], rows);

  return daily;
}

function renderMissingCostTable() {
  if (!state.costMap.size) {
    renderTable('missingCostTable', ['Exame', 'Receita', 'Volume'], []);
    return;
  }

  const missingMap = new Map();

  state.mainRecords.forEach(record => {
    if (record.custoUnit === 0 && record.receita > 0) {
      const key = record.exames || '(sem exame)';

      if (!missingMap.has(key)) {
        missingMap.set(key, {
          exame: key,
          receita: 0,
          volume: 0
        });
      }

      const item = missingMap.get(key);
      item.receita += record.receita;
      item.volume += record.volume;
    }
  });

  const rows = [...missingMap.values()]
    .sort((a, b) => b.receita - a.receita)
    .slice(0, 30)
    .map(item => [
      cell(item.exame),
      cell(fmtBR(item.receita), 'num'),
      cell(smartFmt(item.volume), 'num')
    ]);

  renderTable('missingCostTable', [
    'Exame',
    'Receita sem custo',
    'Volume'
  ], rows);
}

function renderCharts(seriesTotal, seriesRDI, seriesMTG, daily, metaRegionalData, executive) {
  destroyCharts();

  if (typeof Chart === 'undefined') {
    addWarning('Chart.js não carregado. Gráficos não serão exibidos.');
    return;
  }

  const visibleKeys = getVisibleKeys();

  const totalVisible = seriesTotal.filter(item => visibleKeys.includes(item.key));
  const rdiVisible = seriesRDI.filter(item => visibleKeys.includes(item.key));
  const mtgVisible = seriesMTG.filter(item => visibleKeys.includes(item.key));

  const labels = totalVisible.map(item => item.label);

  const rdiMap = new Map(rdiVisible.map(item => [item.key, item]));
  const mtgMap = new Map(mtgVisible.map(item => [item.key, item]));

  const rdiData = totalVisible.map(item => rdiMap.get(item.key)?.trend || 0);
  const mtgData = totalVisible.map(item => mtgMap.get(item.key)?.trend || 0);

  Chart.defaults.font.family = "'Segoe UI', Arial, sans-serif";
  Chart.defaults.color = '#374151';

  state.charts.push(new Chart(document.getElementById('chartTendencia'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Realizado',
          data: totalVisible.map(item => item.realized),
          borderColor: '#2563eb',
          backgroundColor: '#2563eb',
          tension: 0.25
        },
        {
          label: 'Tendência',
          data: totalVisible.map(item => item.trend),
          borderColor: '#16a34a',
          backgroundColor: '#16a34a',
          borderDash: [6, 6],
          tension: 0.25
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + fmtBR(ctx.parsed.y)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => fmtBR(value)
          }
        }
      }
    }
  }));

  state.charts.push(new Chart(document.getElementById('chartRdiMtg'), {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'RDI',
          data: rdiData,
          borderColor: '#7c3aed',
          backgroundColor: '#7c3aed',
          tension: 0.25
        },
        {
          label: 'MTG',
          data: mtgData,
          borderColor: '#f97316',
          backgroundColor: '#f97316',
          tension: 0.25
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ': ' + fmtBR(ctx.parsed.y)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: value => fmtBR(value)
          }
        }
      }
    }
  }));

  if (metaRegionalData.length) {
    state.charts.push(new Chart(document.getElementById('chartMetaRegional'), {
      type: 'bar',
      data: {
        labels: metaRegionalData.map(item => item.label),
        datasets: [
          {
            label: 'Tendência',
            data: metaRegionalData.map(item => item.trend),
            backgroundColor: '#2563eb',
            borderRadius: 8
          },
          {
            label: 'Meta',
            data: metaRegionalData.map(item => item.meta),
            backgroundColor: '#9ca3af',
            borderRadius: 8
          }
        ]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: ctx => ctx.dataset.label + ': ' + fmtBR(ctx.parsed.y)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => fmtBR(value)
            }
          }
        }
      }
    }));
  }

  if (executive && executive.budget != null) {
    state.charts.push(new Chart(document.getElementById('chartBudget'), {
      type: 'bar',
      data: {
        labels: [
          `Projeção ${executive.focusYear}`,
          `Orçamento ${executive.focusYear}`
        ],
        datasets: [{
          label: 'Valor',
          data: [
            executive.projection,
            executive.budget
          ],
          backgroundColor: [
            '#16a34a',
            '#111827'
          ],
          borderRadius: 10
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: ctx => 'Valor: ' + fmtBR(ctx.parsed.y)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => fmtBR(value)
            }
          }
        }
      }
    }));
  }

  if (daily.labels.length) {
    state.charts.push(new Chart(document.getElementById('chartDemandantes'), {
      type: 'line',
      data: {
        labels: daily.labels,
        datasets: [{
          label: 'IDs acumulados',
          data: daily.values,
          borderColor: '#0f766e',
          backgroundColor: '#0f766e',
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: ctx => 'IDs acumulados: ' + fmtInt(ctx.parsed.y)
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => fmtInt(value)
            }
          }
        }
      }
    }));
  }
}

function destroyCharts() {
  state.charts.forEach(chart => chart.destroy());
  state.charts = [];
}

function renderTable(containerId, headers, rows) {
  const container = document.getElementById(containerId);

  let html = '<table><thead><tr>';

  headers.forEach(header => {
    html += `<th>${esc(header)}</th>`;
  });

  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';

    row.forEach(cellObj => {
      html += `<td class="${cellObj.cls || ''}">${esc(cellObj.value)}</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody></table>';

  container.innerHTML = html;
}

function cell(value, cls = '') {
  return {
    value,
    cls
  };
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function showGlobalAlert(message, type = 'info') {
  const alert = document.getElementById('globalAlert');
  alert.innerHTML = message;
  alert.className = `alert ${type}`;
  alert.hidden = false;
}

function clearWarnings() {
  document.getElementById('warnings').innerHTML = '';
}

function addWarning(message) {
  const div = document.createElement('div');
  div.className = 'alert warning';
  div.innerHTML = message;
  document.getElementById('warnings').appendChild(div);
}
