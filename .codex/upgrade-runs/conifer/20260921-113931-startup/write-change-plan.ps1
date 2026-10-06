$ErrorActionPreference = 'Stop'

$repo = 'C:\Users\OEM\legacy-upgrade-system\projects\conifer'
$artifact = 'C:\Users\OEM\legacy-upgrade-system\.codex\upgrade-runs\conifer\20260921-113931-startup'
$impactPath = Join-Path $artifact 'impact-report.json'
$impact = Get-Content -Raw -LiteralPath $impactPath | ConvertFrom-Json

function Get-Locations($file, $pattern) {
  $entry = $impact.affected_files | Where-Object file_path -eq $file | Select-Object -First 1
  if (-not $entry) { return @() }
  $locs = @($entry.locations | Where-Object { $_.symbol_or_pattern -match $pattern -or $_.matched_api -match $pattern } | Select-Object -First 12)
  if ($locs.Count -eq 0) { $locs = @($entry.locations | Select-Object -First 4) }
  @($locs | ForEach-Object {
    [ordered]@{
      start_line = [int]$_.start_line
      end_line = [int]$_.end_line
      symbol_or_pattern = [string]$_.symbol_or_pattern
      matched_api = [string]$_.matched_api
    }
  })
}

function New-Change($seq, $file, $risk, $rationale, $pattern, $description, $evidence, $type = 'modify') {
  [ordered]@{
    sequence = $seq
    file_path = $file
    change_type = $type
    estimated_risk = $risk
    rationale = $rationale
    locations = @(Get-Locations $file $pattern)
    change_description = $description
    validation_evidence = $evidence
  }
}

$changes = New-Object System.Collections.ArrayList
$seq = 1

