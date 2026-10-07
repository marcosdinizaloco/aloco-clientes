# ALOCO — estado do projeto (handover)

Marcos Diniz · Aracaju/SE · ALOCO
Produtos: **Barber IA** (barbearias) e **Beauty IA** (salões).

## Como o Marcos quer ser atendido

- Sem textão. Direto sempre.
- Sem explicação, só solução.
- Nunca dizer "sua intuição está certa". Corrigir de verdade.
- Achou um bug? Conserta na hora. Não adia, não "deixa para depois".
- Não reinterpretar o projeto. Resultado, não iteração.

## Identidade visual BARBER IA

PRETO + AZUL ELÉTRICO + BRANCO.
Verde só para WhatsApp / confirmação / ação positiva.
**NÃO usar VERMELHO como cor da identidade.**

## Os três ambientes

| | o que é |
|---|---|
| **GitHub** `marcosdinizaloco/aloco-clientes` | site em `app.aloco.com.br`, branch `main` |
| **PAINEL** (Apps Script) | planilha "ALOCO - Banco", `SHEET_ID = 1xiGqJqv7usO-OTPGghPQWzN5fSrGiVdq-htUf-leUWs` |
| **Recepcao** (Apps Script) | projeto vinculado, CRM/admin dele |

## GitHub — estado do acesso

`main` protegido no servidor desde 07/out: ruleset **protege-main**, Active,
bypass list vazia, exige Pull Request, bloqueia force push e deleção.
Então NEM o Marcos empurra direto no main — o editor do site do GitHub passa a
oferecer "Create a new branch and start a pull request". É o esperado.

## Onde esta conversa deve acontecer

Decidido em 07/out: **uma tarefa só, rodando NO COMPUTADOR do Marcos**
(seletor "Run this task" no canto superior direito do app, ao iniciar uma
tarefa Cowork). Motivo:

| | na nuvem | no computador dele |
|---|---|---|
| GitHub (branch, PR) | só se o repo foi anexado na criação | sim, pelo git da máquina |
| Apps Script via clasp | **não** — a rede da sandbox bloqueia `script.google.com` | sim |
| n8n, Drive | sim | sim |

Duas sessões na nuvem já foram usadas e devem ser abandonadas. Não existe
conexão entre sessões: elas não trocam mensagem nem compartilham arquivo.
Tudo que precisa atravessar passa por este arquivo.

## Plano: versionar o Apps Script com clasp (não iniciado)

Existe API oficial — `script.googleapis.com/v1/projects/{scriptId}/content` —
e a CLI `clasp`. É o caminho para parar com o copia-e-cola do Apps Script.

Pré-requisito já feito ou a fazer pelo Marcos:
`script.google.com/home/usersettings` → ligar **API Google Apps Script**.

Primeira etapa, SOMENTE LEITURA:
1. instalar Node e `npm i -g @google/clasp`
2. `clasp login` (o Marcos autoriza no navegador; o token fica em
   `~/.clasprc.json`, na máquina dele — Claude nunca vê o valor)
3. `clasp clone` do PAINEL e do Recepcao, em pastas separadas
4. `git init` e primeiro commit em cada uma
5. mostrar a lista de arquivos baixados

**NUNCA rodar `clasp push` antes de o código estar no git e o Marcos ter visto
o diff.** `clasp push` substitui o projeto INTEIRO de uma vez. O Recepcao tem
25 arquivos e o encadeamento `Código.gs → Uso.gs → Importar.gs → Resumo.gs`;
um push fora de ordem quebra a cadeia e derruba as 43 barbearias juntas.
Depois do git, o Apps Script entra no mesmo fluxo branch + PR do repositório.

## REGRAS DO REPOSITÓRIO — main = PRODUÇÃO

43 aplicativos ao vivo. **NUNCA push direto no main.**

1. Branch com nome descritivo (ex: `fix/home-safe-area-ios`).
2. Alterar e testar SOMENTE na branch.
3. Commit + push da branch.
4. Antes de qualquer merge, apresentar a ele:
   - arquivos alterados
   - resumo objetivo do que mudou
   - testes executados
   - resultado dos testes
   - impacto potencial nos 43 apps
   - hash do commit
5. NÃO fazer merge. Aguardar aprovação explícita.
6. Só então merge no main.

**Canário:** alteração que toca os 43 (`patch.js`, `patch.css`, `_modelo.html`,
`painel-app-pwa/*`) testa primeiro em `clientes/marcos-2` — app dele, sem cliente real.

