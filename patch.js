// ALOCO - ajustes globais dos apps.
(function(){
  var K = 'aloco_cliente';
  var P = 'aloco_agd_pendente';

  function lerCookie(){
    try { var m = document.cookie.match(/(?:^|;\s*)aloco_cliente=([^;]*)/);
          return m ? decodeURIComponent(m[1]) : ''; } catch(e){ return ''; }
  }
  function gravarCookie(v){
    try { document.cookie = K+'='+encodeURIComponent(v)+';path=/;max-age=31536000;SameSite=Lax'; } catch(e){}
  }
  function apagarCookie(){ try { document.cookie = K+'=;path=/;max-age=0'; } catch(e){} }
  function lerLocal(){ try { return localStorage.getItem(K) || ''; } catch(e){ return ''; } }
  function gravarLocal(v){ try { localStorage.setItem(K, v); } catch(e){} }

  // o app grava o nome completo por cima do campo "nome" e mantem o sobrenome:
  // junta os dois depois e sai "Marcos Diniz Diniz". Aqui tiramos a repeticao.
  function semRepetir(o){
    try {
      if(!o || !o.nome || !o.sobrenome) return o;
      var n = String(o.nome).trim(), s = String(o.sobrenome).trim();
      if (n.length > s.length && n.slice(-(s.length+1)).toLowerCase() === (' '+s).toLowerCase()){
        o.nome = n.slice(0, n.length - s.length - 1).trim();
      }
    } catch(e){}
    return o;
  }
  function normalizar(txt){
    try { var o = JSON.parse(txt); if(!o) return txt; return JSON.stringify(semRepetir(o)); }
    catch(e){ return txt; }
  }

  var atual = lerLocal() || lerCookie();
  if (atual && atual !== 'null'){ atual = normalizar(atual); gravarLocal(atual); gravarCookie(atual); }

  if (typeof window.salvarSessao === 'function'){
    var _salvar = window.salvarSessao;
    window.salvarSessao = function(d){
      try { d = semRepetir(d); gravarCookie(JSON.stringify(d)); } catch(e){}
      return _salvar.call(this, d);
    };
  }
  if (typeof window.sairConta === 'function'){
    var _sair = window.sairConta;
    window.sairConta = function(){ apagarCookie(); return _sair.apply(this, arguments); };
  }

  function restaurar(){
    var s = lerLocal() || lerCookie();
    if (!s || s === 'null') return;
    var tela = document.getElementById('screen-cadastro');
    if (tela && !tela.classList.contains('hidden')){
      try {
        if (typeof window.aplicarCliente === 'function') window.aplicarCliente(JSON.parse(s));
        if (typeof window.entrarNoApp === 'function') window.entrarNoApp();
        else tela.classList.add('hidden');
      } catch(e){ tela.classList.add('hidden'); }
    }
  }
  restaurar();
  var n = 0, t = setInterval(function(){ restaurar(); if (++n > 40) clearInterval(t); }, 400);

  // ── AVISO DE AGENDAMENTO NAO CONFIRMADO ────────────────────────────
  // Antes o app dizia "horario garantido" mesmo quando o envio falhava: o
  // POST terminava em .catch(function(){}) e ninguem ficava sabendo.
  var ultimoUrl = '';
  function faixa(txt, acao){
    var id = 'aloco-aviso-agd';
    var el = document.getElementById(id);
    if(!el){
      el = document.createElement('div'); el.id = id;
      // acima da barra de abas do app, senao a faixa cobre a navegacao
      el.style.cssText = 'position:fixed;left:12px;right:12px;z-index:999999;'
        + 'bottom:calc(84px + env(safe-area-inset-bottom, 0px));'
        + 'background:#8c2f2f;color:#fff;padding:13px 15px;border-radius:12px;font:600 13px/1.4 inherit;'
        + 'box-shadow:0 10px 28px rgba(0,0,0,.5);display:flex;gap:10px;align-items:center';
      document.body.appendChild(el);
    }
    el.innerHTML = '<span style="flex:1">'+txt+'</span>';
    if(acao){
      var b = document.createElement('button');
      b.textContent = 'Tentar de novo';
      b.style.cssText = 'border:0;border-radius:9px;padding:9px 12px;font:700 12px inherit;'
        + 'background:#fff;color:#8c2f2f;cursor:pointer';
      b.onclick = acao; el.appendChild(b);
    }
    el.style.display = 'flex';
  }
  function esconderFaixa(){ var el=document.getElementById('aloco-aviso-agd'); if(el) el.style.display='none'; }

  function guardarPendente(url, body){
    try { localStorage.setItem(P, JSON.stringify({ url:url, body:body, em:Date.now() })); } catch(e){}
  }
  function limparPendente(){ try { localStorage.removeItem(P); } catch(e){} }

  function reenviar(){
    var p = null; try { p = JSON.parse(localStorage.getItem(P) || 'null'); } catch(e){}
    if(!p || !p.url || !p.body) { esconderFaixa(); return; }
    faixa('Enviando de novo...', null);
    _fetch.call(window, p.url, { method:'POST', body:p.body })
      .then(function(r){ return r.json(); })
      .then(function(j){
        if(j && j.ok){ limparPendente(); esconderFaixa(); }
        else faixa('A barbearia ainda nao recebeu o seu horario.', reenviar);
      })
      .catch(function(){ faixa('Sem conexao. O seu horario ainda nao foi enviado.', reenviar); });
  }

  // AGENDAMENTO: completa o que faltar com o que esta na tela de confirmacao
  var _fetch = window.fetch;
  window.fetch = function(url, opt){
    var ehAgendar = false;
    try {
      if (opt && String(opt.method||'').toUpperCase() === 'POST'
          && typeof opt.body === 'string' && opt.body.indexOf('"agendar"') >= 0){
        ehAgendar = true;
        var o = JSON.parse(opt.body);
        var g = function(id){ var e = document.getElementById(id); return e ? String(e.textContent||'').trim() : ''; };
        var vazio = function(v){ return !v || v === 'undefined' || v === 'null'; };
        var c = {}; try { c = semRepetir(JSON.parse(lerLocal() || lerCookie() || '{}')) || {}; } catch(e){}
        if (vazio(o.servico))  o.servico  = g('cd-svc');
        if (vazio(o.barbeiro)) o.barbeiro = g('cd-bar');
        if (vazio(o.horario))  o.horario  = g('cd-hr');
        if (vazio(o.telefone)) o.telefone = String(c.telefone || '');
        o.cliente = ((c.nome||'') + ' ' + (c.sobrenome||'')).trim() || o.cliente || 'Cliente';
        if (!o.valor){
          var v = g('cd-vl').replace(/[^\d,]/g,'').replace(',','.');
          o.valor = parseFloat(v) || 0;
        }
        var corpo = JSON.stringify(o);
        opt = Object.assign({}, opt, { body: corpo });   // mantem headers e o resto
        ultimoUrl = String(url || '');
        guardarPendente(ultimoUrl, corpo);
      }
    } catch(e){}

    var r = _fetch.call(this, url, opt);
    if (!ehAgendar) return r;
    return r.then(function(resp){
      try {
        resp.clone().json().then(function(j){
          if (j && j.ok){ limparPendente(); esconderFaixa(); }
          else faixa('A barbearia nao recebeu o seu horario.', reenviar);
        }).catch(function(){ limparPendente(); esconderFaixa(); });
      } catch(e){}
      return resp;
    }, function(err){
      faixa('Sem conexao. O seu horario ainda nao foi enviado.', reenviar);
      throw err;
    });
  };

  // se o app foi fechado com um agendamento pendente, tenta assim que abrir
  try {
    var pend = JSON.parse(localStorage.getItem(P) || 'null');
    if (pend && pend.url) setTimeout(reenviar, 2500);
  } catch(e){}
  window.addEventListener('online', function(){
    try { if (localStorage.getItem(P)) reenviar(); } catch(e){}
  });
})();
