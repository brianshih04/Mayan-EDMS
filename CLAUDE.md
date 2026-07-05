# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This repo contains **two distinct projects** that are developed together:

1. **`mayan/`** — the Mayan EDMS backend. A fork/mirror of upstream Mayan EDMS **4.3.1** (Django 3.2.14, Python 3.7–3.9), an Apache-2.0 document management system. ~60 Django apps under `mayan/apps/`. This is the stable document backend: OCR, indexing, permissions, workflows, search, signatures.
2. **`avision-portal/`** — a React + Vite role-based frontend that sits **on top of** Mayan. This is the **active development** (current branch `codex/avision-portal`). It does not replace Mayan; it presents a simplified, role-oriented UI (scanner / records / reviewer / viewer / admin) and talks to Mayan as its backend.

The running deployment is on Windows. Mayan runs in Docker at `http://localhost:8080` (deployment root `E:\Mayan-EDMS-Docker`, outside the repo); the portal dev server runs on `http://localhost:5174`. Both are exposed publicly via a single Cloudflare named tunnel (`mayan-emds`).

## Mayan backend — commands

All Mayan commands go through `manage.py` or `make`. `make` targets set the correct settings module automatically.

```bash
# Dev server
make runserver                       # ./manage.py runserver --settings=mayan.settings.development
make manage <command>                # run any management command with development settings
make shell-plus                      # Django shell with all models auto-imported (very useful)

# Tests (settings default to mayan.settings.testing.development, migrations skipped by default)
make test                            # all apps with tests (MODULE defaults to --mayan-apps)
make test MODULE=mayan.apps.documents                          # one app
make test MODULE=mayan.apps.documents.tests.test_document_models          # one module
make test MODULE=mayan.apps.documents.tests.test_models.SomeTestCase.test_method
make test ARGUMENTS="--keepdb -v2"   # pass extra args to Django's test runner
make test-all-migrations             # migration tests (--no-exclude --tag=migration_test)

# Lint / checks
flake8                               # config in .flake8 (E501 + N801–N806 are ignored)
make check-missing-migrations        # fail if models have unmigrated changes

# Coverage
make coverage-run && make coverage-html   # report under htmlcov/

# Test against a real DB backend (containers managed by make)
make docker-postgresql-start         # also: docker-mysql-start, docker-oracle-start, docker-redis-start, docker-elastic-start
make test-with-postgresql MODULE=mayan.apps.documents
```

Underlying single-test invocation (what `make test` expands to):
```bash
./manage.py test <MODULE> --settings=mayan.settings.testing.development --skip-migrations
```

The custom test runner (`mayan.apps.testing.runner.MayanTestRunner`) adds:
- `--mayan-apps` — run only apps whose `MayanAppConfig` sets `has_tests = True`.
- `--skip-migrations` — create tables directly from models (`NullMigrationsClass`), much faster.
- `--no-exclude` — include tests tagged with the project's exclude tag.

Test settings (`mayan/settings/testing/base.py`) force `CELERY_TASK_ALWAYS_EAGER`, an in-memory broker, MD5 password hashing, and disable auto-OCR / auto-parsing / auto-file-metadata so unit tests stay hermetic.

### Requirements are generated — do not hand-edit

`requirements/*.txt` are produced by `make generate-requirements` (→ `manage.py generaterequirements`) from dependency declarations inside each app's `dependencies.py`. Edit the declarations, then regenerate; never edit the `.txt` files directly.

## Mayan backend — architecture

Mayan is **not** structured like a vanilla Django project. It is a plugin/registry system. Understanding this is the prerequisite to touching any app.

### Apps are self-wiring plugins

Each app subclasses `MayanAppConfig` (`mayan/apps/common/apps.py`), not `AppConfig`. Everything an app contributes — URLs, permissions, menus, search columns, events, Celery queues, dashboard widgets — is registered **imperatively in the app's `apps.py` `ready()` method** by calling class-based registries. `mayan/apps/documents/apps.py` is the canonical, full-featured example (~1000 lines of registrations).

Things autodiscovered by the framework (you do NOT wire these in a root file):
- **URLs**: `MayanAppConfig.configure_urls()` mounts each app's `urls.py` at its `app_url`. The root `mayan/urls/base.py` is intentionally empty.
- **Celery tasks**: `app.autodiscover_tasks(INSTALLED_APPS)` in `mayan/celery.py` picks up each app's `tasks.py`.

### The registry classes (the real "API")

