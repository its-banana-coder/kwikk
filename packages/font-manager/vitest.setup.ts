import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// DATABASE_URL lives in apps/api/.env — load it here so this package's tests
// can reach Postgres without every contributor exporting it manually.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../../apps/api/.env") });