@(
  @('docker-compose.yml','high','Compose schema, service names, image pins, and known baseline startup failures are central to the full-stack modernization.','docker-compose|container image|container_name|mailserver|solr|redis','Remove the obsolete top-level version key; remove hardcoded container_name entries; keep service names stable. Replace or remove catatnight/postfix so compose no longer aborts. Pin externally pulled images to maintained explicit tags where verifiable, including solr, browsertrix, shepherd, coturn, dat-share, and behaviors; flag unverifiable images in comments. Preserve Solr config mount and Redis hostnames.',@('docker compose config succeeds.','Requested 12-service startup set reaches running.','No mailserver pull failure remains.')),
  @('webrecorder/Dockerfile','high','The pywb base image is pinned and baseline WSGI load currently fails.','FROM webrecorder/pywb','Update FROM webrecorder/pywb:2.5.0 to the latest compatible pywb image/tag. Preserve Bottle + uWSGI + pywb. Fix Python path/working-directory assumptions so app, recorder, and warcserver uWSGI commands import webrecorder modules.',@('docker compose build succeeds.','app, recorder, and warcserver stay running.')),
  @('redis/Dockerfile','high','Redis is both runtime service and fakeredis compatibility surface.','FROM redis|redis.conf','Update FROM redis:3.2.4 to a maintained compatible Redis tag. Keep init-redis-conf.sh and redis.conf semantics intact; do not touch runtime data.',@('redis-cli INFO server matches redis/Dockerfile.','Redis starts without config parse errors.')),
  @('nginx/Dockerfile','medium','nginx fronts the acceptance URL.','FROM nginx','Update FROM nginx:1.13-alpine to a maintained nginx alpine tag while preserving nginx.conf routing.',@('http://localhost:8089/ renders Conifer page.')),
  @('frontend/Dockerfile','high','Frontend dependency upgrade requires a Node LTS runtime and in-container lockfile regeneration.','Dockerfile|node|yarn','Move frontend image to current Node LTS compatible with Yarn classic. Preserve React + Redux + webpack and container command shape.',@('docker compose run --rm --no-deps frontend yarn install completes.','docker compose build frontend succeeds.')),
  @('search-driver/Dockerfile','medium','search-driver depends on Node, puppeteer-core, ioredis, and node-fetch.','Dockerfile|node','Move search-driver to current Node LTS. Keep external browser control through puppeteer-core/browsertrix; do not bundle Chromium.',@('node --check search-driver/index.js succeeds.')),
  @('frontend/package.json','high','Main dependency manifest for React SSR, Redux, router, webpack, Babel, Jest, Sass, and browser packages.','react|webpack|node-sass|redux-connect|raven|swagger-ui|enzyme','Upgrade all outdated frontend dependencies to latest compatible stable versions while preserving React + Redux + webpack. Replace node-sass with sass; Raven packages with Sentry; redux-connect with local behavior; Enzyme with Testing Library; webpack 4 ecosystem with webpack 5-compatible loaders/plugins. Resolve GitHub fork dependencies to releases where possible or flag retained forks.',@('No stale removed packages remain in package.json.','frontend/yarn.lock regenerated in container.','Jest CI command succeeds.')),
  @('frontend/yarn.lock','high','Lockfile must match upgraded frontend manifest.','yarn.lock|node-sass|redux-connect|raven|webpack','Regenerate only via docker compose run --rm --no-deps frontend yarn install. Preserve LF and do not hand-edit generated bundles.',@('No stale node-sass/raven/redux-connect/enzyme/webpack4 entries remain.')),
  @('frontend/babel.config.js','medium','Babel 7/Jest modernization requires current config compatibility.','babel|preset|plugin','Update for current @babel/core, presets, runtime, class/private syntax equivalents, and Jest transforms. Remove deprecated proposal plugin names where replaced.',@('Frontend bundles compile.','Jest transforms JSX.')),
  @('frontend/config/polyfills.js','medium','@babel/polyfill is deprecated.','polyfill','Replace @babel/polyfill with explicit core-js/regenerator-runtime imports or preset-env useBuiltIns strategy compatible with upgraded Babel.',@('Client bundle builds without @babel/polyfill.')),
  @('frontend/config/testSetup.js','high','Test stack moves from Enzyme adapter to Testing Library.','enzyme','Remove Enzyme adapter setup and configure @testing-library/jest-dom plus required React test environment shims.',@('No enzyme imports remain.')),
  @('frontend/src/components/TempUserTimer/index.test.js','medium','Affected Enzyme test should demonstrate Testing Library migration.','enzyme','Rewrite to @testing-library/react assertions on visible behavior rather than internals.',@('Targeted Jest test passes.')),
  @('frontend/webpack/webpack.config.js','high','Webpack 5 removes several loader/plugin patterns used by shared config.','webpack4|url-loader|file-loader|time-fix-plugin','Remove time-fix-plugin and incompatible wrapping; replace url-loader/file-loader rules with webpack 5 asset modules; keep aliases, EnvironmentPlugin defaults, output/publicPath, and superagent handling.',@('Frontend build emits bundles without webpack 4 plugin errors.')),
  @('frontend/src/client.js','high','React hydration and Raven client initialization are affected.','Raven|ReactDOM|hydrate|react-hot-loader','Replace Raven with Sentry browser initialization. Use the selected React version hydration API. Remove react-hot-loader/AppContainer if incompatible while preserving feasible HMR.',@('No raven-js import remains.','Browser hydration has no pageerror.')),
  @('frontend/src/store/create.js','high','Raven Redux middleware must be replaced while preserving store creation.','Raven|raven-for-redux|middleware','Replace raven-for-redux with Sentry Redux enhancer/middleware or minimal custom middleware. Keep createMiddleware, batching, immutable initial state, devtools, and HMR reducer replacement intact.',@('Invalid login rejection renders in page.')),
  @('frontend/src/containers/App/App.js','high','App combines routing, redux-connect data loading, and Raven error reporting.','Raven|renderRoutes|redux-connect|asyncConnect','Replace Raven calls with Sentry equivalents. Replace asyncConnect export with local async data replacement. Keep renderRoutes if selecting react-router-config v5; if selecting later router, preserve route semantics without re-architecting.',@('Error boundary still renders fallback.','No redux-connect or raven-js imports remain.')),
  @('frontend/src/root.js','high','Root renders ReduxAsyncConnect and must host replacement route renderer.','ReduxAsyncConnect|BrowserRouter|MemoryRouter','Remove ReduxAsyncConnect. Render router tree using selected stable router/config path and pass client/store helpers through context or route props. Preserve BrowserRouter and MemoryRouter modes.',@('Sign Up navigation renders /_register.')),
  @('frontend/src/server.js','high','SSR depends on redux-connect loadOnServer.','ReduxAsyncConnect|loadOnServer|StaticRouter','Replace loadOnServer with local route data preloader matching request location against baseRoute and invoking matched loadData/async functions. Preserve StaticRouter redirect/status handling, BaseHtml serialization, compression, and Express lifecycle.',@('Home page server-rendered title contains Conifer | Homepage.')),
  @('frontend/src/store/reducer.js','medium','redux-connect injects a reducer that must be removed/replaced.','redux-connect|reduxAsyncConnect','Remove reduxAsyncConnect reducer import and combine entry. Add only an explicit local async reducer if the replacement helper needs one.',@('Redux store initializes during SSR and hydration.')),
  @('frontend/src/routes.js','high','react-router beta v4 path regex syntax may break under newer router/path-to-regexp.','react-router|path|:splat|regex','Keep route table architecture. Prefer latest v5-compatible router/config if v6+ would force re-architecture or drop regex semantics. Explicitly preserve userPath, $br, splat, optional timestamp, embed, login/register/docs/faq, replay/record patterns.',@('Startup URL and key pages match expected components.')),
  @('frontend/src/components/siteComponents/ApiDocs/index.js','medium','swagger-ui package API changed significantly.','swagger-ui|SwaggerUi','Update import/initialization for upgraded swagger-ui. Preserve swagger-ui CSS import and /api/v1.json URL at #swaggerContainer.',@('/docs/api renders Swagger UI.')),
  @('frontend/src/helpers/ApiClient.js','medium','superagent upgrade touches SSR, login, and Redux flows.','superagent|request.end|withCredentials','Review superagent API compatibility while preserving method wrappers, cookie forwarding, Host override, withCredentials, request.type, and rejection semantics.',@('Invalid login flow rejects cleanly.')),
  @('search-driver/package.json','medium','Separate Node manifest for Redis, fetch, and puppeteer-core.','ioredis|node-fetch|puppeteer-core','Upgrade ioredis and puppeteer-core to latest compatible stable. For node-fetch, either stay on latest v2 CJS-compatible or migrate index.js for v3+; prefer smallest working change under Node LTS. Regenerate yarn.lock.',@('node --check search-driver/index.js succeeds.')),
  @('search-driver/index.js','medium','node-fetch v3 is ESM-only and ioredis/puppeteer may require small updates.','node-fetch|ioredis|puppeteer-core','If using node-fetch v3+, use dynamic import wrapper or convert consistently to ESM. Preserve Redis keys, browsertrix connection, CDP calls, and PUT payload behavior.',@('No module import errors.')),
  @('search-driver/yarn.lock','medium','Lockfile must match search-driver manifest.','yarn.lock|ioredis|node-fetch|puppeteer-core','Regenerate lockfile after package.json edits using existing package manager style and LF.',@('Lockfile entries match selected ranges.')),
  @('webrecorder/requirements.txt','high','Python dependencies are bare/obsolete and include requested replacements.','bottle|bottle-cork|youtube_dl|fakeredis|apispec','Pin bare deps. Upgrade bottle to 0.13.x. Replace youtube_dl with yt-dlp. Upgrade fakeredis to 2.x and apispec to 6.x. Use released bottle-cork if compatible. Remove six after imports are migrated.',@('requirements has bottle 0.13, yt-dlp, fakeredis 2, apispec 6, no youtube_dl/six.')),
  @('webrecorder/setup.py','high','Modern packaging must remove legacy setuptools hooks.','setuptools|dependency_links|setup_requires|tests_require','Remove setuptools.command.test import, PyTest command/cmdclass, setup_requires, dependency_links. Keep install_requires from requirements plus pywb through normal metadata. Move test deps to extras_require if needed.',@('No dependency_links/setup_requires/setuptools.command.test remain.')),
  @('webrecorder/webrecorder/apiutils.py','high','apispec <1 to 6 changes constructor and registration APIs.','apispec|APISpec','Update APISpec construction for apispec 6.x, including openapi_version/info/plugin/path/schema calls. Preserve /api/v1.json shape for Swagger UI as much as possible.',@('/docs/api loads /api/v1.json.')),
  @('webrecorder/webrecorder/standalone/serializefakeredis.py','high','fakeredis 2 changed private internals used by serialization.','fakeredis|DATABASES|_ZSet|_Hash|_ExpiringDict','Replace private fakeredis imports with supported FakeServer/FakeRedis state access or local adapter while preserving standalone player serialization.',@('No ImportError for fakeredis private internals.')),
  @('solrconf/conf/solrconfig.xml','high','Solr config must match selected Solr image; user prohibited schema changes unless required.','luceneMatchVersion','Do not modify unless selected Solr rejects luceneMatchVersion 8.5.1 or core creation fails. If required, make minimal compatibility edit and leave managed-schema untouched unless Solr explicitly rejects it.',@('Live Solr config reports matching luceneMatchVersion.')),
  @('solrconf/conf/managed-schema','high','Managed schema should stay untouched unless Solr requires it.','Solr|schema','Default action is no edit. Change only if selected Solr image rejects schema during core creation; document exact Solr error if edited.',@('No managed-schema diff unless startup proves necessity.'))
) | ForEach-Object {
  [void]$changes.Add((New-Change $seq $_[0] $_[1] $_[2] $_[3] $_[4] $_[5]))
  $seq++
}

