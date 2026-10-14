// Shared ElevenLabs text-to-speech helper for the clip generators
// (spelling-den/scripts/generate-audio.js, word-den/scripts/generate-audio.js).
// Voice: Daniel (British male). Needs ELEVENLABS_API_KEY in the repo-root
// .env (gitignored).
"use strict";

var fs = require("fs");
var path = require("path");

var VOICE_ID = "onwK4e9ZLuTAKqWW03F9"; // Daniel — British male
var MODEL = "eleven_multilingual_v2";
var SETTINGS = { stability: 0.6, similarity_boost: 0.75, speed: 0.9 };

function loadEnv() {
  var file = path.join(__dirname, "..", ".env");
  if (fs.existsSync(file)) {
    fs.readFileSync(file, "utf8").split("\n").forEach(function (line) {
      var m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
    });
  }
  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY missing (set it in the repo-root .env)");
    process.exit(1);
  }
}

// `context` may hold previous_text / next_text: ElevenLabs only speaks
// `text`, but uses the surrounding words to pronounce it naturally.
async function render(text, outFile, context) {
  var res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/" + VOICE_ID + "?output_format=mp3_44100_64",
    {
      method: "POST",
      headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign(
        { text: text, model_id: MODEL, voice_settings: SETTINGS }, context || {}
      ))
    }
  );
  if (!res.ok) throw new Error(res.status + " " + (await res.text()));
  fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
}

module.exports = { loadEnv: loadEnv, render: render };
