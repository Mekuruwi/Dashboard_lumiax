// utils.js - Funções utilitárias de formatação e parsing

function normalizeKey(value) {
  if (value == null) return '';

  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function isEmptyRow(row) {
  if (!row || !row.length) return true;

  return row.every(value => {
    return value === null || value === undefined || String(value).trim() === '';
  });
}

function cleanText(value) {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleDateString('pt-BR');
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';

  return String(value).trim();
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function formatCnpj(digits) {
  digits = onlyDigits(digits);

  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  return digits;
}

function parseNumber(value) {
  if (value == null || value === '') return 0;

  if (typeof value === 'number') {
    return isFinite(value) ? value : 0;
  }

  if (value instanceof Date) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;

  let text = String(value).trim();

  if (!text) return 0;

  text = text.replace(/R\$/gi, '').replace(/[\s\u00A0]/g, '');

  let negative = false;

  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.replace(/[()]/g, '');
  }

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (lastComma > -1) {
    text = text.replace(/,/g, '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }

  const number = parseFloat(text);

  if (isNaN(number)) return 0;

  return negative ? -number : number;
}

function parseDate(value) {
  if (value == null || value === '') return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : stripTime(value);
  }

  if (typeof value === 'number') {
    if (value <= 0) return null;

    const date = new Date(1899, 11, 30);
    date.setDate(date.getDate() + Math.floor(value));

    return isNaN(date.getTime()) ? null : stripTime(date);
  }

  if (typeof value === 'string') {
    const text = value.trim();

    if (!text) return null;

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    match = text.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);

    if (match) {
      let year = parseInt(match[3], 10);

      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      const month = parseInt(match[2], 10) - 1;
      const day = parseInt(match[1], 10);

      const date = new Date(year, month, day);

      if (date.getMonth() === month) {
        return stripTime(date);
      }
    }

    const date = new Date(text);

    return isNaN(date.getTime()) ? null : stripTime(date);
  }

  return null;
}

function parseInputDate(value) {
  if (!value) return null;

  const parts = value.split('-').map(Number);

  if (parts.length !== 3) return null;

  const date = new Date(parts[0], parts[1] - 1, parts[2]);

  return isNaN(date.getTime()) ? null : date;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function shiftMonthKey(key, delta) {
  if (!key || key === '9999-99') return '';

  const parts = key.split('-').map(Number);

  if (parts.length !== 2) return '';

  const date = new Date(parts[0], parts[1] - 1 + delta, 1);

  return monthKeyFromDate(date);
}

function getMonthInfo(dateValue, mesAnoValue) {
  if (dateValue) {
    return {
      key: monthKeyFromDate(dateValue),
      label: monthLabelFromDate(dateValue)
    };
  }

  return monthInfoFromLabel(mesAnoValue);
}

function monthKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return `${year}-${month}`;
}

function monthLabelFromDate(date) {
  return `${monthPt(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function monthLabelFromKey(key) {
  if (!key) return '';

  const [year, month] = key.split('-');

  const monthNumber = Number(month);

  if (!year || !monthNumber || monthNumber < 1 || monthNumber > 12) {
    return key;
  }

  return `${monthPt(monthNumber)}/${year}`;
}

function monthInfoFromLabel(label) {
  const text = cleanText(label);

  if (!text) {
    return {
      key: '9999-99',
      label: '(sem mês)'
    };
  }

  const parts = text.split(/[\/\-\s]+/).filter(Boolean);

  if (parts.length >= 2) {
    const month = monthNumberFromAbbr(parts[0]);
    let year = parseInt(parts[1], 10);

    if (!isNaN(month) && month > 0 && !isNaN(year)) {
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }

      return {
        key: `${year}-${String(month).padStart(2, '0')}`,
        label: `${monthPt(month)}/${year}`
      };
    }
  }

  return {
    key: '9999-99',
    label: text
  };
}

function monthPt(month) {
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return months[month - 1] || '';
}

function monthNumberFromAbbr(text) {
  const key = normalizeKey(text).slice(0, 3);

  const map = {
    jan: 1,
    fev: 2,
    mar: 3,
    abr: 4,
    mai: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    set: 9,
    out: 10,
    nov: 11,
    dez: 12
  };

  return map[key] || 0;
}

function fmtInt(value) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 0
  }).format(value || 0);
}

function fmtBR(value) {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2
  }).format(value || 0);
}

function smartFmt(value) {
  if (typeof value !== 'number' || isNaN(value)) return '0';

  return Number.isInteger(value) ? fmtInt(value) : fmtBR(value);
}

function fmtPct(value) {
  if (value == null || isNaN(value) || !isFinite(value)) return '-';

  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    maximumFractionDigits: 2
  }).format(value);
}

function fmtPctArrow(value) {
  if (value == null || isNaN(value) || !isFinite(value)) return '-';

  const formatted = fmtPct(value);

  if (value > 0) return `${formatted} ↑`;
  if (value < 0) return `${formatted} ↓`;

  return formatted;
}

function esc(value) {
  return String(value ?? '')
    .replace(/[&<>"']/g, match => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[match]));
}

function findHeaderRow(aoa, aliases, minScore) {
  const normMap = makeNormMap(aliases);
  let best = null;

  const maxRows = Math.min(aoa.length, 100);

  for (let i = 0; i < maxRows; i++) {
    const row = aoa[i];

    if (!Array.isArray(row)) continue;

    const colMap = {};
    const foundFields = new Set();

    for (let j = 0; j < row.length; j++) {
      const normalized = normalizeKey(row[j]);

      if (!normalized) continue;

      const field = normMap.get(normalized);

      if (field && !foundFields.has(field)) {
        colMap[field] = j;
        foundFields.add(field);
      }
    }

    const score = foundFields.size;

    if (!best || score > best.score) {
      best = {
        score,
        rowIndex: i,
        colMap,
        headers: row
      };
    }
  }

  if (!best || best.score < minScore) return null;

  const allFields = Object.keys(aliases);
  best.missing = allFields.filter(field => !(field in best.colMap));

  return best;
}

function makeNormMap(aliases) {
  const map = new Map();

  for (const [field, list] of Object.entries(aliases)) {
    list.forEach(alias => map.set(normalizeKey(alias), field));
  }

  return map;
}
