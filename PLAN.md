# Reading Den — Build Plan

Tracking doc for the unified app described in
`reading-den-unified-claude-code-prompt.md`, which merges the read-aloud
reading tutor ("Reading Den") and the sight-word game ("Word Den", built
first — see `word-den-claude-code-prompt.md`) behind one home screen.
Plain HTML/CSS/JS throughout, no build step, `localStorage` only, no
backend, works opened directly via `file://` or any static host.

Layout:
- `/index.html` — home screen, two-tile choice
- `/word-den/` — Word Game mode (already built)
- `/read-den/` — Read a Book mode (new)
- `/parent.html` — unified parent log covering both modes (new; replaces
  `word-den/parent.html`)

## Phase A — Home screen
- [x] Root `index.html` + `css/home.css`: two big calm tiles ("Read a
      Book", "Word Game"), no default/recommended styling on either
- [x] Subtle "parent" link, unobtrusive, same treatment as the existing
      Word Game one

## Phase B — Word Game mode (built previously, see below for detail)
- [x] Fully built per the original `word-den-claude-code-prompt.md` (word
      bank, spaced repetition, game engine, audio/text modes, dino
      progress visual, styling) — all of Phases 0–6 from the old plan
- [x] Re-point its "parent" footer link at the new unified `../parent.html`
- [x] Add a small home link back to `/index.html`

## Phase C — Read a Book mode (`read-den/`)
- [x] Book content (`js/books.js`): a handful of short, dinosaur/animal/
      nature-themed books at ~ATOS 2.1 (short sentences, plain
      high-frequency vocabulary), each a few pages long
- [x] State module (`js/state.js`): per-book last page reached, reread
      count, per-word stumble log/counts, session start/end (app-open
      time) plus accumulated active-listening time
- [x] Speech-recognition follow-along (`js/speech-recognition.js` +
      `js/reader.js`) where `SpeechRecognition` is available: page text
      shown word-by-word, current word highlighted, spoken words matched
      forward against the upcoming few words to advance — never flags a
      miss, just waits or gently offers the word after a pause
  - [x] Pause handling: after a few quiet seconds, a soft "hear this
        word" bubble appears near the current word; tapping it (or the
        word itself, any time) speaks it and moves on — logged silently
        as a stumble, never shown to him as wrong
  - [x] Low-friction Prev/Next page navigation, always available,
        never gated on finishing a page
- [x] Graceful fallback where `SpeechRecognition` isn't supported (e.g.
      iPad Safari): plain page-through reading with an optional "read
      this page to me" narration button (`SpeechSynthesis`), same nav,
      no stumble tracking (can't detect it), clearly not pretending to
      listen
- [x] Book picker (`read-den/index.html` + `js/picker.js`): big covers,
      resumes each book from its last page, no level/progress numbers
- [x] Styling consistent with the Word Game's dinosaur/nature theme,
      mobile/tablet-friendly

## Phase D — Unified parent log (`parent.html`)
- [x] Same 4-digit PIN speed-bump pattern as before, one shared unlock
- [x] Word Game section: shaky/learning/solid breakdown, play time,
      voice picker (moved from `word-den/parent.html`)
- [x] Read a Book section: per-book last page / reread count, words he
      stumbled on (aggregated), reading sessions (app-open time vs.
      actual active-listening time where recognition was available)
- [x] Remove the old `word-den/parent.html` + `word-den/js/parent.js` now
      superseded by the unified view

## Phase E — Manual test pass
- [x] Served locally, clicked through home → Read a Book (picker → reader
      → page nav → tap-to-hear-word) → Word Game → parent, and back;
      confirmed no console errors anywhere
- [x] Read a Book: page nav and tap-to-hear-and-advance verified live
      (logs a silent stumble, never shows "wrong"); mic follow-along
      logic verified by code review — a real device/mic is needed to
      exercise `SpeechRecognition` itself, which headless automation
      can't provide
- [x] Parent view reflects data from both modes correctly (word-game
      clusters, book page/reread counts, stumbled-word list all matched
      what was just done in-session), PIN gate works
- [x] Mobile-width check: `resize_window` didn't actually shrink the
      automated browser's viewport in this environment, so verified
      instead by auditing every new stylesheet for fixed pixel widths —
      all new CSS (`css/home.css`, `read-den/css/style.css`,
      `css/parent.css`) reuses the same `clamp()`/`minmax()`/flex-wrap
      patterns already confirmed overflow-free in the original Word Den
      build; no fixed widths that could overflow a 375px viewport

## Phase F — Word Game levels & gamification
- [x] `word-den/js/levels.js`: XP curve + dino-evolution level stages
      (Egg → Hatchling → Baby Dino → ... → Dino Legend) and a badge
      catalogue
- [x] `word-den/js/state.js`: persist XP, total correct, best streak,
      daily play streak, and unlocked badges alongside existing word
      records
- [x] Game screen: level pill + XP bar in the header, in-round streak
      flame indicator, full-screen level-up celebration, badge-unlock
      toast, and a tap-to-open progress modal (level, XP, streaks,
      badge grid)
- [x] Unified parent view: level/title, XP-to-next-level, streak
      numbers, and the same badge grid surfaced under the Word Game
      section
- [x] Manual QA: static syntax/ID cross-checks passed; live in-browser
      click-through blocked by a Claude-in-Chrome extension disconnect
      this session — recommend a manual smoke test (answer a few
      rounds, confirm level-up/badge popups and the level pill's
      progress modal look right) before relying on this fully

## Stretch (explicitly not MVP — logged, not built now)
- [ ] Feed words stumbled on while reading into the Word Game's practice
      clusters automatically (data model below already tracks stumbled
      words/counts in a shape that could support this later)
- [ ] Additional game modes beyond pick-the-word
- [ ] Import/export of word-mistake data
- [ ] More visual themes beyond dinosaurs/animals
- [ ] More book content
