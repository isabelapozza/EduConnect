// =======================
// EduConnect MVP - app.js (PT-BR)
// Local-first + Sincronização com Airtable (DEMO)
// =======================

// ---------- Utilidades ----------
const $  = (seletor) => document.querySelector(seletor);
const $$ = (seletor) => Array.from(document.querySelectorAll(seletor));

function alerta(msg, ms = 1800){
  const t = $('#aviso');
  if(!t) { alert(msg); return; }
  t.textContent = msg;
  t.hidden = false;
  setTimeout(()=> t.hidden = true, ms);
}

function gerarId(){ return Math.random().toString(36).slice(2, 10); }

function lerLS(chave, padrao){
  try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; }
  catch { return padrao; }
}
function escreverLS(chave, valor){
  localStorage.setItem(chave, JSON.stringify(valor));
}

// ---------- Estado ----------
let estado = {
  usuario: null,
  grupos: [],
  participacoes: {},   // { emailUsuario: [idGrupo, ...] }
  materiais: {},       // { idGrupo: [{id,titulo,url,remetente,email,data}], ... }
  mentorias: []        // ADIÇÃO: [{id,titulo,topico,idGrupo,mentorNome,mentorEmail,solicitanteNome,solicitanteEmail,dataHoraIso,status}]
};

// =======================
// AIRTABLE (DEMO - token exposto; não use em produção)
// =======================
const AIRTABLE = {
  habilitado: true, // coloque false para desligar a sincronização
  baseId: "appAg0wUVhqHnwW9o",
  token:  "pat120TZhIwBW5uMp.c2d80ab5f598ac3ccc81035bf1ae51440af3e8130ae2c5bed9fcb30b2b20d54a",
  tabelas: {
    grupos: "Grupos",
    materiais: "Materiais",
    participacoes: "Participacoes",
    mentorias: "Mentorias" // ADIÇÃO
  }
};

const urlBaseAT = (tabela) =>
  `https://api.airtable.com/v0/${AIRTABLE.baseId}/${encodeURIComponent(tabela)}`;

async function chamarAirtable(tabela, { metodo="GET", parametros=null, corpo=null } = {}) {
  const url = new URL(urlBaseAT(tabela));
  if (parametros) Object.entries(parametros).forEach(([k,v]) => url.searchParams.set(k, v));
  const resp = await fetch(url, {
    method: metodo,
    headers: {
      "Authorization": `Bearer ${AIRTABLE.token}`,
      "Content-Type": "application/json"
    },
    body: corpo ? JSON.stringify(corpo) : null
  });
  if (!resp.ok) {
    const texto = await resp.text();
    throw new Error(`Airtable ${metodo} ${tabela} falhou: ${resp.status} — ${texto}`);
  }
  return resp.json();
}

// =======================
// Persistência Local
// =======================
function carregarEstado(){
  estado.usuario        = lerLS('usuario', null);
  estado.grupos         = lerLS('grupos', []);
  estado.participacoes  = lerLS('participacoes', {});
  estado.materiais      = lerLS('materiais', {});
  estado.mentorias      = lerLS('mentorias', []); // ADIÇÃO
}
function salvarEstado(){
  escreverLS('usuario', estado.usuario);
  escreverLS('grupos', estado.grupos);
  escreverLS('participacoes', estado.participacoes);
  escreverLS('materiais', estado.materiais);
  escreverLS('mentorias', estado.mentorias); // ADIÇÃO
}

// Semente local para demo (funciona offline)
function semearSeVazio(){
  const grupos = lerLS('grupos', []);
  if(grupos.length === 0){
    const g1 = { id: gerarId(), nome: 'Cálculo I - Noturno', descricao: 'Listas, resumos e plantões de dúvida', emailDoDono: 'owner@exemplo.com' };
    const g2 = { id: gerarId(), nome: 'POO em Java', descricao: 'Orientação a Objetos + exercícios', emailDoDono: 'prof@exemplo.com' };
    escreverLS('grupos', [g1, g2]);
    escreverLS('materiais', {
      [g1.id]: [{ id: gerarId(), titulo:'Resumo Limites (PDF)', url:'https://exemplo.com/limites.pdf', remetente:'Ana', email:'ana@ex.com', data: new Date().toISOString() }],
      [g2.id]: []
    });
  }
}

