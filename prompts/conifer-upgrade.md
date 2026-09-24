Upgrade every outdated dependency in the conifer repo to its latest compatible version. This is a full-stack modernization, not a single-module bump. In scope are all five dependency manifests and all pinned container images:

**frontend/package.json** — a 2018–2020 React SSR stack, the largest block of work:
- node:10.6.0 (frontend/Dockerfile) → current Node LTS
- webpack 4.28.0 → 5.x, plus its webpack-4-only plugin set: hard-source-webpack-plugin (abandoned, no webpack 5 support — remove), clean-webpack-plugin ^1.0.0, copy-webpack-plugin ^4.6.0, mini-css-extract-plugin ^0.4.5, css-loader 1.0.1, style-loader 0.23.1, and file-loader ^2.0.0 / url-loader 1.1.2 (both superseded by webpack 5 asset modules — remove rather than upgrade)
- node-sass ^4.14.1 → sass (dart-sass). This is a REPLACEMENT, not a version bump; node-sass is deprecated and its native libsass bindings have no builds for modern Node.
- react ^16.9.0 / react-dom ^16.9.0 → latest stable
- react-redux ^5.1.1 → latest (a 4-major jump; the store wiring in frontend/src/store will need work)
- react-router-dom ^4.4.0-beta.6 and react-router-config ^4.4.0-beta.6 → latest stable. Note these are pinned to a BETA that was never released; frontend/src/routes.js uses the v4 route-config shape with regex path params that v6+ does not support.
- redux-connect ^8.0.0 — unmaintained and coupled to react-router v4; find a maintained equivalent or inline its behavior
- enzyme ^3.7.0 + enzyme-adapter-react-16 → @testing-library/react (enzyme has no React 17+ adapter)
- eslint 5.9.0 + eslint-config-airbnb ^17.1.0 + plugins → latest stable
- jest 24.8.0 / babel-jest 23.4.2 → latest stable
- raven-js ^3.27.0 + raven-for-redux → @sentry/browser (raven is the retired Sentry SDK)
- @babel/* pinned at 7.0.0–7.1.x → latest 7.x; drop @babel/polyfill (deprecated since 7.4) and the babel-core ^7.0.0-bridge.0 shim
- swagger-ui ^3.23.11 → latest (this renders /docs/api, which is a declared key page below)
- pm2 ^3.2.2, nodemon ^1.18.7, bootstrap ^4.5.0, react-datepicker ^2.10.1, react-dnd ^6.0.0, react-virtualized ^9.21.2, immutable ^4.0.0-rc.12 (an RC!), superagent ^4.0.0
- Three dependencies are pinned to personal GitHub forks rather than registry releases: react-collapsible → github:m4rk3r/react-collapsible#dist; react-router-breadcrumbs-hoc → github:m4rk3r/react-router-breadcrumbs-hoc#dist; shepherd-client → github:oldweb-today/shepherd-client#rb-dimensions. Resolve each to a maintained upstream release where one exists; flag it if not.

**webrecorder/requirements.txt and webrecorder/setup.py** — mostly UNPINNED, which hides the age:
- bottle==0.12.13 → 0.13.x
- werkzeug, bleach, boto3, requests, itsdangerous, psutil, gevent-websocket — all bare names with no version constraint. Pin every one of them as part of this work; an unpinned requirement that the base image already satisfies is silently never upgraded.
- youtube_dl → yt-dlp (REPLACEMENT; youtube_dl has been unmaintained since 2021)
- fakeredis<1.0 → latest (now 2.x)
- apispec<1.0 → latest (now 6.x)
- bottle-cork — installed from a raw git commit SHA (94d4017a4d1b0d20328e9283e341bd674df3a18a) in both the Dockerfile and setup.py dependency_links; move to a released version
- six — remove; the codebase is Python 3 only
- setup.py uses setuptools.command.test (removed in setuptools 72) and dependency_links (removed from pip years ago). Both need replacing with a modern packaging approach.
- Base image webrecorder/pywb:2.5.0 → latest pywb. This also moves the interpreter off Python 3.7.2.
- webrecorder/Dockerfile hardcodes VOLUME /usr/local/lib/python3.5/site-packages/pywb/ — that path is already wrong today (pywb installs under python3.7) and will move again.

**search-driver/package.json**: node:12.8.0 → current Node LTS; puppeteer-core ^2.1.1 → latest; ioredis ^4.16.0 → 5.x; node-fetch ^2.6.0 → latest (note 3.x is ESM-only)

**Container images in docker-compose.yml and the Dockerfiles**:
- redis:3.2.4 → latest stable 7.x/8.x
- nginx:1.13-alpine → latest stable
- solr — currently has NO version tag at all, so it silently floats. It is presently resolving to Solr 10.0.0 while solrconf/conf/solrconfig.xml declares `<luceneMatchVersion>8.5.1</luceneMatchVersion>`. Pin the image explicitly and reconcile that mismatch.
- catatnight/postfix (mailserver) — unmaintained since ~2015. Replace or remove.
- Third-party images that are frozen but not built from this repo: oldwebtoday/shepherd:1.2.0, webrecorder/browsertrix:0.2.0, oldwebtoday/coturn:1.0, webrecorder/dat-share, webrecorder/behaviors:latest, plus zookeeper:3.6 in search-compose.yml. Bump these tags where a newer one exists, but treat them as UNVERIFIABLE — they are not built here and cannot be meaningfully smoke-tested by this pipeline. Say so explicitly rather than claiming success.
- docker-compose.yml declares version: '2', which modern Compose ignores with a warning on every invocation. Remove it. It also hardcodes container_name: on all 13 services, which makes those names global to the Docker daemon and collide with any other project; prefer Compose's default per-project naming.

IMPORTANT — the baseline does not currently work. Do not assume you are starting from a running application. At HEAD (commit c406b480 on main) the stack does not come up cleanly:
- the `app` service fails to load its WSGI application and exits
- `docker compose up` aborts during image pull because of the mailserver image
- two of the three uWSGI services fail to exec their configured command

Diagnosing and repairing these is IN SCOPE and is part of the upgrade. Do not paper over them by pinning everything to its current version — work out the actual constraint that each failure represents, because at least one of them is a genuine version conflict between this repo's own code and one of its dependencies, where both the too-old and the too-new version fail for different reasons. Report what you find.

Exclude from scope: data/ and wr.env (runtime state and secrets, both gitignored); **/node_modules/; webrecorder/proxy-certs/; webrecorder/migration_scripts/ (one-off historical scripts); webrecorder/webrecorder/static/bundle/ and frontend/static/ (generated build output); the two .bak files in webrecorder/webrecorder/. Do NOT re-architect: the backend stays on Bottle + uWSGI + pywb and the frontend stays React + Redux + webpack. No migration to FastAPI/Flask, Vite, or Next.js. Do not modify solrconf/ schema files unless the Solr version change actually requires it.