[void]$changes.Add([ordered]@{
  sequence = $seq
  file_path = 'frontend/src/helpers/asyncData.js'
  change_type = 'create'
  estimated_risk = 'high'
  rationale = 'A small local helper is the narrowest way to replace redux-connect loadOnServer/asyncConnect without re-architecting React + Redux + webpack.'
  locations = @()
  change_description = 'Scope expansion: create a focused helper that exports an asyncConnect-compatible wrapper or loadData convention plus a server preloader. It must support existing asyncConnect promise arrays, pass {store, helpers:{client}, params, location}, and work for SSR and client navigation.'
  validation_evidence = @('All former redux-connect imports use the local helper or loadData.','SSR and client route flow pass.')
})
$seq++

$asyncFiles = @(
  'frontend/src/containers/CollectionCover/CollectionCover.js',
  'frontend/src/containers/CollectionDetail/CollectionDetail.js',
  'frontend/src/containers/CollectionList/CollectionList.js',
  'frontend/src/containers/CollectionManagement/CollectionManagement.js',
  'frontend/src/containers/DesktopSettings/DesktopSettings.js',
  'frontend/src/containers/Extract/Extract.js',
  'frontend/src/containers/Home/Home.js',
  'frontend/src/containers/ListDetail/ListDetail.js',
  'frontend/src/containers/Live/Live.js',
  'frontend/src/containers/NewRecording/NewRecording.js',
  'frontend/src/containers/Patch/Patch.js',
  'frontend/src/containers/Record/Record.js',
  'frontend/src/containers/Replay/Replay.js',
  'frontend/src/containers/UserSettings/UserSettings.js'
)
foreach ($file in $asyncFiles) {
  [void]$changes.Add((New-Change $seq $file 'high' 'This container imports asyncConnect from redux-connect and participates in SSR/client route data loading.' 'redux-connect|asyncConnect' 'Replace redux-connect import with the local async data helper or convert the promise declaration into loadData consumed by that helper. Preserve connect composition and existing dispatch/promise logic exactly.' @('No redux-connect import remains.','Route-backed async data still dispatches.')))
  $seq++
}

