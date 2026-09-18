// Word Den — game engine: round generation, tap handling, progress visual.
var WordDen = window.WordDen || {};

(function () {
  "use strict";

  var els = {};
  var retryQueue = []; // [{ word, roundsUntilDue }]
  var lastTarget = null;
  var sessionIndex = null;
  var correctInSession = 0;
  var STEPS_PER_LAP = 8;
  var animating = false;

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
    } else {
      btnEl.classList.add("option-tried");
      WordDen.state.recordMiss(currentTarget);
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

  function init() {
    els.promptCard = document.getElementById("promptCard");
    els.promptWord = document.getElementById("promptWord");
    els.promptListenBtn = document.getElementById("promptListenBtn");
    els.optionsGrid = document.getElementById("optionsGrid");
    els.dino = document.getElementById("dino");
    els.progressTrack = document.getElementById("progressTrack");
    els.audioToggle = document.getElementById("audioToggle");

    els.audioToggle.checked = WordDen.state.getAudioMode();
    els.audioToggle.addEventListener("change", function () {
      WordDen.state.setAudioMode(els.audioToggle.checked);
      renderRound();
    });

    els.promptListenBtn.addEventListener("click", function () {
      if (currentTarget) WordDen.speech.speak(currentTarget);
    });

    sessionIndex = WordDen.state.startSession();
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

    renderRound();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.WordDen = WordDen;
})();