## Estrutura do repositório

- `clientes/<slug>/` — 43 apps
- `painel-app-pwa/` — painel único, serve as 43 lojas (1 commit = todas)
  - `index.html` (456 KB), `home-apps.js` (142 KB), `manifest.json`, `sw.js`, ícones
- `patch.js` (70 KB) / `patch.css` (25 KB) — injetados em todos os apps, cache 5 min
- `_modelo.html` — molde de novos apps
- `central/`, `barbeiro.html`, `certificado/`, `404.html`, `CNAME`, `mic.html`

## Segredos — NUNCA pedir, ecoar ou versionar

Senha do painel, `SENHA_MASTER`, `PAINEL_SENHA`, `SEGREDO`, `MP_ACCESS_TOKEN`,
`ONESIGNAL_REST_KEY`, PAT do GitHub, `TOKEN_RECEPCAO`, `ZAPI_*`, chave da OpenAI.
As chaves vão nas Script Properties **por ele**. Nunca no chat, nunca em arquivo.
Scripts de auditoria são read-only e mascaram string ≥20 chars como «OCULTO n».
Não alterar produção sem autorização dele.

## Onde o projeto parou

### BARBER IA — comando de voz (em andamento)

Objetivo: o barbeiro fala "cadastra o corte por 35, a barba por 25" e o sistema
cadastra. Tela de confirmação item por item antes de gravar qualquer coisa.

**Passo 0 — microfone no iPhone: FEITO.** PWA instalado, gravação funcionou.

**Passo 1 — ponte PAINEL ↔ Recepcao: FEITO E PROVADO (07/out, 13:34).**

- `IAPonte.gs` instalado no **Recepcao**. Envolve `_roteia` (wrapper, zero linha alterada).
  Ações novas: `ia_ditado` (áudio→texto, whisper-1) e `ia_pensar` (texto→plano, gpt-4.1).
  Camadas de defesa: `_iaLerJson`, `_iaArrumar`, `_iaCasar`, `_iaConferirFala`.
  `precisaConfirmar` é sempre `true`. Log em aba `IA_Log`.
- `IA.gs` instalado no **PAINEL**. Não abre nenhum endpoint público de propósito.
- Script Properties do PAINEL gravadas: `RECEPCAO_URL` (112 chars, /exec) e
  `TOKEN_RECEPCAO` (14 chars). Total de propriedades foi de 100 para 102.
  A tela de Propriedades do PAINEL é SOMENTE LEITURA (passou de 50), então
  qualquer propriedade nova precisa ser gravada por código com `setProperty`.
  NUNCA usar `setProperties(obj, true)` ali — apagaria as 100 `pw_<slug>`.
- Implantação `/exec` nova criada no Recepcao só para a IA (Versão 150).
  As duas antigas (Versão 149, 6/out) ficaram intactas — NÃO MEXER nelas.

Testes que passaram:

| teste | onde | resultado |
|---|---|---|
| `ia_teste_texto` | Recepcao | 3 serviços, preços certos, `precisaConfirmar: true` |
| `ia_teste_alterar` | Recepcao | `id: "SV1"`, `ambiguo: false`, confiança 1 |
| `ia_teste_ambiguo` | Recepcao | `ambiguo: true`, perguntou em vez de chutar |
| `ia_teste_pecas` | PAINEL | tudo definido; `_porBarbearia` e `_upsert` existem |
| `ia_teste_ponte` | PAINEL | **ok:true**, plano completo, tin 589 / tout 162 (≈ R$ 0,013) |

**Falta:** `ia_teste_com_contexto` com uma loja que TENHA serviços cadastrados
(marcos-barber foi apagado e está com 0). E testar o caminho de áudio (`iaComando`).

**Passo 2 (não iniciado):** ligar a tela de confirmação à ponte, resolver a
autenticação do painel, construir o executor.
Peça encontrada para isso: o PAINEL tem uma Script Property `pw_<slug>` por loja,
com hash de 64 caracteres. É a autenticação por barbearia.
`_upsert` existe no PAINEL e é a função que vai gravar.

Custo verificado: **R$ 0,013–0,021 por comando de voz**.

### Home do painel (concluído)

`painel-app-pwa/home-apps.js` — grade única 3+3+3+1, 10 apps, sem scroll,
safe-area do iPhone corrigida, botão BARBER IA.
**Cuidado:** `#alcAssLink` é ASSINATURA (cobrança), não assistente. O botão
BARBER IA não navega para lugar nenhum — só chama `window.ALOCO_IA_ABRIR`.

