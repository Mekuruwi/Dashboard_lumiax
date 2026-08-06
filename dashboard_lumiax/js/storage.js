// storage.js - Persistência de dados no localStorage

function saveToStorage(key, data) {
  try {
    const serialized = JSON.stringify(data);
    localStorage.setItem(`lumiax_${key}`, serialized);
    console.log(`Dados salvos: ${key}`);
  } catch (error) {
    console.error('Erro ao salvar dados:', error);
  }
}

function loadFromStorage(key) {
  try {
    const serialized = localStorage.getItem(`lumiax_${key}`);
    if (serialized === null) return null;
    return JSON.parse(serialized);
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return null;
  }
}

function clearStorage() {
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('lumiax_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Storage limpo');
  } catch (error) {
    console.error('Erro ao limpar storage:', error);
  }
}

function restoreState() {
  const mainRecords = loadFromStorage('mainRecords');
  const daysRaw = loadFromStorage('daysRaw');
  const costMapData = loadFromStorage('costMap');
  const metaData = loadFromStorage('metaData');
  const budgetMapData = loadFromStorage('budgetMap');
  const funnelMapData = loadFromStorage('funnelMap');

  let restored = false;

  if (mainRecords) {
    state.mainRecords = mainRecords;
    restored = true;
  }

  if (daysRaw) {
    state.daysRaw = daysRaw;
    state.diasMap = buildDiasMap(daysRaw);
    restored = true;
  }

  if (costMapData && Array.isArray(costMapData)) {
    state.costMap = new Map(costMapData);
    restored = true;
  }

  if (metaData) {
    state.metaMap = new Map(metaData.map);
    state.metaHeaders = metaData.headers || [];
    restored = true;
  }

  if (budgetMapData && Array.isArray(budgetMapData)) {
    state.budgetMap = new Map(budgetMapData);
    restored = true;
  }

  if (funnelMapData && Array.isArray(funnelMapData)) {
    state.funnelMap = new Map(funnelMapData);
    restored = true;
  }

  if (restored) {
    showGlobalAlert('Dados restaurados do armazenamento local.', 'info');
    updateAll();
  }
}

function updateFileStatusUI(fileId, statusId, count, label) {
  const statusEl = document.getElementById(statusId);
  if (count > 0) {
    statusEl.textContent = `${fmtInt(count)} ${label}`;
    document.getElementById(fileId).dataset.loaded = 'true';
  } else {
    statusEl.textContent = 'não carregado';
    document.getElementById(fileId).dataset.loaded = 'false';
  }
}
