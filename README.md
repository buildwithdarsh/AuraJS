> This project is made with the help of Claude (1M context).

<div align="center">

<br />

<img src="https://img.shields.io/badge/aura.js-v1.0.0-2997ff?style=for-the-badge&labelColor=000000" alt="version" />
<img src="https://img.shields.io/badge/minified-32KB-30d158?style=for-the-badge&labelColor=000000" alt="size" />
<img src="https://img.shields.io/badge/gzip-~11KB-ff9f0a?style=for-the-badge&labelColor=000000" alt="gzip" />
<img src="https://img.shields.io/badge/dependencies-0-bf5af2?style=for-the-badge&labelColor=000000" alt="deps" />
<img src="https://img.shields.io/badge/modules-20-64d2ff?style=for-the-badge&labelColor=000000" alt="modules" />
<img src="https://img.shields.io/badge/license-MIT-ff375f?style=for-the-badge&labelColor=000000" alt="license" />

<br /><br />

# Aura.js

**The everything framework in one script tag.**

Build full-featured SPAs with routing, state, hooks, i18n, IndexedDB, PWA support, API mocking, and more — without Node, without a build step, without dependencies.

[Live Demo](https://aurajs.work.withdarsh.com/) &nbsp;&middot;&nbsp; [Documentation](https://aurajs.work.withdarsh.com/docs/router.html) &nbsp;&middot;&nbsp; [Get Started](#-quick-start)

<br />

</div>

---

## Why Aura.js?

| | React + ecosystem | Vue 3 | **Aura.js** |
|---|---|---|---|
| Setup time | ~2 min (Node + CLI) | ~2 min (Node + CLI) | **10 seconds** |
| Bundle (min+gzip) | ~46KB + router + state | ~44KB + router | **~11KB (everything)** |
| Requires Node | Yes | Yes | **No** |
| Requires build step | Yes | Yes | **No** |
| Built-in router | No (react-router) | No (vue-router) | **Yes** |
| Built-in state | No (redux/zustand) | Yes | **Yes** |
| Built-in HTTP client | No (axios/fetch) | No | **Yes** |
| Built-in i18n | No (react-intl) | No (vue-i18n) | **Yes** |
| Built-in mock API | No (MSW) | No | **Yes** |
| Built-in IndexedDB | No | No | **Yes** |
| PWA + Service Worker | No | No | **Yes** |
| Composable hooks | Yes | Composition API | **Yes** |

---

## Quick Start

**No install. No CLI. No config.** Just a script tag.

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://aurajs.work.withdarsh.com/dist/aura.umd.js"></script>
</head>
<body>
  <script>
    // Define routes
    Aura.route('/', (ctx) => {
      Aura.template.renderString('<h1>Hello, {{name}}!</h1>', { name: 'World' });
    });

    Aura.route('/users/:id', (ctx) => {
      console.log('User ID:', ctx.params.id);
    });

    // Start the app
    Aura.init();
  </script>
</body>
</html>
```

That's it. You have a fully routed SPA.

> **Refresh-safe on any static host.** Aura's router encodes logical paths as a query
> parameter (`/?_r=/users/42`) so refreshes, bookmarks, and shared links always resolve
> to your real `index.html` &mdash; no server rewrite rules, no 404s, no hosting config.
> Works out of the box on GitHub Pages, S3, Vercel, Netlify, Cloudflare Pages, or any
> plain file server.

---

## All 20 Modules

<table>
<tr>
<td width="50%">

### Core
| Module | Description |
|--------|-------------|
| [**Router**](https://aurajs.work.withdarsh.com/docs/router.html) | SPA routing, dynamic params, wildcards, groups, middleware, guards, refresh-safe query-param URLs |
| [**State**](https://aurajs.work.withdarsh.com/docs/state.html) | Reactive state, subscriptions, computed, batch, persist, actions |
| [**Events**](https://aurajs.work.withdarsh.com/docs/events.html) | Pub/sub, wildcard namespaces, priority ordering, auto-unsub |
| [**Template**](https://aurajs.work.withdarsh.com/docs/template.html) | Handlebars-style rendering, #if/#each/#unless, partials, caching |
| [**API Client**](https://aurajs.work.withdarsh.com/docs/api.html) | HTTP client, interceptors, retry, timeout, abort, upload |
| [**i18n**](https://aurajs.work.withdarsh.com/docs/i18n.html) | Translation, pluralization, Intl formatting, RTL, DOM translate |
| [**Hooks**](https://aurajs.work.withdarsh.com/docs/hooks.html) | useState, useEvent, useFetch, useStorage, useComputed, custom hooks |

</td>
<td width="50%">

### Platform & Tools
| Module | Description |
|--------|-------------|
| [**Device**](https://aurajs.work.withdarsh.com/docs/device.html) | Detection, fingerprint, battery, network, dark mode, online/offline |
| [**Geolocation**](https://aurajs.work.withdarsh.com/docs/geo.html) | GPS with IP fallback, Haversine distance, watching, permissions |
| [**Performance**](https://aurajs.work.withdarsh.com/docs/perf.html) | Operation timing, memory tracking, threshold filtering |
| [**Delegate**](https://aurajs.work.withdarsh.com/docs/delegate.html) | Event delegation with CSS selectors, dynamic elements |
| [**Storage**](https://aurajs.work.withdarsh.com/docs/storage.html) | localStorage, sessionStorage, cookies — namespaced with TTL |
| [**Utils**](https://aurajs.work.withdarsh.com/docs/utils.html) | Debounce, throttle, deepClone, slugify, pipe, uid, and more |
| [**Mock API**](https://aurajs.work.withdarsh.com/docs/mock.html) | Intercept fetch, mock routes from JSON files, persist, share |
| [**IndexedDB**](https://aurajs.work.withdarsh.com/docs/idb.html) | Promise-based IDB wrapper — stores, indexes, queries, cursors |
| [**Logger**](https://aurajs.work.withdarsh.com/docs/logger.html) | Levels, tagged loggers, custom transports, history, events |
| [**tryThis**](https://aurajs.work.withdarsh.com/docs/try.html) | `[err, data]` tuple pattern — kill try/catch boilerplate |
| [**PWA**](https://aurajs.work.withdarsh.com/docs/pwa.html) | Service worker, caching strategies, install prompt, offline |

</td>
</tr>
</table>

---

## Module Highlights

### Hooks — React-style, but framework-agnostic

```js
// Reactive state — returns [getter, setter]
const [count, setCount] = Aura.hooks.useState('count', 0);
setCount(5);
console.log(count()); // 5

// Auto-fetch with loading/error state
const { data, loading, error, refetch } = Aura.hooks.useFetch('/api/users');

// localStorage-backed state
const [theme, setTheme] = Aura.hooks.useStorage('theme', 'dark');

// Auto-cleanup setup
const teardown = Aura.hooks.useSetup(() => {
  Aura.hooks.useEvent('resize', handler);
  Aura.hooks.useWatch('user', updateUI);
});
teardown(); // cleans up everything
```

### tryThis — Never write try/catch again

```js
// Sync
const [err, data] = Aura.tryThis(() => JSON.parse(rawInput));

// Async
const [err, users] = await Aura.tryThis(() => Aura.api.get('/users'));

// Direct promise
const [err, res] = await Aura.tryThis(fetch('/api/health'));

// Chain with Logger
if (err) Aura.log.error('Request failed', err);
```

### Mock API — Frontend doesn't wait for backend

```js
// Register mocks — inline or from JSON files
Aura.mock.load({
  'GET /api/users':     { body: [{ id: 1, name: 'Alex' }], delay: 300 },
  'GET /api/users/:id': { body: { id: 1, name: 'Alex' } },
  'POST /api/users':    { status: 201, body: { id: 2 } },
  'GET /api/products':  '/mocks/products.json',  // from file
});

Aura.mock.enable();  // intercepts window.fetch
Aura.mock.save();    // persist to localStorage
Aura.mock.export();  // share with teammates
```

### IndexedDB — The ugly API, made beautiful

```js
await Aura.idb.open('myApp', 1, [{
  name: 'users',
  keyPath: 'id',
  indexes: [{ name: 'email', keyPath: 'email', unique: true }]
}]);

await Aura.idb.set('users', { id: 1, name: 'Alex', email: 'a@b.com' });
const user = await Aura.idb.get('users', 1);
const all  = await Aura.idb.getAll('users');
const found = await Aura.idb.query('users', 'email', 'a@b.com');
```

### PWA + Service Worker — Offline in 5 lines

```js
await Aura.pwa.register('/aura-sw.js');

Aura.pwa.addStrategy({ name: 'images', strategy: 'cache-first', match: /\.(png|jpg|svg)$/ });
Aura.pwa.addStrategy({ name: 'api', strategy: 'network-first', match: '/api/' });
Aura.pwa.precache(['/', '/app.js', '/styles.css']);

Aura.pwa.onInstallPrompt(() => showInstallBanner());
```

### Logger — Structured, tagged, transportable

```js
Aura.log.info('App started');
Aura.log.error('Payment failed', { orderId: 42 });

// Tagged loggers
const auth = Aura.log.tag('Auth');
auth.info('User logged in');  // => [INFO][Auth] User logged in

// Custom transport
Aura.log.addTransport((entry) => {
  if (entry.level === 'error') sendToSentry(entry);
});

// Listen via Events
Aura.on('log:error', showToast);
```

---

## Install

### CDN (recommended — no build step)

```html
<script src="https://aurajs.work.withdarsh.com/dist/aura.umd.js"></script>
```

### npm (for bundler setups)

```bash
npm install @buildwithdarsh/aura.js
```

```js
import Aura from '@buildwithdarsh/aura.js';

Aura.route('/', handler);
Aura.init();
```

Or via CDN:

```html
<script src="https://cdn.jsdelivr.net/npm/@buildwithdarsh/aura.js"></script>
```

---

## Project Structure

```
src/
├── api/          # HTTP client with interceptors
├── delegate/     # Event delegation
├── device/       # Device detection & fingerprinting
├── events/       # Pub/sub event system
├── geo/          # Geolocation
├── hooks/        # Composable hooks (useState, useFetch, etc.)
├── i18n/         # Internationalization
├── idb/          # IndexedDB wrapper
├── logger/       # Structured logging
├── mock/         # API mocking (fetch interceptor)
├── perf/         # Performance monitoring
├── pwa/          # PWA + Service Worker management
├── router/       # SPA routing
├── state/        # Reactive state management
├── storage/      # localStorage/session/cookies
├── template/     # Handlebars-style templating
├── try/          # tryThis error wrapper
├── utils/        # Utility functions
└── index.ts      # Main entry — exports Aura singleton
```

---

## Development

```bash
# Install dev dependencies
npm install

# Build (outputs to dist/)
npm run build

# Watch mode
npm run dev

# Type check
npm run typecheck
```

---

## Browser Support

Works in all modern browsers. No polyfills needed.

| Chrome | Firefox | Safari | Edge |
|--------|---------|--------|------|
| 80+ | 78+ | 14+ | 80+ |

---

## Philosophy

1. **One script tag** — No Node, no CLI, no webpack, no config
2. **Everything built-in** — Router, state, hooks, i18n, DB, PWA, mocking, logging
3. **Zero dependencies** — 32KB minified, ~11KB gzipped
4. **Progressively adoptable** — Use one module or all twenty
5. **Developer-first** — Clean APIs, TypeScript types, comprehensive docs

---

<div align="center">

**[Live Demo](https://aurajs.work.withdarsh.com/)** &nbsp;&middot;&nbsp; **[Full Documentation](https://aurajs.work.withdarsh.com/docs/router.html)**

Made by [Darsh Gupta](https://github.com/darshgupta)

MIT License

</div>
