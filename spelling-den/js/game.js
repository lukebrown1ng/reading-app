// Spelling Den — game engine. Hear the word, then unjumble letter tiles
// onto blank spaces to spell it — the word is never shown as text before
// it's checked, since that would give the spelling away.
var SpellDen = window.SpellDen || {};

(function () {
  "use strict";

  var els = {};
  var sessionIndex = null;
  var animating = false;

  var currentWeek = null;
  var order = []; // shuffled word indices into currentWeek.words for this round
  var wordIndex = 0;
  // { word, status } per completed word, in round order. status is
  // "first" (correct first try), "retry" (correct after a wrong go), or
  // "skipped" (moved on without ever getting it right this round).
  var results = [];

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

  // --- Round / word setup -----------------------------------------------

  function loadWeek(weekId) {
    currentWeek = SpellDen.getWeek(weekId) || SpellDen.getLatestWeek();
    SpellDen.state.setActiveWeekId(currentWeek.id);
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
    renderProgress();

    SpellDen.speech.speak(currentWord);
  }

  function buildTray() {
    var letters = currentWord.split("").map(function (ch, i) {
      return { ch: ch, id: i, used: false };
    });
    tray = shuffle(letters);
    renderTray();
  }

  function buildBlanks() {
    blanks = currentWord.split("").map(function () { return null; });
    renderBlanks();
  }

  // --- Rendering ----------------------------------------------------------

  function renderTray() {
    els.letterTray.innerHTML = "";
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

  function renderBlanks() {
    els.blanksRow.innerHTML = "";
    blanks.forEach(function (slot, i) {
      var box = document.createElement("button");
      box.type = "button";
      box.className = "blank-box" + (slot ? " blank-filled" : "");
      box.textContent = slot ? slot.ch : "";
      box.disabled = !slot || wrongLocked || animating;
      box.setAttribute("aria-label", slot ? "Remove letter" : "Empty space");
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

    setTimeout(function () {
      animating = false;
      nextWord();
    }, 1100);
  }

  function handleWrong() {
    wrongLocked = true;
    animating = false;
    missedThisWord = true;
    SpellDen.state.recordMiss(currentWord);

    els.blanksRow.classList.add("blanks-wrong");
    els.correctSpellingWord.textContent = currentWord;
    els.wrongFeedback.hidden = false;
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
    els.playArea.hidden = true;
    els.roundComplete.hidden = false;

    var firstTryCount = results.filter(function (r) { return r.status === "first"; }).length;
    els.roundCompleteScore.textContent =
      firstTryCount + " out of " + results.length + " spelled right first time!";

    var correctWords = results.filter(function (r) {
      return r.status === "first" || r.status === "retry";
    }).map(function (r) { return r.word; });
    var practiceWords = results.filter(function (r) {
      return r.status === "skipped";
    }).map(function (r) { return r.word; });

    renderResultList(els.correctWordList, correctWords);
    els.correctWordsBlock.hidden = correctWords.length === 0;

    renderResultList(els.practiceWordList, practiceWords);
    els.practiceWordsBlock.hidden = practiceWords.length === 0;
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

  function renderWeekPicker() {
    els.weekPickerList.innerHTML = "";
    SpellDen.getAllWeeks().slice().reverse().forEach(function (week) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "week-option" + (currentWeek && week.id === currentWeek.id ? " week-option-active" : "");
      btn.innerHTML =
        '<span class="week-option-label">' + week.label + "</span>" +
        '<span class="week-option-words">' + week.words.join(", ") + "</span>";
      btn.addEventListener("click", function () {
        closeWeekPicker();
        loadWeek(week.id);
      });
      els.weekPickerList.appendChild(btn);
    });
  }

  function openWeekPicker() {
    renderWeekPicker();
    els.weekPickerModal.hidden = false;
  }

  function closeWeekPicker() {
    els.weekPickerModal.hidden = true;
  }

  // --- Init ---------------------------------------------------------------

  function init() {
    els.weekPill = document.getElementById("weekPill");
    els.weekPillLabel = document.getElementById("weekPillLabel");
    els.weekPickerModal = document.getElementById("weekPickerModal");
    els.weekPickerList = document.getElementById("weekPickerList");
    els.weekPickerCloseBtn = document.getElementById("weekPickerCloseBtn");

    els.playArea = document.getElementById("playArea");
    els.wordProgressLabel = document.getElementById("wordProgressLabel");
    els.progressDots = document.getElementById("progressDots");
    els.hearBtn = document.getElementById("hearBtn");
    els.blanksRow = document.getElementById("blanksRow");
    els.letterTray = document.getElementById("letterTray");
    els.checkBtn = document.getElementById("checkBtn");

    els.wrongFeedback = document.getElementById("wrongFeedback");
    els.correctSpellingWord = document.getElementById("correctSpellingWord");
    els.tryAgainBtn = document.getElementById("tryAgainBtn");
    els.skipWordBtn = document.getElementById("skipWordBtn");

    els.roundComplete = document.getElementById("roundComplete");
    els.roundCompleteScore = document.getElementById("roundCompleteScore");
    els.playAgainBtn = document.getElementById("playAgainBtn");
    els.correctWordsBlock = document.getElementById("correctWordsBlock");
    els.correctWordList = document.getElementById("correctWordList");
    els.practiceWordsBlock = document.getElementById("practiceWordsBlock");
    els.practiceWordList = document.getElementById("practiceWordList");

    els.weekPill.addEventListener("click", openWeekPicker);
    els.weekPickerCloseBtn.addEventListener("click", closeWeekPicker);
    els.weekPickerModal.addEventListener("click", function (e) {
      if (e.target === els.weekPickerModal) closeWeekPicker();
    });

    els.hearBtn.addEventListener("click", function () {
      if (currentWord) SpellDen.speech.speak(currentWord);
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
      loadWeek(currentWeek.id);
    });

    sessionIndex = SpellDen.state.startSession();
    window.addEventListener("beforeunload", function () {
      SpellDen.state.endSession(sessionIndex);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        SpellDen.state.endSession(sessionIndex);
      }
    });

    var savedWeekId = SpellDen.state.getActiveWeekId();
    loadWeek(savedWeekId);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.SpellDen = SpellDen;
})();
