# Dashboard Lumiax

Dashboard interativo para análise de dados da BASE_LUMIAX com integração de metas, funil e projeções.

## Estrutura do Projeto

```
dashboard_lumiax/
├── index.html          # Página principal
├── css/
│   └── style.css       # Estilos da aplicação
├── js/
│   ├── state.js        # Estado global e aliases de colunas
│   ├── utils.js        # Funções utilitárias (formatação, parsing, datas)
│   ├── storage.js      # Persistência em localStorage
│   ├── parsers.js      # Parse de arquivos Excel/CSV
│   ├── core.js         # Lógica de negócio e agregação
│   ├── renderers.js    # Renderização de KPIs, tabelas e gráficos
│   └── app.js          # Inicialização e event listeners
└── storage/            # Pasta para armazenamento futuro
```

## Funcionalidades

### Arquivos Suportados

1. **BASE_LUMIAX** - Dados principais de exames/faturamento
2. **Dias úteis** - Calendário de dias úteis com pesos
3. **Custo** - Custo por exame/procedimento
4. **Meta regional** - Metas por regional
5. **Orçamento anual** - Orçamento por ano
6. **Base Funil** - Potencial por CNPJ

### Recursos

- **Persistência de dados**: Os arquivos carregados ficam armazenados no localStorage do navegador até serem substituídos por novos uploads
- **KPIs em tempo real**: Realizado, tendência, margem, demandantes, projeção vs orçamento
- **Gráficos interativos**: Tendência, RDI vs MTG, metas regionais, projeção vs orçamento
- **Tabelas detalhadas**: Por mês, regional, serviço, CNPJ
- **Filtros**: Período (últimos 3/6/12 meses, ano, todos), data de corte

## Como Usar

1. Abra o arquivo `index.html` em um navegador moderno
2. Carregue os arquivos Excel/CSV nas respectivas seções
3. Os dados serão automaticamente processados e exibidos
4. Ajuste os parâmetros (mês foco, período, data de corte) conforme necessário
5. Os dados permanecem armazenados mesmo após fechar o navegador

## Dependências

- [SheetJS (XLSX)](https://cdn.jsdelivr.net/npm/xlsx@0.18.5/) - Leitura de arquivos Excel
- [Chart.js](https://cdn.jsdelivr.net/npm/chart.js@4.4.1/) - Gráficos interativos

## Armazenamento

Os dados carregados são persistidos no **localStorage** do navegador com o prefixo `lumiax_`. Isso significa que:

- Os dados permanecem mesmo após fechar o navegador
- Ao recarregar a página, os dados são restaurados automaticamente
- Para limpar os dados, basta carregar novos arquivos ou limpar o localStorage do navegador

## Navegadores Suportados

- Chrome (recomendado)
- Firefox
- Edge
- Safari

## Notas

- Requer conexão com internet para carregar as bibliotecas XLSX e Chart.js via CDN
- Os arquivos são processados localmente no navegador (não há upload para servidor)
