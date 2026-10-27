// Writes the current file list and a content hash into sw.js, so the service
// worker can cache the whole app for offline use and replaces its old cache
// when anything changes.   Usage: node scripts/build-sw.js
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const SKIP_DIRS = new Set([".git", "node_modules", "scripts", "tests"]);
const SKIP_FILES = new Set(["sw.js", ".env", ".gitignore", ".DS_Store", "package.json"]);
const SKIP_EXT = new Set([".md"]);

function walk(dir, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (!SKIP_FILES.has(name) && !SKIP_EXT.has(path.extname(name))) {
      out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  return out;
}

const files = walk(root, []);
if (require.main !== module) { module.exports = { files }; return; }
const hash = crypto.createHash("sha1");
files.forEach((f) => { hash.update(f); hash.update(fs.readFileSync(path.join(root, f))); });
const version = hash.digest("hex").slice(0, 10);

const swPath = path.join(root, "sw.js");
let sw = fs.readFileSync(swPath, "utf8");
sw = sw.replace(/^const VERSION = .*;$/m, "const VERSION = " + JSON.stringify(version) + ";");
sw = sw.replace(/^const PRECACHE = [\s\S]*?^\];?$|^const PRECACHE = \[\];$/m,
  "const PRECACHE = [\n" + ["./"].concat(files).map((f) => "  " + JSON.stringify(f === "./" ? f : "./" + f) + ",").join("\n") + "\n];");
fs.writeFileSync(swPath, sw);
console.log("sw.js: version " + version + ", " + files.length + " files precached");
