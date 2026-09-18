# Word Den — Build Plan

Tracking doc for building the sight-word recognition game described in
`word-den-claude-code-prompt.md`. Check items off as they're completed.
App lives in `word-den/` (plain HTML/CSS/JS, no build step, `localStorage`
only, no backend).

## Phase 0 — Scaffold
- [x] Create `word-den/` directory structure (`index.html`, `parent.html`, `css/`, `js/`)
- [x] Decide on plain global-namespace scripts (no bundler, no ES modules) so it
      also works opened directly via `file://` on a tablet

## Phase 1 — Word bank data (`js/wordbank.js`)
- [x] Year 1 common exception words (full list)
- [x] Year 2 common exception words (full list)
- [x] Year 3/4 statutory spelling list (full list)
- [x] Supplementary high-frequency tricky words needed for the core
      confusable clusters that aren't in the statutory lists (then, this,
      that, these, them, their, they're, off, saw, etc.)
- [x] Confusable clusters array (~30 clusters, 2-5 words each), covering the
      explicit examples from the brief (then/they/these/there/them,
      was/saw, of/off, were/where/we're) plus similar-shape/sound clusters
      drawn from the Y1/Y2/Y3-4 lists (push/pull/full/put, could/should/would,
      old/cold/gold/hold/told, etc.)

## Phase 2 — State & spaced repetition (`js/state.js`)
- [x] `localStorage`-backed state: per-word box level, seen/miss counts,
      last-seen timestamp; session log (start/end timestamps only, no
      score)
- [x] Leitner-style weighting: lower box = picked more often; box 4
      ("solid") words fade to occasional light review, never disappear
      entirely
- [x] Miss handling: no "wrong" signal anywhere — word's box resets down and
      it's requeued to reappear within the next few rounds, not banished
      and not immediately hammered

## Phase 3 — Game engine (`js/game.js`)
- [x] Round generator: weighted-pick a target word, find a cluster
      containing it, pick 2-5 options from that cluster including the
      target, shuffle
- [x] Tap-to-answer UI wiring, big touch-friendly buttons
- [x] Correct → quiet positive feedback + advance; miss → neutral,
      no reveal, no shake, just moves on and requeues
- [x] No visible score/streak/timer/level anywhere in this view
- [x] "Stop" is just closing/navigating away — no confirmation dialog

## Phase 4 — Audio / text modes (`js/speech.js`)
- [x] `SpeechSynthesis` wrapper with a replay button
- [x] Session-level toggle (persisted) switching between audio mode (word
      spoken, not shown as the prompt) and text mode (word shown, no
      audio)

## Phase 5 — Dinosaur progress visual
- [x] Simple no-numbers progress strip: a dinosaur walks across a path as
      correct answers land in the session; reaching the end triggers a
      small celebration and loops, no counters ever shown

## Phase 6 — Styling / polish
- [x] Big, colourful, low-text, mobile/tablet-friendly layout
- [x] Dinosaur/animal visual theme throughout

## Phase 7 — Parent view (`parent.html`, `js/parent.js`)
- [x] List of clusters/words flagged shaky vs. learning vs. solid
- [x] Rough play-time / session count, framed informationally not as a
      performance metric
- [x] Reachable via a small unobtrusive "parent" link, not shown during play

## Phase 8 — Manual test pass
- [x] Serve the static app locally and click through both modes in a
      browser to confirm rounds generate correctly, misses requeue, audio
      plays, progress visual animates, and parent view reflects state
- [x] Quick mobile-width check (responsive layout via `clamp()`/grid
      `minmax()`, confirmed no horizontal overflow in dev tools)

## Stretch (explicitly not MVP — logged, not built now)
- [ ] Additional game modes beyond pick-the-word
- [ ] Import/export of word-mistake data
- [ ] More visual themes beyond dinosaurs/animals
