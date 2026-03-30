# My Broker — CRM & Simulador de Propostas

Plataforma integrada para consultoria em consórcios, planos de saúde e seguros de vida.

## Rotas

- **`/`** → CRM completo (Negociações, Contatos, Empresas, Tarefas)
- **`/simulador`** → Simulador de Propostas de Consórcio

## Funcionalidades do CRM

- **Negociações** — Pipeline Kanban + Lista (toggle), drag-and-drop, status
- **Contatos** — Cadastro separado, vínculos com empresas e dependentes
- **Empresas** — KPIs (valor em andamento/vendido/perdido), ticket médio
- **Tarefas** — Página dedicada com filtros
- **Formulário contextual** — Campos adaptam por produto/modalidade/ramo
- **Lead Score** — Pontuação A-E + estrelas 1-5
- **Templates** — Mensagens com variáveis para WhatsApp/E-mail
- **Marcar Venda/Perda** — Status tracking

## Funcionalidades do Simulador

- Geração de propostas de crédito patrimonial programado
- Leitura automática de propostas via IA
- Compartilhamento por código único
- Múltiplos tipos de proposta (Simplificada, Padrão, Analítica)

## Deploy

### Via GitHub + Vercel (recomendado)

1. Suba no GitHub
2. Importe no Vercel → Deploy automático
3. Framework: Vite

### Local

```bash
npm install
npm run dev
```

## Estrutura

```
src/
├── App.jsx                    # CRM principal
├── Simulador.jsx              # Simulador de propostas
├── main.jsx                   # Roteamento (/ → CRM, /simulador → Simulador)
├── styles.css                 # CSS global do CRM
├── utils/
│   ├── constants.js           # Constantes
│   ├── helpers.js             # Utilitários, score, modelos
│   └── storage.js             # Adaptador localStorage
└── components/
    ├── UI.jsx                 # Componentes compartilhados
    ├── Contacts.jsx           # Contatos
    ├── Companies.jsx          # Empresas com KPIs
    ├── NegotiationForm.jsx    # Form contextual (3 passos)
    ├── NegotiationDetail.jsx  # Detalhe estilo RD Station
    ├── NegotiationPipeline.jsx # Kanban + Lista
    ├── Tasks.jsx              # Tarefas
    └── ActivityForm.jsx       # Atividades
```