The repo is checked out with LF line endings and core.autocrlf is set to false locally — do not reintroduce CRLF, and consider adding a .gitattributes (the repo ships none, which is why Windows checkouts corrupt every shell script).

## External services

This app depends on external services that are NOT in any package manifest, declared only as container images in docker-compose.yml:

- **Redis 3.2.4** → target latest stable. This is NOT a cache — it is the application's PRIMARY DATASTORE. All user accounts, collections, lists, recordings and session state live in Redis. There is no SQL database anywhere in this stack. Treat any Redis change as data-bearing.
- **Apache Solr, currently UNPINNED** → pin explicitly. Used for full-text search over captured pages via webrecorder/webrecorder/solrmanager.py, reached at http://solr:8983 with collection `conifer`, precreated from the configset in solrconf/.
- **Apache ZooKeeper 3.6** — only in search-compose.yml (the multi-node SolrCloud topology), not in the default local stack.
- Supporting containers with no manifest entry: oldwebtoday/shepherd (remote-browser orchestration, bind-mounts /var/run/docker.sock), webrecorder/browsertrix, oldwebtoday/coturn (TURN/WebRTC), webrecorder/dat-share, webrecorder/behaviors, and a Postfix mail container.

Both Redis and Solr have in-repo configuration that can drift from the live service, so populate `validation.external_service_checks` with at least these two entries:

| service | live_check_command_or_request | expected_match_file | mismatch |
|---|---|---|---|
| Redis | `docker compose exec -T redis redis-cli INFO server` → read `redis_version` | `redis/Dockerfile` | running version differs from the `FROM redis:<tag>` pin |
| Solr | `curl -s "http://localhost:8983/solr/conifer/config?wt=json"` → read `luceneMatchVersion` | `solrconf/conf/solrconfig.xml` | the repo declares 8.5.1; confirm the pinned Solr still accepts it, and that the `conifer` collection was actually created rather than silently skipped |

A passing home page does not prove either service is healthy — the app renders fine with Solr misconfigured, because search is not on the landing path.

## Build, start, and validation commands

Working directory for all commands: `C:\Users\OEM\legacy-upgrade-system\projects\conifer`

- **Build** (`validation.build_commands`): `docker compose build`
- **Start** (`validation.startup_commands`): `docker compose up -d redis solr app recorder warcserver frontend nginx dat behaviors shepherd coturn browsertrix`
  - The service list deliberately omits `mailserver`; including it currently aborts the whole startup, which is one of the failures in scope. If you fix or replace that image, add it back.
- **Startup health check URL** (`validation.startup_health_check_urls`): `http://localhost:8089/`
- **Stop**: `docker compose down`
- **Logs**: `docker compose logs --tail 50 <service>`

Startup is slow and asynchronous. nginx serves a maintenance page for roughly the first 30 seconds while uWSGI boots and the frontend builds its bundles, and it returns HTTP 200 while doing so. Retry rather than concluding failure on the first response, and do not treat a 200 alone as readiness.

**This frontend is server-side rendered, which makes HTTP status checks actively misleading.** Express renders the React tree on the server and returns complete, correct-looking HTML even when the client bundle is broken. A snapped hydration — the most likely failure mode of the webpack 5, React 18, and react-router migrations — produces HTTP 200, a full page of markup, and a console exception, with no server-side symptom at all. The Playwright console and snapshot checks are therefore the real acceptance signal here, not the status code. Treat any `error` or `pageerror` console entry on these pages as a genuine failure and triage it, rather than accepting a 200 as proof the page works.