| Registry | Defined in | Purpose |
|---|---|---|
| `ModelPermission` / `register_inheritance` | `acls/classes.py` | Bind permissions to models; propagate ACLs across object relationships |
| `SourceColumn` | `navigation/classes.py` | Declare columns shown in list views (incl. thumbnails, sortable fields) |
| `EventModelRegistry` / `ModelEventType` | `events/classes.py` | Map models to the events they emit (audit log) |
| `ModelField` / `ModelQueryFields` | `databases/classes.py` | Whitelist fields for the API + auto `select_related`/`prefetch_related` |
| `ModelCopy` | `common/classes.py` | Configure deep-copy of objects |
| `Layer` (`layer_decorations`, `layer_saved_transformations`) | `converter/layers.py` | Image transformation pipelines applied to page thumbnails |
| `CeleryQueue` + `queue.add_task_type(...)` | `task_manager/classes.py` | Declare queues/workers and route task types to them (see each app's `queues.py`) |
| Menus (`menu_main`, `menu_object`, `menu_facet`, `menu_list_facet`, `menu_multi_item`, `menu_secondary`, `menu_setup`, `menu_return`) | `common/menus.py` | Declarative navigation. Links (`links/` dir) are bound to menus in `ready()` |

When adding a feature to an app, expect to touch its `apps.py` (registration), `models/`, `links/`, `permissions.py`, `views/`, `urls.py`, `serializers/` (for the REST API), and `tasks.py` + `queues.py` (for async work). `models/` is a package, split per model (e.g. `document_models.py`, `document_file_models.py`).

### Document ingestion: sources

Documents enter via `mayan/apps/sources/source_backends/`: `watch_folder_backends.py`, `staging_folder_backends.py`, `web_form_backends.py`, `email_backends.py`, `sane_scanner_backends.py`. This is the integration point the Avision portal targets.

### Settings resolution

`mayan/settings/base.py` is processed by `smart_settings` (`SettingNamespaceSingleton`), which reads `config.env` (→ generated into `mayan/settings/literals.py` via `make copy-config-env`). Many symbols in `base.py` are flagged `# NOQA: F821` because they are **injected at runtime** from env vars (`MAYAN_*`), not defined statically — e.g. `MEDIA_ROOT`, `DATABASE_ENGINE`, `COMMON_EXTRA_APPS`. Override behavior with `MAYAN_*` environment variables or the `MAYAN_DATABASES` dict (see the `*-with-postgresql` make targets).

### REST API

DRF serializers per app (`serializers/`), viewsets in `api_views/`, auto-documented with `drf-yasg` (Swagger/OpenAPI). Auth: Session / Token / Basic.

### Code style notes

- Translations use **`ugettext_lazy`** (Django 3.2 alias), imported as `_` — not `gettext_lazy`.
- flake8 ignores E501 (no line-length limit) and N801–N806 (naming), so the codebase deliberately uses some non-PEP8 names; match surrounding style.
- Commits to upstream require DCO sign-off (`git commit -s` → `Signed-off-by: Name <email>`).

## Avision portal — commands

All commands run from `avision-portal/`:

```powershell
npm install
npm run dev        # Vite dev server on http://localhost:5174 (host 0.0.0.0)
npm run build      # production build to dist/
npm run preview    # preview the build on 5174
```

PowerShell helpers exist: `start-portal.ps1`, `build-portal.ps1`, `preview-portal.ps1`.

There is **no separate test runner, lint, or typecheck configured** for the portal (`package.json` has only `dev`/`build`/`preview`). Verify changes by running `npm run dev` and exercising the UI.

## Avision portal — architecture

- **Stack**: React 19, Vite 6, `lucide-react` icons. No router, no state library, no i18n library — it is intentionally minimal.
- **Single source file**: nearly all app logic (roles, navigation, tasks, panels, demo data, locale dictionaries) lives in **`src/main.jsx`**. i18n strings for `zh-TW`, `en`, `ja`, `zh-CN` are a single `locales` object there.
- **Backend bridge is a Vite plugin**: `vite.config.js` exports `scannerApiPlugin()`, which registers Node middleware (on both dev and preview servers) exposing the scanner API:
  - `GET  /api/scanner/watch-folder` — lists importable files in the watch folder
  - `GET  /api/scanner/files/:fileName` — streams a file for preview
  - `POST /api/scanner/batches` — writes a batch manifest JSON to the portal state dir

  Config via env: `AVISION_WATCH_FOLDER` (default `E:\watch_folder`), `AVISION_PORTAL_STATE_DIR` (default `E:\Mayan-EDMS-Docker\data\portal`). `allowedHosts` must include `mayan-portal.avision-gb10.org` for the Cloudflare tunnel to work.

### Hard constraints (from DEVELOPMENT_PLAN.md / DEVELOPMENT.md)

- **Do not modify Mayan core** unless explicitly necessary and the upgrade cost is evaluated — keep the portal a thin layer.
- **Never write portal manifests into `E:\watch_folder`** — Mayan's watch-folder source would ingest them as documents. Manifests go to `AVISION_PORTAL_STATE_DIR\batches\`.
- **The scanner API must prevent path traversal** — only filenames (no path components) are accepted and they must resolve inside the watch folder. `resolveWatchFolderFile()` / `createScannerBatch()` already enforce this; preserve it when editing.
- Roles (scanner / records / reviewer / viewer / admin) and their nav are defined in `src/main.jsx` (`demoUsers`, `roleNav`, `tasks`, `panels`). Mayan API integration is staged but largely not yet wired — only the scanner watch-folder bridge is real; other roles are still demo data.
- Planned direction: extract the Vite middleware into a real backend service (`server/scanner`, `server/mayan`, `server/auth`) and call Mayan's REST API for auth, import, metadata, and workflow.

The portal's own docs (`avision-portal/README.md`, `DEVELOPMENT.md`, `DEVELOPMENT_PLAN.md`, `USERGUIDE.md`, `CHANGELOG.md`, `TODOLIST.md`) are the authoritative source for product direction and current status — read them before starting portal work.