// =======================
// AIRTABLE: PULL (baixar → local)
// =======================
async function puxarGruposAT() {
  if (!AIRTABLE.habilitado) return;
  let registros = [];
  let offset;
  do {
    const dados = await chamarAirtable(AIRTABLE.tabelas.grupos, { parametros: offset ? { offset } : null });
    registros = registros.concat(dados.records);
    offset = dados.offset;
  } while (offset);

  const grupos = registros.map(r => ({
    id: r.fields.IdDoGrupo,
    nome: r.fields.Nome || "",
    descricao: r.fields.Descricao || "",
    emailDoDono: r.fields.EmailDoDono || ""
  })).filter(g => !!g.id);

  estado.grupos = grupos;
  salvarEstado();
}

async function puxarMateriaisAT() {
  if (!AIRTABLE.habilitado) return;
  let registros = [];
  let offset;
  do {
    const dados = await chamarAirtable(AIRTABLE.tabelas.materiais, { parametros: offset ? { offset } : null });
    registros = registros.concat(dados.records);
    offset = dados.offset;
  } while (offset);

  const porGrupo = {};
  registros.forEach(r => {
    const gid = r.fields.IdDoGrupo;
    if (!gid) return;
    if (!porGrupo[gid]) porGrupo[gid] = [];
    porGrupo[gid].push({
      id: r.fields.IdDoMaterial,
      titulo: r.fields.Titulo || "",
      url: r.fields.Url || "",
      remetente: r.fields.Remetente || "",
      email: r.fields.Email || "",
      data: r.fields.DataIso || new Date().toISOString()
    });
  });

  estado.materiais = porGrupo;
  salvarEstado();
}

async function puxarParticipacoesAT() {
  if (!AIRTABLE.habilitado) return;
  let registros = [];
  let offset;
  do {
    const dados = await chamarAirtable(AIRTABLE.tabelas.participacoes, { parametros: offset ? { offset } : null });
    registros = registros.concat(dados.records);
    offset = dados.offset;
  } while (offset);

  const mapa = {};
  registros.forEach(r => {
    const email = (r.fields.EmailDoUsuario || "").toLowerCase();
    const gid = r.fields.IdDoGrupo;
    if (!email || !gid) return;
    if (!mapa[email]) mapa[email] = [];
    if (!mapa[email].includes(gid)) mapa[email].push(gid);
  });

  estado.participacoes = mapa;
  salvarEstado();
}

// ADIÇÃO: PULL de Mentorias
async function puxarMentoriasAT() {
  if (!AIRTABLE.habilitado) return;
  let registros = [];
  let offset;
  do {
    const dados = await chamarAirtable(AIRTABLE.tabelas.mentorias, { parametros: offset ? { offset } : null });
    registros = registros.concat(dados.records);
    offset = dados.offset;
  } while (offset);

  estado.mentorias = registros.map(r => ({
    id: r.fields.IdDaMentoria,
    titulo: r.fields.Titulo || "",
    topico: r.fields.Topico || "",
    idGrupo: r.fields.IdDoGrupo || "",
    mentorNome: r.fields.MentorNome || "",
    mentorEmail: r.fields.MentorEmail || "",
    solicitanteNome: r.fields.SolicitanteNome || "",
    solicitanteEmail: r.fields.SolicitanteEmail || "",
    dataHoraIso: r.fields.DataHoraIso || "",
    status: r.fields.Status || "PENDENTE"
  })).filter(m => !!m.id);

  salvarEstado();
}

async function puxarTudoAT() {
  if (!AIRTABLE.habilitado) return;
  try {
    await Promise.all([puxarGruposAT(), puxarMateriaisAT(), puxarParticipacoesAT(), puxarMentoriasAT()]); // ADIÇÃO
    alerta("Sincronizado do Airtable ✔");
    renderizarGrupos();
    const aba = document.querySelector('.tab.active')?.dataset?.aba;
    if (aba === 'materiais') renderizarVistaMateriais();
    if (aba === 'mentorias') renderizarVistaMentorias(); // ADIÇÃO
  } catch (e) {
    console.error(e);
    alerta("Falha ao sincronizar do Airtable");
  }
}

// =======================
// Autenticação
// =======================
function entrar(nome, email){
  estado.usuario = { nome, email: email.toLowerCase() };
  if(!estado.participacoes[estado.usuario.email]) estado.participacoes[estado.usuario.email] = [];
  salvarEstado();
  renderizarAutenticacao();
  renderizarApp();
  alerta(`Bem-vinda(o), ${nome}!`);
  // Puxa dados compartilhados após login
  puxarTudoAT();
}
function sair(){
  estado.usuario = null;
  salvarEstado();
  renderizarAutenticacao();
}

