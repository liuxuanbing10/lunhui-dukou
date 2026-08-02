import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? '127.0.0.1';

const app = buildApp();

app
  .listen({ port, host })
  .then(() => console.log(`lunhui-dukou server listening on http://${host}:${port}`))
  .catch((err: unknown) => {
    app.log.error(err);
    process.exit(1);
  });
