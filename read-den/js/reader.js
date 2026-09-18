// Read Den — reader view: page rendering, speech-recognition follow-along
// (where supported), and the no-recognition narration fallback.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var PAUSE_MS = 6000; // quiet seconds before gently offering the word
  var LOOKAHEAD = 6; // how many upcoming words we'll match speech against

  var els = {};
  var book = null;
  var pageIndex = 0;
  var tokens = [];
  var currentWordIndex = 0;
  var listening = false;
  var recognitionSupported = false;
  var recognitionActiveSince = null;
  var sessionIndex = null;
  var pauseTimer = null;

  function getBookIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get("book");
  }

  function clearPauseTimer() {
    if (pauseTimer) {
      clearTimeout(pauseTimer);
      pauseTimer = null;
    }
  }

  function resetPauseTimer() {
    clearPauseTimer();
    if (!listening) return;
    pauseTimer = setTimeout(showHearBubble, PAUSE_MS);
  }

  function showHearBubble() {
    if (currentWordIndex < tokens.length) {
      els.hearWordBtn.hidden = false;
    }
  }

  function hideHearBubble() {
    els.hearWordBtn.hidden = true;
  }

  function highlightWord(index) {
    var spans = els.pageText.querySelectorAll(".word");
    spans.forEach(function (span, i) {
      span.classList.toggle("word-current", i === index);
    });
  }

  function updateNavButtons() {
    els.prevBtn.disabled = pageIndex === 0;
    if (pageIndex === book.pages.length - 1) {
      els.nextBtn.textContent = "📚 Books";
    } else {
      els.nextBtn.textContent = "Next ▶";
    }
  }

  function stopListening() {
    if (recognitionActiveSince && sessionIndex !== null) {
      ReadDen.state.addActiveMs(sessionIndex, Date.now() - recognitionActiveSince);
      recognitionActiveSince = null;
    }
    listening = false;
    ReadDen.recognition.stop();
    clearPauseTimer();
    hideHearBubble();
    if (els.listenBtn) els.listenBtn.textContent = "🎤 Start reading";
  }

  function pageComplete() {
    return currentWordIndex >= tokens.length;
  }

  function advanceTo(newIndex) {
    if (newIndex <= currentWordIndex) return;
    currentWordIndex = Math.min(newIndex, tokens.length);
    hideHearBubble();
    if (pageComplete()) {
      stopListening();
      return;
    }
    highlightWord(currentWordIndex);
    resetPauseTimer();
  }

  function onRecognitionResult(words) {
    var recent = words.slice(-8);
    var windowEnd = Math.min(tokens.length, currentWordIndex + LOOKAHEAD);
    var bestMatch = -1;
    for (var i = currentWordIndex; i < windowEnd; i++) {
      if (recent.indexOf(tokens[i].norm) !== -1) {
        bestMatch = i;
      }
    }
    if (bestMatch >= currentWordIndex) {
      advanceTo(bestMatch + 1);
    }
  }

  function onRecognitionEnd() {
    // Many browsers auto-stop SpeechRecognition after a few quiet
    // seconds even with continuous=true. If we're still in "listening"
    // mode and the page isn't finished, just pick it back up seamlessly
    // rather than surfacing anything to him.
    if (listening && !pageComplete()) {
      ReadDen.recognition.start({
        onResult: onRecognitionResult,
        onEnd: onRecognitionEnd,
        onError: onRecognitionError
      });
    }
  }

  function onRecognitionError(err) {
    if (err === "not-allowed" || err === "service-not-allowed") {
      // Mic permission denied — fall back to the narration-only mode
      // quietly rather than repeatedly failing.
      recognitionSupported = false;
      stopListening();
      els.listenBtn.hidden = true;
      els.narrateBtn.hidden = false;
    }
  }

  function startListening() {
    if (!recognitionSupported || pageComplete()) return;
    listening = true;
    recognitionActiveSince = Date.now();
    els.listenBtn.textContent = "⏸ Listening… tap to pause";
    ReadDen.recognition.start({
      onResult: onRecognitionResult,
      onEnd: onRecognitionEnd,
      onError: onRecognitionError
    });
    resetPauseTimer();
  }

  function hearWord() {
    if (currentWordIndex >= tokens.length) return;
    var token = tokens[currentWordIndex];
    ReadDen.narration.speak(token.norm || token.display);
    ReadDen.state.recordStumble(token.norm, book.id, pageIndex);
    advanceTo(currentWordIndex + 1);
  }

  function renderPage(index) {
    stopListening();
    pageIndex = Math.max(0, Math.min(index, book.pages.length - 1));
    tokens = ReadDen.tokenizePage(book.pages[pageIndex]);
    currentWordIndex = 0;

    els.pageText.innerHTML = "";
    tokens.forEach(function (token, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = token.display;
      span.addEventListener("click", function () {
        if (i === currentWordIndex) hearWord();
      });
      els.pageText.appendChild(span);
      els.pageText.appendChild(document.createTextNode(" "));
    });
    highlightWord(0);
    hideHearBubble();

    ReadDen.state.setPage(book.id, pageIndex);
    updateNavButtons();

    if (recognitionSupported) {
      els.listenBtn.hidden = false;
      els.listenBtn.textContent = "🎤 Start reading";
    } else {
      els.narrateBtn.hidden = false;
      els.tapHint.hidden = false;
    }
  }

  function goToPage(index) {
    if (index > book.pages.length - 1) {
      window.location.href = "index.html";
      return;
    }
    renderPage(index);
  }

  function init() {
    var bookId = getBookIdFromUrl();
    book = ReadDen.getBook(bookId);
    if (!book) {
      window.location.href = "index.html";
      return;
    }

    els.bookTitle = document.getElementById("bookTitle");
    els.pageText = document.getElementById("pageText");
    els.hearWordBtn = document.getElementById("hearWordBtn");
    els.tapHint = document.getElementById("tapHint");
    els.listenBtn = document.getElementById("listenBtn");
    els.narrateBtn = document.getElementById("narrateBtn");
    els.prevBtn = document.getElementById("prevBtn");
    els.nextBtn = document.getElementById("nextBtn");

    els.bookTitle.textContent = book.title;
    recognitionSupported = ReadDen.recognition.isSupported();

    els.hearWordBtn.addEventListener("click", hearWord);
    els.listenBtn.addEventListener("click", function () {
      if (listening) {
        stopListening();
      } else {
        startListening();
      }
    });
    els.narrateBtn.addEventListener("click", function () {
      ReadDen.narration.speak(book.pages[pageIndex]);
    });
    els.prevBtn.addEventListener("click", function () {
      goToPage(pageIndex - 1);
    });
    els.nextBtn.addEventListener("click", function () {
      goToPage(pageIndex + 1);
    });

    ReadDen.state.recordBookOpen(book.id);
    sessionIndex = ReadDen.state.startSession(book.id);
    window.addEventListener("beforeunload", function () {
      stopListening();
      ReadDen.state.endSession(sessionIndex);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        stopListening();
        ReadDen.state.endSession(sessionIndex);
      }
    });

    var startPage = ReadDen.state.getBookProgress(book.id).lastPage || 0;
    renderPage(startPage);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.ReadDen = ReadDen;
})();
