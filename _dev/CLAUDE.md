# REGRAS DO REPOSITÓRIO aloco-clientes

main = PRODUÇÃO. 43 aplicativos ao vivo. NUNCA fazer push direto no main.

## Fluxo obrigatório para qualquer alteração

1. Criar branch com nome descritivo (ex: `fix/home-safe-area-ios`).
2. Alterar e testar SOMENTE na branch.
3. Commit na branch. Push da branch.
4. Apresentar ao Marcos, antes de qualquer merge:
   - arquivos alterados
   - resumo objetivo do que mudou
   - testes executados
   - resultado dos testes
   - impacto potencial nos 43 apps
   - hash do commit
5. NÃO fazer merge. Aguardar aprovação explícita dele.
6. Só então merge no main.

## Canário

Alteração que toca os 43 apps (patch.js, patch.css, _modelo.html,
painel-app-pwa/*) testa primeiro em UM app do próprio Marcos que não
tem cliente real. Só propaga depois que ele aprovar o canário.

## Estrutura

- `clientes/<slug>/` — 43 apps
- `painel-app-pwa/` — painel único, serve as 43 lojas (1 commit = todas)
- `patch.js` / `patch.css` — injetados em todos os apps, cache 5 min
- `_modelo.html` — molde de novos apps
- `central/`, `barbeiro.html`, `certificado/`, `404.html`, `CNAME`

## Segredos

Nunca colocar token, senha ou chave em arquivo versionado nem no chat.
