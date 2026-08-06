// core.js - Funções utilitárias e de agregação

function applyCosts() {
  let matched = 0;
  let missing = 0;

  state.mainRecords.forEach(record => {
    const costUnit =
      state.costMap.get(record.exameNorm) ??
      state.costMap.get(record.servicoNorm) ??
      0;

    record.custoUnit = costUnit;

    const qty = record.volume > 0 ? record.volume : 1;
    record.custoTotal = costUnit * qty;

    if (costUnit > 0) {
      matched++;
    } else {
      missing++;
    }
  });

  state.costInfo = {
    matched,
    missing,
    total: state.mainRecords.length
  };
}

function buildMonthList(records) {
  const map = new Map();

  records.forEach(record => {
    if (!map.has(record.monthKey)) {
      map.set(record.monthKey, record.monthLabel);
    }
  });

  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([key, label]) => ({
      key,
      label
    }));
}

function aggregateBase() {
  const agg = new Map();

  state.mainRecords.forEach(record => {
    if (!agg.has(record.monthKey)) {
      agg.set(record.monthKey, {
        key: record.monthKey,
        label: record.monthLabel,
        receita: 0,
        volume: 0,
        custo: 0,
        rdiReceita: 0,
        mtgReceita: 0,
        missingCostReceita: 0,
        ids: new Set(),
        idService: new Map(),
        regional: new Map(),
        servicos: new Map(),
        cnpj: new Map(),
        dates: new Map()
      });
    }

    const monthAgg = agg.get(record.monthKey);

    monthAgg.receita += record.receita;
    monthAgg.volume += record.volume;
    monthAgg.custo += record.custoTotal;

    if (record.servicoNorm === 'rdi') {
      monthAgg.rdiReceita += record.receita;
    }

    if (record.servicoNorm === 'mtg') {
      monthAgg.mtgReceita += record.receita;
    }

    if (record.custoUnit === 0 && record.receita > 0) {
      monthAgg.missingCostReceita += record.receita;
    }

    if (record.id) {
      monthAgg.ids.add(record.id);

      if (!monthAgg.idService.has(record.id)) {
        monthAgg.idService.set(record.id, {
          rdi: false,
          mtg: false
        });
      }

      const service = monthAgg.idService.get(record.id);

      if (record.servicoNorm === 'rdi' && (record.receita > 0 || record.volume > 0)) {
        service.rdi = true;
      }

      if (record.servicoNorm === 'mtg' && (record.receita > 0 || record.volume > 0)) {
        service.mtg = true;
      }
    }

    const regKey = record.regional || '(não informado)';

    if (!monthAgg.regional.has(regKey)) {
      monthAgg.regional.set(regKey, {
        receita: 0,
        volume: 0,
        custo: 0,
        ids: new Set()
      });
    }

    const reg = monthAgg.regional.get(regKey);

    reg.receita += record.receita;
    reg.volume += record.volume;
    reg.custo += record.custoTotal;

    if (record.id) {
      reg.ids.add(record.id);
    }

    const serviceKey = record.servico || '(sem serviço)';

    if (!monthAgg.servicos.has(serviceKey)) {
      monthAgg.servicos.set(serviceKey, {
        receita: 0,
        volume: 0
      });
    }

    const servAgg = monthAgg.servicos.get(serviceKey);
    servAgg.receita += record.receita;
    servAgg.volume += record.volume;

    if (record.cnpjDigits) {
      if (!monthAgg.cnpj.has(record.cnpjDigits)) {
        monthAgg.cnpj.set(record.cnpjDigits, {
          receita: 0,
          volume: 0
        });
      }

      const cnpjAgg = monthAgg.cnpj.get(record.cnpjDigits);
      cnpjAgg.receita += record.receita;
      cnpjAgg.volume += record.volume;
    }

    if (record.data && record.id) {
      const dayKey = dateKey(record.data);

      if (!monthAgg.dates.has(dayKey)) {
        monthAgg.dates.set(dayKey, {
          date: stripTime(record.data),
          ids: new Set()
        });
      }

      monthAgg.dates.get(dayKey).ids.add(record.id);
    }
  });

  return agg;
}

