const fs = require('fs');
const path = require('path');

const repo = 'C:\\Users\\OEM\\legacy-upgrade-system\\projects\\conifer';
const artifactDir = 'C:\\Users\\OEM\\legacy-upgrade-system\\.codex\\upgrade-runs\\conifer\\20260921-113931-startup';
const outPath = path.join(artifactDir, 'impact-report.json');

const upgradeDescription = `Upgrade every outdated dependency in the conifer repo to its latest compatible version across all five dependency manifests and all pinned container images. Full-stack modernization, not a single-module bump. Scope includes frontend/package.json React SSR stack, webpack 4 to 5, removal/replacement of webpack-4-only plugins/loaders, node-sass to sass, React/ReactDOM latest stable, react-redux latest, react-router beta v4 stack to latest stable with route-config/regex caveats, redux-connect replacement or inline behavior, enzyme to Testing Library, latest ESLint/Jest/Babel 7, Raven to Sentry, Swagger UI latest, PM2/nodemon/bootstrap/react-datepicker/react-dnd/react-virtualized/immutable/superagent updates, GitHub fork dependencies resolved or flagged, webrecorder requirements/setup modernization including bottle 0.13.x, pin bare Python deps, youtube_dl to yt-dlp, fakeredis 2.x, apispec 6.x, bottle-cork released version, remove six, replace setuptools.command.test/dependency_links with modern packaging, pywb image latest and Python path fix, search-driver Node LTS/puppeteer-core/ioredis/node-fetch updates, docker-compose/container image updates for Redis, nginx, Solr, postfix/mailserver replacement/removal, other third-party images bumped where possible but flagged as unverifiable, remove docker-compose version 2 and hardcoded container_name, diagnose baseline failures at HEAD c406b480: app WSGI load exit, docker compose up aborts on mailserver pull, two uWSGI services fail to exec commands. Do not re-architect: backend remains Bottle + uWSGI + pywb, frontend remains React + Redux + webpack. Do not modify solrconf schema files unless Solr change requires it. Preserve LF line endings and consider .gitattributes.`;

const excluded = [
  /^data\//,
  /^wr\.env$/,
  /(^|\/)node_modules\//,
  /^webrecorder\/proxy-certs\//,
  /^webrecorder\/migration_scripts\//,
  /^webrecorder\/webrecorder\/static\/bundle\//,
  /^frontend\/static\//,
  /^webrecorder\/webrecorder\/[^/]+\.bak$/
];

function rel(abs) {
  return path.relative(repo, abs).replace(/\\/g, '/');
}

function read(relPath) {
  return fs.readFileSync(path.join(repo, relPath), 'utf8');
}

function lines(relPath) {
  return read(relPath).split(/\r?\n/);
}

function isExcluded(relPath) {
  return excluded.some((rx) => rx.test(relPath));
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const r = rel(abs);
    if (isExcluded(r)) continue;
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === '.gitnexus') continue;
      walk(abs, acc);
    } else {
      acc.push(r);
    }
  }
  return acc;
}

const textExt = new Set(['.js', '.jsx', '.json', '.py', '.txt', '.yml', '.yaml', '.xml', '.ini', '.conf', '.sh', '.scss', '.css', '.html', '.md', '.Dockerfile', '']);
const allFiles = walk(repo).filter((f) => {
  const base = path.basename(f);
  const ext = path.extname(f);
  return base === 'Dockerfile' || textExt.has(ext);
});

const affected = new Map();
const nodes = new Map();
const edges = [];
const breaking = new Set();
const coverageNotes = [];

function addNode(id, version, type, version_source, extra = {}) {
  if (!nodes.has(id)) nodes.set(id, { id, version: version || 'unknown', type, version_source, ...extra });
}

