import 'dotenv/config'
import { createApp } from "./app.js";
import { buildDeps } from "./deps.js";

const PORT = process.env.PORT || 5454

createApp(buildDeps()).listen(PORT,() => {
    console.log(`server is running on http://localhost:${PORT}`)
})
