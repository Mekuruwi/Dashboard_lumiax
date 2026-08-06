'use strict';

// Estado global da aplicação
const state = {
  mainRecords: [],
  daysRaw: [],
  diasMap: new Map(),
  costMap: new Map(),
  metaMap: new Map(),
  metaHeaders: [],
  budgetMap: new Map(),
  funnelMap: new Map(),
  monthList: [],
  agg: new Map(),
  focusMonth: '',
  cutoff: stripTime(new Date()),
  period: 'last12',
  metaDemandantes: 0,
  costInfo: {
    matched: 0,
    missing: 0,
    total: 0
  },
  charts: []
};

// Mapeamento de aliases para colunas da BASE_LUMIAX
const mainAliases = {
  unidade: ['unidade', 'unidad'],
  id: ['id'],
  exames: ['exames', 'exame'],
  modalidade: ['modalidade'],
  faturamento: ['faturamento'],
  data: [
    'datadeconclusao',
    'dataconclusao',
    'datadeconclucao',
    'dataconclucao',
    'data',
    'dtconclusao'
  ],
  mesano: ['mesano', 'mes', 'competencia'],
  servico: ['servico', 'service'],
  regional: ['regional', 'regiao'],
  volume: ['volume', 'vol', 'qtd', 'quantidade'],
  receita: ['receita', 'receitatotal', 'valortotal'],
  unidadepadrao: ['unidadepadrao'],
  cnpj: ['cnpj']
};

// Mapeamento de aliases para colunas de dias úteis
const dayAliases = {
  mesano: ['mesano', 'mes', 'competencia', 'periodo'],
  dia: ['dia', 'datadia', 'data'],
  diasemana: ['dias', 'diadasemana', 'diasemana', 'diase', 'diasem'],
  peso: ['peso', 'pond', 'valorpeso']
};

const costAliases = {
  laudo: ['laudo', 'exame', 'descricao', 'servico', 'nomedoexame', 'procedimento'],
  custo: ['custodoexame', 'custo', 'valorcusto', 'custounitario', 'valor']
};

const budgetAliases = {
  ano: ['ano', 'year'],
  valor: ['valor', 'orcamento', 'value', 'valororcado']
};

const funnelAliases = {
  cnpj: ['cnpj'],
  razao: ['razaosocial', 'razao', 'cliente'],
  nomefantasia: ['nomefantasia', 'fantasia'],
  regional: ['regional', 'regiao'],
  potencial: ['potencial', 'valorpotencial', 'potencialmensal']
};

const mainFile = document.getElementById('mainFile');
const daysFile = document.getElementById('daysFile');
const costFile = document.getElementById('costFile');
const metaFile = document.getElementById('metaFile');
const budgetFile = document.getElementById('budgetFile');
const funnelFile = document.getElementById('funnelFile');

const mainStatus = document.getElementById('mainStatus');
const daysStatus = document.getElementById('daysStatus');
const costStatus = document.getElementById('costStatus');
const metaStatus = document.getElementById('metaStatus');
const budgetStatus = document.getElementById('budgetStatus');
const funnelStatus = document.getElementById('funnelStatus');

const focusMonth = document.getElementById('focusMonth');
const cutoffDate = document.getElementById('cutoffDate');
const periodSelect = document.getElementById('periodSelect');
const metaDemandantesInput = document.getElementById('metaDemandantes');

cutoffDate.value = toInputDate(state.cutoff);
periodSelect.value = state.period;

mainFile.addEventListener('change', () => {
  loadFile(mainFile, 'mainFile', parseMainAoA, result => {
    state.mainRecords = result;
    saveToStorage('mainRecords', result);
  });
});

daysFile.addEventListener('change', () => {
  loadFile(daysFile, 'daysFile', parseDaysAoA, result => {
    state.daysRaw = result;
    state.diasMap = buildDiasMap(result);
    saveToStorage('daysRaw', result);
  });
});

costFile.addEventListener('change', () => {
  loadFile(costFile, 'costFile', parseCostAoA, result => {
    state.costMap = result;
    saveToStorage('costMap', Array.from(result.entries()));
  });
});

metaFile.addEventListener('change', () => {
  loadFile(metaFile, 'metaFile', parseMetaAoA, result => {
    state.metaMap = result.map;
    state.metaHeaders = result.headers;
    saveToStorage('metaData', { map: Array.from(result.map.entries()), headers: result.headers });
  });
});

budgetFile.addEventListener('change', () => {
  loadFile(budgetFile, 'budgetFile', parseBudgetAoA, result => {
    state.budgetMap = result;
    saveToStorage('budgetMap', Array.from(result.entries()));
  });
});

funnelFile.addEventListener('change', () => {
  loadFile(funnelFile, 'funnelFile', parseFunnelAoA, result => {
    state.funnelMap = result;
    saveToStorage('funnelMap', Array.from(result.entries()));
  });
});

focusMonth.addEventListener('change', () => {
  state.focusMonth = focusMonth.value;
  updateAll();
});

cutoffDate.addEventListener('change', () => {
  const parsed = parseInputDate(cutoffDate.value);
  state.cutoff = parsed ? stripTime(parsed) : stripTime(new Date());
  updateAll();
});

periodSelect.addEventListener('change', () => {
  state.period = periodSelect.value;
  updateAll();
});

metaDemandantesInput.addEventListener('input', () => {
  state.metaDemandantes = parseNumber(metaDemandantesInput.value);
  updateAll();
});

