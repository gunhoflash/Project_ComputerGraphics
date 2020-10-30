import { Application, send } from "https://deno.land/x/oak@v6.3.1/mod.ts";

const app = new Application();
const port = 8080;
const static_root = `${Deno.cwd()}/static`;

app.use(async (context) => {
  await send(context, context.request.url.pathname, {
    root: static_root,
    index: "proj1.html",
  });
});

console.log(`Starting server... Please check: http://127.0.0.1:${port}`);
await app.listen({ port: port });