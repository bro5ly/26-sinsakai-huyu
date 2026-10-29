import "dotenv/config";
import { createApp } from "./app.js";
import { buildDeps } from "./deps.js";
import { getConfig } from "./config.js";

// 環境変数が足りなければ、ここで止まる(何が足りないかを出す)
const config = getConfig();

createApp(buildDeps(config), config).listen(config.port, () => {
  console.log(`server is running on http://localhost:${config.port}`);
});
