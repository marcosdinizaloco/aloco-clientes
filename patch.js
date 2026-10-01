// ALOCO - ajustes globais dos apps.
(function(){
  var K = 'aloco_cliente';

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

  // AGENDAMENTO: completa o que faltar com o que esta na tela de confirmacao
  var _fetch = window.fetch;
  window.fetch = function(url, opt){
    try {
      if (opt && String(opt.method||'').toUpperCase() === 'POST'
          && typeof opt.body === 'string' && opt.body.indexOf('"agendar"') >= 0){
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
        opt = { method:'POST', body: JSON.stringify(o) };
      }
    } catch(e){}
    return _fetch.call(this, url, opt);
  };
})();