// =======================
// UI: troca Autenticação / App
// =======================
function renderizarAutenticacao(){
  const logado = !!estado.usuario;
  $('#secaoAutenticacao').hidden = logado;
  $('#secaoAplicacao').hidden    = !logado;

  $('#botaoSair').hidden         = !logado;
  $('#botaoSincronizar').hidden  = !logado;

  $('#usuarioAtual').textContent = logado ? `${estado.usuario.nome} · ${estado.usuario.email}` : '';
}

// =======================
// Abas
// =======================
function configurarAbas(){
  $$('.tab').forEach(botao=>{
    botao.addEventListener('click', ()=>{
      $$('.tab').forEach(b=>b.classList.remove('active'));
      botao.classList.add('active');
      const aba = botao.dataset.aba;
      $$('.view').forEach(v=>v.classList.remove('active'));
      $(`#vista-${aba}`).classList.add('active');

      if(aba === 'grupos'){ renderizarGrupos(); }
      if(aba === 'materiais'){ renderizarVistaMateriais(); }
      if(aba === 'mentorias'){ renderizarVistaMentorias(); } // ADIÇÃO
    });
  });
}

// =======================
// Grupos
// =======================
function renderizarGrupos(){
  if(!estado.usuario) return;

  const termo = $('#buscaGrupos').value?.toLowerCase() ?? '';
  const listaDisponiveis = $('#listaGrupos');
  const listaMeus = $('#listaMeusGrupos');

  // filtra por nome
  const grupos = estado.grupos.filter(g => (g.nome || '').toLowerCase().includes(termo));

  // Disponíveis
  listaDisponiveis.innerHTML = '';
  grupos.forEach(g=>{
    const jaEntrou = estado.participacoes[estado.usuario.email]?.includes(g.id);
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `
      <div>
        <h4>${g.nome}</h4>
        <div class="meta">${g.descricao || 'Sem descrição'}</div>
      </div>
      <div>
        ${jaEntrou ? `<button class="btn btn-ghost" disabled>Já entrou</button>` :
          `<button class="btn btn-primary" data-entrar="${g.id}">Entrar</button>`}
      </div>
    `;
    listaDisponiveis.appendChild(el);
  });

  // Meus grupos
  listaMeus.innerHTML = '';
  const meusIds = new Set(estado.participacoes[estado.usuario.email] || []);
  estado.grupos
    .filter(g => meusIds.has(g.id) || g.emailDoDono === estado.usuario.email)
    .forEach(g=>{
      const qtd = (estado.materiais[g.id] || []).length;
      const el = document.createElement('div');
      el.className = 'item';
      el.innerHTML = `
        <div>
          <h4>${g.nome}</h4>
          <div class="meta">${g.descricao || 'Sem descrição'} · ${qtd} material(is)</div>
        </div>
        <div>
          <button class="btn btn-ghost" data-abrir-materiais="${g.id}">Ver materiais</button>
        </div>
      `;
      listaMeus.appendChild(el);
    });

  // Entrar (local-first + push remoto)
  listaDisponiveis.querySelectorAll('[data-entrar]').forEach(botao=>{
    botao.addEventListener('click', async ()=>{
      const idGrupo = botao.getAttribute('data-entrar');
      const arr = estado.participacoes[estado.usuario.email] || [];
      if(!arr.includes(idGrupo)){
        // local
        arr.push(idGrupo);
        estado.participacoes[estado.usuario.email] = arr;
        salvarEstado();
        renderizarGrupos();
        alerta('Entrada no grupo confirmada!');

        // remoto
        if (AIRTABLE.habilitado) {
          try {
            await chamarAirtable(AIRTABLE.tabelas.participacoes, {
              metodo: "POST",
              corpo: { records: [{ fields: {
                EmailDoUsuario: estado.usuario.email,
                IdDoGrupo: idGrupo
              }}]}
            });
          } catch (e) {
            console.error(e);
            alerta("Falha ao registrar participação no Airtable.");
          }
        }
      }
    });
  });

  // Abrir materiais do grupo
  listaMeus.querySelectorAll('[data-abrir-materiais]').forEach(botao=>{
    botao.addEventListener('click', ()=>{
      document.querySelector('.tab[data-aba="materiais"]').click();
      const idGrupo = botao.getAttribute('data-abrir-materiais');
      $('#selecaoGrupoMateriais').value = idGrupo;
      renderizarListaMateriais(idGrupo);
    });
  });
}