$webpackFiles = @(
  'frontend/webpack/desktop.config.js',
  'frontend/webpack/player.config.js',
  'frontend/webpack/webpack.config.client.development.js',
  'frontend/webpack/webpack.config.client.production.babel.js',
  'frontend/webpack/webpack.config.server.development.babel.js',
  'frontend/webpack/webpack.config.server.production.babel.js',
  'frontend/webpack/webpack.config.client.js',
  'frontend/webpack/webpack.config.server.js',
  'frontend/webpack/webpack-dev-server.js'
)
foreach ($file in $webpackFiles) {
  [void]$changes.Add((New-Change $seq $file 'high' 'Webpack 5 loader/plugin APIs and wrappers are affected by the dependency upgrade.' 'webpack4|sass-loader|cache-loader|eslint-loader|MiniCssExtractPlugin|CleanPlugin|CopyWebpackPlugin|webpack-merge' 'Update for webpack 5-compatible syntax. Remove cache-loader/eslint-loader. Use sass instead of node-sass. Update clean/copy/mini-css/postcss/autoprefixer/webpack-merge APIs while preserving entries, outputs, SSR/client split, desktop/player modes, and no-Vite/no-Next constraint.' @('Frontend production and server webpack configs compile.')))
  $seq++
}

$fakeFiles = @(
  'webrecorder/test/testutils.py',
  'webrecorder/test/test_anon_workflow.py',
  'webrecorder/test/test_browser_init.py',
  'webrecorder/test/test_player_proxy.py',
  'webrecorder/test/test_rec.py',
  'webrecorder/test/test_upload.py',
  'webrecorder/webrecorder/standalone/webrecorder_player.py'
)
foreach ($file in $fakeFiles) {
  [void]$changes.Add((New-Change $seq $file 'medium' 'fakeredis 2 changes construction/from_url behavior and decode_responses semantics.' 'fakeredis|FakeStrictRedis|from_url|decode_responses' 'Update FakeStrictRedis/FakeRedis usage for fakeredis 2.x. Prefer shared FakeServer where tests require shared state. Preserve decode_responses and DB selection.' @('Affected fake Redis tests construct successfully.')))
  $seq++
}

