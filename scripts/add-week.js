#!/usr/bin/env node
// Adds a new Spelling Den week in one go: the word list, the example
// sentences, the audio clips and the offline cache list.
//
//   node scripts/add-week.js --year 3 --focus "Words with silent k" week.txt
//   node scripts/add-week.js --year 5 --focus "Words ending -ible" --no-audio week.txt
//
// week.txt has one word per line, a "|", then its example sentence:
//
//   knight | The knight rode a white horse.
//   knot | She tied a knot in the rope.
//
// Homophones need sentences that make the meaning obvious (the sentence is
// also the pronunciation context for the word's clip). Needs
// ELEVENLABS_API_KEY in .env unless --no-audio is given (then run
// spelling-den/scripts/generate-audio.js yourself later).
"use strict";

var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = path.join(__dirname, "..");
var WEEKS = path.join(ROOT, "spelling-den/js/weeks.js");
var SENTENCES = path.join(ROOT, "spelling-den/js/sentences.js");

function fail(msg) {
  console.error("add-week: " + msg);
  process.exit(1);
}

var args = process.argv.slice(2);
var year = null, focus = null, file = null, audio = true;
for (var i = 0; i < args.length; i++) {
  if (args[i] === "--year") year = parseInt(args[++i], 10);
  else if (args[i] === "--focus") focus = args[++i];
  else if (args[i] === "--no-audio") audio = false;
  else file = args[i];
}
if (year !== 3 && year !== 5) fail("--year must be 3 or 5");
if (!focus) fail('--focus "what this week is about" is required');
if (!file) fail("give the word list file (lines of: word | sentence)");

var entries = fs.readFileSync(file, "utf8").split("\n").map(function (line) {
  return line.trim();
}).filter(function (line) {
  return line && line[0] !== "#";
}).map(function (line) {
  var parts = line.split("|");
  if (parts.length < 2 || !parts[0].trim() || !parts.slice(1).join("|").trim()) {
    fail('bad line (need "word | sentence"): ' + line);
  }
  return { word: parts[0].trim().toLowerCase(), sentence: parts.slice(1).join("|").trim() };
});
if (entries.length !== 10) fail("a week has 10 words; found " + entries.length);

var weeksSrc = fs.readFileSync(WEEKS, "utf8");
var sentencesSrc = fs.readFileSync(SENTENCES, "utf8");
var arrayName = year === 5 ? "WEEKS_Y5" : "WEEKS";
var idPrefix = year === 5 ? "y5week" : "week";
var labelPrefix = year === 5 ? "Year 5 · Week " : "Week ";

var existing = (weeksSrc.match(new RegExp('id: "' + idPrefix + "(\\d+)\"", "g")) || []).map(function (m) {
  return parseInt(m.match(/(\d+)"$/)[1], 10);
});
var n = (existing.length ? Math.max.apply(null, existing) : 0) + 1;

entries.forEach(function (e) {
  if (!new RegExp("\\b" + e.word + "\\b", "i").test(e.sentence)) {
    fail('the sentence for "' + e.word + '" must contain the word: ' + e.sentence);
  }
  if (new RegExp("^\\s*" + e.word + ":", "m").test(sentencesSrc)) {
    console.log('note: "' + e.word + '" already has a sentence — keeping the existing one');
  }
});

// 1. weeks.js — insert before the closing "];" of the right array.
var start = weeksSrc.indexOf("SpellDen." + arrayName + " = [");
if (start === -1) fail("couldn't find SpellDen." + arrayName + " in weeks.js");
var close = weeksSrc.indexOf("\n  ];", start);
var q = JSON.stringify;
var block =
  ",\n    {\n" +
  "      id: " + q(idPrefix + n) + ",\n" +
  "      label: " + q(labelPrefix + n) + ",\n" +
  "      focus: " + q(focus) + ",\n" +
  "      words: [\n" +
  [0, 5].map(function (s) {
    return "        " + entries.slice(s, s + 5).map(function (e) { return q(e.word); }).join(", ");
  }).join(",\n") + "\n" +
  "      ]\n    }";
weeksSrc = weeksSrc.slice(0, close) + block + weeksSrc.slice(close);
fs.writeFileSync(WEEKS, weeksSrc);

// 2. sentences.js — append before the closing "};".
var add = entries.filter(function (e) {
  return !new RegExp("^\\s*" + e.word + ":", "m").test(sentencesSrc);
});
if (add.length) {
  var end = sentencesSrc.lastIndexOf("\n};");
  var lines = add.map(function (e) { return "  " + e.word + ": " + q(e.sentence); }).join(",\n");
  sentencesSrc = sentencesSrc.slice(0, end) + ",\n\n  // " + labelPrefix + n + "\n" + lines + sentencesSrc.slice(end);
  fs.writeFileSync(SENTENCES, sentencesSrc);
}
console.log("Added " + labelPrefix + n + " (" + idPrefix + n + ") with " + entries.length + " words.");

// 3. audio, then the offline cache list.
if (audio) {
  var gen = cp.spawnSync("node", [path.join(ROOT, "spelling-den/scripts/generate-audio.js")], { stdio: "inherit" });
  if (gen.status !== 0) fail("audio generation failed — fix that and re-run generate-audio.js, then node scripts/build-sw.js");
} else {
  console.log("Skipped audio. Run: node spelling-den/scripts/generate-audio.js");
}
cp.spawnSync("node", [path.join(__dirname, "build-sw.js")], { stdio: "inherit" });
console.log("Listen to the new clips (open spelling-den/audio/<word>.mp3), then commit.");