function addLoc(file, loc) {
  if (isExcluded(file)) return;
  const key = file;
  const existing = affected.get(key) || {
    file_path: file,
    change_type: 'modify',
    usage_type: loc.usage_type || 'direct_usage',
    risk_level: loc.risk_level || 'medium',
    reason: loc.file_reason || loc.reason,
    locations: []
  };
  if (riskRank(loc.risk_level) > riskRank(existing.risk_level)) existing.risk_level = loc.risk_level;
  if (existing.usage_type !== 'configuration' && loc.usage_type === 'configuration') existing.usage_type = 'configuration';
  if (!existing.reason.includes(loc.reason)) existing.reason = `${existing.reason}; ${loc.reason}`;
  existing.locations.push({
    start_line: loc.start_line,
    end_line: loc.end_line || loc.start_line,
    symbol_or_pattern: loc.symbol_or_pattern,
    matched_api: loc.matched_api,
    confidence: loc.confidence || 'medium',
    reason: loc.reason
  });
  affected.set(key, existing);
}

function riskRank(r) {
  return { low: 1, medium: 2, high: 3 }[r] || 2;
}

function escRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findLine(file, matcher, cb) {
  lines(file).forEach((line, idx) => {
    if (matcher(line)) cb(idx + 1, line);
  });
}

function packageUsages(pkg, source, current, target, risk = 'medium', reason = 'Manifest dependency is in modernization scope; direct usages may need API compatibility review.') {
  addNode(`npm:${pkg}`, current, 'external_package', source);
  const rx = new RegExp(`(?:from\\s+['"]${escRegex(pkg)}(?:/[^'"]*)?['"]|require\\(\\s*['"]${escRegex(pkg)}(?:/[^'"]*)?['"]\\s*\\)|import\\s+['"]${escRegex(pkg)}(?:/[^'"]*)?['"])`);
  for (const f of allFiles) {
    if (!/\.(js|jsx|json)$/.test(f) && !f.endsWith('Dockerfile')) continue;
    findLine(f, (line) => rx.test(line) || (f.includes('/webpack/') && line.includes(pkg)), (n) => {
      addLoc(f, {
        start_line: n,
        symbol_or_pattern: pkg,
        matched_api: `npm:${pkg}`,
        usage_type: 'direct_usage',
        risk_level: risk,
        confidence: rx.test(lines(f)[n - 1]) ? 'high' : 'medium',
        reason
      });
      edges.push({ from: f, to: `npm:${pkg}`, relationship: 'imports_or_configures' });
    });
  }
}

function pythonUsages(pkg, moduleNames, source, current, risk = 'medium', reason = 'Python dependency is in modernization scope; imports and package-specific calls may need compatibility review.') {
  addNode(`pypi:${pkg}`, current, 'external_package', source);
  const names = moduleNames.map(escRegex).join('|');
  const rx = new RegExp(`\\b(?:import\\s+(?:${names})\\b|from\\s+(?:${names})\\b|${names}\\.)`);
  for (const f of allFiles) {
    if (!/\.(py|ini|yaml|yml|txt)$/.test(f)) continue;
    findLine(f, (line) => rx.test(line) || line.includes(pkg), (n) => {
      addLoc(f, {
        start_line: n,
        symbol_or_pattern: moduleNames.join('|'),
        matched_api: `pypi:${pkg}`,
        usage_type: f.endsWith('.ini') || f.endsWith('.yaml') || f.endsWith('.yml') || f.endsWith('.txt') ? 'configuration' : 'direct_usage',
        risk_level: risk,
        confidence: rx.test(lines(f)[n - 1]) ? 'high' : 'medium',
        reason
      });
      edges.push({ from: f, to: `pypi:${pkg}`, relationship: 'imports_or_configures' });
    });
  }
}

function manifestWhole(file, matched, risk, reason) {
  addLoc(file, {
    start_line: 1,
    end_line: lines(file).length,
    symbol_or_pattern: matched,
    matched_api: matched,
    usage_type: 'configuration',
    risk_level: risk,
    confidence: 'high',
    reason
  });
}