$sixFiles = @(
  'webrecorder/webrecorder/admin.py',
  'webrecorder/webrecorder/basecontroller.py',
  'webrecorder/webrecorder/collscontroller.py',
  'webrecorder/webrecorder/contentcontroller.py',
  'webrecorder/webrecorder/downloadcontroller.py',
  'webrecorder/webrecorder/maincontroller.py',
  'webrecorder/webrecorder/models/recording.py',
  'webrecorder/test/test_anon_workflow.py',
  'webrecorder/test/test_rec.py',
  'webrecorder/test/test_register_migrate.py'
)
foreach ($file in $sixFiles) {
  [void]$changes.Add((New-Change $seq $file 'low' 'six is being removed from Python dependencies.' 'six|six.moves|iteritems' 'Replace six.moves.urllib.parse with urllib.parse and six.iteritems(obj) with obj.items(). Do not touch excluded migration_scripts.' @('No planned non-excluded file imports six.')))
  $seq++
}

$depChanges = New-Object System.Collections.ArrayList
foreach ($node in @($impact.dependency_graph.nodes)) {
  if ($node.type -eq 'external_package' -and $node.version_source -match 'frontend/package.json|search-driver/package.json|webrecorder/requirements.txt|webrecorder/setup.py') {
    $to = 'latest compatible stable'
    switch ([string]$node.id) {
      'npm:node-sass' { $to = 'replace with npm:sass latest compatible stable' }
      'npm:raven-js' { $to = 'replace with npm:@sentry/browser latest compatible stable' }
      'npm:raven-for-redux' { $to = 'replace with Sentry Redux middleware/custom middleware' }
      'npm:redux-connect' { $to = 'remove; replace with local async data helper' }
      'npm:enzyme' { $to = 'replace with @testing-library/react latest compatible stable' }
      'npm:enzyme-adapter-react-16' { $to = 'replace with @testing-library/jest-dom latest compatible stable' }
      'pypi:youtube_dl' { $to = 'replace with pypi:yt-dlp latest compatible stable' }
      'pypi:bottle' { $to = '0.13.x latest patch' }
      'pypi:fakeredis' { $to = '2.x latest compatible stable' }
      'pypi:apispec' { $to = '6.x latest compatible stable' }
    }
    [void]$depChanges.Add([ordered]@{
      file_path = [string]$node.version_source
      dependency = [string]$node.id
      from_version = [string]$node.version
      to_version = $to
    })
  }
}

@(
  @('docker-compose.yml','compose schema','version: ''2''','Compose specification without top-level version'),
  @('docker-compose.yml','catatnight/postfix','catatnight/postfix','maintained mail image or removed optional mailserver'),
  @('docker-compose.yml','solr image','solr implicit/unpinned','explicit verified Solr tag compatible with solrconf'),
  @('docker-compose.yml','webrecorder/browsertrix','webrecorder/browsertrix:0.2.0','latest compatible verified tag or documented unverifiable legacy pin'),
  @('docker-compose.yml','oldwebtoday/coturn','oldwebtoday/coturn:1.0','latest compatible verified image or documented unverifiable legacy pin'),
  @('docker-compose.yml','oldwebtoday/shepherd','oldwebtoday/shepherd:1.2.0','latest compatible verified image or documented unverifiable legacy pin'),
  @('redis/Dockerfile','redis base image','redis:3.2.4','latest maintained compatible Redis tag'),
  @('nginx/Dockerfile','nginx base image','nginx:1.13-alpine','latest maintained compatible nginx alpine tag'),
  @('webrecorder/Dockerfile','webrecorder/pywb base image','webrecorder/pywb:2.5.0','latest compatible pywb image tag'),
  @('frontend/Dockerfile','node base image','legacy Node image','current Node LTS image compatible with Yarn classic'),
  @('search-driver/Dockerfile','node base image','legacy Node image','current Node LTS image')
) | ForEach-Object {
  [void]$depChanges.Add([ordered]@{ file_path=$_[0]; dependency=$_[1]; from_version=$_[2]; to_version=$_[3] })
}

