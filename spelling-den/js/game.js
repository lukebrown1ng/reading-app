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

  var inputMode = "tiles"; // "tiles" (tap jumbled letters) or "type" (on-screen keyboard)
  var KEY_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

  var currentStreak = 0; // words right first time in a row; any miss resets it
  var toastQueue = [];
  var toastShowing = false;

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
    currentStreak = 0;
    renderStreakIndicator();
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

  function setInputMode(mode) {
    if (mode === inputMode) return;
    inputMode = mode;
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
    if (els.playArea.hidden || !els.weekPickerModal.hidden || !els.historyModal.hidden || !els.progressModal.hidden) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "Enter") {
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
    awardProgress(!missedThisWord);

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
    currentStreak = 0;
    renderStreakIndicator();

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

  // --- Levels, streak and badges ------------------------------------------

  function allWords() {
    var seen = {};
    var words = [];
    SpellDen.getAllWeeks().forEach(function (week) {
      week.words.forEach(function (w) {
        if (!seen[w]) {
          seen[w] = true;
          words.push(w);
        }
      });
    });
    return words;
  }

  // Called when a word is finally spelled right. Right first time extends
  // the streak (with a growing XP bonus); right after a retry still earns
  // some XP but doesn't count towards the streak.
  function awardProgress(firstTry, perfectRound) {
    var xpGain = 5;
    if (firstTry) {
      currentStreak += 1;
      SpellDen.state.recordStreak(currentStreak);
      xpGain = 10 + Math.min(currentStreak - 1, 10) * 2;
    }
    renderStreakIndicator();
    var xpResult = SpellDen.state.addXP(xpGain);
    renderLevelUI();
    if (xpResult.leveledUp) showLevelUp(xpResult.after);
    SpellDen.state.evaluateBadges(currentStreak, allWords(), false).forEach(queueBadgeToast);
  }

  function renderLevelUI() {
    var info = SpellDen.state.getLevelInfo();
    els.levelEmoji.textContent = info.emoji;
    els.levelNum.textContent = "Lv " + info.level;
    els.xpBarFill.style.width = info.progressPct + "%";
  }

  function renderStreakIndicator() {
    if (currentStreak >= 3) {
      els.streakFlame.hidden = false;
      els.streakCount.textContent = currentStreak;
    } else {
      els.streakFlame.hidden = true;
    }
  }

  function showLevelUp(info) {
    els.levelUpEmoji.textContent = info.emoji;
    els.levelUpTitle.textContent = info.title;
    els.levelUpNum.textContent = "Level " + info.level + "!";
    els.levelUpOverlay.hidden = false;
    els.levelUpOverlay.classList.add("show");
    setTimeout(function () {
      els.levelUpOverlay.classList.remove("show");
      setTimeout(function () {
        els.levelUpOverlay.hidden = true;
      }, 300);
    }, 2200);
  }

  function queueBadgeToast(badgeId) {
    var badge = SpellDen.BADGES.filter(function (b) {
      return b.id === badgeId;
    })[0];
    if (!badge) return;
    toastQueue.push(badge);
    if (!toastShowing) showNextToast();
  }

  function showNextToast() {
    var badge = toastQueue.shift();
    if (!badge) {
      toastShowing = false;
      return;
    }
    toastShowing = true;
    els.badgeToastIcon.textContent = badge.icon;
    els.badgeToastName.textContent = badge.name;
    els.badgeToast.hidden = false;
    els.badgeToast.classList.add("show");
    setTimeout(function () {
      els.badgeToast.classList.remove("show");
      setTimeout(function () {
        els.badgeToast.hidden = true;
        showNextToast();
      }, 300);
    }, 2400);
  }

  function renderProgressModal() {
    var info = SpellDen.state.getLevelInfo();
    els.modalEmoji.textContent = info.emoji;
    els.modalTitle.textContent = info.title;
    els.modalLevelNum.textContent = "Level " + info.level;
    els.modalXpFill.style.width = info.progressPct + "%";
    els.modalXpLabel.textContent = info.xpIntoLevel + " / " + info.xpForNextLevel + " XP to next level";

    var daily = SpellDen.state.getDailyStreak();
    els.modalDailyStreak.textContent = daily.current === 1
      ? "📅 1 day so far — come back tomorrow!"
      : "📅 " + daily.current + " days in a row (best: " + daily.best + ")";

    els.modalBestStreak.textContent =
      "🔥 Best streak: " + SpellDen.state.getBestStreak() + " in a row";

    var words = allWords();
    var solidCount = words.filter(function (w) {
      return SpellDen.state.isWordSolid(w);
    }).length;
    els.modalSolidCount.textContent = "📚 " + solidCount + " / " + words.length + " words rock solid";

    var earned = SpellDen.state.getBadges();
    els.modalBadgeGrid.innerHTML = "";
    SpellDen.BADGES.forEach(function (badge) {
      var unlocked = !!earned[badge.id];
      var card = document.createElement("div");
      card.className = "badge-card" + (unlocked ? " badge-unlocked" : " badge-locked");
      card.innerHTML =
        '<div class="badge-icon">' + (unlocked ? badge.icon : "🔒") + "</div>" +
        '<div class="badge-name">' + badge.name + "</div>" +
        '<div class="badge-desc">' + badge.desc + "</div>";
      els.modalBadgeGrid.appendChild(card);
    });
  }

  function openProgressModal() {
    renderProgressModal();
    els.progressModal.hidden = false;
  }

  function closeProgressModal() {
    els.progressModal.hidden = true;
  }

  // --- Round complete ---------------------------------------------------

  function showRoundComplete() {
    els.playArea.hidden = true;
    els.roundComplete.hidden = false;

    var perfect = results.length > 0 && results.every(function (r) { return r.status === "first"; });
    SpellDen.state.evaluateBadges(currentStreak, allWords(), perfect).forEach(queueBadgeToast);

    SpellDen.state.addRound({
      weekId: currentWeek.id,
      weekLabel: currentWeek.label,
      mode: inputMode,
      results: results
    });

    var firstTryCount = results.filter(function (r) { return r.status === "first"; }).length;
    els.roundCompleteScore.textContent =
      firstTryCount + " out of " + results.length + " spelled right first time!";

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

  // --- History ----------------------------------------------------------

  function renderHistory() {
    els.historyList.innerHTML = "";
    var rounds = SpellDen.state.getRounds().reverse();
    if (rounds.length === 0) {
      els.historyList.textContent = "No scores yet — finish a round and it will show up here!";
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
      meta.firstChild.textContent = round.weekLabel;
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
    renderHistory();
    els.historyModal.hidden = false;
  }

  function closeHistory() {
    els.historyModal.hidden = true;
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
    els.levelPill = document.getElementById("levelPill");
    els.levelEmoji = document.getElementById("levelEmoji");
    els.levelNum = document.getElementById("levelNum");
    els.xpBarFill = document.getElementById("xpBarFill");
    els.streakFlame = document.getElementById("streakFlame");
    els.streakCount = document.getElementById("streakCount");
    els.levelUpOverlay = document.getElementById("levelUpOverlay");
    els.levelUpEmoji = document.getElementById("levelUpEmoji");
    els.levelUpTitle = document.getElementById("levelUpTitle");
    els.levelUpNum = document.getElementById("levelUpNum");
    els.badgeToast = document.getElementById("badgeToast");
    els.badgeToastIcon = document.getElementById("badgeToastIcon");
    els.badgeToastName = document.getElementById("badgeToastName");
    els.progressModal = document.getElementById("progressModal");
    els.modalCloseBtn = document.getElementById("modalCloseBtn");
    els.modalEmoji = document.getElementById("modalEmoji");
    els.modalTitle = document.getElementById("modalTitle");
    els.modalLevelNum = document.getElementById("modalLevelNum");
    els.modalXpFill = document.getElementById("modalXpFill");
    els.modalXpLabel = document.getElementById("modalXpLabel");
    els.modalDailyStreak = document.getElementById("modalDailyStreak");
    els.modalBestStreak = document.getElementById("modalBestStreak");
    els.modalSolidCount = document.getElementById("modalSolidCount");
    els.modalBadgeGrid = document.getElementById("modalBadgeGrid");
    els.historyBtn = document.getElementById("historyBtn");
    els.historyModal = document.getElementById("historyModal");
    els.historyList = document.getElementById("historyList");
    els.historyCloseBtn = document.getElementById("historyCloseBtn");
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
    els.playAgainBtn = document.getElementById("playAgainBtn");
    els.correctWordsBlock = document.getElementById("correctWordsBlock");
    els.correctWordList = document.getElementById("correctWordList");
    els.retryWordsBlock = document.getElementById("retryWordsBlock");
    els.retryWordList = document.getElementById("retryWordList");
    els.practiceWordsBlock = document.getElementById("practiceWordsBlock");
    els.practiceWordList = document.getElementById("practiceWordList");

    els.levelPill.addEventListener("click", openProgressModal);
    els.modalCloseBtn.addEventListener("click", closeProgressModal);
    els.progressModal.addEventListener("click", function (e) {
      if (e.target === els.progressModal) closeProgressModal();
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

    inputMode = SpellDen.state.getInputMode();
    renderModeToggle();
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
      loadWeek(currentWeek.id);
    });

    SpellDen.state.touchDailyStreak();
    renderLevelUI();

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