for (const pkgFile of ['frontend/package.json', 'search-driver/package.json']) {
  const pkg = JSON.parse(read(pkgFile));
  manifestWhole(pkgFile, 'package.json', 'high', 'Node dependency manifest in full-stack modernization scope.');
  for (const section of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, version] of Object.entries(pkg[section] || {})) {
      const high = [
        'webpack', 'webpack-cli', 'webpack-dev-middleware', 'webpack-hot-middleware', 'webpack-merge',
        'react', 'react-dom', 'react-redux', 'react-router-config', 'react-router-dom', 'redux-connect',
        'node-sass', 'sass-loader', 'enzyme', 'enzyme-adapter-react-16', 'jest', 'babel-jest',
        'eslint', 'eslint-loader', 'raven-js', 'raven-for-redux', 'swagger-ui', 'express',
        'puppeteer-core', 'ioredis', 'node-fetch', 'superagent'
      ].includes(name);
      packageUsages(name, pkgFile, version, 'latest compatible', high ? 'high' : 'medium');
    }
  }
}

manifestWhole('frontend/yarn.lock', 'yarn.lock', 'high', 'Frontend lockfile pins the dependency graph and must align with package.json modernization.');
manifestWhole('search-driver/yarn.lock', 'yarn.lock', 'high', 'Search-driver lockfile pins the dependency graph and must align with package.json modernization.');
manifestWhole('webrecorder/requirements.txt', 'requirements.txt', 'high', 'Python runtime dependency manifest contains pinned, bare, and major-upgrade packages.');
manifestWhole('webrecorder/setup.py', 'setup.py packaging metadata', 'high', 'Legacy packaging hooks, dependency_links, and setup/test behavior are in modernization scope.');

const reqVersions = {
  bleach: 'unpinned',
  bottle: '0.12.13',
  'bottle-cork': 'unpinned/git fork',
  boto3: 'unpinned',
  youtube_dl: 'unpinned',
  itsdangerous: 'unpinned',
  requests: '>=2.9.1',
  werkzeug: 'unpinned',
  'gevent-websocket': 'unpinned',
  har2warc: '>=1.0.4',
  fakeredis: '<1.0',
  apispec: '<1.0',
  psutil: 'unpinned',
  pywb: '>=2.4.1 plus image 2.5.0'
};
const pyMap = {
  bleach: ['bleach'],
  bottle: ['bottle'],
  'bottle-cork': ['cork', 'bottle_cork', 'webreccork'],
  boto3: ['boto3'],
  youtube_dl: ['youtube_dl'],
  itsdangerous: ['itsdangerous'],
  requests: ['requests'],
  werkzeug: ['werkzeug'],
  'gevent-websocket': ['geventwebsocket', 'gevent'],
  har2warc: ['har2warc'],
  fakeredis: ['fakeredis'],
  apispec: ['apispec'],
  psutil: ['psutil'],
  pywb: ['pywb']
};
for (const [pkg, mods] of Object.entries(pyMap)) {
  const high = ['bottle', 'bottle-cork', 'youtube_dl', 'fakeredis', 'apispec', 'pywb'].includes(pkg);
  pythonUsages(pkg, mods, pkg === 'pywb' ? 'webrecorder/setup.py; webrecorder/Dockerfile' : 'webrecorder/requirements.txt', reqVersions[pkg], high ? 'high' : 'medium');
}

const composeFiles = ['docker-compose.yml', 'search-compose.yml', 'frontend/Dockerfile', 'webrecorder/Dockerfile', 'search-driver/Dockerfile', 'redis/Dockerfile', 'nginx/Dockerfile'];
for (const f of composeFiles) {
  manifestWhole(f, path.basename(f), 'high', 'Container image/build/runtime configuration is in modernization scope.');
  findLine(f, (line) => /\b(image:|FROM|container_name:|^version:|command:|uwsgi|solr|redis|zookeeper|postfix|mailserver|browsertrix|behaviors|dat-share|coturn|shepherd)\b/i.test(line), (n, line) => {
    addLoc(f, {
      start_line: n,
      symbol_or_pattern: 'container image/version/service command',
      matched_api: line.trim(),
      usage_type: 'configuration',
      risk_level: /container_name:|version: '2'|image: solr$|catatnight\/postfix|uwsgi|FROM webrecorder\/pywb/.test(line) ? 'high' : 'medium',
      confidence: 'high',
      reason: 'Pinned or implicit container/runtime setting participates in compose/image modernization and baseline startup risk.'
    });
  });
}

