# ACORDAR — o que fazer de manhã

Dois arquivos prontos e testados. **47 testes, zero falha.**
Nada foi publicado. Nada entrou no seu disco (sua máquina caiu no meio).

---

## PASSO 0 — PRIMEIRO DE TODOS, antes de qualquer `push`

```
cd Documents\aloco-gas\painel
clasp pull
```

Sua pasta local do PAINEL está com o código de ontem de manhã. Um `clasp push` sem esse `pull` desfaz os 6 consertos de ontem: receita líquida, comissões, bloqueio, duplicado, capacidade e a ordem dos arquivos.

**30 segundos. Não pule.**

---

## PASSO 1 — Colocar os dois arquivos no lugar

Baixe os dois que mandei na conversa e substitua:

| Arquivo | Vai em |
|---|---|
| `patch.js` | `Documents\aloco-clientes\patch.js` |
| `index.html` | `Documents\aloco-clientes\painel-app-pwa\index.html` |

---

## PASSO 2 — Branch, commit, push

```
cd Documents\aloco-clientes
git checkout -b fix/reserva-confirmada-e-crm
git add patch.js painel-app-pwa/index.html
git commit -m "reserva so confirma com resposta do servidor; clientes 360 conta visitas"
git push -u origin fix/reserva-confirmada-e-crm
```

---

## PASSO 3 — Canário (sua regra, do seu CLAUDE.md)

O `patch.js` toca os **43 apps** e tem cache de 5 minutos.

Depois do merge, **espere 5 minutos** e teste **só no `marcos-2`**:

1. Abra `app.aloco.com.br/clientes/marcos-2/`
2. Agende um horário → tem que aparecer **"Reservando..."** no botão antes do sucesso
3. Ligue o modo avião e tente de novo → tem que dizer **"Sem conexão. Seu horário NÃO foi reservado"**
4. Toque em **Remarcar** no card do início → tem que abrir a tela de agendamento
5. Vá em **Pacotes** → o relógio da barra de cima tem que mostrar a hora certa, não `09:41`

Se os 5 passarem, está valendo para os 43. Se algum falhar, me chame antes de mexer em mais nada.

---

## PASSO 4 — Conferir o Clientes 360

1. Abra o painel de uma loja que **tem** agendamentos
2. **Clientes 360°**
3. Os cartões agora têm que mostrar **Visitas** e **Última visita** de verdade

Ontem mostravam 0 para todo mundo, em todas as lojas.

---

# O QUE FOI CORRIGIDO

## 1. A reserva mentia para o cliente — `patch.js`

**Antes:** `fetch(...).catch(function(){})` e a tela de "RESERVADO" era pintada na linha seguinte, sem esperar resposta. Internet ruim ou Apps Script fora do ar: o cliente lia RESERVADO, aparecia na barbearia, e **não existia agendamento nenhum**.

**Agora:** manda, espera, e só pinta o sucesso com `ok:true`. Nos outros casos:

| O que aconteceu | O que o cliente lê |
|---|---|
| Horário foi preenchido no meio | "Esse horário acabou de ser preenchido. Escolha outro." + a lista recarrega |
| Caiu a internet | "Sem conexão. Seu horário **NÃO** foi reservado — tente de novo." |
| Erro do servidor | a mensagem real do servidor |

Nenhum texto de sucesso foi reescrito — quem pinta a tela continua sendo a função original do app. E três cliques seguidos no botão viram **um** agendamento só.

## 2. "Remarcar" não fazia nada — `patch.js`

O botão não tinha `onclick`. Agora abre a tela de agendamento.

**Decisão que eu tomei e você pode desfazer:** "Notificações", "Privacidade" e "Ajuda" no perfil também eram linhas mortas com setinha `›`, e as telas por trás **não existem**. Deixei escondidas. Linha morta que promete e não entrega é pior que linha nenhuma. Para trazer de volta, apague o bloco "CONTROLES QUE NAO FAZIAM NADA" do `patch.js`.

## 3. Relógio parado em `09:41` na tela Pacotes — `patch.js`

O atualizador só conhecia `lt-home`, `lt-agenda`, `lt-fila`, `lt-perfil` e `lt-cons`. A barra da tela Pacotes não tem id, então ficava com a hora de exemplo do molde. (`lt-cons`, aliás, não existe em lugar nenhum.) Agora qualquer `.sb-time` acompanha o relógio.

## 4. Clientes 360 contava zero visita — `index.html`

**Dois bugs independentes, um em cima do outro.**

**Bug A** — `_cliEnrichBasic` procurava o cliente assim:
```js
var cid = a.idCliente || ((a.observacao||'').replace('cli:',''));
if(!cid) return;
```
Só que a aba **Agendamentos não tem coluna `idCliente` nem `observacao`**. As colunas são `id, barbearia, data, horario, cliente, telefone, servico, barbeiro, valor, status, criadoEm`. O `cid` saía vazio **sempre**, e o `forEach` dava `return` na primeira linha.

Agora o encontro é pelo **telefone**, que existe nas duas abas — com o id na frente quando houver, e o nome como última reserva. Casa com e sem o `55` na frente. Cancelado e bloqueio não contam. Cada cliente lê de uma chave só, então nada conta duas vezes.

**Bug B** — mesmo com o A corrigido, a tela continuava mostrando 0. O `ldCli()` carregava **só os clientes**, e o `_drawCrm` contava as visitas em cima de uma lista de agendamentos vazia. Pior: o `_agds` que ele usava é o da Agenda, **filtrado pelo dia escolhido** — se alguém passasse pela Agenda antes, o Clientes 360 contaria só as visitas daquele dia.

Agora o Clientes 360 lê a lista completa, numa variável própria (`_agdsCrm`). Os dois vêm do mesmo pacote já guardado — nenhuma viagem a mais ao servidor.

**O bug B só apareceu no teste de tela.** O teste de unidade passou com o A corrigido e a tela continuou mostrando 0.

## 5. Agendamento salvo com telefone inventado — `index.html`

```js
var tel = document.getElementById('agd-tel').value.trim() || '00000000000';
```

Telefone vazio virava `00000000000` em silêncio, e a barbearia ficava sem como confirmar. Agora pede o telefone, como o Novo Cliente já pedia.

---

# TESTES

| Suíte | O que mede | Resultado |
|---|---|---|
| `treserva.js` | a reserva no app real do `marcos-2`, com o servidor respondendo de 4 jeitos | **20/20** |
| `tcrm.js` | o Clientes 360 contra o arquivo de hoje **e** o corrigido | **11/11** |
| `tregressao.js` | as 11 telas do painel abrem, e as validações do agendamento | **16/16** |

O `tcrm.js` roda contra os dois arquivos de propósito: ele **prova** que o de produção dá 0 visita e o corrigido dá 2.

Rode com:
```
cd Documents\aloco-clientes\_dev\testes
node treserva.js
node tcrm.js
node tregressao.js
```

---

# O QUE AINDA NÃO FOI FEITO

| Item | Por quê |
|---|---|
| Comanda corrompe nome e horário | não comecei |
| Saudação sem "Boa noite" no desktop | não comecei |
| Abas Mês / 30 dias com rótulo de "dia" | não comecei |
| Status do cliente não salva, e não dá para excluir cliente | backend, precisa de implantação |
| Design system (exclusão, slot branco, emoji, acentos) | não comecei |
| Rotacionar OneSignal e Mercado Pago | só você |
| Apagar `mic.html`, `teste.html`, `teste123.html` | só você |

---

**Resumo:** dois arquivos, 47 testes verdes, zero publicado. O `clasp pull` do Passo 0 é o único que não pode esperar.