async function criarGrupo(nome, descricao){
  const novo = { id: gerarId(), nome, descricao, emailDoDono: estado.usuario.email };

  // local-first
  estado.grupos.push(novo);
  estado.materiais[novo.id] = [];
  if(!estado.participacoes[estado.usuario.email]) estado.participacoes[estado.usuario.email] = [];
  if(!estado.participacoes[estado.usuario.email].includes(novo.id)){
    estado.participacoes[estado.usuario.email].push(novo.id);
  }
  salvarEstado();

  // remoto
  if (AIRTABLE.habilitado) {
    try {
      await chamarAirtable(AIRTABLE.tabelas.grupos, {
        metodo: "POST",
        corpo: { records: [{ fields: {
          IdDoGrupo: novo.id,
          Nome: novo.nome,
          Descricao: novo.descricao,
          EmailDoDono: novo.emailDoDono
        }}]}
      });
      await chamarAirtable(AIRTABLE.tabelas.participacoes, {
        metodo: "POST",
        corpo: { records: [{ fields: {
          EmailDoUsuario: estado.usuario.email,
          IdDoGrupo: novo.id
        }}]}
      });
    } catch (e) {
      console.error(e);
      alerta("Grupo criado localmente. Falha ao enviar ao Airtable.");
    }
  }

  alerta('Grupo criado!');
  $('#formularioCriarGrupo').reset();
  document.querySelector('.tab[data-aba="grupos"]').click();
  renderizarGrupos();
}

// =======================
// Materiais
// =======================
function renderizarVistaMateriais(){
  if(!estado.usuario) return;
  const selecao = $('#selecaoGrupoMateriais');
  const caixa = $('#caixaMateriais');

  selecao.innerHTML = '';
  const idsMeus = new Set(estado.participacoes[estado.usuario.email] || []);
  const meusGrupos = estado.grupos.filter(g => idsMeus.has(g.id) || g.emailDoDono === estado.usuario.email);

  if(meusGrupos.length === 0){
    selecao.innerHTML = '<option value="">Você ainda não participa de grupos</option>';
    caixa.hidden = true;
    return;
  }

  meusGrupos.forEach(g=>{
    const op = document.createElement('option');
    op.value = g.id;
    op.textContent = g.nome;
    selecao.appendChild(op);
  });

  caixa.hidden = false;
  renderizarListaMateriais(selecao.value);
  selecao.onchange = () => renderizarListaMateriais(selecao.value);
}

function renderizarListaMateriais(idGrupo){
  const box = $('#listaMateriais');
  box.innerHTML = '';

  const itens = (estado.materiais[idGrupo] || []).slice().reverse();
  if(itens.length === 0){
    box.innerHTML = '<div class="muted">Ainda não há materiais neste grupo.</div>';
    return;
  }

  itens.forEach(m=>{
    const a = document.createElement('a');
    a.href = m.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.className = 'item';
    a.innerHTML = `
      <div>
        <h4>${m.titulo}</h4>
        <div class="meta">por ${m.remetente} · ${new Date(m.data).toLocaleString('pt-BR')}</div>
      </div>
      <div>🔗</div>
    `;
    box.appendChild(a);
  });
}

async function adicionarMaterial(idGrupo, titulo, url){
  if(!/^https?:\/\/.+/i.test(url)){
    alerta('URL inválida. Use https://...');
    return;
  }
  const item = {
    id: gerarId(),
    titulo,
    url,
    remetente: estado.usuario.nome,
    email: estado.usuario.email,
    data: new Date().toISOString()
  };

  // local-first
  const arr = estado.materiais[idGrupo] || [];
  arr.push(item);
  estado.materiais[idGrupo] = arr;
  salvarEstado();
  renderizarListaMateriais(idGrupo);
  $('#formularioAdicionarMaterial').reset();
  alerta('Material adicionado!');

  // remoto
  if (AIRTABLE.habilitado) {
    try {
      await chamarAirtable(AIRTABLE.tabelas.materiais, {
        metodo: "POST",
        corpo: { records: [{ fields: {
          IdDoMaterial: item.id,
          IdDoGrupo: idGrupo,
          Titulo: item.titulo,
          Url: item.url,
          Remetente: item.remetente,
          Email: item.email,
          DataIso: item.data
        }}]}
      });
    } catch (e) {
      console.error(e);
      alerta("Falha ao enviar material ao Airtable.");
    }
  }
}