for (const f of ['solrconf/conf/solrconfig.xml', 'solrconf/conf/managed-schema']) {
  findLine(f, (line) => /luceneMatchVersion|<schema\b|schema version|_version_/.test(line), (n, line) => {
    addLoc(f, {
      start_line: n,
      symbol_or_pattern: 'Solr schema/config version',
      matched_api: line.trim(),
      usage_type: 'configuration',
      risk_level: /luceneMatchVersion|<schema\b/.test(line) ? 'high' : 'medium',
      confidence: 'high',
      reason: 'Checked-in Solr config must be validated against the selected Solr image and live loaded core/configset.'
    });
  });
}

const specialSearches = [
  { pkg: 'express', rx: /app\.(get|post|put|delete|patch|use)\([^)]*\*/, reason: 'Express 4 to 5 path-to-regexp change rejects bare wildcard routes.', break: 'express 4.x -> 5.x wildcard route strings need review.' },
  { pkg: 'express', rx: /\.query\.hasOwnProperty\(/, reason: 'Express 5 req.query is null-prototype; direct hasOwnProperty can throw.', break: 'express 4.x -> 5.x req.query object semantics need review.' },
  { pkg: 'react-router', rx: /(react-router|react-router-config|react-router-dom|matchPath|Switch|withRouter|browserHistory|routes\.map|path:\s*['"][^'"]*[:(*?])/, reason: 'React Router v4 beta to latest stable can affect route-config matching and regex/optional route behavior.', break: 'react-router v4 beta -> latest stable route config and matching behavior need review.' },
  { pkg: 'redux-connect', rx: /redux-connect|asyncConnect|ReduxAsyncConnect|loadOnServer/, reason: 'redux-connect is in replacement/inline-behavior scope for SSR data loading.', break: 'redux-connect replacement affects SSR data loading.' },
  { pkg: 'raven', rx: /raven-js|raven-for-redux|Raven\.|createRavenMiddleware/, reason: 'Raven packages are replaced by Sentry SDK packages with different setup/middleware APIs.', break: 'Raven -> Sentry migration affects client error instrumentation.' },
  { pkg: 'webpack4', rx: /webpack|extract-text-webpack-plugin|hard-source-webpack-plugin|cache-loader|file-loader|url-loader|style-loader|css-loader|sass-loader|node-sass|uglify|optimization|module\.rules|loaders?/, reason: 'Webpack 4 to 5 and webpack-4-only loader/plugin ecosystem requires config review.', break: 'webpack 4 -> 5 affects config, loaders, plugins, and SSR builds.' },
  { pkg: 'setuptools', rx: /setuptools\.command\.test|dependency_links|setup_requires|tests_require|TestCommand/, reason: 'Legacy setuptools test command/dependency_links/setup_requires are incompatible with modern packaging expectations.', break: 'Modern Python packaging removes legacy setup.py test/dependency_links workflows.' },
  { pkg: 'youtube_dl', rx: /youtube_dl/, reason: 'youtube_dl is in requested replacement scope for yt-dlp.', break: 'youtube_dl -> yt-dlp package/import replacement needed.' },
  { pkg: 'apispec', rx: /apispec|APISpec|MarshmallowPlugin/, reason: 'apispec <1 to 6.x has API and plugin initialization changes.', break: 'apispec <1 -> 6.x affects API spec construction.' },
  { pkg: 'fakeredis', rx: /fakeredis|FakeStrictRedis|FakeRedis/, reason: 'fakeredis <1 to 2.x can affect test Redis semantics.', break: 'fakeredis <1 -> 2.x affects fake Redis behavior and tests.' }
];
for (const s of specialSearches) {
  for (const f of allFiles) {
    if (!/\.(js|jsx|py|json|yml|yaml|ini)$/.test(f) && !f.includes('/webpack/')) continue;
    findLine(f, (line) => s.rx.test(line), (n, line) => {
      addLoc(f, {
        start_line: n,
        symbol_or_pattern: s.pkg,
        matched_api: line.trim(),
        usage_type: f.endsWith('.json') || f.endsWith('.yml') || f.endsWith('.yaml') || f.endsWith('.ini') ? 'configuration' : 'direct_usage',
        risk_level: 'high',
        confidence: 'high',
        reason: s.reason
      });
      breaking.add(s.break);
    });
  }
}

const serviceNodes = [
  ['service:Redis', '3.2.4', 'redis/Dockerfile', true],
  ['service:Apache Solr', 'unpinned image currently resolving externally; solrconf luceneMatchVersion 8.5.1', 'docker-compose.yml; search-compose.yml; solrconf/conf/solrconfig.xml', true],
  ['service:Apache ZooKeeper', '3.6', 'search-compose.yml', true],
  ['service:oldwebtoday/shepherd', '1.2.0', 'docker-compose.yml', true],
  ['service:webrecorder/browsertrix', '0.2.0', 'docker-compose.yml', true],
  ['service:oldwebtoday/coturn', '1.0', 'docker-compose.yml', true],
  ['service:webrecorder/dat-share', 'unversioned image tag', 'docker-compose.yml', true],
  ['service:webrecorder/behaviors', 'latest', 'docker-compose.yml', true],
  ['service:Postfix mail container/catatnight/postfix', 'unversioned/unmaintained', 'docker-compose.yml', true],
  ['service:nginx', '1.13-alpine', 'nginx/Dockerfile', true],
  ['service:Node frontend image', '10.6.0', 'frontend/Dockerfile', false],
  ['service:Node search-driver image', '12.8.0', 'search-driver/Dockerfile', false],
  ['service:pywb image', '2.5.0', 'webrecorder/Dockerfile', false]
];
for (const [id, version, source, live] of serviceNodes) {
  addNode(id, version, 'external_service', source, { requires_live_verification: live });
}

const serviceSearches = [
  ['service:Redis', /redis|REDIS_URL|StrictRedis|redisutils/i],
  ['service:Apache Solr', /solr|SOLR|search_url|Solr/i],
  ['service:Apache ZooKeeper', /zookeeper|ZK_HOST|zoo[123]/i],
  ['service:oldwebtoday/shepherd', /shepherd|SHEPHERD/i],
  ['service:webrecorder/browsertrix', /browsertrix|remote browser|REMOTE_BROWSER|SCREENSHOT_API/i],
  ['service:webrecorder/dat-share', /dat-share|\bdat\b|DAT_/i],
  ['service:webrecorder/behaviors', /behaviors|BEHAVIOR/i],
  ['service:Postfix mail container/catatnight/postfix', /postfix|mailserver|smtp|maildomain/i]
];
for (const [id, rx] of serviceSearches) {
  for (const f of allFiles) {
    if (!/\.(py|js|jsx|yml|yaml|ini|conf|Dockerfile|sh)$/.test(f) && path.basename(f) !== 'Dockerfile') continue;
    findLine(f, (line) => rx.test(line), (n, line) => {
      addLoc(f, {
        start_line: n,
        symbol_or_pattern: id,
        matched_api: line.trim(),
        usage_type: /yml|yaml|ini|conf|Dockerfile|sh$/.test(f) || path.basename(f) === 'Dockerfile' ? 'configuration' : 'direct_usage',
        risk_level: id.includes('Solr') || id.includes('Redis') || id.includes('Postfix') || id.includes('browsertrix') ? 'high' : 'medium',
        confidence: 'medium',
        reason: 'External service dependency or client/config reference found during infra scan.'
      });
      edges.push({ from: f, to: id, relationship: 'configures_or_connects_to' });
    });
  }
}

coverageNotes.push('GitNexus index for conifer is available at HEAD c406b480 and was queried, but dependency/config-heavy searches relied on rg-equivalent exact scans for line locations.');
coverageNotes.push('Excluded paths honored: data/, wr.env, **/node_modules/, webrecorder/proxy-certs/, webrecorder/migration_scripts/, webrecorder/webrecorder/static/bundle/, frontend/static/, webrecorder/webrecorder/*.bak.');
coverageNotes.push('No live Docker, Redis, Solr, ZooKeeper, or browser image verification was performed in Stage 1; nodes with requires_live_verification=true need runtime checks.');
coverageNotes.push('Solr image tags are unpinned in compose files; current running resolution to 10.0.0 is user-declared and not verified from the repo alone.');
coverageNotes.push('GitHub fork dependencies and unversioned/obsolete images were recorded as unverifiable from local manifests without network/package registry checks.');
coverageNotes.push('Validation context preserved: docker compose build; docker compose up -d redis solr app recorder warcserver frontend nginx dat behaviors shepherd coturn browsertrix; URL http://localhost:8089/ title Conifer | Homepage; pages /_login, /_register, /_faq, /docs/api; sign-up route and invalid login flow; empty datastore/search; capture/replay untested due large remote browser images.');
coverageNotes.push('Baseline failures to preserve for planning: app WSGI load exit, docker compose up aborts on mailserver pull, two uWSGI services fail to exec commands.');

for (const id of ['frontend', 'search-driver', 'webrecorder', 'docker-compose', 'solrconf', 'redis', 'nginx']) {
  addNode(`internal:${id}`, 'unknown', 'internal', 'repository scan');
}
for (const [id, node] of nodes) {
  if (id.startsWith('npm:')) edges.push({ from: id.startsWith('npm:ioredis') || id.startsWith('npm:node-fetch') || id.startsWith('npm:puppeteer') ? 'internal:search-driver' : 'internal:frontend', to: id, relationship: 'declares_dependency' });
  if (id.startsWith('pypi:')) edges.push({ from: 'internal:webrecorder', to: id, relationship: 'declares_dependency' });
  if (id.startsWith('service:')) edges.push({ from: 'internal:docker-compose', to: id, relationship: 'configures_service' });
}

for (const item of affected.values()) {
  const seen = new Set();
  item.locations = item.locations.filter((loc) => {
    const key = `${loc.start_line}:${loc.end_line}:${loc.matched_api}:${loc.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.start_line - b.start_line || a.matched_api.localeCompare(b.matched_api));
  if (item.locations.length > 80) {
    item.locations = item.locations.slice(0, 80);
    item.reason += '; additional matches exist and were truncated to keep the artifact planner-readable.';
  }
}

const affectedFiles = Array.from(affected.values()).sort((a, b) => a.file_path.localeCompare(b.file_path));
const highRiskCount = affectedFiles.filter((f) => f.risk_level === 'high').length;

const report = {
  upgrade_description: upgradeDescription,
  affected_files: affectedFiles,
  dependency_graph: {
    nodes: Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.filter((e, i, arr) => arr.findIndex((x) => x.from === e.from && x.to === e.to && x.relationship === e.relationship) === i)
  },
  risk_summary: {
    total_affected_files: affectedFiles.length,
    high_risk_count: highRiskCount,
    breaking_changes: Array.from(breaking).sort(),
    notes: 'Broad dependency/container modernization crosses React/Redux/router SSR, webpack 4 to 5, deprecated Python packaging, Bottle/pywb runtime, Solr/Redis live service compatibility, and unpinned/obsolete container image boundaries. This report is analysis-only and proposes no fixes.'
  },
  coverage_notes: coverageNotes.join(' ')
};

fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({
  path: outPath,
  total_affected_files: affectedFiles.length,
  high_risk_count: highRiskCount,
  nodes: report.dependency_graph.nodes.length,
  edges: report.dependency_graph.edges.length
}, null, 2));
