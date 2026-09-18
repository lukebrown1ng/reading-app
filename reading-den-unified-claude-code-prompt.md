# Build Prompt: Reading Den (unified — read-aloud + word game)

Use this as the initial prompt to Claude Code. It merges two previously separate specs — the read-aloud reading tutor ("Reading Den") and the sight-word picker game ("Word Den") — into one app with a simple choice of what to do each time he opens it.

## Who this is for

A boy, nearly 8, in Year 3 (UK). He reads at roughly a 5–6 year old level (school gives his book level as ATOS ~2.1). He's into dinosaurs, animals, and the natural world — not space. He often doesn't recognize a word he just read a page or two earlier, and specifically mixes up common tricky words like `then`/`they`/`these`. He shuts down the instant something feels like school, so tone and framing matter as much as features.

## Global design principles (apply to every screen, both modes)

- Never quiz him. No visible score, level, timer, or streak anywhere in the child-facing UI.
- Never tell him an answer or a word is "wrong." A miss is invisible to him — it just quietly comes back around later.
- Never rush him. No countdowns, no pressure to hurry.
- He can stop at any point, no friction, no guilt messaging.
- Visual theme: dinosaurs/animals throughout, not space.

## Home screen

A calm choice between two big, simple tiles — no "recommended for you," no default selection nudging him one way:

1. **Read a Book** — out loud reading practice
2. **Word Game** — quick sight-word picker

## Mode 1: Read a Book

- Speech recognition listens as he reads a book aloud and follows along.
- No visible reading level, score, timer, or streak.
- Never flags a word as wrong; if he stumbles, the app just supports him quietly (e.g. can offer the word if he pauses, without any "incorrect" framing).
- Simple, low-friction page/book navigation — nothing that feels like progressing through levels.
- Book content themed toward dinosaurs/animals/nature where possible.

## Mode 2: Word Game

- Quick-fire picker: a word is presented, he taps the matching word from a small set of options.
- Options are drawn from **confusable clusters** rather than random words — e.g. `then/they/these/there/them`, `was/saw`, `of/off` — since the goal is specifically drilling the words he actually swaps.
- Word bank sourced from the standard UK statutory word lists (Year 1, Year 2 common exception words, Year 3/4 spelling list) — build a reasonably complete set, not just a few examples.
- Presentation is both audio (spoken via browser `SpeechSynthesis`) and text, switchable per round or session.
- Missed words come back around more often; solid words fade out of rotation — simple spaced repetition, invisible to him.
- Progress shown via a simple dinosaur/animal visual (e.g. a dino moving across the screen), never a number.

## Unified private parent log (not shown to him at all)

One "Parent" view/link (no login needed for MVP), pulling together data from both modes:

- **From Read a Book**: every word he stumbled on, every reread, where he stopped in each book, and actual reading time vs. time the app was open.
- **From Word Game**: which words/clusters are shaky vs. solid, and roughly how much he's played — not framed as performance, just visibility for you.

## Optional stretch idea (not MVP)

Words he stumbles on while reading could automatically feed into the Word Game's practice clusters, so the two modes reinforce each other over time. Worth keeping in mind for the data model even if you don't wire it up in the first pass.

## Tech approach (suggested)

- Single-page web app; the two modes can be separate views/routes within one app.
- `localStorage` for all state — no accounts, no backend needed for the MVP.
- Mobile/tablet-friendly (likely played on a tablet).
- Browser `SpeechRecognition` API for the reading mode, `SpeechSynthesis` for the word game's audio mode.

## Build order

1. MVP: home screen with the two-tile choice; Word Game fully working (picker, clustered word bank, audio/text toggle, invisible repeat logic, non-numeric progress visual); Read a Book working (speech recognition follow-along, non-punitive stumble handling).
2. Unified parent log covering both modes.
3. Stretch: cross-mode word data sharing described above; additional book content or game themes.

Keep every child-facing screen big, colourful, low-text, and forgiving — assume he disengages fast if anything feels like a test.
