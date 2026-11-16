# Handoff

Fixed blank Open Site by changing vite.config.ts base from /NeivaPoints/ to ./ so built assets resolve under Craft root and GitHub Pages. Project app_in_root=true, actual application root is workspace (no app/). npm run build and rebuild_check passed. Direct Playwright smoke test served dist at / and /NeivaPoints/: both rendered login controls with zero pageerrors. Existing Word changes were preserved. CLI help attempt session 84100 may still be pending; direct cached Playwright used for browser validation.
