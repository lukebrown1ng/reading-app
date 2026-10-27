#!/usr/bin/env node
// Renders pre-made audio clips for Word Den using ElevenLabs.
//
//   node word-den/scripts/generate-audio.js            # only missing clips
//   node word-den/scripts/generate-audio.js --force    # regenerate all
//   node word-den/scripts/generate-audio.js --force there their
//
// Reads every word the game can ask for (WordDen.ACTIVE_WORDS, i.e. every
// word in a cluster in js/wordbank.js) and writes audio/<slug>.mp3, where
// the slug is the lowercased word with anything but a-z / 0-9 turned into
// "-" (they're -> they-re). Needs ELEVENLABS_API_KEY in the repo-root .env.
// Existing clips are skipped, so adding a cluster only renders new words.
"use strict";

var fs = require("fs");
var path = require("path");
var eleven = require("../../scripts/elevenlabs");

var ROOT = path.join(__dirname, "..");

// Words on their own are easy to mispronounce — "a" as "ay", "to" as "too",
// "Mr" letter by letter. For those, SAY changes what's spoken, and CONTEXT
// gives the words either side of it (spoken by nobody, used only to steer
// the pronunciation). Add a word here if its clip sounds wrong, then re-run
// with --force <word>. Keys are lowercase.
// "am." (with the full stop) is spoken at a natural length rather than clipped.
var SAY = { mr: "Mister", mrs: "Missus", am: "am." };

var CONTEXT = {
  a: ["I saw", "dog in the park."],
  i: ["Yesterday", "went to the park."],
  to: ["I want", "go home."],
  too: ["Can I come", "?"],
  two: ["I have", "cats."],
  the: ["Look at", "big dog."],
  of: ["A cup", "tea."],
  an: ["I ate", "apple."],
  as: ["He ran", "fast as he could."],
  am: ["Yes, I", ""],
  us: ["Come with", "to the park."],
  or: ["Tea", "coffee?"],
  oh: ["", "no!"],
  so: ["I was tired and", "I went to bed."],
  do: ["What shall we", "today?"],
  be: ["I want to", "a pilot."],
  by: ["Walk", "the river."],
  no: ["Oh,", "thank you."],
  know: ["I", "the answer."],
  "he's": ["I think", "coming."],
  "they're": ["Look,", "here now."],
  their: ["They lost", "coats."],
  there: ["Put it over", "."],
  here: ["Come", "now."],
  where: ["Look", "is it?"],
  were: ["We", "at home."],
  one: ["I have", "cat."],
  once: ["", "upon a time."],
  eye: ["Open your", "wide."],
  who: ["", "is that?"],
  whole: ["I ate the", "cake."],
  heard: ["I", "a noise."],
  heart: ["My", "is beating fast."]
};

function slug(word) {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function loadWords() {
  return eleven.loadScripts(path.join(ROOT, "js"), ["wordbank.js"]).WordDen.ACTIVE_WORDS;
}

async function main() {
  eleven.loadEnv();
  var args = process.argv.slice(2);
  var force = args.indexOf("--force") !== -1;
  var only = args.filter(function (a) { return a.indexOf("--") !== 0; })
    .map(function (a) { return a.toLowerCase(); });

  fs.mkdirSync(path.join(ROOT, "audio"), { recursive: true });
  var made = 0;
  var words = loadWords();
  for (var i = 0; i < words.length; i++) {
    var word = words[i];
    var key = word.toLowerCase();
    if (only.length && only.indexOf(key) === -1) continue;
    var out = path.join(ROOT, "audio", slug(word) + ".mp3");
    if (!force && fs.existsSync(out)) continue;

    var ctx = {};
    var c = CONTEXT[key];
    if (c) {
      if (c[0]) ctx.previous_text = c[0];
      if (c[1]) ctx.next_text = c[1];
    }
    await eleven.render(SAY[key] || word, out, ctx);
    made++;
    console.log("✓ " + path.basename(out));
  }
  console.log("Done — " + made + " clip(s) generated.");
}

main().catch(function (e) { console.error(e.message); process.exit(1); });
