/* Presentation-only enhancement. Original demo and data scripts remain unchanged. */
(function () {
  'use strict';
  // Use native disclosure: all original copy remains readable without JavaScript.
  document.querySelectorAll('.repo-card').forEach(function (card) {
    var body = card.querySelector('.repo-body');
    if (!body || body.querySelector('.project-details')) return;
    var rows = Array.from(body.querySelectorAll('.case-row'));
    var details = document.createElement('details');
    details.className = 'project-details';
    var summary = document.createElement('summary');
    summary.textContent = '项目详情';
    details.appendChild(summary);
    rows.forEach(function (row) { details.appendChild(row); });
    body.insertBefore(details, body.firstChild);
  });
  // Reorder whole existing sections; never copy or rewrite their personal data.
  var main = document.getElementById('mainContent');
  ['home', 'intern', 'stats', 'repos', 'edu', 'playground', 'interview', 'contact'].forEach(function (id) {
    var section = document.getElementById(id);
    if (section && section.parentElement === main) main.appendChild(section);
  });
  // Project cards reveal their own associated project data on hover/focus.
  document.querySelectorAll('.repo-card').forEach(function (card) {
    if (card.querySelector('.project-hover-card')) return;
    var title = card.querySelector('.repo-head .name');
    var slug = card.querySelector('.repo-head .gh');
    var desc = card.querySelector('.repo-head .desc');
    var image = card.querySelector('.repo-shot img');
    var rows = Array.from(card.querySelectorAll('.case-row')).slice(0, 3);
    var links = Array.from(card.querySelectorAll('.repo-links a'));
    var hover = document.createElement('div');
    hover.className = 'project-hover-card';
    hover.setAttribute('role', 'status');
    hover.innerHTML = '<div class="project-hover-media"></div><div class="project-hover-copy"><span class="project-hover-kicker"></span><h3></h3><p class="project-hover-desc"></p><div class="project-hover-facts"></div><div class="project-hover-actions"></div></div>';
    var media = hover.querySelector('.project-hover-media');
    if (image) { var img = image.cloneNode(true); img.removeAttribute('loading'); media.appendChild(img); }
    hover.querySelector('.project-hover-kicker').textContent = slug ? slug.textContent.trim() : 'OPEN SOURCE PROJECT';
    hover.querySelector('h3').textContent = title ? title.childNodes[0].textContent.trim() : '项目详情';
    hover.querySelector('.project-hover-desc').textContent = desc ? desc.textContent.trim() : '';
    rows.forEach(function (row) {
      var fact = document.createElement('p');
      fact.innerHTML = '<b>' + (row.querySelector('.lab') ? row.querySelector('.lab').textContent.trim() : '项目') + '</b> ' + row.querySelector('.t').textContent.replace(row.querySelector('.lab') ? row.querySelector('.lab').textContent : '', '').trim();
      hover.querySelector('.project-hover-facts').appendChild(fact);
    });
    links.forEach(function (link) {
      var a = link.cloneNode(true); a.textContent = link.textContent.trim() + ' ↗'; hover.querySelector('.project-hover-actions').appendChild(a);
    });
    card.appendChild(hover);
    card.addEventListener('click', function (event) {
      if (window.matchMedia('(max-width: 720px)').matches && !event.target.closest('a,button,summary,details')) card.classList.toggle('project-hover-open');
    });
  });
  var menu = document.getElementById('mobileMenu');
  var menuButton = document.getElementById('menuBtn');
  function syncMenu() {
    if (!menu || !menuButton) return;
    var open = menu.classList.contains('show');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
    menu.inert = !open;
  }
  if (menu) { new MutationObserver(syncMenu).observe(menu, {attributes:true,attributeFilter:['class']}); syncMenu(); }
  var modal = document.getElementById('resumeModal');
  var focusBeforeModal;
  if (modal) new MutationObserver(function () {
    if (modal.classList.contains('show')) {
      focusBeforeModal = document.activeElement;
      modal.querySelector('.close').focus();
    } else if (focusBeforeModal && document.contains(focusBeforeModal)) focusBeforeModal.focus({preventScroll:true});
  }).observe(modal, {attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      if (modal && modal.classList.contains('show')) window.closeResume();
      if (menu && menu.classList.contains('show')) { window.toggleMenu(); menuButton.focus(); }
    }
    if (event.key === 'Tab' && modal && modal.classList.contains('show')) {
      var focusable = Array.from(modal.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]'));
      var first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  // Closing a mobile menu on desktop prevents a hidden scroll lock after resize.
  var desktop = matchMedia('(min-width: 721px)');
  desktop.addEventListener('change', function (event) { if (event.matches && menu && menu.classList.contains('show')) window.toggleMenu(); });
  // Clarify data provenance; no live AI / social metrics are implied by the UI.
  document.querySelectorAll('.repo-shot img').forEach(function (img) { img.loading = 'lazy'; });
})();