$planned = @($impact.affected_files.file_path | Where-Object {
  $_ -notmatch '^data/' -and
  $_ -notmatch '(^|/)node_modules/' -and
  $_ -notmatch '^webrecorder/proxy-certs/' -and
  $_ -notmatch '^webrecorder/migration_scripts/' -and
  $_ -notmatch '^webrecorder/webrecorder/static/bundle/' -and
  $_ -notmatch '^frontend/static/' -and
  $_ -notmatch '\.bak$'
} | Sort-Object -Unique)
$planned += 'frontend/src/helpers/asyncData.js'
$planned = @($planned | Sort-Object -Unique)

$startup = 'docker compose up -d redis solr app recorder warcserver frontend nginx dat behaviors shepherd coturn browsertrix'
$startupBounded = 'docker compose up -d redis solr app recorder warcserver frontend nginx dat behaviors shepherd coturn browsertrix; $deadline=(Get-Date).AddSeconds(360); do { Start-Sleep -Seconds 5; try { $r=Invoke-WebRequest -UseBasicParsing -Uri http://localhost:8089/ -TimeoutSec 10; if ($r.StatusCode -lt 500 -and $r.Content -match ''Conifer | Homepage'') { docker compose ps; exit 0 } } catch { } } while ((Get-Date) -lt $deadline); docker compose ps; docker compose logs --tail 50 nginx frontend app recorder warcserver solr redis; exit 1'

