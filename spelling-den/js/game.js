// Spelling Den — game engine. Hear the word, then unjumble letter tiles
// onto blank spaces to spell it — the word is never shown as text before
// it's checked, since that would give the spelling away.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var els = {};
  var animating = false;
  var nextWordTimer = null; // pending move on after a correct answer

  var currentWeek = null;
  var order = []; // shuffled word indices into currentWeek.words for this round
  var wordIndex = 0;
  // { word, status } per completed word, in round order. status is
  // "first" (correct first try), "retry" (correct after a wrong go), or
  // "skipped" (moved on without ever getting it right this round).
  var results = [];

  var activeYear = 3;
  var savedInputMode = "tiles"; // the child's Year 3 choice, kept while in Year 5
  // "tiles" (tap jumbled letters) or "type" (on-screen keyboard). Year 5 is
  // always "type".
  var inputMode = "tiles";
  var KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  var currentWord = "";
  var tray = []; // [{ ch, id, used }]
  var blanks = []; // [{ ch, tileId } | null] per letter position
  var wrongLocked = false; // true while the correct-spelling reveal is showing
  var missedThisWord = false; // whether this word has had a wrong check yet

  function shuffle(arr) {
    var copy = arr.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  // --- Reactions: dino, cheer, chime, screen-reader status ----------------

  var CHEERS = ["You got it!", "Brilliant!", "Spot on!", "Yes!", "Well done!"];
  var audioCtx = null;

  function dinoDo(cls) {
    els.dino.className = "dino";
    void els.dino.offsetWidth; // restart the animation if it is already running
    if (cls) els.dino.classList.add(cls);
  }

  // A rising two-note chime, made with the Web Audio API so no clip is needed.
  function chime() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      [660, 880].forEach(function (freq, i) {
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        var t = audioCtx.currentTime + i * 0.14;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
    } catch (e) { /* sound is a bonus */ }
  }

  function announce(text) {
    els.liveStatus.textContent = "";
    setTimeout(function () { els.liveStatus.textContent = text; }, 30);
  }

  // --- Round / word setup -----------------------------------------------

  var PRACTICE_ID = "practice";

  function trickyWords() {
    return SpellDen.state.getTrickyWords(SpellDen.getWeeksForYear(activeYear), 10);
  }

  // A made-up "week" of the words he still finds hard. Its id keeps the
  // year prefix so its rounds are filed under the right year.
  function practiceWeek() {
    return {
      id: (activeYear === 5 ? "y5" : "") + PRACTICE_ID,
      label: "Tricky words",
      focus: "Words you found tricky before",
      year: activeYear,
      words: trickyWords()
    };
  }

  function loadWeek(weekId) {
    clearTimeout(nextWordTimer); // a pick during the cheer must not skip the new round's first word
    if (weekId === PRACTICE_ID && trickyWords().length > 0) {
      currentWeek = practiceWeek();
    } else {
      currentWeek = SpellDen.getWeek(weekId);
      if (!currentWeek || currentWeek.year !== activeYear) currentWeek = SpellDen.getLatestWeek(activeYear);
      SpellDen.state.setActiveWeekId(currentWeek.id);
    }
    order = shuffle(currentWeek.words.map(function (_, i) { return i; }));
    wordIndex = 0;
    results = [];
    renderWeekPill();
    els.roundComplete.hidden = true;
    els.playArea.hidden = false;
    startWord();
  }

  function startWord() {
    currentWord = currentWeek.words[order[wordIndex]];
    wrongLocked = false;
    missedThisWord = false;
    animating = false;

    buildTray();
    buildBlanks();
    els.wrongFeedback.hidden = true;
    els.blanksRow.classList.remove("blanks-correct", "blanks-wrong");
    els.cheer.classList.remove("cheer-show");
    dinoDo("");
    renderProgress();

    els.hearSentenceBtn.hidden = !SpellDen.speech.hasSentence(currentWord);
    SpellDen.speech.speakIntro(currentWord);
  }

  function buildTray() {
    if (inputMode === "type") {
      tray = [];
      renderTray();
      return;
    }
    var letters = currentWord.split("").map(function (ch, i) {
      return { ch: ch, id: i, used: false };
    });
    tray = shuffle(letters);
    // Never deal the tiles already in spelling order — that would give the
    // answer away. Compared by letter, not tile, so repeated letters
    // (e.g. "meet") can't slip through. Gives up only when every
    // arrangement spells the word (a word of one repeated letter).
    var distinct = letters.some(function (t) { return t.ch !== letters[0].ch; });
    while (distinct && tray.map(function (t) { return t.ch; }).join("") === currentWord) {
      tray = shuffle(letters);
    }
    renderTray();
  }

  function buildBlanks() {
    blanks = currentWord.split("").map(function () { return null; });
    renderBlanks();
  }

  // --- Rendering ----------------------------------------------------------

  function renderTray() {
    els.letterTray.innerHTML = "";
    els.letterTray.classList.toggle("keyboard", inputMode === "type");
    if (inputMode === "type") {
      renderKeyboard();
      return;
    }
    tray.forEach(function (tile) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "letter-tile" + (tile.used ? " tile-used" : "");
      btn.textContent = tile.ch;
      btn.disabled = tile.used || wrongLocked || animating;
      btn.addEventListener("click", function () {
        placeLetter(tile.id);
      });
      els.letterTray.appendChild(btn);
    });
  }

  // Typing mode: a custom on-screen keyboard rather than the system one,
  // so iOS autocorrect / suggestions can't give the spelling away and the
  // layout doesn't jump when a keyboard slides up.
  function renderKeyboard() {
    var locked = wrongLocked || animating;
    KEY_ROWS.forEach(function (letters, rowIndex) {
      var row = document.createElement("div");
      row.className = "key-row";
      letters.split("").forEach(function (ch) {
        var key = document.createElement("button");
        key.type = "button";
        key.className = "key";
        key.textContent = ch;
        key.disabled = locked;
        key.addEventListener("click", function () {
          typeLetter(ch);
        });
        row.appendChild(key);
      });
      if (rowIndex === KEY_ROWS.length - 1) {
        var back = document.createElement("button");
        back.type = "button";
        back.className = "key key-back";
        back.textContent = "⌫";
        back.setAttribute("aria-label", "Delete last letter");
        back.disabled = locked;
        back.addEventListener("click", backspace);
        row.appendChild(back);
      }
      els.letterTray.appendChild(row);
    });
  }

  function typeLetter(ch) {
    if (wrongLocked || animating || inputMode !== "type") return;
    var nextEmpty = blanks.indexOf(null);
    if (nextEmpty === -1) return;
    blanks[nextEmpty] = { ch: ch, tileId: null };
    dinoDo("dino-munch");
    renderBlanks();
  }

  function backspace() {
    if (wrongLocked || animating || inputMode !== "type") return;
    for (var i = blanks.length - 1; i >= 0; i--) {
      if (blanks[i]) {
        blanks[i] = null;
        renderBlanks();
        return;
      }
    }
  }

  // Year 5 is keyboard-only; Year 3 goes back to the saved tiles/type choice.
  function applyYear() {
    inputMode = activeYear === 5 ? "type" : savedInputMode;
    els.modeToggle.hidden = activeYear === 5;
    renderModeToggle();
  }

  function setInputMode(mode) {
    if (mode === inputMode || activeYear === 5) return;
    inputMode = mode;
    savedInputMode = mode;
    SpellDen.state.setInputMode(mode);
    renderModeToggle();
    // Start this word's entry afresh in the new mode; it isn't a miss.
    if (currentWord && !wrongLocked && !animating) {
      buildTray();
      buildBlanks();
    }
  }

  function renderModeToggle() {
    els.modeTilesBtn.setAttribute("aria-pressed", String(inputMode === "tiles"));
    els.modeTypeBtn.setAttribute("aria-pressed", String(inputMode === "type"));
  }

  function onPhysicalKey(e) {
    if (!els.roundComplete.hidden || !els.weekPickerModal.hidden || !els.historyModal.hidden || !els.grownupsModal.hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
      var tag = e.target && e.target.tagName;
      if (tag === "A" || tag === "SELECT") return;
      // Enter means "Check" — stop it also pressing whichever tile or key
      // happens to have focus.
      e.preventDefault();
      if (!els.checkBtn.disabled) els.checkBtn.click();
    } else if (inputMode === "type") {
      if (e.key === "Backspace") {
        e.preventDefault();
        backspace();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        typeLetter(e.key.toLowerCase());
      }
    }
  }

  function renderBlanks() {
    els.blanksRow.innerHTML = "";
    blanks.forEach(function (slot, i) {
      var box = document.createElement("button");
      box.type = "button";
      box.className = "blank-box" + (slot ? " blank-filled" : "");
      box.textContent = slot ? slot.ch : "";
      box.disabled = !slot || wrongLocked || animating;
      box.style.setProperty("--i", i);
      box.setAttribute("aria-label", "Letter " + (i + 1) + " of " + blanks.length + ": " +
        (slot ? slot.ch + ", tap to remove" : "empty"));
      box.addEventListener("click", function () {
        removeLetter(i);
      });
      els.blanksRow.appendChild(box);
    });
    updateCheckBtn();
  }

  function updateCheckBtn() {
    var full = blanks.length > 0 && blanks.every(function (b) { return !!b; });
    els.checkBtn.disabled = !full || wrongLocked || animating;
  }

  function renderProgress() {
    els.wordProgressLabel.textContent = "Word " + (wordIndex + 1) + " of " + order.length;
    els.progressDots.innerHTML = "";
    for (var i = 0; i < order.length; i++) {
      var dot = document.createElement("span");
      var cls = "dot";
      if (i < results.length) {
        cls += " dot-" + results[i].status;
      } else if (i === wordIndex) {
        cls += " dot-current";
      }
      dot.className = cls;
      els.progressDots.appendChild(dot);
    }
  }

  function renderWeekPill() {
    els.weekPillLabel.textContent = currentWeek.label;
    els.focusCallout.hidden = !currentWeek.focus;
    els.focusCalloutText.textContent = currentWeek.focus || "";
  }

  // --- Letter placement -----------------------------------------------

  function placeLetter(tileId) {
    if (wrongLocked || animating) return;
    var tile = tray.filter(function (t) { return t.id === tileId; })[0];
    if (!tile || tile.used) return;
    var nextEmpty = -1;
    for (var i = 0; i < blanks.length; i++) {
      if (!blanks[i]) { nextEmpty = i; break; }
    }
    if (nextEmpty === -1) return;

    blanks[nextEmpty] = { ch: tile.ch, tileId: tile.id };
    tile.used = true;
    dinoDo("dino-munch");
    renderTray();
    renderBlanks();
  }

  function removeLetter(index) {
    if (wrongLocked || animating) return;
    var slot = blanks[index];
    if (!slot) return;
    var tile = tray.filter(function (t) { return t.id === slot.tileId; })[0];
    if (tile) tile.used = false;
    blanks[index] = null;
    renderTray();
    renderBlanks();
  }

  // --- Checking -------------------------------------------------------

  function checkWord() {
    var attempt = blanks.map(function (s) { return s.ch; }).join("");
    var isCorrect = attempt.toLowerCase() === currentWord.toLowerCase();

    if (isCorrect) {
      handleCorrect();
    } else {
      handleWrong();
    }
  }

  function handleCorrect() {
    SpellDen.state.recordCorrect(currentWord, !missedThisWord);
    results.push({ word: currentWord, status: missedThisWord ? "retry" : "first" });
    renderProgress();

    els.blanksRow.classList.add("blanks-correct");
    var cheer = CHEERS[Math.floor(Math.random() * CHEERS.length)];
    els.cheer.textContent = cheer;
    els.cheer.classList.add("cheer-show");
    dinoDo("dino-cheer");
    chime();
    announce("Correct! " + cheer);

    nextWordTimer = setTimeout(function () {
      animating = false;
      nextWord();
    }, 1700);
  }

  function handleWrong() {
    wrongLocked = true;
    animating = false;
    SpellDen.state.recordMiss(currentWord, !missedThisWord);
    missedThisWord = true;

    els.blanksRow.classList.add("blanks-wrong");
    els.correctSpellingWord.textContent = currentWord;
    els.wrongFeedback.hidden = false;
    dinoDo("dino-oops");
    announce("Not quite. It is spelled " + currentWord.split("").join(" ") + ".");
    renderTray();
    renderBlanks();
  }

  function tryAgain() {
    wrongLocked = false;
    animating = false;
    els.wrongFeedback.hidden = true;
    els.blanksRow.classList.remove("blanks-wrong");
    buildTray();
    buildBlanks();
  }

  function skipWord() {
    wrongLocked = false;
    animating = false;
    els.wrongFeedback.hidden = true;
    els.blanksRow.classList.remove("blanks-wrong");
    results.push({ word: currentWord, status: "skipped" });
    renderProgress();
    nextWord();
  }

  function nextWord() {
    wordIndex += 1;
    if (wordIndex >= order.length) {
      showRoundComplete();
    } else {
      startWord();
    }
  }

  // --- Round complete ---------------------------------------------------

  function showRoundComplete() {
    els.roundComplete.hidden = false;

    SpellDen.state.addRound({
      weekId: currentWeek.id,
      weekLabel: currentWeek.label,
      mode: inputMode,
      results: results
    });
    renderStreakPill();

    var firstTryCount = results.filter(function (r) { return r.status === "first"; }).length;
    var low = firstTryCount * 2 < results.length;
    els.roundCompleteCard.classList.toggle("round-complete-low", low);
    els.roundCompleteScore.textContent = firstTryCount + " / " + results.length + (low ? " right first time" : "");
    els.roundCompleteCaption.textContent = low ? "Tricky ones today - let's practise!"
      : firstTryCount === results.length ? "all spelled right first time!" : "spelled right first time!";

    els.roundCompleteEggs.innerHTML = "";
    results.forEach(function (r, i) {
      var egg = document.createElement("span");
      egg.className = "dot dot-" + r.status;
      egg.style.setProperty("--i", i);
      els.roundCompleteEggs.appendChild(egg);
    });
    els.roundCompleteDino.className = "round-complete-dino";
    void els.roundCompleteDino.offsetWidth; // replay the cheer on every round
    els.roundCompleteDino.classList.add("dino-cheer");

    var correctWords = results.filter(function (r) {
      return r.status === "first";
    }).map(function (r) { return r.word; });
    var retryWords = results.filter(function (r) {
      return r.status === "retry";
    }).map(function (r) { return r.word; });
    var practiceWords = results.filter(function (r) {
      return r.status === "skipped";
    }).map(function (r) { return r.word; });

    renderResultList(els.correctWordList, correctWords);
    els.correctWordsBlock.hidden = correctWords.length === 0;

    renderResultList(els.retryWordList, retryWords);
    els.retryWordsBlock.hidden = retryWords.length === 0;

    renderResultList(els.practiceWordList, practiceWords);
    els.practiceWordsBlock.hidden = practiceWords.length === 0;

    var tricky = trickyWords();
    els.practiceTrickyBtn.hidden = tricky.length === 0;
    els.practiceTrickyBtn.textContent = "🌱 Practise my tricky words (" + tricky.length + ")";
    els.playAgainBtn.textContent = currentWeek.label === "Tricky words"
      ? "Play tricky words again" : "Play this week again";
  }

  function renderResultList(container, words) {
    container.innerHTML = "";
    words.forEach(function (word) {
      var chip = document.createElement("span");
      chip.className = "result-word-chip";
      chip.textContent = word;
      container.appendChild(chip);
    });
  }

  // --- Week picker ------------------------------------------------------

  // Each option names the week's theme and word count, never the words
  // themselves, so a child can't read the answers before playing.
  function weekOption(label, detail, active, onPick) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "week-option" + (active ? " week-option-active" : "");
    var l = document.createElement("span");
    l.className = "week-option-label";
    l.textContent = label;
    var d = document.createElement("span");
    d.className = "week-option-words";
    d.textContent = detail;
    btn.appendChild(l);
    btn.appendChild(d);
    btn.addEventListener("click", function () {
      closeWeekPicker();
      onPick();
    });
    return btn;
  }

  var RECENT_WEEKS = 3;

  function renderWeekPicker() {
    els.weekPickerList.innerHTML = "";
    var tricky = trickyWords();
    if (tricky.length > 0) {
      els.weekPickerList.appendChild(weekOption(
        "🌱 Tricky words", tricky.length + " words to practise",
        currentWeek && currentWeek.label === "Tricky words",
        function () { loadWeek(PRACTICE_ID); }));
    }
    var weeks = SpellDen.getWeeksForYear(activeYear).slice().reverse();
    var activeIdx = weeks.findIndex(function (w) { return currentWeek && w.id === currentWeek.id; });
    var showAll = activeIdx >= RECENT_WEEKS;
    weeks.forEach(function (week, i) {
      var btn = weekOption(week.label,
        (week.focus ? week.focus + " · " : "") + week.words.length + " words",
        currentWeek && week.id === currentWeek.id,
        function () { loadWeek(week.id); });
      if (i >= RECENT_WEEKS && !showAll) btn.hidden = true;
      btn.dataset.older = i >= RECENT_WEEKS ? "1" : "";
      els.weekPickerList.appendChild(btn);
    });
    if (weeks.length > RECENT_WEEKS && !showAll) {
      var more = document.createElement("button");
      more.type = "button";
      more.className = "week-more-btn";
      more.textContent = "Show earlier weeks";
      more.addEventListener("click", function () {
        els.weekPickerList.querySelectorAll("[data-older='1']").forEach(function (b) { b.hidden = false; });
        more.remove();
      });
      els.weekPickerList.appendChild(more);
    }
  }

  // --- History ----------------------------------------------------------

  function renderStreakPill() {
    var stats = SpellDen.state.getStreakStats(activeYear);
    if (stats.doneToday) {
      els.streakPillLabel.textContent = "✅ " + stats.streak + (stats.streak === 1 ? " day" : " days") + " in a row, played today";
    } else {
      els.streakPillLabel.textContent = stats.streak > 0
        ? "🔥 " + stats.streak + (stats.streak === 1 ? " day" : " days") + " in a row, not played yet today"
        : "📅 Not played yet today";
    }
  }

  function renderHistory() {
    els.historyList.innerHTML = "";
    var stats = SpellDen.state.getStreakStats(activeYear);
    var summary = document.createElement("div");
    summary.className = "history-summary";
    var lines = [
      stats.doneToday
        ? "✅ Done today — best score " + stats.todayBest + " / " + stats.todayTotal
        : "📅 Not done yet today",
      "🔥 " + stats.streak + (stats.streak === 1 ? " day" : " days") + " in a row" +
        (stats.bestStreak > stats.streak ? " (best: " + stats.bestStreak + ")" : "")
    ];
    if (stats.bestScore !== null) {
      lines.push("🏆 Best score: " + stats.bestScore + " / " + stats.bestTotal);
    }
    lines.forEach(function (text) {
      var line = document.createElement("div");
      line.textContent = text;
      summary.appendChild(line);
    });
    els.historyList.appendChild(summary);
    var rounds = SpellDen.state.getRounds(activeYear).reverse();
    if (rounds.length === 0) {
      var empty = document.createElement("div");
      empty.textContent = "No scores yet — finish a round and it will show up here!";
      els.historyList.appendChild(empty);
      return;
    }
    rounds.forEach(function (round) {
      var d = new Date(round.at);
      var card = document.createElement("div");
      card.className = "history-round";

      var head = document.createElement("div");
      head.className = "history-round-head";
      var score = document.createElement("span");
      score.className = "history-score";
      score.textContent = round.firstTry + " / " + round.total;
      var meta = document.createElement("span");
      meta.className = "history-meta";
      meta.innerHTML = "<strong></strong><span></span>";
      var isYear5 = /^y5/.test(round.weekId);
      meta.firstChild.textContent = round.weekLabel +
        (isYear5 ? "" : round.mode === "type" ? " · ⌨️ Keyboard" : " · 🔀 Tiles");
      meta.lastChild.textContent =
        d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
        ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      head.appendChild(score);
      head.appendChild(meta);
      card.appendChild(head);

      var words = document.createElement("div");
      words.className = "result-word-list";
      round.results.forEach(function (r) {
        var chip = document.createElement("span");
        chip.className = "result-word-chip history-chip-" + r.status;
        chip.textContent = r.word;
        words.appendChild(chip);
      });
      card.appendChild(words);
      els.historyList.appendChild(card);
    });
  }

  function openHistory() {
    closeGrownups();
    els.historyHeading.textContent = "My scores · Year " + activeYear;
    renderHistory();
    els.historyModal.hidden = false;
  }

  function closeHistory() {
    els.historyModal.hidden = true;
  }

  function openGrownups() { els.grownupsModal.hidden = false; }
  function closeGrownups() { els.grownupsModal.hidden = true; }

  function openWeekPicker() {
    closeGrownups();
    renderWeekPicker();
    els.weekPickerModal.hidden = false;
  }

  function closeWeekPicker() {
    els.weekPickerModal.hidden = true;
  }

  // --- Init ---------------------------------------------------------------

  function init() {
    els.grownupsBtn = document.getElementById("grownupsBtn");
    els.grownupsModal = document.getElementById("grownupsModal");
    els.grownupsCloseBtn = document.getElementById("grownupsCloseBtn");
    els.dino = document.getElementById("dino");
    els.cheer = document.getElementById("cheer");
    els.liveStatus = document.getElementById("liveStatus");
    els.streakPillLabel = document.getElementById("streakPillLabel");
    els.historyBtn = document.getElementById("historyBtn");
    els.historyModal = document.getElementById("historyModal");
    els.historyHeading = document.getElementById("historyHeading");
    els.historyList = document.getElementById("historyList");
    els.historyCloseBtn = document.getElementById("historyCloseBtn");
    els.yearSelect = document.getElementById("yearSelect");
    els.modeToggle = document.getElementById("modeToggle");
    els.weekPill = document.getElementById("weekPill");
    els.weekPillLabel = document.getElementById("weekPillLabel");
    els.weekPickerModal = document.getElementById("weekPickerModal");
    els.weekPickerList = document.getElementById("weekPickerList");
    els.weekPickerCloseBtn = document.getElementById("weekPickerCloseBtn");

    els.playArea = document.getElementById("playArea");
    els.wordProgressLabel = document.getElementById("wordProgressLabel");
    els.progressDots = document.getElementById("progressDots");
    els.hearBtn = document.getElementById("hearBtn");
    els.hearSentenceBtn = document.getElementById("hearSentenceBtn");
    els.focusCallout = document.getElementById("focusCallout");
    els.focusCalloutText = document.getElementById("focusCalloutText");
    els.modeTilesBtn = document.getElementById("modeTilesBtn");
    els.modeTypeBtn = document.getElementById("modeTypeBtn");
    els.blanksRow = document.getElementById("blanksRow");
    els.letterTray = document.getElementById("letterTray");
    els.checkBtn = document.getElementById("checkBtn");

    els.wrongFeedback = document.getElementById("wrongFeedback");
    els.correctSpellingWord = document.getElementById("correctSpellingWord");
    els.tryAgainBtn = document.getElementById("tryAgainBtn");
    els.skipWordBtn = document.getElementById("skipWordBtn");

    els.roundComplete = document.getElementById("roundComplete");
    els.roundCompleteScore = document.getElementById("roundCompleteScore");
    els.roundCompleteCard = document.querySelector(".round-complete-card");
    els.roundCompleteCaption = document.getElementById("roundCompleteCaption");
    els.roundCompleteEggs = document.getElementById("roundCompleteEggs");
    els.roundCompleteDino = document.getElementById("roundCompleteDino");
    els.playAgainBtn = document.getElementById("playAgainBtn");
    els.practiceTrickyBtn = document.getElementById("practiceTrickyBtn");
    els.correctWordsBlock = document.getElementById("correctWordsBlock");
    els.correctWordList = document.getElementById("correctWordList");
    els.retryWordsBlock = document.getElementById("retryWordsBlock");
    els.retryWordList = document.getElementById("retryWordList");
    els.practiceWordsBlock = document.getElementById("practiceWordsBlock");
    els.practiceWordList = document.getElementById("practiceWordList");

    els.grownupsBtn.addEventListener("click", openGrownups);
    els.grownupsCloseBtn.addEventListener("click", closeGrownups);
    els.grownupsModal.addEventListener("click", function (e) {
      if (e.target === els.grownupsModal) closeGrownups();
    });
    els.historyBtn.addEventListener("click", openHistory);
    els.historyCloseBtn.addEventListener("click", closeHistory);
    els.historyModal.addEventListener("click", function (e) {
      if (e.target === els.historyModal) closeHistory();
    });
    els.weekPill.addEventListener("click", openWeekPicker);
    els.weekPickerCloseBtn.addEventListener("click", closeWeekPicker);
    els.weekPickerModal.addEventListener("click", function (e) {
      if (e.target === els.weekPickerModal) closeWeekPicker();
    });

    els.hearBtn.addEventListener("click", function () {
      if (currentWord) SpellDen.speech.speak(currentWord);
    });

    savedInputMode = SpellDen.state.getInputMode();
    activeYear = SpellDen.state.getActiveYear();
    applyYear();
    els.modeTilesBtn.addEventListener("click", function () { setInputMode("tiles"); });
    els.modeTypeBtn.addEventListener("click", function () { setInputMode("type"); });
    document.addEventListener("keydown", onPhysicalKey);

    els.hearSentenceBtn.addEventListener("click", function () {
      if (currentWord) SpellDen.speech.speakSentence(currentWord);
    });

    els.checkBtn.addEventListener("click", function () {
      if (els.checkBtn.disabled) return;
      animating = true;
      renderTray();
      renderBlanks();
      checkWord();
    });

    els.tryAgainBtn.addEventListener("click", tryAgain);
    els.skipWordBtn.addEventListener("click", skipWord);
    els.playAgainBtn.addEventListener("click", function () {
      loadWeek(currentWeek.label === "Tricky words" ? PRACTICE_ID : currentWeek.id);
    });
    els.practiceTrickyBtn.addEventListener("click", function () {
      loadWeek(PRACTICE_ID);
    });

    Den.trackSession({
      start: function () { return SpellDen.state.startSession(); },
      end: SpellDen.state.endSession
    });

    // Pick a year first; the game only starts once one is chosen.
    function chooseYear(year) {
      els.yearSelect.hidden = true;
      if (year !== activeYear) {
        activeYear = year;
        SpellDen.state.setActiveYear(year);
        applyYear();
      }
      renderStreakPill();
      loadWeek(SpellDen.state.getActiveWeekId());
    }
    // Direct links skip the start page: spelling-den/?year=3 or ?year=5.
    var linkedYear = (window.location.search.match(/[?&]year=([35])\b/) || [])[1];
    if (linkedYear) chooseYear(+linkedYear);
    document.getElementById("year3Btn").addEventListener("click", function () { chooseYear(3); });
    document.getElementById("year5Btn").addEventListener("click", function () { chooseYear(5); });
  }

  document.addEventListener("DOMContentLoaded", init);

  window.SpellDen = SpellDen;
})();