// =======================
// ADIÇÃO — Mentorias: helpers e CRUD
// =======================
async function encontrarRegistroATPorCampo(tabela, campo, valor){
  try {
    const formula = `{${campo}} = "${valor.replace(/"/g, '\\"')}"`;
    const dados = await chamarAirtable(tabela, { parametros: { filterByFormula: formula, maxRecords: 1 } });
    return dados.records?.[0] || null;
  } catch (e) {
    console.error('Erro ao buscar registro no Airtable:', e);
    return null;
  }
}

async function criarMentoria({ titulo, topico, idGrupo, mentorNome, mentorEmail, dataHoraIso }){
  const item = {
    id: gerarId(),
    titulo,
    topico,
    idGrupo: idGrupo || "",
    mentorNome,
    mentorEmail,
    solicitanteNome: estado.usuario.nome,
    solicitanteEmail: estado.usuario.email,
    dataHoraIso,
    status: "PENDENTE"
  };

  // local-first
  estado.mentorias.push(item);
  salvarEstado();
  renderizarListaMentorias();
  alerta("Mentoria agendada!");

  // remoto
  if (AIRTABLE.habilitado) {
    try {
      await chamarAirtable(AIRTABLE.tabelas.mentorias, {
        metodo: "POST",
        corpo: { records: [{ fields: {
          IdDaMentoria: item.id,
          Titulo: item.titulo,
          Topico: item.topico,
          IdDoGrupo: item.idGrupo,
          MentorNome: item.mentorNome,
          MentorEmail: item.mentorEmail,
          SolicitanteNome: item.solicitanteNome,
          SolicitanteEmail: item.solicitanteEmail,
          DataHoraIso: item.dataHoraIso,
          Status: item.status
        }}]}
      });
    } catch (e) {
      console.error('Erro ao salvar mentoria no Airtable:', e);
      // Não exibe alerta de erro para o usuário
    }
  }
}

async function atualizarStatusMentoria(idDaMentoria, novoStatus){
  // local
  const m = estado.mentorias.find(x => x.id === idDaMentoria);
  if (!m) return;
  m.status = novoStatus;
  salvarEstado();
  renderizarListaMentorias();

  // remoto
  if (AIRTABLE.habilitado) {
    try {
      const rec = await encontrarRegistroATPorCampo(AIRTABLE.tabelas.mentorias, "IdDaMentoria", idDaMentoria);
      if (!rec) return;
      await chamarAirtable(AIRTABLE.tabelas.mentorias, {
        metodo: "PATCH",
        corpo: { records: [{ id: rec.id, fields: { Status: novoStatus } }] }
      });
    } catch (e) {
      console.error(e);
      alerta("Falha ao atualizar status no Airtable.");
    }
  }
}

// =======================
// ADIÇÃO — Mentorias: UI
// =======================
function renderizarVistaMentorias(){
  // Preencher seletor de grupos (somente os meus/grupos que sou dono)
  const selecao = $('#selecaoGrupoMentoria');
  selecao.innerHTML = '';
  const idsMeus = new Set(estado.participacoes[estado.usuario.email] || []);
  const meusGrupos = estado.grupos.filter(g => idsMeus.has(g.id) || g.emailDoDono === estado.usuario.email);

  const optVazio = document.createElement('option');
  optVazio.value = '';
  optVazio.textContent = 'Sem grupo específico';
  selecao.appendChild(optVazio);

  meusGrupos.forEach(g=>{
    const op = document.createElement('option');
    op.value = g.id;
    op.textContent = g.nome;
    selecao.appendChild(op);
  });

  renderizarListaMentorias();
}

