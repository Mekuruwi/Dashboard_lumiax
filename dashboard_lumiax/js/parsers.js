// parsers.js - Funções de parsing de arquivos

function parseMainAoA(aoa) {
  const header = findHeaderRow(aoa, mainAliases, 5);

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho da BASE_LUMIAX. ' +
      'Esperado encontrar colunas como Unidade, ID, EXAMES, Modalidade, Faturamento, Data de Conclução, Mês_ano, SERVIÇO, regional, Volume, Receita, UNIDADE_PADRÃO, CNPJ.'
    );
  }

  const records = [];

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const get = field => header.colMap[field] != null ? row[header.colMap[field]] : null;

    const id = cleanText(get('id'));
    const exames = cleanText(get('exames'));
    const servico = cleanText(get('servico'));
    const regional = cleanText(get('regional')) || '(não informado)';
    const volume = parseNumber(get('volume'));
    const receita = parseNumber(get('receita'));
    const data = parseDate(get('data'));
    const mesAno = cleanText(get('mesano'));
    const cnpj = cleanText(get('cnpj'));

    const month = getMonthInfo(data, mesAno);

    if (!id && !exames && receita === 0 && volume === 0) continue;

    records.push({
      id,
      exames,
      servico,
      servicoNorm: normalizeKey(servico),
      exameNorm: normalizeKey(exames),
      regional,
      volume,
      receita,
      data,
      cnpj,
      cnpjDigits: onlyDigits(cnpj),
      monthKey: month.key,
      monthLabel: month.label,
      custoUnit: 0,
      custoTotal: 0
    });
  }

  if (!records.length) {
    throw new Error('Nenhum registro útil foi encontrado na BASE_LUMIAX após o cabeçalho.');
  }

  return records;
}

function parseDaysAoA(aoa) {
  const header = findHeaderRow(aoa, dayAliases, 2);

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho da base de dias úteis. ' +
      'Esperado encontrar colunas como mês ano, DIA, DIA S e PESO.'
    );
  }

  const days = [];

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const get = field => header.colMap[field] != null ? row[header.colMap[field]] : null;

    const mesAno = cleanText(get('mesano'));
    const dia = parseDate(get('dia'));
    const diaSemana = cleanText(get('diasemana'));
    const peso = parseNumber(get('peso'));

    if (!dia && !mesAno) continue;

    days.push({
      mesAno,
      dia,
      diaSemana,
      peso: isNaN(peso) ? 0 : peso
    });
  }

  if (!days.length) {
    throw new Error('Nenhum registro útil foi encontrado na base de dias úteis.');
  }

  return days;
}

function parseCostAoA(aoa) {
  const header = findHeaderRow(aoa, costAliases, 2);

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho da base de custo. ' +
      'Esperado encontrar colunas como LAUDO e Custo do exame.'
    );
  }

  const map = new Map();

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const get = field => header.colMap[field] != null ? row[header.colMap[field]] : null;

    const laudo = cleanText(get('laudo'));
    const custo = parseNumber(get('custo'));

    if (!laudo) continue;

    map.set(normalizeKey(laudo), custo);
  }

  if (!map.size) {
    throw new Error('Nenhum custo válido foi encontrado na base de custo.');
  }

  return map;
}

function parseMetaAoA(aoa) {
  const monthNorms = ['mesano', 'mes', 'competencia', 'periodo'];
  let header = null;

  const maxRows = Math.min(aoa.length, 100);

  for (let i = 0; i < maxRows; i++) {
    const row = aoa[i];

    if (!Array.isArray(row)) continue;

    let mesCol = -1;
    const regionalCols = [];

    for (let j = 0; j < row.length; j++) {
      const normalized = normalizeKey(row[j]);

      if (!normalized) continue;

      if (monthNorms.includes(normalized)) {
        mesCol = j;
      } else if (!['total', 'soma'].includes(normalized)) {
        regionalCols.push({
          index: j,
          label: cleanText(row[j]),
          norm: normalized
        });
      }
    }

    if (mesCol >= 0 && regionalCols.length >= 1) {
      header = {
        rowIndex: i,
        mesCol,
        regionalCols
      };
      break;
    }
  }

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho da meta regional. ' +
      'Esperado uma coluna de mês e colunas de regionais, como CO, CRC, NO/NE, RIOMINAS, SPSUL.'
    );
  }

  const map = new Map();
  const headers = header.regionalCols.map(item => item.label);

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const monthLabel = cleanText(row[header.mesCol]);
    const month = monthInfoFromLabel(monthLabel);

    if (month.key === '9999-99') continue;

    const regionals = new Map();
    let total = 0;

    header.regionalCols.forEach(col => {
      const value = parseNumber(row[col.index]);
      regionals.set(col.norm, {
        label: col.label,
        value
      });
      total += value;
    });

    map.set(month.key, {
      label: month.label,
      total,
      regionals
    });
  }

  if (!map.size) {
    throw new Error('Nenhum mês válido foi encontrado na meta regional.');
  }

  return {
    map,
    headers
  };
}

function parseBudgetAoA(aoa) {
  const header = findHeaderRow(aoa, budgetAliases, 2);

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho do orçamento por ano. ' +
      'Esperado encontrar colunas como ano e valor.'
    );
  }

  const map = new Map();

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const get = field => header.colMap[field] != null ? row[header.colMap[field]] : null;

    const ano = parseNumber(get('ano'));
    const valor = parseNumber(get('valor'));

    if (ano > 1900 && ano < 2200) {
      map.set(Math.round(ano), valor);
    }
  }

  if (!map.size) {
    throw new Error('Nenhum orçamento válido foi encontrado.');
  }

  return map;
}

function parseFunnelAoA(aoa) {
  const header = findHeaderRow(aoa, funnelAliases, 2);

  if (!header) {
    throw new Error(
      'Não foi possível localizar o cabeçalho da Base Funil. ' +
      'Esperado encontrar colunas como Cnpj, Razão Social e Potencial.'
    );
  }

  const map = new Map();

  for (let i = header.rowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i];

    if (isEmptyRow(row)) continue;

    const get = field => header.colMap[field] != null ? row[header.colMap[field]] : null;

    const cnpj = cleanText(get('cnpj'));
    const cnpjDigits = onlyDigits(cnpj);

    if (!cnpjDigits) continue;

    const razao = cleanText(get('razao'));
    const nomeFantasia = cleanText(get('nomefantasia'));
    const regional = cleanText(get('regional'));
    const potencial = parseNumber(get('potencial'));

    map.set(cnpjDigits, {
      cnpjDigits,
      cnpjFormatted: formatCnpj(cnpjDigits),
      razao,
      nomeFantasia,
      regional,
      potencial
    });
  }

  if (!map.size) {
    throw new Error('Nenhum CNPJ válido foi encontrado na Base Funil.');
  }

  return map;
}

function buildDiasMap(days) {
  const map = new Map();

  days.forEach(day => {
    let key = null;
    let label = null;

    if (day.dia) {
      key = monthKeyFromDate(day.dia);
      label = monthLabelFromDate(day.dia);
    } else {
      const info = monthInfoFromLabel(day.mesAno);
      key = info.key;
      label = info.label;
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        closed: 0,
        days: []
      });
    }

    const entry = map.get(key);
    entry.closed += day.peso || 0;

    if (day.dia) {
      entry.days.push({
        date: stripTime(day.dia),
        peso: day.peso || 0
      });
    }
  });

  map.forEach(entry => {
    entry.days.sort((a, b) => a.date - b.date);
  });

  return map;
}
