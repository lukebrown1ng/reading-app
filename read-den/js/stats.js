// Read Den — turns the raw reading log into what a parent wants to know:
// how much, how often, how fluently, and which words are still tricky.
// Pure functions of the state, so they can be unit-tested; the parent page
// does the drawing.
var ReadDen = window.ReadDen || {};

(function () {
  "use strict";

  var DAY = 86400000;
  var TREND_MIN_PAGES = 4; // pages needed in a period before it is compared
  var CHART_DAYS = 14;

  function startOfDay(ts) {
    var d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }

  // The start of the calendar day `n` days before the one containing `ts`
  // (built from the date so a daylight-saving change can't shift it).
  function daysBefore(ts, n) {
    var d = new Date(ts);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n).getTime();
  }

  function sum(reads, key) {
    return reads.reduce(function (t, r) { return t + (r[key] || 0); }, 0);
  }

  function between(reads, from, to) {
    return reads.filter(function (r) { return r.ts >= from && r.ts < to; });
  }

  // Words per minute and the share of words that needed help, from the
  // pages the microphone followed (the only ones with trustworthy timings).
  function fluency(reads) {
    var listened = reads.filter(function (r) { return r.mode === "listen" && r.ms >= 3000 && r.words >= 3; });
    var words = sum(listened, "words");
    var ms = sum(listened, "ms");
    return {
      pages: listened.length,
      wpm: ms > 0 ? Math.round(words * 60000 / ms) : null,
      helpRate: words > 0 ? sum(listened, "helped") / words : null
    };
  }

  function period(reads) {
    var days = {};
    reads.forEach(function (r) { days[startOfDay(r.ts)] = true; });
    return {
      minutes: Math.round(sum(reads, "ms") / 60000),
      pages: reads.length,
      words: sum(reads, "words"),
      days: Object.keys(days).length
    };
  }

  function streaks(reads, now) {
    return Den.streaks(reads.map(function (r) { return r.ts; }), now);
  }

  function plural(n, word) {
    return n + " " + word + (n === 1 ? "" : "s");
  }

  function percent(x) {
    return Math.round(x * 100) + "%";
  }

  // state: ReadDen.state; books: ReadDen.BOOKS.
  ReadDen.computeStats = function (state, books, now) {
    now = now || Date.now();
    var reads = state.getPageReads();
    var words = state.getWordStats();
    var weekStart = daysBefore(now, 6);
    var prevWeekStart = daysBefore(now, 13);
    var tomorrow = daysBefore(now, -1);

    var week = period(between(reads, weekStart, tomorrow));
    var prevWeek = period(between(reads, prevWeekStart, weekStart));
    var weekReads = between(reads, weekStart, tomorrow);
    var prevReads = between(reads, prevWeekStart, weekStart);

    var booksFinishedThisWeek = 0;
    var totalCompletions = 0;
    var bookRows = books.map(function (book) {
      var progress = state.getBookProgress(book.id);
      var own = reads.filter(function (r) { return r.bookId === book.id; });
      var f = fluency(own);
      totalCompletions += progress.completions;
      if (progress.lastCompleted >= weekStart) booksFinishedThisWeek += 1;
      return {
        id: book.id,
        title: book.title,
        cover: book.cover,
        pageCount: book.pages.length,
        lastPage: progress.lastPage,
        started: progress.opens > 0,
        completions: progress.completions,
        lastRead: own.length ? own[own.length - 1].ts : progress.lastOpened,
        pagesRead: own.length,
        helpRate: f.helpRate
      };
    });
    week.booksFinished = booksFinishedThisWeek;

    var daily = [];
    for (var i = CHART_DAYS - 1; i >= 0; i--) {
      var from = daysBefore(now, i);
      var dayReads = between(reads, from, daysBefore(now, i - 1));
      daily.push({ ts: from, ms: sum(dayReads, "ms"), pages: dayReads.length, words: sum(dayReads, "words") });
    }

    var wordRows = Object.keys(words).map(function (word) {
      var w = words[word];
      var status = w.clean >= state.MASTERED_AFTER ? "mastered" : w.clean > 0 ? "improving" : "tricky";
      var book = null;
      books.forEach(function (b) { if (b.id === w.bookId) book = b; });
      return {
        word: word,
        helped: w.helped,
        clean: w.clean,
        status: status,
        last: w.last,
        where: book ? book.title + ", page " + (w.page + 1) : null
      };
    });
    var order = { tricky: 0, improving: 1, mastered: 2 };
    wordRows.sort(function (a, b) {
      return order[a.status] - order[b.status] || b.helped - a.helped || b.last - a.last;
    });

    var pace = fluency(weekReads);
    var prevPace = fluency(prevReads);
    var streak = streaks(reads, now);
    var lastRead = reads.length ? reads[reads.length - 1].ts : 0;

    var stats = {
      hasData: reads.length > 0,
      week: week,
      prevWeek: prevWeek,
      streak: streak,
      pace: pace,
      prevPace: prevPace,
      daily: daily,
      books: bookRows,
      words: wordRows,
      lastRead: lastRead,
      totals: { pages: reads.length, words: sum(reads, "words"), completions: totalCompletions }
    };
    stats.insights = insights(stats, now);
    return stats;
  };

  // A few plain-English observations — what's worth noticing, not a dump.
  function insights(s, now) {
    var out = [];
    if (!s.hasData) return out;
    var w = s.week;
    var daysSince = Math.floor((startOfDay(now) - startOfDay(s.lastRead)) / DAY);

    if (w.pages > 0) {
      out.push("This week: " + plural(w.pages, "page") + " (" + plural(w.words, "word") + ") over " +
        plural(w.days, "day") + ", about " + plural(Math.max(w.minutes, 1), "minute") + " of reading.");
    } else if (daysSince >= 3) {
      out.push("No reading for " + plural(daysSince, "day") + ". A short book might be a gentle way back in.");
    }

    if (s.streak.current >= 2) {
      out.push("Reading " + s.streak.current + " days in a row" + (s.streak.current >= s.streak.best ? " — a personal best." : " (best is " + s.streak.best + ")."));
    }

    if (s.pace.wpm !== null && s.pace.pages >= 2) {
      var line = "Reading pace is around " + s.pace.wpm + " words a minute";
      if (s.prevPace.wpm !== null && s.prevPace.pages >= TREND_MIN_PAGES && s.pace.pages >= TREND_MIN_PAGES) {
        var diff = s.pace.wpm - s.prevPace.wpm;
        line += Math.abs(diff) < 3 ? ", about the same as the week before" :
          diff > 0 ? ", up from " + s.prevPace.wpm + " the week before" : ", down from " + s.prevPace.wpm + " the week before";
      }
      out.push(line + ". (Timed while the microphone is following along, so pauses count.)");
    }

    if (s.pace.helpRate !== null && s.pace.pages >= 2) {
      var help = "Needed a word read out for " + percent(s.pace.helpRate) + " of words this week";
      if (s.prevPace.helpRate !== null && s.prevPace.pages >= TREND_MIN_PAGES && s.pace.pages >= TREND_MIN_PAGES) {
        help += " (" + percent(s.prevPace.helpRate) + " the week before)";
      }
      out.push(help + ".");
    }

    var mastered = s.words.filter(function (x) { return x.status === "mastered"; });
    if (mastered.length) {
      out.push("Words that used to need help and now read smoothly: " +
        mastered.slice(0, 6).map(function (x) { return x.word; }).join(", ") + ".");
    }
    var tricky = s.words.filter(function (x) { return x.status === "tricky"; });
    if (tricky.length) {
      out.push("Worth a little practice: " + tricky.slice(0, 5).map(function (x) { return x.word; }).join(", ") +
        ". The Word Game mixes these in.");
    }
    return out;
  };

  ReadDen.stats = { streaks: streaks, fluency: fluency, startOfDay: startOfDay };
  window.ReadDen = ReadDen;
})();
