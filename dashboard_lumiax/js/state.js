// state.js - Estado global da aplicação

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