The home page must contain `Conifer | Homepage` in a server-rendered `<title>` tag. A 200 alone is not sufficient, because nginx serves the maintenance page with a 200.

Success criteria: all 12 started services reach `running` state in `docker compose ps` and stay there; the startup health check passes its Playwright check; every `key_pages` entry passes; every `key_user_flows` entry passes; both `external_service_checks` pass.

## Key pages (`validation.key_pages`)

| url | description |
|---|---|
| `http://localhost:8089/_login` | Login form — server-rendered form whose fields are wired through Redux; exercises the react-redux upgrade |
| `http://localhost:8089/_register` | Registration form (REQUIRE_INVITES=false, ANON_DISABLED=true in wr.env) |
| `http://localhost:8089/_faq` | Static content page — exercises routing and rendering without touching the API |
| `http://localhost:8089/docs/api` | Swagger UI — directly renders the upgraded swagger-ui dependency, which is a large major-version jump and a likely source of console errors |

Note that `http://localhost:8089/docs` returns a 301 redirect to `/docs/api`. Use `/docs/api` directly so the browser check does not have to follow a redirect.

## Key user flows (`validation.key_user_flows`)

A page that loads clean does not prove its interactive paths survived. These two flows target exactly the code the upgrade is most likely to break — client-side routing and Redux-connected form submission — and both are deterministic and non-mutating, so they can be re-run safely against the empty datastore.

Selector conventions are inconsistent between the two forms, so target them as written below rather than assuming a pattern: the **login** form's fields carry `id` attributes (`#username`, `#password`), while the **registration** form's fields carry only `name` attributes (`name="username"`, `name="email"`, `name="confirmpassword"`) with no `id`. Both were verified against the running baseline.

**Flow 1 — client-side route navigation** (`url: http://localhost:8089/`)
1. Navigate to `http://localhost:8089/`
2. Click the link with text `Sign Up` (href `/_register`)
3. Confirm the registration form rendered — the page contains an input with `name="confirmpassword"`, which appears only on the registration form and not on the login page
4. Capture console output

This is the single highest-value check in the run. react-router-dom is being moved off an unreleased 4.x beta, and this flow proves a client-side transition still mounts the target route. A full-page reload or a blank render here means the router migration failed, and nothing in an HTTP status check would reveal it.

**Flow 2 — login form submission with invalid credentials** (`url: http://localhost:8089/_login`)
1. Navigate to `http://localhost:8089/_login`
2. Fill the input with id `username` with `nonexistent_user_upgrade_check`
3. Fill the input with id `password` with `wrongpassword123`
4. Click the submit button with text `Sign in`
5. Confirm the page still renders the login form and displays a rejection message rather than a blank page or an error boundary
6. Capture console output

This exercises the full round trip — Redux-connected form state, the superagent HTTP call, the Bottle API, Redis lookup, and error rendering — without creating any state. Deliberately do NOT submit the registration form; that would write a user to Redis and make the flow non-repeatable on re-runs.

One caveat when triaging Flow 2: a rejected login legitimately returns HTTP 401, and the browser may log that failed request to the console as a network message. A clean 401 network log is EXPECTED and should be triaged `out_of_scope`. Only a JavaScript exception, a `pageerror`, or a React error boundary should be treated as a real failure for this flow.

## Test suites — weaker than they look

- webrecorder/test/ holds 33 pytest files, but pytest is NOT installed in the app image — it sits in setup.py `tests_require`, which the Dockerfile never installs. Installing it is part of the work if you want these to run.
- `npm test` in frontend/ is `jest --watch --env=jsdom`. The `--watch` flag is INTERACTIVE and will hang forever in automation — use `npx jest --ci --watchAll=false` instead. There is only about one test file, so a green frontend suite proves very little.
- Treat the build succeeding, plus the Playwright page and flow checks above, as the real acceptance signal.
- Regenerating lockfiles must happen inside a container so the result lands on the host: `docker compose run --rm --no-deps frontend yarn install` rewrites frontend/yarn.lock in place (Compose bind-mounts ./frontend/ to /code). If you change package.json without doing this, the build silently reinstalls the old 2020 dependency graph from the stale lockfile.

## Datastore state

The datastore and search index are EMPTY. This is a fresh local install: data/ was created empty during setup, Redis holds no accounts or collections, the Solr `conifer` collection is precreated but has zero documents, and no WARCs have been captured. There is therefore no migration or backwards-compatibility burden on stored data, and destructive resets (`docker compose down -v`) are acceptable during iteration.

Be aware this also means data-layer regressions will NOT surface on their own — if a Redis or Solr upgrade changes serialization behavior, an empty store hides it. This is precisely why the `external_service_checks` above matter: they inspect the live service's own configuration rather than inferring health from an application page that never touches it.

A full capture/replay flow (recording a live page into a collection) is the app's core purpose but requires the remote-browser images from install-browsers.sh, several GB that are not installed. Do not attempt to validate capture; state explicitly in the final report that it is untested.
