/**
 * A minimal static file server for the built Storybook.
 *
 * Deliberately dependency-free: adding an npm package to serve files during
 * tests would put more third-party code in the dependency tree than the ~50
 * lines it replaces, and every one of those lines is auditable here.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const DEFAULT_PORT = 6006;
const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;

const [, , requestedRoot, requestedPort] = process.argv;
const root = resolve(requestedRoot ?? 'storybook-static');
const port = Number(requestedPort ?? DEFAULT_PORT);

if (!existsSync(root)) {
  console.error(`No such directory: ${root}\nRun \`npm run build-storybook\` first.`);
  process.exit(1);
}

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.map', 'application/json; charset=utf-8'],
]);

createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${port}`);
  // normalize() collapses ".." before the join, so a crafted path cannot escape
  // the served directory.
  const relativePath = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, relativePath);

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    response.writeHead(HTTP_NOT_FOUND, { 'content-type': 'text/plain' });
    response.end('Not found');
    return;
  }

  response.writeHead(HTTP_OK, {
    'content-type': MIME_TYPES.get(extname(filePath)) ?? 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(filePath).pipe(response);
}).listen(port, () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
