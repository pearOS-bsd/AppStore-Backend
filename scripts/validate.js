const fs = require("fs");
const path = require("path");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const schema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "schema", "app.schema.json"), "utf8"));

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(schema);

function validateApp(app) {
  const valid = validateFn(app);
  return { valid, errors: validateFn.errors || [] };
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node validate.js <file-or-dir>");
    process.exit(1);
  }
  const files = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => f.endsWith(".json")).map((f) => path.join(target, f))
    : [target];

  let ok = true;
  for (const file of files) {
    const app = JSON.parse(fs.readFileSync(file, "utf8"));
    const result = validateApp(app);
    if (!result.valid) {
      ok = false;
      console.error(`INVALID: ${file}`);
      console.error(JSON.stringify(result.errors, null, 2));
    } else {
      console.log(`OK: ${file}`);
    }
  }
  process.exit(ok ? 0 : 1);
}

module.exports = { validateApp };
