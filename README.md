# pearOS App Store — Backend

A serverless "App Store" built entirely on GitHub: developers submit apps through a
GitHub Issue Form, submissions are validated and turned into a review Pull Request,
and once merged the static JSON API + browsing site are rebuilt and published on
GitHub Pages. The flow: Submit → In Review → Approved/Rejected → Live.

## How it works

1. **Submit** — a developer opens `Submit an App` (an Issue Form, see
   `.github/ISSUE_TEMPLATE/submit-app.yml`). The button on the site links straight to it.
2. **`submission-to-pr.yml`** parses the issue body, builds a JSON record that matches
   `schema/app.schema.json`, validates it, and either:
   - comments + closes the issue if validation fails, or
   - commits it to `data/pending/{appId}.json` on a new branch and opens a review PR.
3. **You review the PR** like a diff. `validate-pr.yml` runs schema validation and a
   build-asset check as required status checks (branch protection on `main` blocks
   merging until both pass, unless you use the maintainer-only override).
4. **`review-decision.yml`** reacts to the PR being closed:
   - merged → moves the file to `data/approved/`, sets `status: "approved"`, rebuilds
     `site/api/database.json`, `site/api/index.json`, and `site/api/apps/{appId}.json`,
     commits to `main`, and closes the issue as published.
   - closed unmerged → removes the pending file and closes the issue as rejected.
5. **`pages-deploy.yml`** publishes `site/` (the browsing UI + generated `site/api/*`)
   to GitHub Pages whenever `main` changes.

## The "API"

Everything under `site/api/` is static JSON, served directly by GitHub Pages:

- `GET /api/database.json` — full array of every approved app, same shape as
  `database.example.json`.
- `GET /api/index.json` — lightweight list (id, name, category, icon, price) for search/browse UIs.
- `GET /api/apps/{appId}.json` — single app lookup by id.

## Hosting the build (.pkg / .app.zip)

The catalog only ever stores metadata + a download URL — never the binary itself. The
Issue Form has a native GitHub file-upload field for the `.pkg` / `.app.zip`; the developer
attaches it directly to the issue, and the maintainer re-hosts a permanent copy as a
GitHub Release before merging.

When reviewing a submission PR:

```bash
# 1. Download the build attached to the original issue (linked under
#    "Build File (.pkg or .app.zip)" in the issue body).

# 2. Host it permanently as a GitHub Release (2GB/file limit). One release per app version:
gh release create "app-<appId>-v<version>" \
  ./AppBundle.app.zip ./pearos_arm64.pkg ./pearos_x86_64.pkg \
  --title "<App Name> v<version>" --notes "Automated release for app <appId>"

# 3. Grab the asset URLs and attach them to the pending submission:
gh release view "app-<appId>-v<version>" --json assets -q '.assets[].url'

node scripts/attach-build.js data/pending/<appId>.json \
  --url <universal .app.zip or .pkg URL> \
  --arm64 <pearos_arm64.pkg URL> \
  --x86_64 <pearos_x86_64.pkg URL>

# 4. Commit that change to the PR branch, push, then merge.
```

`validate-pr.yml` runs a `build-asset-check` job that fails if `currentRelease.downloadUrl`
is still empty when the PR is open. With branch protection enabled this blocks the normal
merge button — as the repo owner you still have a "merge without waiting for requirements"
override if you want to publish a metadata-only listing before the binary is ready.

## Local development

```bash
npm install
node scripts/validate.js data/approved      # validate existing entries
node scripts/build-database.js              # regenerate site/api/*
python3 -m http.server 8000 -d site         # browse the site locally
```

## One-time repo setup

- Settings → Pages → Build and deployment source: **GitHub Actions**.
- Labels `app-submission`, `in-review`, `published`, `rejected`, `invalid-submission`
  are auto-created by the workflows on first use (GitHub's API creates missing labels).
- Branch protection on `main` requires the `validate` and `build-asset-check` status checks.
