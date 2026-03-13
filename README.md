# My Broker CRM

CRM personalizado para consultoria em consórcios, planos de saúde e seguros de vida.

## Funcionalidades

- **Negociações** — Pipeline Kanban com drag-and-drop + visualização em lista (toggle)
- **Contatos** — Cadastro separado, vinculação a empresas e dependentes
- **Empresas** — Detalhe com KPIs (valor em andamento/vendido/perdido, ticket médio)
- **Tarefas** — Página dedicada com filtros (pendentes/concluídas/atrasadas)
- **Formulário contextual** — Campos adaptam conforme produto, modalidade e ramo
- **Lead Score** — Pontuação automática (A-E) + qualificação por estrelas (1-5)
- **Templates** — Mensagens com variáveis para WhatsApp/E-mail
- **Timeline** — Histórico de atividades e anotações rápidas
- **Marcar Venda/Perda** — Status tracking com motivo de perda

## Setup Local

```bash
npm install
npm run dev
```

## Deploy no Vercel

1. Suba este projeto no GitHub
2. Vá em [vercel.com](https://vercel.com)
3. Import o repositório
4. Framework: **Vite**
5. Deploy automático

## Tecnologias

- React 18
- Vite 6
- Lucide Icons
- Recharts (opcional, para gráficos avançados)
- LocalStorage para persistência

## Estrutura

```
src/
├── App.jsx              # Orquestrador principal
├── main.jsx             # Entry point
├── styles.css           # CSS global
├── utils/
│   ├── constants.js     # Constantes de domínio
│   └── helpers.js       # Utilitários, score, modelos
└── components/
    ├── UI.jsx           # Componentes compartilhados
    ├── Contacts.jsx     # Form, List, Detail de contatos
    ├── Companies.jsx    # Form, Detail com KPIs
    ├── NegotiationForm.jsx    # Form contextual (3 passos)
    ├── NegotiationDetail.jsx  # Detalhe estilo RD Station
    ├── NegotiationPipeline.jsx # Kanban + Lista toggle
    ├── Tasks.jsx        # Form + Página de tarefas
    └── ActivityForm.jsx # Registro de atividades
```
