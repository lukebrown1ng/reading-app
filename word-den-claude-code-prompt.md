# Build Prompt: Sight-Word Recognition Game (working title "Word Den")

Use this as the initial prompt to Claude Code to scaffold the project. It's a standalone web app — separate from the "Reading Den" reading-practice app — focused specifically on fast, confident recognition of common tricky words.

## Who this is for

A boy, nearly 8, in Year 3 (UK). He can decode plenty of words but gets a specific cluster of very common ones mixed up on sight — `then`, `they`, `these` and similar look-alikes (`this`/`that`/`there`/`them`, `was`/`saw`, etc.). He's into dinosaurs and animals, not space. He shuts down the moment something feels like school, so tone matters as much as mechanics.

## Core concept

A quick-fire picker game, in the spirit of "flag master" / "capital master": a word is presented, and he taps the matching word out of a small set of options. The options for each round should be deliberately drawn from the *same confusable cluster* (e.g. present `then`, `they`, `these`, `there` together) rather than random words — the whole point is drilling the words he actually mixes up against each other, not just general vocabulary.

## Non-negotiable design principles

These come directly from how his other reading app was scoped, and should carry over here even though this is a different, more game-like app:

- No visible score, streak counter, timer, or level number anywhere in the child-facing UI.
- Never tell him an answer is "wrong." A miss just means: no fanfare, word quietly goes back into the pile to try again later, game keeps moving.
- Never rush him — no countdown pressure on a round.
- He can stop at any point with no "are you sure" friction or guilt messaging.
- The theme should lean into dinosaurs/animals (progress could visually be "a dinosaur moving across the screen," "feeding animals," etc. — pick one, keep it simple for the MVP) rather than points.

## Presentation modes

Both, switchable per round or per session:

- **Audio mode**: the word is spoken aloud (browser `SpeechSynthesis` is fine — no need for recorded audio files), and he picks the matching written word from the options.
- **Text mode**: the word is shown as text only (no audio), and he picks the matching word. This drills visual recognition independent of listening.
- A simple toggle (audio on/off) is enough — doesn't need to be a big settings screen.

## Word list & progression

- Source the word bank from the standard UK statutory word lists: the Year 1 list, the Year 2 list (common exception words), and the Year 3/4 statutory spelling list. Claude Code should build/include a reasonably complete set for Years 1–3 rather than just a handful of examples.
- Group words into "confusable clusters" — sets of 3–5 words that look or sound similar and are commonly swapped (e.g. `then/they/these/there/them`, `was/saw`, `of/off`, `were/where/we're`). Rounds should draw options from within a cluster.
- Track (invisibly to him) which words/clusters he gets right first-try vs. needs repeats on, and quietly show those words more often — simple spaced repetition, no need for anything fancy for the MVP.
- Words he's solid on should fade out of rotation rather than disappear entirely (occasional light review).

## Parent view

A separate, simple view (not shown during play — e.g. a small "parent" link/button, no password needed for MVP) showing:
- Which words/clusters are shaky vs. solid
- Roughly how much he's played (sessions/time), not framed as a performance metric

## Tech approach (suggested — adjust as needed)

- Single-page web app: plain HTML/CSS/JS or a lightweight framework, no build complexity required.
- `localStorage` for all state — no accounts, no login, no backend needed for the MVP.
- Mobile- and tablet-friendly (he'll likely play on a tablet).
- Browser `SpeechSynthesis` API for audio mode.

## Build order

1. MVP: one game mode (pick-the-word, both audio and text toggle), a real word bank grouped into confusable clusters, invisible repeat-on-miss logic, dinosaur/animal-themed progress visual, no scores/timers anywhere.
2. Parent view showing shaky vs. solid words.
3. Stretch (later, not MVP): additional game modes, importing/exporting word-mistake data, more visual themes.

Keep the child-facing UI big, colourful, low-text, and forgiving — assume an almost-8-year-old who disengages fast if anything feels like a test.
