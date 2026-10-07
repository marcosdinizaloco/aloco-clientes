# _dev — contexto e testes do projeto

Esta pasta existe para que QUALQUER sessão de IA (aqui, Cowork, ou outra)
retome o projeto sem precisar reconstruir o contexto do zero.

Não é servida pelo site. É só referência de desenvolvimento.

## Arquivos

- `CLAUDE.md` — regras do repositório (branch + merge, canário, estrutura, segredos).
- `ALOCO_ESTADO.md` — estado do projeto: os três ambientes, onde cada coisa
  mora, o que já foi feito, o que está pendente, e as armadilhas técnicas.
- `testes/` — as suítes que validam o painel, e a ferramenta de auditoria.

## Como rodar

Precisa de Node e Playwright com Chromium.

    cd _dev/testes
    npm i -D playwright && npx playwright install chromium   (só na primeira vez)

Deixe UM servidor de pé em outro terminal — ele serve o repositório inteiro:

    node _dev/testes/serve.js        # http://localhost:8777

E, só para a suíte de voz, o palco dela:

    node _dev/testes/servir.js       # http://localhost:8742

Então:

    node _dev/testes/tia.js        # BARBER IA x BEAUTY IA: irmãos, cores diferentes
    node _dev/testes/tsistema.js   # as 10 telas internas como UM sistema
    node _dev/testes/ttelas.js     # consistência visual tela a tela
    node _dev/testes/thome.js      # Home: tamanhos, grade, saudação, tesoura
    node _dev/testes/tsimples.js   # a Home termina no BARBER IA e não rola
    node _dev/testes/tvoz.js       # BARBER IA por voz (usa o 8742)
    node _dev/testes/t404.js       # redirecionamento /painel/<slug>

Esperado: **27 · 156 · 45 · 96 · 89 · 38 · 16**, zero falha.

Os testes leem os arquivos de produção de `painel-app-pwa/`. Não existe
cópia: se você mudar o produto, o teste mede o produto.

## A ferramenta de auditoria

    node _dev/testes/auditar.js

Não testa nada: MEDE. Abre as 10 telas pela navegação real, com o backend
respondendo em 900ms, e imprime por tela o tempo até a estrutura aparecer,
o tempo até os dados, as chamadas feitas, os raios, as fontes, as alturas
e corpos de botão, se tem Voltar e qual nome está no cabeçalho.

É com ela que se descobre o que está fora do padrão, em vez de achar.

`LAT=4000 node _dev/testes/auditar.js` simula o Apps Script frio.

## O conjunto de ícones do BEAUTY IA

`_dev/arte/virar.py` é o que gera `painel-app-pwa/arte-beauty.js`. Ele NÃO
desenha ícone novo: pega os do BARBER IA e troca só o matiz, derrubando a
saturação para menos da metade.

    cd _dev/arte
    # extraia os .webp do ART de home-apps.js para esta pasta, depois:
    python3 virar.py agenda caixa clientes comandas barbeiros servicos \
                     fila horarios pacotes relatorios ajustes

Se mexer nele, lembre: **sem derrubar a saturação o neon azul vira laranja
de fogo.** Foi a primeira tentativa e parecia churrascaria, não cosmético.
Champagne e rosa queimado são cores POUCO saturadas — é disso que vem o ar
de luxo.

## Armadilhas que já custaram tempo

**`.css` servido como `text/plain`** parseia para ZERO regras em modo
standards. O teste passa a medir a tela sem estilo nenhum e não acusa nada.
O `serve.js` manda o tipo certo — não troque por um servidor qualquer.

**O backend falso precisa ter a forma do de verdade.** O painel lê quase
tudo de um pacote único (`?action=bundle`) com os campos `home`, `fin`,
`agendamentos`, `clientes`, `barbeiros`, `servicos`, `comandas`, `fila`.
Devolver `{ok:true,dados:...}` genérico faz a tela ficar em "Carregando..."
para sempre e parecer bug do produto. É o que `bundle.json` resolve.

**`window.ir` não cobre o painel inteiro.** Ele trata home, barb, svc, agd,
cli, cx, fin e eq. Horários, Fila e Pacotes entram por `alocoHorario()`,
`alocoFila()` e `alocoPacotes()`. Teste que navega só por `ir()` mede meio
produto.

**"a barbearia" casava dentro de "sua barbearia".** O motor que troca as
palavras para o salão fazia substituição de texto solto, sem fronteira de
palavra: "sobre sua barbearia" virava "sobre **suo** salão" e "minha
barbearia" virava "minho salão". As formas com artigo agora são expressões
com `\b`, em PALAVRAS, e têm que vir ANTES da regra solta de "barbearia".

**Os arquivos do repositório usam CRLF.** Edição por script precisa
normalizar `\r\n`→`\n`, editar, e gravar de volta com `newline=''` e
`\n`→`\r\n`. Senão o diff fica do arquivo inteiro.

## Segredos

Nenhum valor de chave, senha ou token entra nesta pasta. Só os nomes das
variáveis. As chaves vivem nas Script Properties do Apps Script, colocadas
pelo Marcos.
