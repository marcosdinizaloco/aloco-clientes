/* ══════════════════════════════════════════════════════════════════════
   BARBER IA — COMANDO DE VOZ NO PAINEL
   Arquivo novo. Não altera nenhuma linha do index.html além da que o
   carrega. Só se liga no gancho que o botão BARBER IA já procura:
   window.ALOCO_IA_ABRIR.

   REGRA QUE NÃO SE QUEBRA: o que ele falou NÃO é gravado direto.
   O barbeiro confere item por item e só então o sistema grava. Entre
   chutar e perguntar, perguntar.

   Cores: PRETO + AZUL ELÉTRICO + BRANCO.
   Verde aparece só na confirmação. Vermelho não é cor da marca —
   o "gravar de novo" é neutro, não é erro.
   ══════════════════════════════════════════════════════════════════════ */
(function(){
  'use strict';

  if (window.__ALOCO_IA_VOZ) return;
  window.__ALOCO_IA_VOZ = 1;

  var MAX_SEG = 30;          // teto de gravação: evita áudio gigante e conta alta
  var MIN_MS  = 700;         // menos que isso é toque sem querer

  /* ── estado ─────────────────────────────────────────────────────── */
  var cx = null;             // a caixa na tela
  var rec = null, pedacos = [], fluxo = null;
  var t0 = 0, timer = null;
  var ITENS = [];            // o plano devolvido pela IA
  var ESTADO = [];           // '' | 'ok' | 'edit'
  var TEXTO = '';            // o que ele falou, transcrito
  var REGRAVANDO = -1;       // índice do item sendo regravado, -1 = fala inteira

  /* ── utilidades ─────────────────────────────────────────────────── */
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }
  /* ALOCO — o que cada tipo mostra e o que deixa corrigir na mao.
     Espelha o IA_TIPOS do servidor. Para ensinar uma coisa nova, e aqui
     e la — e so isso. */
  var TIPOS = {
    servico: {
      rotulo:'serviço', plural:'serviços', tela:'servicos',
      linha: function(it){ return brl(it.preco) + ' · ' + (it.duracao || 30) + ' min'; },
      titulo: function(it){ return it.nome; },
      campos: [ {c:'nome', r:'Nome'}, {c:'preco', r:'Preço', m:'decimal'},
                {c:'duracao', r:'Minutos', m:'numeric'} ]
    },
    barbeiro: {
      rotulo:'barbeiro', plural:'barbeiros', tela:'equipe',
      linha: function(){ return 'vai para a Equipe'; },
      titulo: function(it){ return it.nome; },
      campos: [ {c:'nome', r:'Nome'} ]
    },
    cliente: {
      rotulo:'cliente', plural:'clientes', tela:'clientes',
      linha: function(it){ return it.telefone ? fone(it.telefone) : 'sem telefone'; },
      titulo: function(it){ return it.nome; },
      campos: [ {c:'nome', r:'Nome'}, {c:'telefone', r:'Telefone', m:'tel'} ]
    },
    agendamento: {
      rotulo:'agendamento', plural:'agendamentos', tela:'agenda',
      linha: function(it){
        return dataBr(it.data) + ' às ' + (it.horario || '--:--') +
               (it.servico ? ' · ' + it.servico : '') +
               (it.barbeiro ? ' · ' + it.barbeiro : ''); },
      titulo: function(it){ return it.cliente; },
      campos: [ {c:'cliente', r:'Cliente'}, {c:'data', r:'Data', m:'numeric', ph:'AAAA-MM-DD'},
                {c:'horario', r:'Hora', ph:'HH:MM'}, {c:'servico', r:'Serviço'},
                {c:'barbeiro', r:'Barbeiro'} ]
    },
    pacote: {
      rotulo:'pacote', plural:'pacotes', tela:'pacotes',
      linha: function(it){ return brl(it.preco) + (it.descricao ? ' · ' + it.descricao : ''); },
      titulo: function(it){ return it.nome; },
      campos: [ {c:'nome', r:'Nome'}, {c:'preco', r:'Preço', m:'decimal'},
                {c:'descricao', r:'Descrição'} ]
    }
  };

  function tipoDe(it){ return TIPOS[String((it && it.tipo) || 'servico')] || TIPOS.servico; }

  function fone(t){
    var n = String(t || '').replace(/\D/g, '');
    if (n.length === 11) return '(' + n.slice(0,2) + ') ' + n.slice(2,7) + '-' + n.slice(7);
    if (n.length === 10) return '(' + n.slice(0,2) + ') ' + n.slice(2,6) + '-' + n.slice(6);
    return n;
  }

  function dataBr(d){
    var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? (m[3] + '/' + m[2]) : (d || 'sem data');
  }

  function brl(v){
    var n = Number(v);
    if (!isFinite(n)) return '—';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }
  function numDe(txt){
    var s = String(txt == null ? '' : txt).replace(/[^0-9,.-]/g,'').replace(',', '.');
    var n = parseFloat(s);
    return isFinite(n) ? n : NaN;
  }
  function aviso(m, t){
    try { if (typeof window.toast === 'function') { window.toast(m, t); return; } } catch(e){}
  }
  function cfg(){
    var A = window.ALOCO || {};
    return { url: A.API_URL || '', b: A.BARBEARIA || '', senha: A.SENHA || '' };
  }
  function post(corpo){
    var c = cfg();
    corpo.b = c.b; corpo.senha = c.senha;
    return fetch(c.url, { method:'POST', body: JSON.stringify(corpo) })
      .then(function(r){ return r.json(); });
  }

  /* ── por que o microfone pode não abrir, em português ───────────── */
  function porQueNao(err){
    var n = (err && err.name) || '';
    if (n === 'NotAllowedError')  return 'Você precisa permitir o microfone. Toque no cadeado ao lado do endereço e libere o microfone para este site.';
    if (n === 'NotFoundError')    return 'Não achei nenhum microfone neste aparelho.';
    if (n === 'NotReadableError') return 'O microfone está ocupado por outro aplicativo. Feche o outro e tente de novo.';
    if (n === 'SecurityError')    return 'O navegador bloqueou o microfone nesta página.';
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      return 'Este navegador não deixa gravar áudio. No iPhone, instale o painel na tela de início e abra por lá.';
    }
    return 'Não consegui abrir o microfone. ' + ((err && err.message) || '');
  }

  /* ── a caixa ────────────────────────────────────────────────────── */
  function abrir(){
    if (cx) return;
    estilo();
    cx = document.createElement('div');
    cx.className = 'iav-fundo';
    cx.innerHTML =
      '<div class="iav-cx" role="dialog" aria-label="Barber IA por voz">' +
        '<div class="iav-topo">' +
          '<b>BARBER IA</b>' +
          '<button class="iav-x" aria-label="Fechar">&times;</button>' +
        '</div>' +
        '<div class="iav-corpo" id="iavCorpo"></div>' +
      '</div>';
    document.body.appendChild(cx);
    cx.querySelector('.iav-x').onclick = fechar;
    cx.addEventListener('click', function(ev){ if (ev.target === cx) fechar(); });
    telaInicio();
  }

  function fechar(){
    pararTudo();
    if (cx && cx.parentNode) cx.parentNode.removeChild(cx);
    cx = null; ITENS = []; ESTADO = []; TEXTO = ''; REGRAVANDO = -1;
  }

  function corpo(){ return document.getElementById('iavCorpo'); }
  function pinta(html){ var c = corpo(); if (c) c.innerHTML = html; }

  /* ── 1. início ──────────────────────────────────────────────────── */
  function telaInicio(){
    pinta(
      '<div class="iav-centro">' +
        '<p class="iav-tit">Fale o que você quer cadastrar</p>' +
        '<p class="iav-sub">Exemplo: "cadastra o corte por 35 reais, a barba por 25 e a sobrancelha por 15"</p>' +
        '<button class="iav-mic" id="iavMic" aria-label="Gravar">' + svgMic() + '</button>' +
        '<p class="iav-dica">Toque para começar</p>' +
        '<p class="iav-nota">Nada é salvo sem você conferir antes.</p>' +
      '</div>'
    );
    document.getElementById('iavMic').onclick = function(){ gravar(-1); };
  }

  /* ── 2. gravando ────────────────────────────────────────────────── */
  function gravar(idx){
    REGRAVANDO = idx;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      return telaErro(porQueNao(null));
    }
    navigator.mediaDevices.getUserMedia({ audio:true }).then(function(s){
      fluxo = s;
      var tipo = '';
      ['audio/mp4','audio/webm;codecs=opus','audio/webm','audio/ogg'].some(function(t){
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)){ tipo = t; return true; }
        return false;
      });
      try { rec = tipo ? new MediaRecorder(s, { mimeType: tipo }) : new MediaRecorder(s); }
      catch(e){ return telaErro(porQueNao(e)); }

      pedacos = [];
      rec.ondataavailable = function(ev){ if (ev.data && ev.data.size) pedacos.push(ev.data); };
      rec.onstop = function(){ enviarAudio(rec.mimeType || tipo || 'audio/mp4'); };
      rec.start();
      t0 = Date.now();
      telaGravando();
    }).catch(function(err){ telaErro(porQueNao(err)); });
  }

  function telaGravando(){
    var titulo = REGRAVANDO >= 0
      ? 'Fale só este item de novo'
      : 'Estou ouvindo';
    pinta(
      '<div class="iav-centro">' +
        '<p class="iav-tit">' + titulo + '</p>' +
        '<div class="iav-ondas" aria-hidden="true">' +
          '<i></i><i></i><i></i><i></i><i></i><i></i><i></i>' +
        '</div>' +
        '<p class="iav-rel" id="iavRel">0:00</p>' +
        '<button class="iav-parar" id="iavParar">Terminei</button>' +
        '<p class="iav-nota">Máximo ' + MAX_SEG + ' segundos.</p>' +
      '</div>'
    );
    document.getElementById('iavParar').onclick = pararGravacao;
    clearInterval(timer);
    timer = setInterval(function(){
      var s = Math.floor((Date.now() - t0) / 1000);
      var el = document.getElementById('iavRel');
      if (el) el.textContent = '0:' + (s < 10 ? '0' : '') + s;
      if (s >= MAX_SEG) pararGravacao();
    }, 200);
  }

  function pararGravacao(){
    clearInterval(timer); timer = null;
    if (Date.now() - t0 < MIN_MS){
      pararTudo();
      aviso('Muito curto. Segure e fale.', 'er');
      return telaInicio();
    }
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch(e){}
    try { if (fluxo) fluxo.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
    fluxo = null;
    telaPensando();
  }

  function pararTudo(){
    clearInterval(timer); timer = null;
    try { if (rec && rec.state !== 'inactive') rec.stop(); } catch(e){}
    try { if (fluxo) fluxo.getTracks().forEach(function(t){ t.stop(); }); } catch(e){}
    rec = null; fluxo = null; pedacos = [];
  }

  /* ── 3. pensando ────────────────────────────────────────────────── */
  function telaPensando(){
    pinta(
      '<div class="iav-centro">' +
        '<div class="iav-girando" aria-hidden="true"></div>' +
        '<p class="iav-tit">Entendendo o que você falou</p>' +
        '<p class="iav-nota">Alguns segundos.</p>' +
      '</div>'
    );
  }

  function enviarAudio(mime){
    var bl = new Blob(pedacos, { type: mime });
    pedacos = [];
    var fr = new FileReader();
    fr.onload = function(){
      var s = String(fr.result || '');
      var b64 = s.indexOf(',') >= 0 ? s.slice(s.indexOf(',') + 1) : s;
      post({ action:'ia_voz', b64: b64, mime: mime })
        .then(aoVoltar)
        .catch(function(){ telaErro('Não consegui falar com o servidor. Vê a internet e tenta de novo.'); });
    };
    fr.onerror = function(){ telaErro('Não consegui ler o áudio gravado.'); };
    fr.readAsDataURL(bl);
  }

  function aoVoltar(j){
    if (!j || !j.ok){
      var e = (j && j.erro) || 'não deu certo';
      if (String(e).indexOf('nao_autorizado') >= 0)
        return telaErro('Sua sessão expirou. Feche e entre de novo no painel.');
      if (String(e).indexOf('nao entendi') >= 0)
        return telaErro('Não entendi o áudio. Fale mais perto do telefone e tente de novo.');
      return telaErro('Deu erro: ' + e);
    }

    var novos = (j.plano && j.plano.itens) || [];
    if (!novos.length) return telaErro('Não entendi o que você quer fazer. Fale de novo, dizendo o que é: um serviço, um barbeiro, um cliente ou um agendamento.');

    if (REGRAVANDO >= 0 && ITENS[REGRAVANDO]){
      ITENS[REGRAVANDO] = novos[0];        // regravação de um item só
      ESTADO[REGRAVANDO] = '';
      REGRAVANDO = -1;
    } else {
      ITENS  = novos;
      ESTADO = novos.map(function(){ return ''; });
      TEXTO  = j.texto || '';
    }
    telaConferir(j.plano && j.plano.pergunta);
  }

  /* ── 4. conferir, item por item ─────────────────────────────────── */
  function telaConferir(pergunta){
    var h = '';
    if (TEXTO) h += '<p class="iav-falou">Você falou: <span>' + esc(TEXTO) + '</span></p>';
    if (pergunta) h += '<p class="iav-pergunta">' + esc(pergunta) + '</p>';
    h += '<p class="iav-tit2">Confira se está tudo certo</p>';
    h += '<div class="iav-lista">';

    ITENS.forEach(function(it, i){
      var st  = ESTADO[i] || '';
      var amb = it.ambiguo === true;
      var T   = tipoDe(it);
      h += '<div class="iav-item' + (st === 'ok' ? ' ok' : '') + (amb ? ' amb' : '') + '" data-i="' + i + '">';
      if (st === 'edit'){
        h += '<div class="iav-form">';
        T.campos.forEach(function(cp){
          h += '<label>' + esc(cp.r) +
               '<input class="iav-in" data-c="' + cp.c + '"' +
               (cp.m ? ' inputmode="' + cp.m + '"' : '') +
               (cp.ph ? ' placeholder="' + cp.ph + '"' : '') +
               ' value="' + esc(it[cp.c] == null ? '' : it[cp.c]) + '"></label>';
        });
        h += '<button class="iav-salvar" data-a="salvar">Pronto</button>' +
             '</div>';
      } else {
        h +=
          '<div class="iav-linha">' +
            '<div class="iav-nome">' +
              '<em class="tipo">' + esc(T.rotulo) + '</em> ' +
              esc(T.titulo(it) || '(sem nome)') +
              (it.corrigido ? '<em>corrigido</em>' : '') +
              (amb ? '<em class="amb">confira este</em>' : '') +
            '</div>' +
            '<div class="iav-val">' + esc(T.linha(it)) + '</div>' +
            (amb && it.porque ? '<div class="iav-porque">' + esc(it.porque) + '</div>' : '') +
          '</div>' +
          '<div class="iav-bts">' +
            '<button class="iav-bt reg" data-a="regravar">' + svgMicP() + '<i>Gravar<br>de novo</i></button>' +
            '<button class="iav-bt edi" data-a="editar">'  + svgLapis() + '<i>Corrigir<br>escrevendo</i></button>' +
            '<button class="iav-bt del" data-a="excluir">' + svgLixo()  + '<i>Tirar<br>da lista</i></button>' +
            '<button class="iav-bt sim" data-a="ok">'      + svgCerto() + '<i>Está<br>certo</i></button>' +
          '</div>';
      }
    h += '</div>';
    });

    h += '</div>';

    var prontos = ESTADO.filter(function(s){ return s === 'ok'; }).length;
    h +=
      '<div class="iav-rodape">' +
        '<button class="iav-cancelar" id="iavCancelar">Cancelar</button>' +
        '<button class="iav-gravar" id="iavGravar"' + (prontos ? '' : ' disabled') + '>' +
          (prontos ? 'Salvar ' + prontos + (prontos === 1 ? ' serviço' : ' serviços') : 'Confirme ao menos um') +
        '</button>' +
      '</div>';

    pinta(h);
    ligarConferir();
  }

  function ligarConferir(){
    var c = corpo();
    if (!c) return;

    c.querySelectorAll('.iav-item').forEach(function(bloco){
      var i = Number(bloco.getAttribute('data-i'));

      bloco.querySelectorAll('[data-a]').forEach(function(bt){
        bt.onclick = function(){
          var a = bt.getAttribute('data-a');

          if (a === 'ok'){
            ESTADO[i] = (ESTADO[i] === 'ok' ? '' : 'ok');   // tocar de novo desfaz
            return telaConferir();
          }
          if (a === 'editar'){
            ESTADO[i] = (ESTADO[i] === 'edit' ? '' : 'edit');
            return telaConferir();
          }
          if (a === 'regravar'){
            return gravar(i);
          }
          if (a === 'excluir'){
            ITENS.splice(i, 1);
            ESTADO.splice(i, 1);
            if (!ITENS.length) return telaInicio();
            return telaConferir();
          }
          if (a === 'salvar'){
            var T2 = tipoDe(ITENS[i]);
            var campos = bloco.querySelectorAll('.iav-in');
            var novo = {};
            campos.forEach(function(el){ novo[el.getAttribute('data-c')] = el.value; });

            /* o que o tipo mostra na tela e o que ele deixa corrigir */
            if (T2 === TIPOS.servico || T2 === TIPOS.pacote){
              var nome = String(novo.nome || '').trim();
              if (!nome){ aviso('O nome não pode ficar vazio.', 'er'); return; }
              var preco = numDe(novo.preco);
              if (!isFinite(preco) || preco < 0){ aviso('Preço inválido.', 'er'); return; }
              ITENS[i].nome  = nome;
              ITENS[i].preco = preco;
              if (T2 === TIPOS.servico){
                var dur = parseInt(numDe(novo.duracao), 10);
                if (!isFinite(dur) || dur <= 0) dur = 30;
                ITENS[i].duracao = dur;
              } else {
                ITENS[i].descricao = String(novo.descricao || '').trim();
              }

            } else if (T2 === TIPOS.barbeiro){
              var nb = String(novo.nome || '').trim();
              if (!nb){ aviso('O nome não pode ficar vazio.', 'er'); return; }
              ITENS[i].nome = nb;

            } else if (T2 === TIPOS.cliente){
              var nc = String(novo.nome || '').trim();
              if (!nc){ aviso('O nome não pode ficar vazio.', 'er'); return; }
              ITENS[i].nome     = nc;
              ITENS[i].telefone = String(novo.telefone || '').replace(/\D/g, '');

            } else if (T2 === TIPOS.agendamento){
              var cli = String(novo.cliente || '').trim();
              if (!cli){ aviso('Diga para quem é o agendamento.', 'er'); return; }
              var dt = String(novo.data || '').trim();
              if (!/^\d{4}-\d{2}-\d{2}$/.test(dt)){ aviso('Data no formato AAAA-MM-DD.', 'er'); return; }
              var hr = String(novo.horario || '').trim();
              var mh = hr.match(/^(\d{1,2})[:h.]?(\d{2})?$/);
              if (!mh){ aviso('Hora no formato HH:MM.', 'er'); return; }
              ITENS[i].cliente  = cli;
              ITENS[i].data     = dt;
              ITENS[i].horario  = ('0' + mh[1]).slice(-2) + ':' + (mh[2] || '00');
              ITENS[i].servico  = String(novo.servico  || '').trim();
              ITENS[i].barbeiro = String(novo.barbeiro || '').trim();
            }

            ITENS[i].corrigido = true;
            ITENS[i].ambiguo   = false;    // ele escreveu com a propria mao
            ESTADO[i] = 'ok';
            return telaConferir();
          }
        };
      });
    });

    var bc = document.getElementById('iavCancelar');
    if (bc) bc.onclick = fechar;
    var bg = document.getElementById('iavGravar');
    if (bg) bg.onclick = aplicar;
  }

  /* ── 5. gravar de verdade ───────────────────────────────────────── */
  var ULTIMO_TIPO = '';

  function aplicar(){
    var escolhidos = [];
    ITENS.forEach(function(it, i){ if (ESTADO[i] === 'ok') escolhidos.push(it); });
    if (!escolhidos.length) return;
    ULTIMO_TIPO = String((escolhidos[0] && escolhidos[0].tipo) || 'servico');

    pinta(
      '<div class="iav-centro">' +
        '<div class="iav-girando" aria-hidden="true"></div>' +
        '<p class="iav-tit">Salvando</p>' +
      '</div>'
    );

    post({ action:'ia_aplicar', itens: escolhidos, intencao: (escolhidos[0] && escolhidos[0].tipo) || 'servico' })
      .then(function(j){
        if (!j || !j.ok) return telaErro('Não consegui salvar: ' + ((j && j.erro) || 'erro'));
        telaFim(j.gravados, j.recusados);
      })
      .catch(function(){ telaErro('Não consegui falar com o servidor.'); });
  }

  function telaFim(n, recusados){
    /* o texto e o destino saem do que foi gravado, nao de "servico" fixo */
    var T = tipoDe(ULTIMO_TIPO ? { tipo: ULTIMO_TIPO } : null);
    var palavra = n === 1 ? T.rotulo : T.plural;
    pinta(
      '<div class="iav-centro">' +
        '<div class="iav-ok" aria-hidden="true">' + svgCerto() + '</div>' +
        '<p class="iav-tit">' + n + ' ' + esc(palavra) + ' ' + (n === 1 ? 'salvo' : 'salvos') + '</p>' +
        (recusados ? '<p class="iav-nota">' + recusados + ' não entrou. Tente de novo por este.</p>' : '') +
        '<button class="iav-parar" id="iavDeNovo">Falar de novo</button>' +
        '<button class="iav-texto" id="iavFim">Ver na tela</button>' +
      '</div>'
    );
    document.getElementById('iavDeNovo').onclick = function(){ ITENS = []; ESTADO = []; TEXTO = ''; telaInicio(); };
    document.getElementById('iavFim').onclick = function(){
      fechar();
      try { if (typeof window.ir === 'function') window.ir(T.tela); } catch(e){}
    };
  }

  function telaErro(msg){
    pinta(
      '<div class="iav-centro">' +
        '<p class="iav-tit">Não deu certo</p>' +
        '<p class="iav-sub">' + esc(msg) + '</p>' +
        '<button class="iav-parar" id="iavTentar">Tentar de novo</button>' +
        '<button class="iav-texto" id="iavSair">Fechar</button>' +
      '</div>'
    );
    document.getElementById('iavTentar').onclick = telaInicio;
    document.getElementById('iavSair').onclick = fechar;
  }

  /* ── desenhos ───────────────────────────────────────────────────── */
  function svgMic(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/>' +
      '<path d="M12 18v3"/><path d="M8 21h8"/></svg>';
  }
  function svgMicP(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/></svg>';
  }
  function svgLapis(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
      '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4z"/></svg>';
  }
  function svgLixo(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round">' +
           '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';
  }

  function svgCerto(){
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
      '<path d="M4 12.5l5.5 5.5L20 7"/></svg>';
  }

  /* ── estilo ─────────────────────────────────────────────────────── */
  function estilo(){
    if (document.getElementById('iavCss')) return;
    var s = document.createElement('style');
    s.id = 'iavCss';
    s.textContent = [
      '.iav-fundo{position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.72);',
      '  display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(6px)}',
      '.iav-cx{width:100%;max-width:520px;max-height:92vh;display:flex;flex-direction:column;',
      '  background:#0F0F12;border:1px solid rgba(255,255,255,.09);border-bottom:0;',
      '  border-radius:20px 20px 0 0;color:#EDEAE6;',
      '  font:15px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;',
      '  padding-bottom:max(12px,env(safe-area-inset-bottom))}',
      '.iav-topo{display:flex;align-items:center;justify-content:space-between;',
      '  padding:16px 18px;border-bottom:1px solid rgba(255,255,255,.07)}',
      '.iav-topo b{font-size:13px;letter-spacing:.14em;color:#0097fd}',
      '.iav-x{background:none;border:0;color:rgba(237,234,230,.5);font-size:26px;line-height:1;cursor:pointer;padding:0 4px}',
      '.iav-corpo{overflow-y:auto;padding:18px;-webkit-overflow-scrolling:touch}',
      '.iav-centro{text-align:center;padding:14px 4px 6px}',
      '.iav-tit{font-size:19px;font-weight:600;margin:0 0 8px}',
      '.iav-tit2{font-size:16px;font-weight:600;margin:14px 0 10px}',
      '.iav-sub{color:rgba(237,234,230,.58);margin:0 0 22px;font-size:14px}',
      '.iav-nota{color:rgba(237,234,230,.36);font-size:12.5px;margin:14px 0 0}',
      '.iav-dica{color:rgba(237,234,230,.5);font-size:13px;margin:14px 0 0}',
      '.iav-mic{width:112px;height:112px;border-radius:50%;border:0;cursor:pointer;',
      '  background:#0097fd;color:#fff;display:inline-flex;align-items:center;justify-content:center;',
      '  box-shadow:0 0 0 10px rgba(0,151,253,.14),0 10px 30px rgba(0,151,253,.3)}',
      '.iav-mic svg{width:46px;height:46px}',
      '.iav-mic:active{transform:scale(.96)}',
      '.iav-ondas{display:flex;align-items:center;justify-content:center;gap:5px;height:66px;margin:10px 0 4px}',
      '.iav-ondas i{width:5px;border-radius:3px;background:#0097fd;animation:iavP .9s ease-in-out infinite}',
      '.iav-ondas i:nth-child(1){height:18px;animation-delay:0s}',
      '.iav-ondas i:nth-child(2){height:34px;animation-delay:.1s}',
      '.iav-ondas i:nth-child(3){height:52px;animation-delay:.2s}',
      '.iav-ondas i:nth-child(4){height:64px;animation-delay:.3s}',
      '.iav-ondas i:nth-child(5){height:52px;animation-delay:.4s}',
      '.iav-ondas i:nth-child(6){height:34px;animation-delay:.5s}',
      '.iav-ondas i:nth-child(7){height:18px;animation-delay:.6s}',
      '@keyframes iavP{0%,100%{transform:scaleY(.45);opacity:.5}50%{transform:scaleY(1);opacity:1}}',
      '@media (prefers-reduced-motion:reduce){.iav-ondas i{animation:none}}',
      '.iav-rel{font-size:26px;font-variant-numeric:tabular-nums;margin:4px 0 18px;color:#EDEAE6}',
      '.iav-parar{display:block;width:100%;padding:16px;border-radius:14px;border:0;cursor:pointer;',
      '  background:#0097fd;color:#fff;font-size:16px;font-weight:600;margin-top:4px}',
      '.iav-texto{display:block;width:100%;padding:13px;border:0;background:none;cursor:pointer;',
      '  color:rgba(237,234,230,.5);font-size:14px;margin-top:6px}',
      '.iav-girando{width:44px;height:44px;margin:16px auto 20px;border-radius:50%;',
      '  border:3px solid rgba(0,151,253,.18);border-top-color:#0097fd;animation:iavG .8s linear infinite}',
      '@keyframes iavG{to{transform:rotate(360deg)}}',
      '.iav-falou{background:#161619;border:1px solid rgba(255,255,255,.07);border-radius:12px;',
      '  padding:12px 14px;font-size:13.5px;color:rgba(237,234,230,.5);margin:0 0 12px}',
      '.iav-falou span{color:#EDEAE6}',
      '.iav-pergunta{background:rgba(0,151,253,.1);border:1px solid rgba(0,151,253,.3);',
      '  border-radius:12px;padding:12px 14px;font-size:14px;color:#8fd0ff;margin:0 0 12px}',
      '.iav-lista{display:flex;flex-direction:column;gap:10px}',
      '.iav-item{background:#161619;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:13px 14px}',
      '.iav-item.ok{border-color:rgba(74,158,110,.5);background:rgba(74,158,110,.07)}',
      '.iav-item.amb{border-color:rgba(0,151,253,.45)}',
      '.iav-linha{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin-bottom:11px}',
      '.iav-nome{font-size:16px;font-weight:600}',
      '.iav-nome em{display:block;font-style:normal;font-size:11px;letter-spacing:.06em;',
      '  color:rgba(237,234,230,.4);margin-top:2px}',
      '.iav-nome em.amb{color:#8fd0ff}',
      '.iav-val{font-size:14px;color:rgba(237,234,230,.62);white-space:nowrap;font-variant-numeric:tabular-nums}',
      '.iav-bts{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px}',
      '.iav-bt{display:flex;flex-direction:column;align-items:center;gap:5px;padding:10px 4px;',
      '  border-radius:11px;cursor:pointer;background:#1d1d21;border:1px solid rgba(255,255,255,.09);',
      '  color:rgba(237,234,230,.72);font-size:11px;line-height:1.25;text-align:center}',
      '.iav-bt svg{width:20px;height:20px}',
      '.iav-bt i{font-style:normal}',
      '.iav-bt.sim{border-color:rgba(74,158,110,.4);color:#7ec79b}',
      '.iav-bt.del{border-color:rgba(190,90,90,.32);color:#c98b8b}',
      '.iav-nome em.tipo{font-style:normal;font-size:10.5px;font-weight:700;letter-spacing:.4px;',
        'text-transform:uppercase;color:#8aa0bd;background:rgba(138,160,189,.12);',
        'border-radius:999px;padding:2px 7px;margin-right:7px;vertical-align:middle}',
      '.iav-porque{margin-top:6px;font-size:12.5px;line-height:1.35;color:#c9a227}',
      '.iav-item.ok .iav-bt.sim{background:#4A9E6E;border-color:#4A9E6E;color:#fff}',
      '.iav-bt.edi:active,.iav-bt.reg:active{background:#26262b}',
      '.iav-form{display:flex;flex-direction:column;gap:10px}',
      '.iav-form label{display:block;font-size:11.5px;letter-spacing:.06em;color:rgba(237,234,230,.45)}',
      '.iav-dupla{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
      '.iav-in{width:100%;margin-top:5px;padding:11px 12px;border-radius:10px;',
      '  background:#0F0F12;border:1px solid rgba(255,255,255,.14);color:#EDEAE6;font-size:15px}',
      '.iav-in:focus{outline:2px solid #0097fd;outline-offset:1px}',
      '.iav-salvar{padding:12px;border-radius:11px;border:0;background:#0097fd;color:#fff;',
      '  font-size:14px;font-weight:600;cursor:pointer}',
      '.iav-rodape{display:flex;gap:9px;margin-top:16px}',
      '.iav-cancelar{flex:0 0 34%;padding:15px;border-radius:13px;cursor:pointer;',
      '  background:none;border:1px solid rgba(255,255,255,.14);color:rgba(237,234,230,.6);font-size:15px}',
      '.iav-gravar{flex:1;padding:15px;border-radius:13px;border:0;cursor:pointer;',
      '  background:#4A9E6E;color:#fff;font-size:15px;font-weight:600}',
      '.iav-gravar:disabled{background:#26262b;color:rgba(237,234,230,.3);cursor:default}',
      '.iav-ok{width:62px;height:62px;margin:6px auto 16px;border-radius:50%;background:#4A9E6E;',
      '  color:#fff;display:flex;align-items:center;justify-content:center}',
      '.iav-ok svg{width:30px;height:30px}'
    ].join('\n');
    document.head.appendChild(s);
  }

  /* ── o gancho que o botão BARBER IA procura ─────────────────────── */
  window.ALOCO_IA_ABRIR = abrir;

  /* exposto só para os testes */
  window.__iavTeste = {
    numDe: numDe, brl: brl, esc: esc, porQueNao: porQueNao,
    estado: function(){ return { ITENS: ITENS, ESTADO: ESTADO }; },
    semear: function(itens){ ITENS = itens; ESTADO = itens.map(function(){ return ''; }); }
  };
})();
