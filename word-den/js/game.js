// Word Den — game engine: round generation, tap handling, progress visual.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  var els = {};
  var retryQueue = []; // [{ word, roundsUntilDue }]
  var lastTarget = null;
  var sessionIndex = null;
  var correctInSession = 0;
  var currentStreak = 0; // resets to 0 on any miss
  var STEPS_PER_LAP = 8;
  var animating = false;
  var toastQueue = [];
  var toastShowing = false;

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

  function pickWeighted(words) {
    var total = 0;
    var weights = words.map(function (w) {
      var weight = WordDen.state.getWordWeight(w);
      total += weight;
      return weight;
    });
    var r = Math.random() * total;
    var acc = 0;
    for (var i = 0; i < words.length; i++) {
      acc += weights[i];
      if (r <= acc) return words[i];
    }
    return words[words.length - 1];
  }

  function decayRetryQueue() {
    retryQueue.forEach(function (entry) {
      entry.roundsUntilDue -= 1;
    });
  }

  function takeDueRetry() {
    for (var i = 0; i < retryQueue.length; i++) {
      if (retryQueue[i].roundsUntilDue <= 0) {
        return retryQueue.splice(i, 1)[0].word;
      }
    }
    return null;
  }

  function pickTargetWord() {
    decayRetryQueue();
    var due = takeDueRetry();
    if (due) return due;

    var candidates = WordDen.ACTIVE_WORDS;
    var word = pickWeighted(candidates);
    // Avoid immediately repeating the same word two rounds in a row when
    // there's any alternative.
    var attempts = 0;
    while (word === lastTarget && candidates.length > 1 && attempts < 5) {
      word = pickWeighted(candidates);
      attempts += 1;
    }
    return word;
  }

  function pickClusterFor(word) {
    var key = word.toLowerCase();
    var clusterIds = WordDen.CLUSTERS_BY_WORD[key] || [];
    var clusterId = clusterIds[Math.floor(Math.random() * clusterIds.length)];
    return WordDen.CLUSTERS.filter(function (c) {
      return c.id === clusterId;
    })[0];
  }

  function buildOptions(target, cluster) {
    var others = cluster.words.filter(function (w) {
      return w.toLowerCase() !== target.toLowerCase();
    });
    var optionCount = Math.min(cluster.words.length, 4);
    var chosenOthers = shuffle(others).slice(0, optionCount - 1);
    return shuffle([target].concat(chosenOthers));
  }

  var currentTarget = null;

  function renderRound() {
    var target = pickTargetWord();
    var cluster = pickClusterFor(target);
    var options = buildOptions(target, cluster);
    currentTarget = target;
    lastTarget = target;

    var audioMode = WordDen.state.getAudioMode();
    els.optionsGrid.innerHTML = "";
    els.promptCard.classList.toggle("prompt-audio", audioMode);

    if (audioMode) {
      els.promptWord.textContent = "";
      els.promptListenBtn.hidden = false;
      WordDen.speech.speak(target);
    } else {
      els.promptWord.textContent = target;
      els.promptListenBtn.hidden = true;
    }

    options.forEach(function (word) {
      var btn = document.createElement("button");
      btn.className = "option-btn";
      btn.type = "button";
      btn.textContent = word;
      btn.addEventListener("click", function () {
        handleAnswer(word, btn);
      });
      els.optionsGrid.appendChild(btn);
    });
  }

  function handleAnswer(chosenWord, btnEl) {
    if (animating) return;
    animating = true;
    var buttons = els.optionsGrid.querySelectorAll(".option-btn");
    buttons.forEach(function (b) {
      b.disabled = true;
    });

    var isCorrect = chosenWord.toLowerCase() === currentTarget.toLowerCase();

    if (isCorrect) {
      btnEl.classList.add("option-correct");
      WordDen.state.recordCorrect(currentTarget);
      retryQueue = retryQueue.filter(function (e) {
        return e.word.toLowerCase() !== currentTarget.toLowerCase();
      });
      advanceProgress();

      currentStreak += 1;
      WordDen.state.recordStreak(currentStreak);
      renderStreakIndicator();

      // Streak bonus rewards staying in a row without punishing misses.
      var xpGain = 10 + Math.min(currentStreak - 1, 10) * 2;
      var xpResult = WordDen.state.addXP(xpGain);
      renderLevelUI();
      var newBadges = WordDen.state.evaluateBadges(currentStreak);

      if (xpResult.leveledUp) {
        showLevelUp(xpResult.after);
      }
      newBadges.forEach(queueBadgeToast);
    } else {
      btnEl.classList.add("option-tried");
      WordDen.state.recordMiss(currentTarget);
      currentStreak = 0;
      renderStreakIndicator();
      var already = retryQueue.some(function (e) {
        return e.word.toLowerCase() === currentTarget.toLowerCase();
      });
      if (!already) {
        retryQueue.push({
          word: currentTarget,
          roundsUntilDue: 2 + Math.floor(Math.random() * 3)
        });
      }
    }

    setTimeout(function () {
      animating = false;
      renderRound();
    }, isCorrect ? 650 : 450);
  }

  function advanceProgress() {
    correctInSession += 1;
    var lapPosition = correctInSession % STEPS_PER_LAP;
    var pct = (lapPosition / STEPS_PER_LAP) * 100;
    els.dino.style.left = pct + "%";
    if (lapPosition === 0) {
      els.progressTrack.classList.add("progress-celebrate");
      setTimeout(function () {
        els.progressTrack.classList.remove("progress-celebrate");
      }, 900);
    }
  }

  function renderLevelUI() {
    var info = WordDen.state.getLevelInfo();
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
    var badge = WordDen.BADGES.filter(function (b) {
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
    var info = WordDen.state.getLevelInfo();
    els.modalEmoji.textContent = info.emoji;
    els.modalTitle.textContent = info.title;
    els.modalLevelNum.textContent = "Level " + info.level;
    els.modalXpFill.style.width = info.progressPct + "%";
    els.modalXpLabel.textContent = info.xpIntoLevel + " / " + info.xpForNextLevel + " XP to next level";

    var daily = WordDen.state.getDailyStreak();
    els.modalDailyStreak.textContent = daily.current === 1
      ? "1 day so far — come back tomorrow!"
      : daily.current + " days in a row (best: " + daily.best + ")";

    els.modalBestStreak.textContent = "Best streak: " + WordDen.state.getBestStreak() + " in a row";

    var solidCount = WordDen.ACTIVE_WORDS.filter(function (w) {
      return WordDen.state.getWordStatus(w) === "solid";
    }).length;
    els.modalSolidCount.textContent = solidCount + " / " + WordDen.ACTIVE_WORDS.length + " words rock solid";

    var earned = WordDen.state.getBadges();
    els.modalBadgeGrid.innerHTML = "";
    WordDen.BADGES.forEach(function (badge) {
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

  function init() {
    els.promptCard = document.getElementById("promptCard");
    els.promptWord = document.getElementById("promptWord");
    els.promptListenBtn = document.getElementById("promptListenBtn");
    els.optionsGrid = document.getElementById("optionsGrid");
    els.dino = document.getElementById("dino");
    els.progressTrack = document.getElementById("progressTrack");
    els.audioToggle = document.getElementById("audioToggle");

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
    els.modalEmoji = document.getElementById("modalEmoji");
    els.modalTitle = document.getElementById("modalTitle");
    els.modalLevelNum = document.getElementById("modalLevelNum");
    els.modalXpFill = document.getElementById("modalXpFill");
    els.modalXpLabel = document.getElementById("modalXpLabel");
    els.modalDailyStreak = document.getElementById("modalDailyStreak");
    els.modalBestStreak = document.getElementById("modalBestStreak");
    els.modalSolidCount = document.getElementById("modalSolidCount");
    els.modalBadgeGrid = document.getElementById("modalBadgeGrid");
    els.modalCloseBtn = document.getElementById("modalCloseBtn");

    els.audioToggle.checked = WordDen.state.getAudioMode();
    els.audioToggle.addEventListener("change", function () {
      WordDen.state.setAudioMode(els.audioToggle.checked);
      renderRound();
    });

    els.promptListenBtn.addEventListener("click", function () {
      if (currentTarget) WordDen.speech.speak(currentTarget);
    });

    els.levelPill.addEventListener("click", openProgressModal);
    els.modalCloseBtn.addEventListener("click", closeProgressModal);
    els.progressModal.addEventListener("click", function (e) {
      if (e.target === els.progressModal) closeProgressModal();
    });

    sessionIndex = WordDen.state.startSession();
    WordDen.state.touchDailyStreak();
    window.addEventListener("beforeunload", function () {
      WordDen.state.endSession(sessionIndex);
    });
    // Also close the session on tab hide (tablets rarely fire beforeunload
    // reliably), so parent-view playtime stays roughly accurate.
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        WordDen.state.endSession(sessionIndex);
      }
    });

    renderLevelUI();
    WordDen.state.evaluateBadges(0).forEach(queueBadgeToast);
    renderRound();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.WordDen = WordDen;
})();
