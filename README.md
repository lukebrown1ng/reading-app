# Reading Den

A small static web app for a child's reading practice: a home screen with
Word Game, Read a Book and Spellings modes, plus a parent page. No build
step — serve the folder with any static server
(e.g. `python3 -m http.server`) and open `index.html`. See `PLAN.md` for the
build log.

## Word Den game over

Word Den gives four lives (❤️ shown above the word). Each wrong answer costs
one; on the fourth the game ends with a "Game over!" screen showing how many
words were right and the best streak that game, and "Play again" starts a fresh
game (lives, the dino's progress along the path and the retry queue all reset).
Levels, XP, badges and the daily streak carry on across games. The limit is
`MAX_MISSES` at the top of `word-den/js/game.js`.

## Spelling history

Each finished Spelling Den round is logged (date and time, week, score as
words right first time out of the total, per-word result, tiles or typed) and
shown newest first under "Spelling history" on the parent page, and to the
kids via the 🏆 "My scores" button at the top of Spelling Den. It is stored
in the browser's localStorage on that device — not synced between devices, and
lost if the browser's site data is cleared.

## Spelling Den streaks

Kept deliberately simple — no levels, XP or badges, and no pop-ups. A pill at
the top of Spelling Den shows the daily streak (✅ once today's round is done,
otherwise 🔥 with the current streak and "not yet today"). Tapping it, or the
🏆 "My scores" button, opens a summary at the top of the history: whether
today's round is done and its best score, the days-in-a-row streak (and the
best ever), and the best score so far, then every round below (e.g. 10 / 10,
3 / 10).

A day counts if at least one round was *finished* on it. The streak is the run
of consecutive days up to today, or up to yesterday if today's round isn't done
yet, so it only breaks after a whole missed day. It's worked out from the saved
round history (`getStreakStats` in `spelling-den/js/state.js`), so it has no
data of its own, and like the history it only lives in that browser on that
device.

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

Weeks can't be added from inside the app — every word needs generated audio,
so new weeks go through the repo.

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

As each new word starts, the game plays the word, then its sentence, then the word again (`speakIntro` in `spelling-den/js/speech.js`); the 🔊 button replays just the word. `speech.js` reuses one `Audio` element for every clip. iOS
only allows audio to start without a tap if that element was played from a
tap before, so the first touch anywhere on the page unlocks it with a silent
sound; this is what lets the next word auto-play. The pause between the word,
the sentence and the word again is `GAP_MS` (600 ms) near the top of the
sequence code in `speech.js`. If a clip is missing (for
example a week added from the parent page, which has no generated audio) or
playback is blocked, it falls back to the device voice, and the "Hear it in a
sentence" button is hidden for words with no sentence.

### Word Den audio

Word Den (the word game) uses the same voice and the same approach. Clips are
`word-den/audio/<slug>.mp3` (slug = lowercased word, anything but a-z/0-9
turned into `-`, so `they're` is `they-re.mp3`), one per word the game can ask
for (every word in a cluster in `word-den/js/wordbank.js`, 266 at the moment,
about 2 MB).

```
node word-den/scripts/generate-audio.js                  # only missing clips
node word-den/scripts/generate-audio.js --force there    # redo one word
```

Add a cluster to `wordbank.js`, run the script, listen to the new clips and
commit them. Short function words said on their own are easy to get wrong
("a", "to", "Mr"), so `SAY` and `CONTEXT` at the top of the script let you
change what's spoken or give the words either side of it as pronunciation
context; add an entry there and `--force` the word if a clip sounds off. Words
with no clip fall back to the device voice. The ElevenLabs call itself lives in
`scripts/elevenlabs.js`, shared by both generators.

### A clip sounds wrong — how to fix it

Both generators work the same way, so the fix is too. You can't hear the clips
from the code, so listen to any new ones (`open <mode>/audio/<name>.mp3`).

1. **Spelling Den (word or sentence):** the sentence in
   `spelling-den/js/sentences.js` is also the pronunciation context for the
   word clip. Reword it so the meaning is obvious (for example "The bus fare was
   two pounds" fixed "fare"), then run
   `node spelling-den/scripts/generate-audio.js --force <word>`. This redoes
   both the word and sentence clips for that word.
2. **Word Den (short or ambiguous words, e.g. "a", "to", "Mr"):** add or edit an
   entry for the word in `SAY` (change the text spoken, like "Mister" for "Mr")
   or `CONTEXT` (the words either side, used only to steer the pronunciation)
   at the top of `word-den/scripts/generate-audio.js`, then run
   `node word-den/scripts/generate-audio.js --force <word>`.
3. Listen again, then commit the new `.mp3` and the edited file.

Each redo of a clip uses ElevenLabs characters (a single word is only a few),
and the free tier is about 10,000 a month, so redo clips one word at a time
rather than running `--force` with no word.

### Gotchas

- Setting `ELEVENLABS_API_KEY` in the environment overrides `.env`.
- A key without the `voices_read` permission still works, because the script
  uses a fixed voice ID instead of listing voices.
- Free-tier ElevenLabs output needs attribution if the app is ever made
  public or commercial.