### Pendências

- **BUG EM PRODUÇÃO — diagnóstico corrigido em 07/out.**
  O clique da notificação abre `app.aloco.com.br/painel/<slug>`.
  O GitHub Pages responde **HTTP 404** e serve o `404.html`. Só que o `404.html`
  da raiz NÃO é página de erro: é um **painel inteiro de 391 KB**, com
  `location.pathname.match(/\/painel\/([^\/?#]+)/i)` dentro. Ele extrai o slug
  e carrega os dados da loja certa.
  Resultado: o barbeiro cai num painel que funciona, mas é **velho** — não tem
  `home-apps.js` (zero referências), logo não tem a Home nova, nem o safe-area
  do iPhone, nem o botão BARBER IA. E como o status é 404, o navegador embutido
  do WhatsApp e do Instagram mostra o erro deles em vez do conteúdo.
  **Correção em duas metades:**
  (a) quem dispara a notificação passa a usar `/painel-app-pwa/?b=<slug>`;
  (b) o `404.html` da raiz vira um redirecionador curto — se a URL casar com
  `/painel/<slug>`, `location.replace('/painel-app-pwa/?b=' + slug)`, senão uma
  página simples de "não encontrado". A metade (b) é a que salva as notificações
  JÁ ENTREGUES nos celulares, que apontam pra `/painel/<slug>` para sempre.
  **ATENÇÃO — não procure por `_notificarDono`.** Esse nome estava no meu
  registro antigo e está ERRADO. Não existe no PAINEL, não existe no Recepcao
  (o Marcos confirmou) e não existe em nenhum arquivo do repositório
  (busca feita em 07/out). Nenhum arquivo do repo monta a URL `/painel/<slug>`.
  Para achar quem dispara: OneSignal → Delivery → abrir uma notificação enviada
  → campo **Launch URL**. Suspeitas a confirmar: um workflow do **n8n**, ou um
  terceiro projeto Apps Script.
- Push notifications: `PLANO_PUSH.md` aprovado em princípio, nada implementado.
  Itens 8 e 9 do spec (cancelar/remarcar) não são implementáveis — o cliente
  não cancela nem remarca; só existe `_barbStatus` (lado barbeiro).
- Apagar `mic.html` da raiz do repo e o ícone "Teste Mic" do iPhone dele.
- Apagar o arquivo `VerToken` do Recepcao, se ainda existir.
- **Gatilho `pilotoVarrer` no Recepcao roda de minuto em minuto**, 2 a 9 s por vez
  — entre 1h e 1h30 de execução por dia, contra uma cota de 90 min/dia. Está
  raspando o teto. Se estourar, TODOS os gatilhos param sem aviso, inclusive os
  de agendamento e Agenda. Rever para 5 em 5 minutos.
- Apagar arquivos de auditoria: PAINEL (`AuditoriaPush`, `VerAgendamento`,
  `VerPush`, `VerAgendar`, `VerAgendar2`) e Recepcao (`VerRepo`, `VerPainel`,
  `VerHome`, `VerFinal`, `VerPonte`, `VerToken`).
- Limpeza de 16 duplicatas em `clientes/` (ele mandou NÃO executar ainda).
- 19 apps "sem dado", ki-beleza órfão, linhas 55/56 compartilhando link.
- Não existe `clientes/marcos-barber`, mas ele testa o painel com `?b=marcos-barber`.
  Verificar se o slug vem da planilha ou se falta app.

## Notas técnicas que custaram caro para descobrir

- Gradiente SVG em traço horizontal/vertical: `objectBoundingBox` não pinta
  (bbox de área zero). Usar `gradientUnits="userSpaceOnUse"`.
- `getBBox` superestima formas rotacionadas. Medir pelo pixel do PNG renderizado.
- iOS: push e microfone exigem o PWA instalado na tela de início.
  `getUserMedia` exige contexto seguro — `data:` URL não serve.
- Apps Script **tem** RSA: `Utilities.computeRsaSha256Signature`.
- O painel não usa `google.script.run` de verdade: tem um shim `_api()` que
  faz `fetch` para a ação `bundle`, com cache de 5 min.
- O roteador original do `doPost` está preso em closure, inalcançável por
  reflexão. Por isso o padrão de extensão é **wrapper**, nunca edição.
