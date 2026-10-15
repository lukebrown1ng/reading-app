#!/usr/bin/env node
// Renders pre-made audio clips for Spelling Den using ElevenLabs.
//
//   node spelling-den/scripts/generate-audio.js            # only missing clips
//   node spelling-den/scripts/generate-audio.js --force    # regenerate all
//   node spelling-den/scripts/generate-audio.js --force eight neighbour
//
// Reads every word in js/weeks.js and its sentence in js/sentences.js, and
// writes audio/<word>.mp3 and audio/<word>-sentence.mp3. Needs
// ELEVENLABS_API_KEY in the repo-root .env (gitignored). Existing clips
// are skipped, so adding a week only generates its new words.
"use strict";

var fs = require("fs");
var path = require("path");
var vm = require("vm");

var ROOT = path.join(__dirname, "..");
var eleven = require("../../scripts/elevenlabs");

function loadSpellDen() {
  var sandbox = { window: {}, SpellDen: undefined };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  ["weeks.js", "sentences.js"].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js", f), "utf8"), sandbox);
  });
  return sandbox.SpellDen;
}

// A word spoken on its own gets guessed at (e.g. "fare"), so word clips are
// rendered with the words either side of it in its example sentence passed
// as context. ElevenLabs only speaks `text`; previous_text/next_text just
// steer the pronunciation.
function contextFor(word, sentence) {
  if (!sentence) return {};
  var m = sentence.match(new RegExp("^(.*?)\\b" + word + "\\b(.*)$", "i"));
  if (!m) return {};
  var ctx = {};
  if (m[1].trim()) ctx.previous_text = m[1].trim();
  if (m[2].trim()) ctx.next_text = m[2].trim();
  return ctx;
}

async function main() {
  eleven.loadEnv();
  var args = process.argv.slice(2);
  var force = args.indexOf("--force") !== -1;
  var only = args.filter(function (a) { return a.indexOf("--") !== 0; });

  var SD = loadSpellDen();
  var words = [];
  SD.getAllWeeks().forEach(function (w) {
    w.words.forEach(function (x) { if (words.indexOf(x) === -1) words.push(x); });
  });

  fs.mkdirSync(path.join(ROOT, "audio"), { recursive: true });
  var made = 0;
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    if (only.length && only.indexOf(word) === -1) continue;
    var sentence = SD.SENTENCES[word];
    if (!sentence) console.warn("No sentence for '" + word + "' — add one to js/sentences.js");
    var jobs = [[word, path.join(ROOT, "audio", word + ".mp3"), contextFor(word, sentence)]];
    if (sentence) jobs.push([sentence, path.join(ROOT, "audio", word + "-sentence.mp3")]);
    for (var j = 0; j < jobs.length; j++) {
      if (!force && fs.existsSync(jobs[j][1])) continue;
      await eleven.render(jobs[j][0], jobs[j][1], jobs[j][2]);
      made++;
      console.log("✓ " + path.basename(jobs[j][1]));
    }
  }
  console.log("Done — " + made + " clip(s) generated.");
}

main().catch(function (e) { console.error(e.message); process.exit(1); });
