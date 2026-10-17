// Read Den — reader view. One tap on the microphone and the book follows
// along page after page: words fill in as they're read, a finished page
// turns by itself, and a stuck word is offered gently. Without a working
// microphone it's tap-to-hear reading with page narration. Everything read
// is logged quietly for the parent view (see stats.js).
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var PAUSE_MS = 6000;         // quiet before gently offering the word
  var AUTO_ADVANCE_MS = 1600;  // a finished page lingers, then turns
  var IDLE_GAP_MS = 20000;     // longer gaps between actions aren't reading time
  var QUICK_END_MS = 1500;     // a recognition run ending this fast is a failure
  var MAX_QUICK_ENDS = 5;      // ...and this many in a row means give up
  var SWIPE_PX = 60;

  var els = {};
  var book = null;
  var pageIndex = 0;
  var tokens = [];
  var wordEls = [];
  var follower = null;
  var finished = false;

  var recognitionSupported = false;
  var micBlocked = false;      // permission refused or no microphone
  var wantListening = false;   // the child asked for it (it survives page turns)
  var micOn = false;           // a recognition run is actually going
  var runStartedAt = 0;
  var quickEnds = 0;
  var latestResults = [];
  var pauseTimer = null;
  var advanceTimer = null;
  var restartTimer = null;
  var narrationId = 0;
  var narrating = false;

  // Per page visit, for the reading log.
  var activeMs = 0;
  var lastTouch = 0;
  var recorded = [];
  var tapped = [];
  var pageUsedMic = false;

  // --- Diagnostics ----------------------------------------------------
  // Open a book with ?debug=1 to see what the microphone is hearing and what
  // the follower does with it — for tuning on a real device.
  var debugEl = null;
  var debugLines = [];
  function debug(line) {
    if (!debugEl) return;
    var t = new Date();
    debugLines.push(("0" + t.getMinutes()).slice(-2) + ":" + ("0" + t.getSeconds()).slice(-2) + " " + line);
    if (debugLines.length > 14) debugLines.shift();
    debugEl.textContent = debugLines.join("\n");
  }

  // --- Small helpers --------------------------------------------------

  function listenMode() {
    return recognitionSupported && !micBlocked;
  }

  function setStatus(text) {
    els.statusLine.textContent = text;
  }

  function idleStatus() {
    if (!listenMode()) return "Tap any word to hear it, or tap Hear it for the whole page.";
    return wantListening ? "I'm listening… take your time." : "Tap the microphone and read out loud. I'll follow along.";
  }

  // Counts time spent on the page, ignoring long gaps between actions.
  function touch() {
    var now = Date.now();
    if (lastTouch && now - lastTouch <= IDLE_GAP_MS) activeMs += now - lastTouch;
    lastTouch = now;
  }

  function clearTimer(name) {
    if (name === "pause" && pauseTimer) { clearTimeout(pauseTimer); pauseTimer = null; }
    if (name === "advance" && advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; }
    if (name === "restart" && restartTimer) { clearTimeout(restartTimer); restartTimer = null; }
  }

  // --- Drawing --------------------------------------------------------

  function paintWords() {
    var cursor = follower.cursor();
    var highlight = listenMode() && !follower.done() ? cursor : -1;
    wordEls.forEach(function (el, i) {
      el.classList.toggle("word-current", i === highlight);
      el.classList.toggle("word-done", listenMode() && i < cursor);
    });
  }

  function paintPips() {
    var pips = els.pips.children;
    for (var i = 0; i < pips.length; i++) {
      pips[i].classList.toggle("pip-done", i < pageIndex);
      pips[i].classList.toggle("pip-current", i === pageIndex);
    }
    els.pips.setAttribute("aria-label", "Page " + (pageIndex + 1) + " of " + book.pages.length);
  }

  function updateControls() {
    els.micBtn.hidden = !listenMode() || finished;
    var on = wantListening;
    els.micBtn.dataset.state = on ? "on" : "off";
    els.micBtn.setAttribute("aria-pressed", on ? "true" : "false");
    els.micLabel.textContent = on ? "Listening… tap to pause" : "Read out loud";
    els.prevBtn.disabled = pageIndex === 0;
    els.nextBtn.textContent = pageIndex === book.pages.length - 1 ? "The end ▶" : "Next ▶";
  }

  function hideHelp() {
    els.hearWordBtn.hidden = true;
  }

  function showHelp() {
    if (!listenMode() || follower.done() || finished) return;
    var token = tokens[follower.cursor()];
    els.hearWordBtn.textContent = "🔊 Hear “" + (token.norm || token.display) + "”";
    els.hearWordBtn.hidden = false;
  }

  function resetPauseTimer() {
    clearTimer("pause");
    if (!wantListening || !micOn) return;
    pauseTimer = setTimeout(showHelp, PAUSE_MS);
  }

  // --- Reading log ----------------------------------------------------

  // Writes what has been read on this page since the last write. With the
  // microphone, that is the words it followed; without, turning forward
  // (readThrough) counts the page as read, and only tapped words are known.
  function flushPage(readThrough) {
    if (!follower) return;
    var statuses = follower.statuses();
    var heard = 0, skipped = 0, helped = 0, unverified = 0;
    var heardWords = [];
    tokens.forEach(function (token, i) {
      if (recorded[i]) return;
      if (tapped[i]) {
        helped += 1;
      } else if (pageUsedMic && statuses[i] === 1) {
        heard += 1;
        heardWords.push(token.norm);
      } else if (pageUsedMic && statuses[i] === 2) {
        skipped += 1;
      } else if (!pageUsedMic && readThrough) {
        unverified += 1;
      } else {
        return;
      }
      recorded[i] = true;
    });
    var words = heard + skipped + helped + unverified;
    var ms = activeMs;
    activeMs = 0;
    if (words === 0) return;
    if (!pageUsedMic && helped === 0 && ms < 1500) return; // just flipping through
    ReadDen.state.recordPageRead({
      bookId: book.id,
      page: pageIndex,
      ts: Date.now(),
      ms: ms,
      mode: pageUsedMic ? "listen" : "manual",
      words: words,
      heard: heard + unverified,
      skipped: skipped,
      helped: helped,
      completed: follower.done() || (!pageUsedMic && readThrough)
    }, heardWords);
  }

  // --- Microphone -----------------------------------------------------

  function stopMic() {
    clearTimer("restart");
    clearTimer("pause");
    micOn = false;
    ReadDen.recognition.stop();
  }

  function startMic() {
    if (!listenMode() || finished || micOn || narrating || document.visibilityState === "hidden") return;
    clearTimer("restart");
    follower.newRun();
    latestResults = [];
    runStartedAt = Date.now();
    micOn = ReadDen.recognition.start({
      onResult: onResult,
      onEnd: onMicEnd,
      onError: onMicError
    });
    resetPauseTimer();
  }

  function onResult(results) {
    latestResults = results;
    quickEnds = 0;
    pageUsedMic = true;
    touch();
    var before = follower.cursor();
    var moved = follower.update(results);
    debug((results[results.length - 1].isFinal ? "final " : "interim ") + "\"" +
      results[results.length - 1].words.join(" ") + "\" cursor " + before + "→" + follower.cursor());
    if (moved) progressed();
  }

  // Browsers end a run by themselves after some quiet; carry straight on.
  // A run that dies immediately (mic busy, network) backs off, and stops
  // trying after a few goes rather than looping.
  function onMicEnd() {
    micOn = false;
    debug("mic ended after " + (Date.now() - runStartedAt) + "ms");
    if (!wantListening || finished || narrating) return;
    quickEnds = Date.now() - runStartedAt < QUICK_END_MS ? quickEnds + 1 : 0;
    if (quickEnds >= MAX_QUICK_ENDS) {
      wantListening = false;
      quickEnds = 0;
      updateControls();
      setStatus("The microphone needs a rest. Tap it to try again.");
      return;
    }
    restartTimer = setTimeout(startMic, Math.min(150 * Math.pow(2, quickEnds), 3000));
  }

  function onMicError(err) {
    debug("mic error: " + err);
    if (err === "not-allowed" || err === "service-not-allowed" || err === "audio-capture") {
      micBlocked = true;
      wantListening = false;
      stopMic();
      hideHelp();
      paintWords();
      updateControls();
      setStatus("No microphone — that's fine! " + idleStatus());
    }
    // Other errors (no-speech, aborted, network) are followed by onend.
  }

  function toggleMic() {
    touch();
    if (wantListening) {
      wantListening = false;
      stopMic();
      hideHelp();
    } else {
      wantListening = true;
      quickEnds = 0;
      clearTimer("advance");
      startMic();
    }
    updateControls();
    setStatus(idleStatus());
  }

  // --- Speaking -------------------------------------------------------

  // Says something aloud with the microphone out of the way, so it doesn't
  // hear the voice and mistake it for the child.
  function speak(text, onWord, onDone) {
    var id = ++narrationId;
    narrating = true;
    stopMic();
    ReadDen.narration.speak(text, function () {
      if (id !== narrationId) return;
      narrating = false;
      clearNarrationHighlight();
      if (wantListening) startMic();
      if (onDone) onDone();
    }, onWord);
  }

  function cancelSpeech() {
    narrationId++;
    narrating = false;
    ReadDen.narration.cancel();
    clearNarrationHighlight();
  }

  function clearNarrationHighlight() {
    wordEls.forEach(function (el) { el.classList.remove("word-narrating"); });
  }

  function narratePage() {
    touch();
    clearTimer("advance");
    hideHelp();
    var text = book.pages[pageIndex];
    speak(text, function (charIndex) {
      var which = -1;
      tokens.forEach(function (token, i) { if (token.start <= charIndex) which = i; });
      wordEls.forEach(function (el, i) { el.classList.toggle("word-narrating", i === which); });
    });
  }

  // --- Words ----------------------------------------------------------

  // Tapping a word says it. That counts as asking for help with it, once
  // per page — and if it was the word being waited on, reading carries on
  // after it.
  function onWordTap(i) {
    touch();
    var token = tokens[i];
    if (!token.norm) return;
    hideHelp();
    if (!tapped[i]) {
      tapped[i] = true;
      ReadDen.state.recordHelp(token.norm, book.id, pageIndex);
    }
    var isCurrent = listenMode() && !follower.done() && i === follower.cursor();
    speak(token.norm);
    if (isCurrent) {
      follower.help();
      progressed();
    }
  }

  // The highlight moved: redraw, then either finish the page or wait for more.
  function progressed() {
    hideHelp();
    paintWords();
    if (follower.done()) {
      onPageComplete();
    } else {
      resetPauseTimer();
    }
  }

  function onPageComplete() {
    clearTimer("pause");
    flushPage(false);
    els.pageCard.classList.add("page-done");
    var last = pageIndex === book.pages.length - 1;
    setStatus(last ? "You read the whole book!" : "Lovely reading!");
    els.nextBtn.classList.add("nudge");
    if (wantListening) {
      var donePage = pageIndex;
      advanceTimer = setTimeout(function () {
        if (pageIndex === donePage && !finished) goNext();
      }, AUTO_ADVANCE_MS);
    }
  }

  // --- Pages ----------------------------------------------------------

  function renderWords() {
    els.pageText.innerHTML = "";
    wordEls = tokens.map(function (token, i) {
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = token.display;
      span.setAttribute("role", "button");
      span.tabIndex = 0;
      span.addEventListener("click", function () { onWordTap(i); });
      span.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onWordTap(i);
        }
      });
      els.pageText.appendChild(span);
      els.pageText.appendChild(document.createTextNode(" "));
      return span;
    });
  }

  function showPage(index, direction) {
    finished = false;
    els.endCard.hidden = true;
    els.readerArea.hidden = false;
    els.navRow.hidden = false;
    clearTimer("advance");
    clearTimer("pause");
    cancelSpeech();

    pageIndex = Math.max(0, Math.min(index, book.pages.length - 1));
    tokens = ReadDen.tokenizePage(book.pages[pageIndex]);
    follower = ReadDen.createFollower(tokens, ReadDen.baselineOf(latestResults));
    recorded = [];
    tapped = [];
    pageUsedMic = false;
    activeMs = 0;
    lastTouch = Date.now();

    renderWords();
    paintWords();
    paintPips();
    hideHelp();
    els.nextBtn.classList.remove("nudge");
    els.pageCard.classList.remove("page-done", "turn-next", "turn-prev");
    if (direction) {
      void els.pageCard.offsetWidth; // restart the animation
      els.pageCard.classList.add(direction === "next" ? "turn-next" : "turn-prev");
    }

    ReadDen.state.setPage(book.id, pageIndex);
    updateControls();
    setStatus(idleStatus());
    if (wantListening) {
      startMic();
      resetPauseTimer();
    }
  }

  function goNext() {
    flushPage(true);
    if (pageIndex >= book.pages.length - 1) {
      finishBook();
    } else {
      showPage(pageIndex + 1, "next");
    }
  }

  function goPrev() {
    if (pageIndex === 0) return;
    flushPage(false);
    showPage(pageIndex - 1, "prev");
  }

  function nextBookAfter() {
    var books = ReadDen.BOOKS;
    var at = 0;
    books.forEach(function (b, i) { if (b.id === book.id) at = i; });
    for (var step = 1; step < books.length; step++) {
      var candidate = books[(at + step) % books.length];
      if (ReadDen.state.getBookProgress(candidate.id).completions === 0) return candidate;
    }
    return books[(at + 1) % books.length];
  }

  function finishBook() {
    finished = true;
    wantListening = false;
    stopMic();
    cancelSpeech();
    clearTimer("advance");
    hideHelp();
    ReadDen.state.recordCompletion(book.id);
    var next = nextBookAfter();
    els.nextBookBtn.href = "book.html?book=" + encodeURIComponent(next.id);
    els.nextBookBtn.textContent = next.cover + " " + next.title + " ▶";
    els.endCover.textContent = book.cover;
    els.readerArea.hidden = true;
    els.navRow.hidden = true;
    els.endCard.hidden = false;
    els.nextBookBtn.focus();
    for (var i = 0; i < els.pips.children.length; i++) els.pips.children[i].classList.add("pip-done");
    els.pips.children[els.pips.children.length - 1].classList.remove("pip-current");
  }

  function readAgain() {
    latestResults = [];
    showPage(0, "next");
  }

  // --- Setup ----------------------------------------------------------

  function bindGestures() {
    var startX = null;
    var startY = 0;
    els.readerArea.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    els.readerArea.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) > Math.abs(dx) / 2) return;
      if (dx < 0) goNext(); else goPrev();
    }, { passive: true });
    document.addEventListener("keydown", function (e) {
      if (finished || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    });
  }

  function init() {
    book = ReadDen.getBook(new URLSearchParams(window.location.search).get("book"));
    if (!book) {
      window.location.href = "index.html";
      return;
    }

    ["bookTitle", "pageText", "pageCard", "readerArea", "pips", "hearWordBtn", "statusLine", "micBtn",
      "micLabel", "narrateBtn", "prevBtn", "nextBtn", "navRow", "endCard", "endCover", "nextBookBtn", "againBtn"]
      .forEach(function (id) { els[id] = document.getElementById(id); });

    els.bookTitle.textContent = book.title;
    document.title = book.title + " — Reading Den";
    book.pages.forEach(function () {
      var pip = document.createElement("span");
      pip.className = "pip";
      els.pips.appendChild(pip);
    });
    recognitionSupported = ReadDen.recognition.isSupported();
    if (/[?&]debug=1/.test(window.location.search)) {
      debugEl = document.createElement("pre");
      debugEl.className = "debug-panel";
      document.body.appendChild(debugEl);
      debug("recognition " + (recognitionSupported ? "supported" : "NOT supported") + ", " + navigator.userAgent.slice(0, 60));
    }

    els.hearWordBtn.addEventListener("click", function () {
      if (!follower.done()) onWordTap(follower.cursor());
    });
    els.micBtn.addEventListener("click", toggleMic);
    els.narrateBtn.addEventListener("click", narratePage);
    els.prevBtn.addEventListener("click", goPrev);
    els.nextBtn.addEventListener("click", goNext);
    els.againBtn.addEventListener("click", readAgain);
    bindGestures();

    ReadDen.state.recordBookOpen(book.id);
    Den.trackSession({
      start: function () { return ReadDen.state.startSession(book.id); },
      end: ReadDen.state.endSession,
      // The microphone must not stay open behind another app.
      onHide: function () {
        wantListening = false;
        stopMic();
        cancelSpeech();
        if (!finished) {
          flushPage(false);
          hideHelp();
          updateControls();
          setStatus(idleStatus());
        }
      }
    });

    showPage(ReadDen.state.getBookProgress(book.id).lastPage, null);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.ReadDen = ReadDen;
})();
