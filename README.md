# React + TypeScript + Vite

## Aplicativos compartilhados (Supabase)

Os atalhos da Central de Aplicativos usam a tabela `external_apps`. Para que os
apps criados pelo professor apareçam para todos os alunos:

1. No Supabase, abra **SQL Editor** e execute o conteúdo de
   [`supabase/external_apps.sql`](./supabase/external_apps.sql).
2. No desenvolvimento local, preencha `.env` com `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (veja `.env.example`) e reinicie o Vite.
3. No GitHub, crie os Secrets de Actions com os mesmos nomes:
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. O workflow de deploy já os
   disponibiliza durante o build.

Após o deploy, crie um atalho como professor e atualize a página de um aluno:
o item e sua ordem devem ser os mesmos para todos. Sem a tabela ou as variáveis
de ambiente, o sistema usa somente o armazenamento local do navegador.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