$validation = [ordered]@{
  base_branch_candidates = @('main','master')
  executor_check_commands = @(
    [ordered]@{working_directory=$repo;command='docker compose run --rm --no-deps frontend yarn install';purpose='setup';timeout_seconds=900;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('error An unexpected error occurred','YN0001');min_record_count=$null}},
    [ordered]@{working_directory=(Join-Path $repo 'search-driver');command='yarn install';purpose='setup';timeout_seconds=600;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('error An unexpected error occurred');min_record_count=$null}},
    [ordered]@{working_directory=$repo;command='docker compose build';purpose='compile';timeout_seconds=1800;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('failed to solve','Module not found','SyntaxError');min_record_count=$null}},
    [ordered]@{working_directory=(Join-Path $repo 'frontend');command='npx jest --ci --watchAll=false';purpose='test';timeout_seconds=600;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('FAIL','Cannot find module');min_record_count=$null}},
    [ordered]@{working_directory=(Join-Path $repo 'search-driver');command='node --check index.js';purpose='compile';timeout_seconds=60;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('SyntaxError','ERR_REQUIRE_ESM');min_record_count=$null}},
    [ordered]@{working_directory=(Join-Path $repo 'webrecorder');command='python -m compileall webrecorder test';purpose='compile';timeout_seconds=300;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('SyntaxError','ImportError');min_record_count=$null}},
    [ordered]@{working_directory=$repo;command=$startupBounded;purpose='startup';timeout_seconds=420;required=$true;health_check_url='http://localhost:8089/';expected_output_checks=[ordered]@{must_not_contain=@('Cannot find module','ModuleNotFoundError','ImportError','TypeError','Traceback','pull access denied','exited');min_record_count=$null}},
    [ordered]@{working_directory=$repo;command='docker compose ps --services --filter status=running';purpose='smoke';timeout_seconds=60;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('Exit','Restarting');min_record_count=12}},
    [ordered]@{working_directory=$repo;command='curl -fsS http://localhost:8089/ | findstr /C:"Conifer | Homepage"';purpose='smoke';timeout_seconds=60;required=$true;health_check_url='';expected_output_checks=[ordered]@{must_not_contain=@('500 Internal Server Error','Traceback');min_record_count=$null}}
  )
  build_commands = @('docker compose build')
  startup_commands = @($startup)
  startup_health_check_urls = @('http://localhost:8089/')
  existing_test_commands = @('cd frontend && npx jest --ci --watchAll=false','cd search-driver && node --check index.js','cd webrecorder && python -m compileall webrecorder test')
  generated_test_commands = @()
  generated_test_files = @()
  content_checks = @(
    [ordered]@{file_path='frontend/package.json';must_contain=@('"sass"','"webpack"','"@testing-library/react"');must_not_contain=@('"node-sass"','"raven-js"','"raven-for-redux"','"redux-connect"','"enzyme"','"enzyme-adapter-react-16"','"hard-source-webpack-plugin"','"time-fix-plugin"','"cache-loader"','"eslint-loader"','"file-loader"','"url-loader"')},
    [ordered]@{file_path='webrecorder/requirements.txt';must_contain=@('bottle==0.13','yt-dlp','fakeredis','apispec');must_not_contain=@('youtube_dl','fakeredis<1.0','apispec<1.0','six')},
    [ordered]@{file_path='webrecorder/setup.py';must_contain=@('install_requires=load_requirements');must_not_contain=@('from setuptools.command.test import test as TestCommand','dependency_links=[','setup_requires=[')},
    [ordered]@{file_path='docker-compose.yml';must_contain=@('services:');must_not_contain=@('version: ''2''','container_name:','image: catatnight/postfix')},
    [ordered]@{file_path='redis/Dockerfile';must_contain=@('FROM redis:');must_not_contain=@('FROM redis:3.2.4')},
    [ordered]@{file_path='nginx/Dockerfile';must_contain=@('FROM nginx:');must_not_contain=@('FROM nginx:1.13-alpine')},
    [ordered]@{file_path='webrecorder/Dockerfile';must_contain=@('FROM webrecorder/pywb:');must_not_contain=@('FROM webrecorder/pywb:2.5.0')},
    [ordered]@{file_path='frontend/src/client.js';must_contain=@('Sentry');must_not_contain=@('raven-js','Raven.config')},
    [ordered]@{file_path='frontend/src/store/create.js';must_contain=@('createMiddleware(client)');must_not_contain=@('raven-for-redux','createRavenMiddleware')},
    [ordered]@{file_path='frontend/src/root.js';must_contain=@('BrowserRouter');must_not_contain=@('ReduxAsyncConnect','redux-connect')},
    [ordered]@{file_path='frontend/src/server.js';must_contain=@('StaticRouter');must_not_contain=@('ReduxAsyncConnect','loadOnServer','redux-connect')},
    [ordered]@{file_path='search-driver/package.json';must_contain=@('"ioredis"','"puppeteer-core"');must_not_contain=@('"node-fetch": "^2.6.0"')},
    [ordered]@{file_path='webrecorder/webrecorder/standalone/serializefakeredis.py';must_contain=@('FakeRedisSerializer');must_not_contain=@('from fakeredis import DATABASES, _ZSet, _Hash, _ExpiringDict')},
    [ordered]@{file_path='solrconf/conf/solrconfig.xml';must_contain=@('<luceneMatchVersion>8.5.1</luceneMatchVersion>');must_not_contain=@()}
  )
  key_pages = @(
    [ordered]@{url='http://localhost:8089/_login';description='Login form, Redux-connected; exercises react-redux upgrade'},
    [ordered]@{url='http://localhost:8089/_register';description='Registration form with REQUIRE_INVITES=false and ANON_DISABLED=true in wr.env'},
    [ordered]@{url='http://localhost:8089/_faq';description='Static content page exercises routing and rendering'},
    [ordered]@{url='http://localhost:8089/docs/api';description='Swagger UI renders upgraded swagger-ui dependency'},
    [ordered]@{url='http://localhost:8089/';description='Startup/home page; must contain Conifer | Homepage in server-rendered title'}
  )
  key_user_flows = @(
    [ordered]@{name='client-side route navigation';url='http://localhost:8089/';steps=@('Navigate to http://localhost:8089/','Click the link with text Sign Up (href /_register)','Confirm the registration form rendered by checking for input name="confirmpassword"','Capture console output and treat error/pageerror as failure');description='Highest-value router migration check; proves client-side transition still mounts target route'},
    [ordered]@{name='login form submission with invalid credentials';url='http://localhost:8089/_login';steps=@('Navigate to http://localhost:8089/_login','Fill #username with nonexistent_user_upgrade_check','Fill #password with wrongpassword123','Click submit button with text Sign in','Confirm login form remains and displays rejection message rather than blank page/error boundary','Capture console output; clean 401 network log is expected/out_of_scope, JS exceptions/pageerrors fail');description='Exercises Redux form state, superagent call, Bottle API, Redis lookup, and error rendering without creating state'}
  )
  external_service_checks = @(
    [ordered]@{service='Redis';live_check_command_or_request='docker compose exec -T redis redis-cli INFO server -> read redis_version';expected_match_file='redis/Dockerfile';mismatch_description='running version differs from FROM redis:<tag> pin.'},
    [ordered]@{service='Solr';live_check_command_or_request='curl -s "http://localhost:8983/solr/conifer/config?wt=json" -> read luceneMatchVersion';expected_match_file='solrconf/conf/solrconfig.xml';mismatch_description='repo declares 8.5.1; confirm pinned Solr accepts it and conifer collection was actually created rather than skipped.'}
  )
  success_criteria = @(
    'All five dependency manifests/lockfiles in scope are modernized or explicitly flagged where a legacy fork/image cannot be verified.',
    'Docker compose no longer fails on mailserver pull and the requested 12-service startup set reaches running state.',
    'http://localhost:8089/ returns a browser-renderable page whose server-rendered title contains Conifer | Homepage after readiness, not merely the temporary maintenance page.',
    'Playwright validation of startup URL, key pages, and key flows records no JS exceptions/pageerrors, with expected invalid-login 401 network response treated as out of scope.',
    'Frontend Jest runs with CI flags, not watch mode.',
    'Python compile/import smoke detects no Bottle/apispec/fakeredis/yt-dlp/six regressions.',
    'Redis and Solr live service checks match repo pins/config.',
    'No excluded paths or generated bundles are modified; LF line endings are preserved without broad unrelated churn.'
  )
  scope_expansion_limit = 12
}

