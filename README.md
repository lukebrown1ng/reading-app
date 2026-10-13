# Reading Den

A small static web app for a child's reading practice: a home screen with
Word Game, Read a Book and Spellings modes, plus a parent page. No build
step — serve the folder with any static server
(e.g. `python3 -m http.server`) and open `index.html`. See `PLAN.md` for the
build log.

## Spelling Den audio (ElevenLabs)

Spelling Den plays pre-recorded clips instead of the device's text-to-speech
voice, which is poor on iOS. The clips are rendered once, offline, with
[ElevenLabs](https://elevenlabs.io) and committed to the repo, so the deployed
app needs no API key, no network calls and no runtime cost.

### What gets generated

For every word in `spelling-den/js/weeks.js`, two clips in `spelling-den/audio/`:

| File | Says |
| --- | --- |
| `<word>.mp3` | the word on its own |
| `<word>-sentence.mp3` | its example sentence from `spelling-den/js/sentences.js` |

Voice: **Daniel** (British male, ElevenLabs voice ID `onwK4e9ZLuTAKqWW03F9`),
model `eleven_multilingual_v2`, speed 0.9, stability 0.6, 64 kbps mono MP3.
These are set at the top of `spelling-den/scripts/generate-audio.js`.

Word clips are rendered with the words either side of them in the example
sentence passed as `previous_text` / `next_text`. Only the word is spoken; the
context stops the model guessing at the pronunciation of words said in
isolation (this fixed "fare"). Homophone sentences should therefore make the
meaning obvious.

### One-time setup

1. Create an ElevenLabs account (the free plan, about 10,000 characters a
   month, is plenty — a whole 10-word week uses roughly 600).
2. Under Profile → API Keys, create a key with the **Text to Speech**
   permission.
3. Put it in a `.env` file at the repo root (it is gitignored — never commit it):

   ```
   ELEVENLABS_API_KEY=your-key-here
   ```

Needs Node 18+ (uses the built-in `fetch`). No `npm install`.

### Adding a new week

1. Add the week to `WEEKS` in `spelling-den/js/weeks.js`.
2. Add one simple sentence per word to `spelling-den/js/sentences.js`. Words
   without a sentence still get a word clip, and the script warns about them.
3. Generate the clips:

   ```
   node spelling-den/scripts/generate-audio.js
   ```

   Clips that already exist are skipped, so only the new words are rendered.
4. Listen to the new clips (`open spelling-den/audio/<word>.mp3`), then commit
   the new `.mp3` files along with the code changes.

### Fixing a clip

```
node spelling-den/scripts/generate-audio.js --force fare      # redo one word (both clips)
node spelling-den/scripts/generate-audio.js --force a b c     # redo several
node spelling-den/scripts/generate-audio.js --force           # redo everything
```

If a word still sounds wrong, change its sentence in `sentences.js` (the
sentence is the pronunciation context) and re-run with `--force <word>`.
The script prints a `✓ <file>` line for each clip it writes.

### How the app plays them

`spelling-den/js/speech.js` reuses one `Audio` element for every clip. iOS
only allows audio to start without a tap if that element was played from a
tap before, so the first touch anywhere on the page unlocks it with a silent
sound; this is what lets the next word auto-play. If a clip is missing (for
example a week added from the parent page, which has no generated audio) or
playback is blocked, it falls back to the device voice, and the "Hear it in a
sentence" button is hidden for words with no sentence.

### Gotchas

- Setting `ELEVENLABS_API_KEY` in the environment overrides `.env`.
- A key without the `voices_read` permission still works, because the script
  uses a fixed voice ID instead of listing voices.
- Free-tier ElevenLabs output needs attribution if the app is ever made
  public or commercial.