function renderizarListaMentorias(){
  const box = $('#listaMentorias');
  const filtro = $('#filtroStatusMentoria')?.value || 'TODAS';
  box.innerHTML = '';

  let itens = estado.mentorias
    .filter(m => m.solicitanteEmail === estado.usuario.email || m.mentorEmail === estado.usuario.email)
    .sort((a,b) => (a.dataHoraIso || '').localeCompare(b.dataHoraIso)); // por data

  if (filtro !== 'TODAS') itens = itens.filter(m => m.status === filtro);

  if (itens.length === 0){
    box.innerHTML = '<div class="muted">Nenhuma mentoria encontrada.</div>';
    return;
  }

  itens.forEach(m=>{
    const el = document.createElement('div');
    el.className = 'item';
    const dataFmt = m.dataHoraIso ? new Date(m.dataHoraIso).toLocaleString('pt-BR') : '—';
    el.innerHTML = `
      <div>
        <h4>${m.titulo} — <span class="meta">${m.topico}</span></h4>
        <div class="meta">Data: ${dataFmt} · Mentor(a): ${m.mentorNome} (${m.mentorEmail})</div>
        <div class="meta">Solicitante: ${m.solicitanteNome} (${m.solicitanteEmail})</div>
        ${m.idGrupo ? `<div class="meta">Grupo: ${m.idGrupo}</div>` : ''}
        <div class="meta">Status: <strong>${m.status}</strong></div>
      </div>
      <div style="display:flex; gap:.5rem; flex-wrap:wrap;">
        ${m.status !== 'CONFIRMADA' ? `<button class="btn btn-ghost" data-confirmar="${m.id}">Confirmar</button>` : ''}
        ${m.status !== 'CONCLUIDA' ? `<button class="btn btn-primary" data-concluir="${m.id}">Concluir</button>` : ''}
      </div>
    `;
    box.appendChild(el);
  });

  // Ações
  box.querySelectorAll('[data-confirmar]').forEach(btn=>{
    btn.addEventListener('click', ()=> atualizarStatusMentoria(btn.getAttribute('data-confirmar'), 'CONFIRMADA'));
  });
  box.querySelectorAll('[data-concluir]').forEach(btn=>{
    btn.addEventListener('click', ()=> atualizarStatusMentoria(btn.getAttribute('data-concluir'), 'CONCLUIDA'));
  });
}

// =======================
// Formulários e botões
// =======================
function configurarFormularios(){
  // Login
  $('#formularioLogin').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const nome  = $('#entradaNome').value.trim();
    const email = $('#entradaEmail').value.trim();
    if(!nome || !email){ alerta('Preencha nome e e-mail'); return; }
    entrar(nome, email);
  });

  // Sair
  $('#botaoSair').addEventListener('click', sair);

  // Sincronizar
  $('#botaoSincronizar').addEventListener('click', puxarTudoAT);

  // Busca de grupos
  $('#buscaGrupos').addEventListener('input', renderizarGrupos);

  // Criar grupo
  $('#formularioCriarGrupo').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const nome = $('#nomeGrupo').value.trim();
    const desc = $('#descricaoGrupo').value.trim();
    if(!nome){ alerta('Dê um nome ao grupo'); return; }
    criarGrupo(nome, desc);
  });

  // Adicionar material
  $('#formularioAdicionarMaterial').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const idGrupo = $('#selecaoGrupoMateriais').value;
    const titulo  = $('#tituloMaterial').value.trim();
    const url     = $('#urlMaterial').value.trim();
    if(!idGrupo){ alerta('Selecione um grupo'); return; }
    if(!titulo || !url){ alerta('Preencha título e URL'); return; }
    adicionarMaterial(idGrupo, titulo, url);
  });

  // ADIÇÃO — Agendar mentoria
  $('#formularioAgendarMentoria').addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const titulo = $('#tituloMentoria').value.trim();
    const topico = $('#topicoMentoria').value.trim();
    const idGrupo = $('#selecaoGrupoMentoria').value;
    const dataHora = $('#dataHoraMentoria').value;
    const mentorNome = $('#mentorNome').value.trim();
    const mentorEmail = $('#mentorEmail').value.trim();

    if(!titulo || !topico || !dataHora || !mentorNome || !mentorEmail){
      alerta('Preencha todos os campos obrigatórios.'); return;
    }

    const dataIso = new Date(dataHora).toISOString();

    criarMentoria({
      titulo,
      topico,
      idGrupo,
      mentorNome,
      mentorEmail,
      dataHoraIso: dataIso
    });

    ev.target.reset();
    renderizarListaMentorias();
  });

  // ADIÇÃO — Filtro da lista
  $('#filtroStatusMentoria').addEventListener('change', renderizarListaMentorias);
}

// =======================
// Boot
// =======================
function renderizarApp(){
  // abrir primeira aba
  document.querySelector('.tab').click();
  $$('.tab').forEach((b,i)=> b.classList.toggle('active', i===0));
  $$('.view').forEach((v,i)=> v.classList.toggle('active', i===0));
  renderizarGrupos();
}

function iniciar(){
  semearSeVazio();    // só para demo local (não atrapalha o pull)
  carregarEstado();
  configurarAbas();
  configurarFormularios();
  renderizarAutenticacao();

  if(estado.usuario){
    renderizarApp();
    puxarTudoAT();
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
