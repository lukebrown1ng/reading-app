// Loads the app's browser scripts into a Node sandbox so their logic can be
// tested without a browser. Each call gives a fresh window + localStorage.
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.join(__dirname, "..");

function createWindow() {
  const store = {};
  const localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  const noop = () => {};
  const sandbox = {
    localStorage,
    console,
    setTimeout, clearTimeout, setInterval: () => 0,
    Date, JSON, Math,
    document: { addEventListener: noop, removeEventListener: noop, visibilityState: "visible" },
    navigator: {}
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = noop;
  vm.createContext(sandbox);
  sandbox.__store = store;
  return sandbox;
}

function load(files) {
  const win = createWindow();
  files.forEach((f) => vm.runInContext(fs.readFileSync(path.join(root, f), "utf8"), win, { filename: f }));
  return win;
}

module.exports = { load, root };
