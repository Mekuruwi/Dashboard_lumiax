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
    updateFileStatusUI();
  }
}

function updateFileStatusUI() {
  updateFileStatus('mainStatus', state.mainRecords.length, 'registros');
  updateFileStatus('daysStatus', state.diasMap.size, 'meses');
  updateFileStatus('costStatus', state.costMap.size, 'itens');
  updateFileStatus('metaStatus', state.metaMap.size, 'meses');
  updateFileStatus('budgetStatus', state.budgetMap.size, 'anos');
  updateFileStatus('funnelStatus', state.funnelMap.size, 'CNPJs');
}

function updateFileStatus(elementId, count, label) {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = count > 0 ? `${fmtInt(count)} ${label}` : 'não carregado';
  }
}
