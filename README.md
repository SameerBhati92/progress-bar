# ProgressBar

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

On the click of the Start Download button a dummy api is being called which is currently around 100mb. The amount of time it will take to load will be shown via progress bar.
You can change this to any api.
It will keep the UI blocked until the progress reaches 100%.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Mock server & streaming POC

This project includes a small local mock server that streams newline-delimited JSON (NDJSON) to simulate a long-running bulk update. Use the mock server together with the Angular dev server (which proxies `/mock/*` to the local mock server) so you avoid CORS while developing.

Start steps (project root):

1. Kill any process using port `3000` (optional):

```bash
lsof -ti:3000 | xargs -r -n1 kill -9
# or
pkill -f mock-server.js || true
```

2. Start the mock NDJSON server (runs on port `3000`):

```bash
node mock-server.js

# or to run it in background and keep logs:
node mock-server.js > mock-server.log 2>&1 &
tail -f mock-server.log
```

3. Start the Angular dev server (uses the proxy config `proxy.conf.json`):

```bash
npm run start
# which runs: ng serve --proxy-config proxy.conf.json
```

4. Open the app in the browser:

- http://localhost:4200

5. Trigger the Bulk Update POC by clicking "Start Bulk Update". The frontend will open a streaming XHR to `/mock/bulk-update` (proxied by the dev server to `http://localhost:3000/bulk-update`).

Quick checks / debugging

- Confirm mock server receives requests: tail `mock-server.log` or check terminal where `node mock-server.js` is running — it logs "Received bulk-update request from ...".
- Direct curl (mock server):

```bash
curl --no-buffer http://localhost:3000/bulk-update
```

- Via dev-server proxy:

```bash
curl --no-buffer http://localhost:4200/mock/bulk-update
```

DevTools Network visibility

- Make sure the Network panel is recording (click the record button so it's active).
- Filter: enable "Fetch/XHR" or set to "All" so XHR entries are visible.
- If you still don't see the request, enable "Preserve log" and retry. Also check for service workers (Application tab) that may interfere.

Troubleshooting

- If you see a 500 from the server, check `mock-server.log` for the stack trace. The mock server includes extra logging and error handling to surface issues.
- If streaming updates don't show up in the UI, open Console — the component logs debug lines prefixed with `BulkUpdate:` showing parsed NDJSON and onprogress events.

Notes

- Proxy config is in `proxy.conf.json` — it rewrites `/mock/*` to `http://localhost:3000` and `/download/*` to the external Hetzner speed test host for download testing.
- The Bulk Update POC is implemented in `src/app/bulk-update.component.ts` and uses XMLHttpRequest streaming so the browser shows a persistent XHR entry while the server streams updates.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
