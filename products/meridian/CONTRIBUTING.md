# Contributing to LiveAnalyst

Contributions are welcome: bug fixes, analytics features, chart improvements,
accessibility, tests, and documentation. For substantial changes, open an issue
first to discuss the approach.

## Submit a contribution

1. Fork [LiveAnalyst](https://github.com/aditya-vithaldas/LiveAnalyst) and create a branch for your change.
2. Follow the local setup in [README.md](README.md). Use your own credentials; never commit keys, `.env`, `.dev.vars`, uploaded customer data, or generated database files.
3. Keep the change focused. Explain what changed and why; add a regression check when fixing a behavior that could break again.
4. Run the checks relevant to your change. For application changes, run `npx tsc --noEmit`, `node --experimental-strip-types scripts/check-analytics.mjs`, `node --experimental-strip-types scripts/check-uploads.mjs`, and `npm run build`. Database changes should also be checked with `node scripts/benchmark-demo.mjs` after generating the demo database.
5. Open a pull request against `main`, describing the behavior and validation. Include before/after screenshots for visual changes.

## Review

[@aditya-vithaldas](https://github.com/aditya-vithaldas) is the maintainer and
reviewer for all files, as specified in [.github/CODEOWNERS](.github/CODEOWNERS).
GitHub requests his review on ready-for-review pull requests from other contributors.
Draft pull requests are welcome while work is in progress. The maintainer reviews
and merges accepted contributions; opening a pull request does not grant write
or deployment access.

## License

By submitting a contribution, you agree that your contribution is provided under
this project's [MIT License](LICENSE). Preserve existing third-party license
notices; dependencies and vendored code retain their respective licenses.
