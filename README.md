# EduConnect
EduConnect — MVP (README)

Protótipo acadêmico de uma plataforma de aprendizagem colaborativa.
Os estudantes podem entrar, criar/participar de grupos, compartilhar materiais por link e agendar mentorias.
Funciona offline (navegador/localStorage) e, quando configurado, sincroniza com o Airtable.

Aviso: este MVP é só para fins didáticos. O token do Airtable fica no frontend — não use isso em produção.

✨ Funcionalidades

Login simples: nome + e-mail (sem senha).

Grupos de estudo: criar grupo, entrar em grupo, ver “Meus grupos”.

Materiais: adicionar URL com título, listar por grupo.

Mentorias: agendar (título, tópico, data/hora, mentor), filtrar por status, Confirmar e Concluir.

Sincronização: local → Airtable e Airtable → local (pull ao clicar Sincronizar).

🧭 Mapa Integrado (Arquitetura & Processo)
Camada Técnica

Frontend: HTML + CSS + JavaScript (estado no localStorage).

“Backend” do MVP: Airtable (API REST) como BaaS.

Banco de dados (Airtable):

Grupos: IdDoGrupo, Nome, Descricao, EmailDoDono

Materiais: IdDoMaterial, IdDoGrupo, Titulo, Url, Remetente, Email, DataIso

Participacoes: EmailDoUsuario, IdDoGrupo

Mentorias: IdDaMentoria, Titulo, Topico, IdDoGrupo, MentorNome, MentorEmail, SolicitanteNome, SolicitanteEmail, DataHoraIso, Status (PENDENTE/CONFIRMADA/CONCLUIDA)

Camada de Experiência (UX)

Textos e rótulos em PT-BR, botões claros, feedback com “toast”.

Acessibilidade básica: foco por teclado, contraste adequado.

Fluxos principais: Login → Grupos → Materiais → Mentorias.

Camada de Gestão (SCRUM)

Papéis: PO (prioriza), SM (facilita), Devs (entregam).

Cerimônias: Planejamento, Daily, Review, Retrospective.

Kanban: Product Backlog → Sprint (A Fazer) → Em Progresso → Revisão/QA → Pronto → Bugs.

Definição de Pronto (DoD): ver seção mais abaixo.

🗂️ Estrutura de pastas
/ (raiz do projeto)
├── index.html
├── style.css
└── script.js

▶️ Como rodar localmente

Baixe/clonar este repositório.

Abra a pasta no VS Code e rode um servidor local (para evitar CORS):

Extensão Live Server (recomendado) ou

Python: python -m http.server 5500 e abra http://localhost:5500

(Opcional) Configure o Airtable (abaixo). Sem Airtable, tudo funciona só local.

🔗 Configurar o Airtable (opcional, para sincronizar)

Crie uma Base (ex.: “EduConnect”) com 4 tabelas (nomes e campos exatos):

Grupos

IdDoGrupo (Single line text)

Nome (Single line text)

Descricao (Long ou Single line text)

EmailDoDono (Email)

Materiais

IdDoMaterial (Single line text)

IdDoGrupo (Single line text)

Titulo (Single line text)

Url (URL)

Remetente (Single line text)

Email (Email)

DataIso (Single line text)

Participacoes

EmailDoUsuario (Email)

IdDoGrupo (Single line text)

Mentorias

IdDaMentoria (Single line text)

Titulo (Single line text)

Topico (Single line text)

IdDoGrupo (Single line text)

MentorNome (Single line text)

MentorEmail (Email)

SolicitanteNome (Single line text)

SolicitanteEmail (Email)

DataHoraIso (Single line text)

Status (Single select: PENDENTE, CONFIRMADA, CONCLUIDA)

Gere um Token Pessoal (PAT) no Airtable:

Escopos: data.records:read e data.records:write.

Dê acesso à sua Base.

Descubra o Base ID (começa com app...) na doc de API da sua base.

No arquivo script.js, edite:

const AIRTABLE = {
  habilitado: true, // ou false se quiser rodar só local
  baseId: "appAg0wUVhqHnwW9o",
  token:  "pat120TZhIwBW5uMp.c2d80ab5f598ac3ccc81035bf1ae51440af3e8130ae2c5bed9fcb30b2b20d54a",
  tabelas: {
    grupos: "Grupos",
    materiais: "Materiais",
    participacoes: "Participacoes",
    mentorias: "Mentorias"
  }
};


Importante: nomes de tabelas e campos são sensíveis. Participacoes é sem acento.
Em produção, não expor o token no frontend — use um backend.

🚀 Deploy no GitHub Pages

Faça commit/push para a branch main (ou master).

No GitHub, vá em Settings → Pages:

Source: Deploy from a branch

Branch: main (pasta /root)

Aguarde e acesse a URL do Pages gerada.

🧪 Como testar (roteiro rápido)

Entrar com nome + e-mail.

Criar grupo (ou entrar em um existente).

Materiais: selecionar o grupo → adicionar título + URL (https://…).

Mentorias: preencher título, tópico, data/hora, mentor (grupo é opcional) → Agendar.

Ver em Minhas mentorias, filtrar por Status, clicar Confirmar e Concluir.

Sincronizar: clique no botão Sincronizar para puxar dados do Airtable.

Se o Airtable não estiver configurado ou falhar, o MVP continua salvando localmente.

✅ Definição de Pronto (DoD)

Um item só está PRONTO quando:

Código no GitHub, sem erros no console.

Critérios de aceitação atendidos (ver cards no Trello).

Funciona em desktop e mobile.

Acessibilidade básica (teclado + contraste).

Integração com Airtable testada (se habilitada).

README atualizado e Pages no ar.

🛠️ Solução de problemas (Airtable)

401 Unauthorized: Token errado ou sem escopos de leitura/escrita.

403 Forbidden: Token não tem acesso à base.

404 Not Found: Nome da tabela diferente (ex.: Mentorias escrito diferente).

422 Unprocessable Entity: Campo com nome ou tipo errado (ex.: DataHoraIso escrito diferente, Url não é campo URL).

CORS/TypeError: abriu o index.html como file://. Rode via Live Server ou http.server.

Abra o Console (F12) e veja a mensagem completa para identificar o campo/tabela que falhou.

🧱 Limitações e próximos passos

Sem autenticação real (apenas e-mail/nome).

Token do Airtable exposto no frontend (não seguro para produção).

Sem upload de arquivo (só links).

Próximos passos: backend próprio, autenticação, permissões por papel, upload, tempo real.

🧑‍🤝‍🧑 Créditos

Projeto acadêmico “EduConnect — MVP”.
Equipe: PO • SM • Devs (preencher nomes).
Professor/Disciplina: (preencher).

📎 Links úteis (preencher)

Trello (Kanban): https://trello.com/invite/b/68d52f1218830b2d20926479/ATTI4f4985c50cdb8fa9b2e7a7ee8600b0b9142A1F81/prova-p1 
