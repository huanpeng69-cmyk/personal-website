/* Local sticker interactions only. Does not call or change any demo/data logic. */
(function () {
  'use strict';
  var stickers = Array.from(document.querySelectorAll('[data-sticker]'));
  if (!stickers.length) return;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mouseHover = window.matchMedia('(hover: hover)');
  var cleanups = [];

  function motionAllowed() {
    return !reduced.matches && !document.hidden && !document.body.classList.contains('motion-off');
  }

  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.dataset.inView = String(entry.isIntersecting && entry.intersectionRatio >= .15);
    });
  }, { threshold: [0, .15] }) : null;

  stickers.forEach(function (button) {
    var image = button.querySelector('.sticker-image');
    var fallback = button.querySelector('.sticker-fallback');
    var feedback = button.querySelector('.sticker-feedback');
    if (!image || !feedback || button.dataset.initialized) return;
    button.dataset.initialized = 'true';
    button.dataset.inView = observer ? 'false' : 'true';
    var reactionTimer;
    var feedbackTimer;

    function stopReaction() {
      window.clearTimeout(reactionTimer);
      button.classList.remove('is-reacting');
    }
    function clearFeedback() {
      window.clearTimeout(feedbackTimer);
      button.classList.remove('has-feedback');
      feedback.textContent = '';
    }
    function react(announce) {
      if (button.disabled || button.dataset.ready !== 'true') return;
      stopReaction();
      if (motionAllowed() && button.dataset.inView === 'true') {
        // Restart a finite CSS reaction even on repeat taps. No continuous JS loop.
        void image.offsetWidth;
        button.classList.add('is-reacting');
        reactionTimer = window.setTimeout(stopReaction, 1000);
      }
      if (announce) {
        clearFeedback();
        feedback.textContent = button.dataset.feedback;
        button.classList.add('has-feedback');
        feedbackTimer = window.setTimeout(clearFeedback, 2200);
      }
    }
    function ready() {
      if (!image.naturalWidth) return;
      button.dataset.ready = 'true';
      button.disabled = false;
      button.classList.remove('is-unavailable');
      if (fallback) fallback.hidden = true;
    }
    function unavailable() {
      stopReaction();
      clearFeedback();
      button.dataset.ready = 'false';
      button.disabled = true;
      button.classList.add('is-unavailable');
      if (fallback) fallback.hidden = false;
    }

    image.addEventListener('load', ready);
    image.addEventListener('error', unavailable);
    if (image.complete) {
      if (image.naturalWidth) ready();
      else unavailable();
    }
    button.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse' && mouseHover.matches) react(false);
    });
    // Native buttons provide touch, Enter and Space without custom keyboard traps.
    button.addEventListener('click', function () { react(true); });
    button.addEventListener('blur', clearFeedback);
    cleanups.push(function () { stopReaction(); clearFeedback(); });
    if (observer) observer.observe(button);
  });

  function syncVisibility() {
    document.documentElement.classList.toggle('stickers-paused', document.hidden);
    if (document.hidden) cleanups.forEach(function (stop) { stop(); });
  }
  document.addEventListener('visibilitychange', syncVisibility);
  reduced.addEventListener('change', function () {
    if (reduced.matches) cleanups.forEach(function (stop) { stop(); });
  });
  syncVisibility();
})();
