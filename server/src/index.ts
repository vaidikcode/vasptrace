import { createApp } from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const app = createApp();

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VASPTrace server (DEMO / REPLAY DATA — NOT LIVE SAHYOG) listening on http://localhost:${PORT}`);
});
