/* ══════════════════════════════════════════════════════════════════════
   BARBER IA — CAMADA DE EXPERIENCIA DAS TELAS INTERNAS

   Este arquivo NAO cria tela, NAO muda regra de negocio e NAO toca no
   backend. Ele conserta tres coisas que a auditoria mediu e que nenhuma
   tela resolvia sozinha:

     1. CABECALHO
        Horarios, Pacotes, Fila e Ajustes nao passam por window.ir —
        entram por funcao propria. Por isso ficavam sem "Voltar".
        E a reposicao por tempo (0/260/900ms) da tela ANTERIOR disparava
        depois da seguinte pintar: Profissionais aparecia escrito
        "Agenda". Aqui o nome da tela e um ESTADO, e um observador do #ct
        repoe o cabecalho sempre que a tela se redesenha.

     2. ESPERA
        Medido com o Apps Script respondendo em 0,9s:
          Agenda 73ms · Caixa 13ms · Clientes 30ms · Servicos 22ms
          Financeiro 29ms   (todos saem do pacote de 5 min, ja existente)
          Horarios 962ms · Pacotes 917ms · Fila 944ms · Ajustes 943ms
        As quatro ultimas fazem busca propria, fora do pacote, sem
        guardar nada. Com o Apps Script frio (3 a 6s) e isso que vira o
        "Carregando..." parado. Aqui elas ganham o mesmo tratamento do
        pacote: resposta guardada entrega na hora e revalida por tras.
        Na abertura do painel havia ainda bundle 2x, horario 3x e fila 2x
        ao mesmo tempo — agora uma busca igual em andamento e reaproveitada.

     3. ESQUELETO
        O padrao visual ja tinha .sk/.sk-line/.sk-card e ninguem usava:
        as telas trocavam a pagina inteira por um disco girando. Aqui o
        disco vira esqueleto com a forma do que vai chegar.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';
  if (window._ALOCO_UI) return; window._ALOCO_UI = 1;

  /* ══ 1. CABECALHO ════════════════════════════════════════════════ */

  var TELA = null;             /* nome da tela em que a pessoa esta */

  function cab(){
    if (!TELA) return;
    try { if (typeof window.ALOCO_CAB === 'function') window.ALOCO_CAB(TELA); } catch(e){}
  }

  function nomeDe(tela){
    var m = window.ALOCO_NOME_TELA || {};
    return m[tela] || '';
  }

  /* o #ct e redesenhado inteiro por quase toda tela. Em vez de adivinhar
     QUANDO isso acontece, eu escuto. */
  var pondo = false;
  function observar(){
    var ct = document.getElementById('ct');
    if (!ct || !window.MutationObserver) return false;
    new MutationObserver(function(){
      if (pondo) return;
      pondo = true;
      try { cab(); esqueleto(ct); } catch(e){}
      pondo = false;
    }).observe(ct, { childList:true, subtree:false });
    return true;
  }

  /* window.ir cobre Agenda, Caixa, Clientes, Profissionais, Servicos,
     Financeiro e Ajustes. As outras tres entram por funcao propria. */
  function embrulhar(nome, fn, rotulo){
    var antigo = window[nome];
    if (typeof antigo !== 'function' || antigo._alocoUi) return;
    var novo = function(){
      try { TELA = rotulo(arguments); } catch(e){}
      var r = antigo.apply(this, arguments);
      try { cab(); } catch(e){}
      return r;
    };
    novo._alocoUi = 1;
    window[nome] = novo;
  }

  function ligarRotas(){
    embrulhar('ir', null, function(a){
      var t = a[0];
      if (t === 'home'){ TELA = null; return null; }
      return nomeDe(t) || TELA;
    });
    embrulhar('alocoHorario', null, function(){ return 'Horários'; });
    embrulhar('alocoFila',    null, function(){ return 'Fila de espera'; });
    embrulhar('alocoPacotes', null, function(){ return 'Pacotes'; });
  }

  /* ══ 2. ESQUELETO NO LUGAR DO DISCO GIRANDO ══════════════════════ */

  function bloco(){
    return '<div class="alcSk">'
         + '<div class="alcSkTopo"><span class="sk sk-line w45"></span></div>'
         + '<div class="alcSkNum">'
         +   '<div class="alcSkK"><span class="sk sk-line w65"></span><span class="sk sk-num"></span></div>'
         +   '<div class="alcSkK"><span class="sk sk-line w65"></span><span class="sk sk-num"></span></div>'
         +   '<div class="alcSkK"><span class="sk sk-line w65"></span><span class="sk sk-num"></span></div>'
         + '</div>'
         + '<div class="alcSkLista">'
         +   '<div class="alcSkIt"><span class="sk sk-avatar"></span><span class="alcSkTx">'
         +     '<span class="sk sk-line w80"></span><span class="sk sk-line w45"></span></span></div>'
         +   '<div class="alcSkIt"><span class="sk sk-avatar"></span><span class="alcSkTx">'
         +     '<span class="sk sk-line w65"></span><span class="sk sk-line w45"></span></span></div>'
         +   '<div class="alcSkIt"><span class="sk sk-avatar"></span><span class="alcSkTx">'
         +     '<span class="sk sk-line w80"></span><span class="sk sk-line w45"></span></span></div>'
         + '</div></div>';
  }

  /* troca so o disco girando. Nao mexe em nada que ja tenha conteudo. */
  function esqueleto(ct){
    var ls = ct.querySelectorAll('.lw');
    for (var i = 0; i < ls.length; i++){
      var l = ls[i];
      if (l.getAttribute('data-alc-sk')) continue;
      var d = document.createElement('div');
      d.setAttribute('data-alc-sk','1');
      d.innerHTML = bloco();
      l.parentNode.replaceChild(d, l);
    }
  }

  /* ══ 3. ESPERA: guardar e nao repetir ════════════════════════════ */

  /* so leitura, e so o que NAO vem no pacote de 5 min que o painel ja
     mantem. Gravacao (POST) nunca passa por aqui. */
  var LEITURA = { bundle:1, horario:1, pacotes_admin:1, pacotes:1, interesses:1,
                  fila:1, assinatura:1, disponibilidade:1 };

  /* POST nem sempre e gravacao. senha_status, login e as chamadas de voz
     sao consulta — jogar a leitura guardada fora por causa delas era o
     que fazia Horarios buscar de novo logo depois da abertura do painel
     ja ter buscado. */
  var POST_CONSULTA = { senha_status:1, login:1, assinatura:1,
                        ia_voz:1, ia_texto:1, disponibilidade:1, equipe_listar:1 };

  /* leitura que o painel faz por POST (o Ajustes usa equipe_listar).
     Vale guardar igual: e consulta, nao gravacao. */
  var POST_LEITURA = { equipe_listar:1 };
  function acaoDoCorpo(o){
    try {
      var b = (o && o.body) || '';
      if (typeof b !== 'string') return null;
      var j = JSON.parse(b);
      return j && j.action ? String(j.action).toLowerCase() : null;
    } catch(e){ return null; }
  }
  var VALIDADE = 60000;        /* 1 min: o mesmo criterio do pacote */
  var guardado = {};           /* url -> { em, txt } */
  var indo = {};               /* url -> Promise<string> */

  function acaoDe(u){
    var m = /[?&]action=([a-z_]+)/i.exec(String(u));
    return m ? m[1].toLowerCase() : null;
  }
  function daApi(u){ return /script\.google\.com/.test(String(u)); }
  function resposta(txt){
    return new Response(txt, { status:200,
      headers:{ 'Content-Type':'application/json; charset=utf-8' } });
  }

  function instalarFetch(){
    if (!window.fetch || window.fetch._alocoUi) return;
    var original = window.fetch.bind(window);

    var meu = function(entrada, opcoes){
      var url = (typeof entrada === 'string') ? entrada : (entrada && entrada.url) || '';
      var metodo = ((opcoes && opcoes.method) || (entrada && entrada.method) || 'GET').toUpperCase();

      /* gravou: o que estava guardado nao vale mais */
      if (metodo !== 'GET' && daApi(url)){
        var a = acaoDoCorpo(opcoes);
        if (!a || !POST_CONSULTA[a]){ guardado = {}; indo = {}; return original(entrada, opcoes); }
        if (!POST_LEITURA[a]) return original(entrada, opcoes);
        var chave = url + '#' + ((opcoes && opcoes.body) || '');
        var gp = guardado[chave];
        if (gp && (Date.now() - gp.em) < VALIDADE){
          if ((Date.now() - gp.em) > VALIDADE / 2) buscar(chave, entrada, opcoes);
          return Promise.resolve(resposta(gp.txt));
        }
        return buscar(chave, entrada, opcoes).then(resposta);
      }

      var acao = acaoDe(url);
      if (metodo !== 'GET' || !daApi(url) || !acao || !LEITURA[acao])
        return original(entrada, opcoes);

      var g = guardado[url];
      if (g && (Date.now() - g.em) < VALIDADE){
        if ((Date.now() - g.em) > VALIDADE / 2) buscar(url, entrada, opcoes);  /* revalida por tras */
        return Promise.resolve(resposta(g.txt));
      }
      return buscar(url, entrada, opcoes).then(resposta);
    };

    /* chave pode ser a url (GET) ou url#corpo (POST de leitura) */
    function buscar(chave, entrada, opcoes){
      var url = chave;
      if (indo[url]) return indo[url];                 /* ja tem uma igual a caminho */
      indo[url] = original(entrada, opcoes)
        .then(function(r){ return r.text(); })
        .then(function(t){
          indo[url] = null;
          try { if (t && t.charAt(0) === '{') guardado[url] = { em:Date.now(), txt:t }; } catch(e){}
          return t;
        })
        .catch(function(e){ indo[url] = null; throw e; });
      return indo[url];
    }

    meu._alocoUi = 1;
    window.fetch = meu;
  }

  /* ══ 4. LIGAR ════════════════════════════════════════════════════ */

  instalarFetch();          /* antes de tudo: a abertura do painel ja busca */

  function ligar(){
    if (!document.getElementById('ct')) return false;
    ligarRotas();
    observar();
    return true;
  }
  if (!ligar()){
    var n = 0;
    var t = setInterval(function(){ if (ligar() || ++n > 60) clearInterval(t); }, 100);
  }
  /* Horarios, Fila e Pacotes sao definidos por um bloco que roda depois
     deste. Tento de novo ate eles existirem. */
  var n2 = 0;
  var t2 = setInterval(function(){
    ligarRotas();
    if (++n2 > 60 || (window.alocoHorario && window.alocoHorario._alocoUi)) clearInterval(t2);
  }, 150);
})();
