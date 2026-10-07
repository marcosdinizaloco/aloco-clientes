# _dev — contexto e testes do projeto

Esta pasta existe para que QUALQUER sessão de IA (aqui, Cowork, ou outra)
retome o projeto sem precisar reconstruir o contexto do zero.

Não é servida pelo site. É só referência de desenvolvimento.

## Arquivos

- `CLAUDE.md` — regras do repositório (branch + merge, canário, estrutura, segredos).
  Cópia da raiz, mantida aqui para quem clonar só esta pasta.
- `ALOCO_ESTADO.md` — estado do projeto: os três ambientes, onde cada coisa mora,
  o que já foi feito, o que está pendente, e as armadilhas técnicas já descobertas.
- `testes/` — as suítes que validam o painel.

## Como rodar os testes

Precisa de Node e Playwright/Chromium. Cada arquivo sobe um servidor local,
serve `painel-app-pwa/` com o backend stubado, e renderiza no Chromium.

    node _dev/testes/thome.js     # Home: tamanhos, grade, saudação, tesoura, avisos, encaixe
    node _dev/testes/ttelas.js    # telas internas: cabeçalho, raios, cores, sem erro de JS
    node _dev/testes/tvoz.js      # BARBER IA por voz: gravar, conferir, corrigir, aplicar
    node _dev/testes/t404.js      # redirecionamento /painel/<slug>

Resultado esperado: thome 96/96, ttelas 45/45, tvoz 38/38, t404 16/16.

## Armadilha conhecida

Ao servir os arquivos para teste, `.css` PRECISA sair como `text/css`.
Servido como `text/plain`, a folha de estilo parseia para 0 regras em modo
standards e o teste passa a medir a tela sem estilo nenhum.

## Segredos

Nenhum valor de chave, senha ou token entra nesta pasta. Só os nomes das
variáveis, para quem precisa saber que elas existem. As chaves vivem nas
Script Properties do Apps Script, colocadas pelo Marcos.
