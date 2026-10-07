# Repository work instructions

## Required Git checkpoints

- During substantial work, make coherent checkpoint commits after meaningful,
  validated milestones. Keep each commit focused and usable rather than saving
  only a final tiny fix while leaving its implementation untracked.
- Commit and push completed, verified changes to the configured remote on the
  applicable existing branch. The owner has requested this as the normal
  project workflow. Report actual commit IDs, push status and remaining edits.
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
- Do not amend/rewrite history, force push, reset user changes, merge unrelated
  branches, or create a PR without an explicit request. If a push is rejected,
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