async function loadFile(input, inputId, parser, onSuccess) {
  const file = input.files[0];
  if (!file) return;

  try {
    showGlobalAlert(`Processando ${file.name}...`, 'info');
    const aoa = await fileToAoA(file);
    const result = parser(aoa);
    onSuccess(result);
    updateAll();
    updateFileStatusUI();
    showGlobalAlert('Arquivo processado com sucesso.', 'info');
  } catch (error) {
    console.error(error);
    showGlobalAlert(`Erro ao processar arquivo: ${error.message}`, 'error');
  }
}

async function fileToAoA(file) {
  if (typeof XLSX === 'undefined') {
    throw new Error('A biblioteca XLSX não foi carregada. Verifique sua internet.');
  }

  const data = await file.arrayBuffer();

  const workbook = XLSX.read(data, {
    type: 'array',
    cellDates: true
  });

  const worksheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: null,
    raw: true
  });
}

function updateAll() {
  clearWarnings();
  renderStatus();

  if (!state.mainRecords.length) {
    renderEmpty();
    return;
  }

  applyCosts();
  state.monthList = buildMonthList(state.mainRecords);
  populateFocusSelect();
  state.agg = aggregateBase();

  if (!state.diasMap.size) {
    addWarning('A base de dias úteis ainda não foi carregada. As tendências ficarão zeradas.');
  }

  if (!state.costMap.size) {
    addWarning('A base de custo ainda não foi carregada. Margem ficará sem custo.');
  } else if (state.costInfo.missing > 0) {
    const pctMissing = state.costInfo.total ? state.costInfo.missing / state.costInfo.total : 0;
    addWarning(
      `Base de custo carregada, mas <strong>${fmtInt(state.costInfo.missing)}</strong> de ` +
      `<strong>${fmtInt(state.costInfo.total)}</strong> registros principais ficaram sem custo ` +
      `(${fmtPct(pctMissing)}). Confira a tabela de exames sem custo.`
    );
  }

  if (!state.metaMap.size) {
    addWarning('A base de meta regional ainda não foi carregada. Gap e metas ficarão vazios.');
  }

  if (!state.budgetMap.size) {
    addWarning('A base de orçamento anual ainda não foi carregada.');
  }

  if (!state.funnelMap.size) {
    addWarning('A Base Funil ainda não foi carregada. Potencial por CNPJ ficará vazio.');
  }

  const seriesTotal = buildTrendSeries(key => getAggValue(key, 'receita'));
  const seriesRDI = buildTrendSeries(key => getAggValue(key, 'rdiReceita'));
  const seriesMTG = buildTrendSeries(key => getAggValue(key, 'mtgReceita'));

  const executive = renderExecutiveKPIs(seriesTotal);
  const metaRegionalData = renderRegionalMetaTable();

  renderKPIs(seriesTotal);
  renderTrendTable(seriesTotal);
  renderRdiMtgTable(seriesRDI, seriesMTG);
  renderMarginTable();
  renderDemandMonthTable();
  renderRegionalTable();
  renderServiceCombo();
  renderServiceMetaTable();
  renderMissingCostTable();
  renderFunnelTable();

  const daily = renderDailyIds();

  renderCharts(
    seriesTotal,
    seriesRDI,
    seriesMTG,
    daily,
    metaRegionalData,
    executive
  );
}

function renderEmpty() {
  const ids = [
    'kpiRealizado',
    'kpiTendencia',
    'kpiRobDu',
    'kpiCusto',
    'kpiMargem',
    'kpiMargemPct',
    'kpiDemandantes',
    'kpiProjecao',
    'kpiOrcamento',
    'kpiGapOrcamento',
    'kpiMetaMes',
    'kpiAtingimentoMes',
    'kpiMetaDemandantes',
    'kpiGapDemandantes'
  ];

  ids.forEach(id => setText(id, '-'));

  const tables = [
    'trendTable',
    'rdiMtgTable',
    'marginTable',
    'demandMonthTable',
    'regionalTable',
    'dailyIdsTable',
    'missingCostTable',
    'regionalMetaTable',
    'serviceMetaTable',
    'funnelTable'
  ];

  tables.forEach(id => document.getElementById(id).innerHTML = '');

  document.getElementById('serviceCombo').innerHTML = '';

  destroyCharts();
}

function renderStatus() {
  mainStatus.textContent = state.mainRecords.length
    ? `${fmtInt(state.mainRecords.length)} registros`
    : 'não carregado';

  daysStatus.textContent = state.diasMap.size
    ? `${fmtInt(state.diasMap.size)} meses`
    : 'não carregado';

  costStatus.textContent = state.costMap.size
    ? `${fmtInt(state.costMap.size)} itens`
    : 'não carregado';

  metaStatus.textContent = state.metaMap.size
    ? `${fmtInt(state.metaMap.size)} meses`
    : 'não carregado';

  budgetStatus.textContent = state.budgetMap.size
    ? `${fmtInt(state.budgetMap.size)} anos`
    : 'não carregado';

  funnelStatus.textContent = state.funnelMap.size
    ? `${fmtInt(state.funnelMap.size)} CNPJs`
    : 'não carregado';
}

function populateFocusSelect() {
  const currentValid = state.focusMonth && state.monthList.some(m => m.key === state.focusMonth);
  const desired = currentValid
    ? state.focusMonth
    : state.monthList.length ? state.monthList[state.monthList.length - 1].key : '';

  focusMonth.innerHTML = '';

  state.monthList.forEach(m => {
    const option = document.createElement('option');
    option.value = m.key;
    option.textContent = m.label;
    focusMonth.appendChild(option);
  });

  focusMonth.value = desired;
  state.focusMonth = desired;
}