$plan = [ordered]@{
  upgrade_description = $impact.upgrade_description
  ordered_changes = @($changes)
  planned_files = $planned
  expected_dependency_changes = @($depChanges)
  validation = $validation
  rollback_strategy = 'Revert the single final execution commit created by the executor.'
  planning_notes = 'ImpactReport was treated as authoritative. Targeted ranges and minimal surrounding context were inspected for manifests, compose/Dockerfiles, React SSR/router/redux-connect/Raven call sites, Swagger UI, search-driver, apispec, fakeredis, packaging, and six imports. Whole manifest/config files were read only where ImpactReport ranges covered the whole file or where exact content-check literals were needed. Exclusions honored: data/, wr.env runtime state/secrets, node_modules, webrecorder/proxy-certs, webrecorder/migration_scripts, generated static bundles, and .bak files. One helper creation, frontend/src/helpers/asyncData.js, is labeled as scope expansion because replacing redux-connect across SSR and client route data loading is narrower with a local helper than duplicating code in every container. scope_expansion_limit is 12 because this combines webpack 4 to 5, React/router SSR, redux-connect removal, Sentry migration, Python packaging, apispec 6, fakeredis 2, and container image changes; expansions are still limited to direct dependency-break call sites from expected_dependency_changes. Solr managed-schema must not be edited unless selected Solr rejects it during startup. Full capture/replay validation remains out of scope because remote-browser images are not installed and are several GB.'
  plan_summary = 'Plan modernizes compose/images, frontend React/Redux/router/webpack/Jest/Sass/Sentry/Swagger dependencies, search-driver Node dependencies, and webrecorder Python packaging/runtime dependencies while preserving Bottle + uWSGI + pywb and React + Redux + webpack. Validation centers on in-container dependency setup, docker compose build/startup, home/key-page browser checks, two user flows, frontend Jest CI, Python compile smoke, search-driver syntax, and live Redis/Solr drift checks.'
}

$out = Join-Path $artifact 'change-plan.json'
$json = $plan | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($out, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))
Write-Output $out
Write-Output "changes=$($changes.Count)"
Write-Output "planned_files=$($planned.Count)"
Write-Output "deps=$($depChanges.Count)"