function buildTrendSeries(getRealized) {
  const series = state.monthList.map(month => {
    const key = month.key;
    const realized = getRealized(key) || 0;

    const open = getOpenWeight(key, state.cutoff);
    const closed = getClosedWeight(key);

    const robDu = open > 0 ? realized / open : 0;
    const trend = robDu * closed;

    return {
      key,
      label: month.label,
      realized,
      open,
      closed,
      robDu,
      trend,
      growth: null
    };
  });

  for (let i = 0; i < series.length; i++) {
    if (i > 0 && series[i - 1].trend > 0) {
      series[i].growth = series[i].trend / series[i - 1].trend - 1;
    }
  }

  return series;
}

function getAggValue(monthKey, field) {
  const monthAgg = state.agg.get(monthKey);
  return monthAgg ? monthAgg[field] : 0;
}

function getVisibleKeys() {
  const all = state.monthList.map(m => m.key);

  if (!all.length) return [];

  const focusIndex = all.indexOf(state.focusMonth);
  const endIndex = focusIndex >= 0 ? focusIndex : all.length - 1;

  if (state.period === 'all') {
    return all;
  }

  if (state.period === 'year') {
    const year = state.focusMonth.slice(0, 4);
    return all.filter(key => key.startsWith(year));
  }

  if (state.period === 'last12') {
    return all.slice(Math.max(0, endIndex - 11), endIndex + 1);
  }

  if (state.period === 'last6') {
    return all.slice(Math.max(0, endIndex - 5), endIndex + 1);
  }

  if (state.period === 'last3') {
    return all.slice(Math.max(0, endIndex - 2), endIndex + 1);
  }

  return all;
}

function computeYearProjection(seriesTotal, focusYear) {
  if (!focusYear || !state.focusMonth) return 0;

  const seriesMap = new Map(seriesTotal.map(item => [item.key, item]));
  const monthKeys = new Set();

  state.monthList.forEach(month => {
    if (month.key.startsWith(String(focusYear))) {
      monthKeys.add(month.key);
    }
  });

  state.metaMap.forEach((value, key) => {
    if (key.startsWith(String(focusYear))) {
      monthKeys.add(key);
    }
  });

  const sortedKeys = [...monthKeys].sort();

  let total = 0;

  sortedKeys.forEach(key => {
    const series = seriesMap.get(key);
    const meta = state.metaMap.get(key)?.total || 0;

    if (key < state.focusMonth) {
      total += (series?.realized || meta || 0);
    } else if (key === state.focusMonth) {
      total += (series?.trend || series?.realized || meta || 0);
    } else {
      total += meta || 0;
    }
  });

  return total;
}

function getClosedWeight(monthKey) {
  const entry = state.diasMap.get(monthKey);
  return entry ? entry.closed : 0;
}

function getOpenWeight(monthKey, cutoff) {
  const entry = state.diasMap.get(monthKey);

  if (!entry) return 0;
  if (!cutoff) return entry.closed;

  const cutoffKey = monthKeyFromDate(cutoff);

  if (monthKey < cutoffKey) {
    return entry.closed;
  }

  if (monthKey > cutoffKey) {
    return 0;
  }

  if (!entry.days.length) {
    return entry.closed;
  }

  let total = 0;

  entry.days.forEach(day => {
    if (day.date <= cutoff) {
      total += day.peso;
    }
  });

  return total;
}

function comboCounts(idServiceMap) {
  let rdiOnly = 0;
  let mtgOnly = 0;
  let both = 0;

  idServiceMap.forEach(service => {
    if (service.rdi && service.mtg) {
      both++;
    } else if (service.rdi) {
      rdiOnly++;
    } else if (service.mtg) {
      mtgOnly++;
    }
  });

  return {
    total: idServiceMap.size,
    rdiOnly,
    mtgOnly,
    both
  };
}

function computeDailyCumulative(monthKey) {
  const monthAgg = state.agg.get(monthKey);

  if (!monthAgg || !monthAgg.dates.size) {
    return {
      labels: [],
      values: []
    };
  }

  const entries = [...monthAgg.dates.entries()]
    .map(([key, value]) => value)
    .sort((a, b) => a.date - b.date);

  const cumulative = new Set();
  const labels = [];
  const values = [];

  entries.forEach(entry => {
    entry.ids.forEach(id => cumulative.add(id));

    labels.push(entry.date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    }));

    values.push(cumulative.size);
  });

  return {
    labels,
    values
  };
}
