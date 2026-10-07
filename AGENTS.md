# Repository work instructions

## Required Git checkpoints

- After every coherent mid-size change or validated milestone, commit and push
  task-related work as a checkpoint. Do this regularly during substantial work,
  not only at the end or after days of uncommitted implementation.
- After completed work passes appropriate checks, merge into `main` and push
  `main` routinely. Do not leave delivered work solely on a feature branch. The
  owner has authorized this normal checkpoint/push/completion-merge workflow;
  no fresh permission is needed for those routine steps. Report actual commit
  IDs, push status, main-merge status and remaining edits or blockers.
- Inspect actual remote refs and the whole merge diff first. Never merge
  knowingly failing, incomplete or unrelated work, or another agent's active
  changes. Respect branch protections and required reviews/checks; use a PR
  when required and report the concrete blocker rather than bypassing it or
  silently leaving completed work unmerged. Check automatic deployment effects
  separately; a routine Git merge does not itself authorize a new deployment.
- Use a verified GitHub-linked author identity for future commits. The owner's
  verified identity is Aditya Vithaldas <aditya.vithaldas@gmail.com>. Do not use
  an automatically inferred machine email or rewrite existing commit authors.
- Before staging, inspect status and diff. Stage only the authorized task's
  implementation, required assets, tests and documentation. Preserve unrelated
  changes and do not silently include another task's work.
- Never commit secrets, credentials, tokens, private mailbox/source data, raw
  OAuth review recordings or captures, runtime caches, or generated build output.
  Scan staged content for accidental credentials and check public illustrations
  use fictional or explicitly authorized public data.
- Verify changes in proportion to their risk. Reuse recorded passing checks for
  unchanged code; do not claim they cover a different snapshot. Run focused
  checks for new code and inspect the staged diff before committing.
- Do not amend/rewrite history, force push, reset user changes, or merge unrelated
  branches. If a push is rejected,
  report the conflict and preserve the work rather than overwriting the remote.

## Deployment traceability

- Prefer deployments built from a committed source snapshot. Record the source
  commit, deployed revision and image digest in the release handoff. Do not rely
  on inherited Cloud Run labels to identify a manually built dirty checkout.
- When catching up Git with an already deployed release, preserve the deployed
  revision and document any excluded or newer local changes. Do not redeploy
  simply to save Git history or claim an exact release match without evidence.
- Git catch-up does not authorize new deployments, changing voice limits,
  changing OAuth setup, or operating the owner's active voice/browser session.
