/* Playground demo logic. Same demos and data as before, with visible process states.
   portfolio.js (site business logic) is untouched. */
(function () {
  'use strict';

  var doc = document;
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motion() {
    return !reduceQuery.matches && !doc.body.classList.contains('motion-off');
  }

  var toastEl = doc.getElementById('toast');
  var toastTimer = null;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2200);
  }

  function copyText(text, okMsg) {
    function legacy() {
      var area = doc.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.top = '-1000px';
      doc.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(area);
      if (ok) toast(okMsg); else toast('复制失败，请手动选择文本');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg); }, legacy);
    } else legacy();
  }

  /* ---------------- tabs: keyboard, hash deep link, enter state ---------------- */

  var NAMES = ['workbench', 'kg', 'amazon', 'gongkao', 'style', 'corner', 'duel', 'video'];
  var tabs = Array.prototype.slice.call(doc.querySelectorAll('#playTabs .ptab'));
  var panels = Array.prototype.slice.call(doc.querySelectorAll('.panel'));
  var current = 'workbench';

  function panelOf(name) { return doc.getElementById('panel-' + name); }
  function tabOf(name) { return doc.getElementById('ptab-' + name); }

  function setHash(name) {
    var hash = '#playground/' + name;
    if (location.hash === hash) return;
    if (window.history && history.replaceState) {
      try { history.replaceState(null, '', hash); return; } catch (e) { /* file:// fallback */ }
    }
    location.hash = hash;
  }

  function activate(name, opts) {
    opts = opts || {};
    if (NAMES.indexOf(name) < 0) name = 'workbench';
    var changed = name !== current;
    current = name;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-p') === name;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
      t.setAttribute('tabindex', on ? '0' : '-1');
    });
    panels.forEach(function (p) {
      var on = p.getAttribute('data-panel') === name;
      p.classList.toggle('active', on);
      if (on) p.removeAttribute('hidden');
      else { p.setAttribute('hidden', ''); p.classList.remove('panel-in'); }
    });
    var target = panelOf(name);
    if (target && changed && motion()) {
      target.classList.remove('panel-in');
      void target.offsetWidth;
      target.classList.add('panel-in');
    }
    if (!opts.silent) setHash(name);
  }

  tabs.forEach(function (t, index) {
    t.addEventListener('click', function () { activate(t.getAttribute('data-p')); });
    t.addEventListener('keydown', function (event) {
      var key = event.key;
      var next = null;
      if (key === 'ArrowRight' || key === 'ArrowDown') next = (index + 1) % tabs.length;
      else if (key === 'ArrowLeft' || key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      else if (key === 'Home') next = 0;
      else if (key === 'End') next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus();
      activate(tabs[next].getAttribute('data-p'));
    });
  });

  doc.querySelectorAll('.pg-step').forEach(function (button) {
    button.addEventListener('click', function () {
      var name = button.getAttribute('data-jump');
      activate(name);
      var target = tabOf(name);
      if (target) target.focus({ preventScroll: true });
      var section = doc.getElementById('playground');
      if (section && motion()) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  function hashTarget() {
    var match = /^#playground\/([a-z]+)$/.exec(location.hash || '');
    return match && NAMES.indexOf(match[1]) >= 0 ? match[1] : null;
  }

  function applyHash() {
    var name = hashTarget();
    if (!name || name === current) return;
    activate(name, { silent: true });
  }

  window.addEventListener('hashchange', applyHash);
  window.addEventListener('popstate', applyHash);

  (function () {
    var initial = hashTarget();
    if (initial) {
      activate(initial, { silent: true });
      var section = doc.getElementById('playground');
      if (section) {
        if (motion()) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else section.scrollIntoView({ block: 'start' });
      }
    } else {
      activate('workbench', { silent: true });
    }
  })();

  /* ---------------- 1. workbench approval ---------------- */

  var wbSeed = [
    { t: '请假审批', n: '张伟，事假 2 天', d: '2026-10-20~21' },
    { t: '公章使用', n: '合同用印 HT-2026-118', d: '法务已预审' },
    { t: '公务接待', n: '客户来访用餐', d: '预算 ¥680' }
  ];
  var wbState = { todo: [], done: [], reject: [] };
  var wbView = 'todo';
  var wbHistory = [];
  var wbBusy = false;
  var wbList = doc.getElementById('wbList');
  var wbUndo = doc.getElementById('wbUndo');
  var wbHint = doc.getElementById('wbHint');

  function wbTotal() { return wbState.todo.length + wbState.done.length + wbState.reject.length; }

  function wbPaint() {
    doc.querySelectorAll('#wbTabs2 .cnt').forEach(function (badge) {
      var key = badge.getAttribute('data-cnt');
      badge.textContent = String(wbState[key].length);
    });
    if (wbUndo) wbUndo.disabled = wbHistory.length === 0;
    if (wbHint) wbHint.textContent = '已处理 ' + (wbTotal() - wbState.todo.length) + ' / ' + wbTotal() + ' 张';
  }

  function wbRows() {
    var list = wbState[wbView];
    wbList.innerHTML = '';
    if (!list.length) {
      var empty = doc.createElement('li');
      empty.className = 'wb-empty';
      empty.innerHTML = '<b>该状态暂无记录</b><span>' + (wbView === 'todo'
        ? '全部审批已处理，可在“已批 / 驳回”查看留痕。'
        : '还没有处理过的单据。') + '</span>';
      wbList.appendChild(empty);
      return;
    }
    list.forEach(function (row, index) {
      var li = doc.createElement('li');
      li.className = 'req' + (wbView === 'todo' ? '' : wbView === 'done' ? ' done' : ' rej');
      var right = wbView === 'todo'
        ? '<div class="ra"><button class="mini ok" type="button" data-i="' + index + '" data-a="done">批准</button><button class="mini no" type="button" data-i="' + index + '" data-a="reject">驳回</button></div>'
        : '<span class="stamp">' + (wbView === 'done' ? '已批准' : '已驳回') + '</span>';
      li.innerHTML = '<div><div class="ri">' + row.t + '</div><div class="rm">' + row.n + ' ' + row.d + '</div></div>' + right;
      wbList.appendChild(li);
    });
    if (wbView === 'todo') {
      wbList.querySelectorAll('.mini').forEach(function (button) {
        button.addEventListener('click', function () {
          wbAct(+button.getAttribute('data-i'), button.getAttribute('data-a'));
        });
      });
    }
  }

  function wbAct(index, target) {
    if (wbBusy) return;
    var item = wbState.todo[index];
    if (!item) return;
    wbBusy = true;
    var row = wbList.querySelectorAll('.req')[index];
    if (row && motion()) {
      row.classList.add('wb-leaving');
      setTimeout(function () { wbMove(index, target); }, 190);
    } else {
      wbMove(index, target);
    }
  }

  function wbMove(index, target) {
    var item = wbState.todo.splice(index, 1)[0];
    wbState[target].push(item);
    wbHistory.push({ item: item, to: target });
    wbPaint();
    wbRows();
    wbBusy = false;
    toast((target === 'done' ? '已批准：' : '已驳回：') + item.t);
  }

  doc.querySelectorAll('#wbTabs2 .t2').forEach(function (button) {
    button.addEventListener('click', function () {
      doc.querySelectorAll('#wbTabs2 .t2').forEach(function (other) {
        other.classList.remove('active');
        other.setAttribute('aria-pressed', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-pressed', 'true');
      wbView = button.getAttribute('data-s');
      wbRows();
    });
  });

  if (wbUndo) {
    wbUndo.addEventListener('click', function () {
      var last = wbHistory.pop();
      if (!last) return;
      var from = wbState[last.to];
      var at = from.indexOf(last.item);
      if (at >= 0) from.splice(at, 1);
      wbState.todo.push(last.item);
      wbPaint();
      wbRows();
      toast('已撤销：' + last.item.t);
    });
  }

  function wbReset() {
    wbState.todo = wbSeed.map(function (row) { return { t: row.t, n: row.n, d: row.d }; });
    wbState.done = [];
    wbState.reject = [];
    wbHistory = [];
    wbView = 'todo';
    wbBusy = false;
    doc.querySelectorAll('#wbTabs2 .t2').forEach(function (button) {
      var on = button.getAttribute('data-s') === 'todo';
      button.classList.toggle('active', on);
      button.setAttribute('aria-pressed', String(on));
    });
    wbPaint();
    wbRows();
  }

  wbReset();

  /* ---------------- 2. knowledge base ---------------- */

  var kgBase = {
    '党员组织关系转接需要哪些材料？': '党员组织关系转接一般需：① 组织关系介绍信（原党委开具）；② 党员档案 / 入党志愿书复印件；③ 本人身份证；④ 接收地党支部同意接收证明。转入后 30 日内完成落到支部的登记。',
    '项目部采购流程怎么走？': '项目部采购通常：需求提报 → 比价 / 招标 → 合同审批 → 验收入库 → 付款。单笔超授权额度须上报公司集采或分管领导审批，留存比价与验收记录备查。',
    '绩效奖金一般怎么核算？': '绩效奖金多按「基数 × 考核系数」核算：基数挂钩岗位职级与月度产值，系数来自 KPI / 360 考评。项目奖常按节点达成比例分段发放，延期或质量不达标会相应扣减。'
  };
  var kgSrcMap = {
    '党员组织关系转接需要哪些材料？': ['《中国共产党党员教育管理工作条例》第三章', '支部工作手册，组织关系转接', '公司党建标准化台账，样例'],
    '项目部采购流程怎么走？': ['《项目部采购管理办法》第 4 条', '公司集采授权清单 2026', '合同审批单模板'],
    '绩效奖金一般怎么核算？': ['《薪酬与绩效管理制度》附件 2', '2025 年度考核结果公示', '项目节点奖发放细则']
  };
  var kgAns = doc.getElementById('kgAns');
  var kgSrc = doc.getElementById('kgSrc');
  var kgInput = doc.getElementById('kgInput');
  var kgMeta = doc.getElementById('kgMeta');
  var kgTimers = [];
  var KG_IDLE = kgAns ? kgAns.innerHTML : '';

  function kgClear() {
    kgTimers.forEach(clearTimeout);
    kgTimers = [];
  }

  function kgReset() {
    kgClear();
    if (kgAns) {
      kgAns.innerHTML = KG_IDLE;
      kgAns.classList.remove('kg-typing');
    }
    if (kgSrc) kgSrc.innerHTML = '';
    if (kgMeta) kgMeta.textContent = '';
    if (kgInput) kgInput.value = '';
  }

  function bindCites() {
    var cites = kgAns.querySelectorAll('.cite');
    var sources = kgSrc.querySelectorAll('.src');
    function pick(index) {
      cites.forEach(function (c) { c.classList.toggle('on', c.getAttribute('data-i') === String(index)); });
      sources.forEach(function (s) { s.classList.toggle('on', s.getAttribute('data-i') === String(index)); });
    }
    cites.forEach(function (cite) {
      cite.addEventListener('click', function () {
        var index = +cite.getAttribute('data-i');
        pick(index);
        if (sources[index]) sources[index].focus();
      });
    });
    sources.forEach(function (source) {
      source.addEventListener('click', function () {
        var index = +source.getAttribute('data-i');
        pick(index);
        toast('已定位正文引用 [' + (index + 1) + ']');
      });
    });
  }

  function runKG(question) {
    var q = (question || '').trim();
    if (!q) {
      if (kgInput) kgInput.focus();
      toast('先输入问题，或点上面的示例');
      return;
    }
    kgClear();
    var known = Object.prototype.hasOwnProperty.call(kgBase, q);
    var answer = known ? kgBase[q] : '示例知识库未收录该问题。真实系统会先走向量召回 + 图谱路径扩展，命中不足时返回“未找到可靠依据”，而不是编造来源。可先点上面三个示例问题看双路召回效果。';
    var sources = known ? kgSrcMap[q] : [];
    var started = (window.performance && performance.now) ? performance.now() : Date.now();

    kgAns.classList.add('kg-typing');
    kgAns.textContent = '';
    kgSrc.innerHTML = '';
    kgMeta.textContent = '向量召回中… 图谱路径扩展中…';

    var step = motion() ? 2 : Math.max(2, answer.length);

    function reveal() {
      kgAns.classList.remove('kg-typing');
      if (known) {
        var wrap = doc.createElement('span');
        wrap.className = 'kg-cite-wrap';
        wrap.innerHTML = ' <button class="cite" type="button" data-i="0">[1]</button>' +
          '<button class="cite" type="button" data-i="1">[2]</button>' +
          '<button class="cite" type="button" data-i="2">[3]</button>';
        kgAns.appendChild(wrap);
        kgSrc.innerHTML = '引用来源：' + sources.map(function (source, index) {
          return '<button class="src" type="button" data-i="' + index + '"><b>[' + (index + 1) + ']</b> ' + source + '</button>';
        }).join('');
        bindCites();
      } else {
        kgSrc.innerHTML = '<span class="src-note">没有可引用的来源 —— 这正是“不可溯源就不作答”的边界。</span>';
      }
      var ms = ((window.performance && performance.now) ? performance.now() : Date.now()) - started;
      kgMeta.textContent = known
        ? '召回 ' + (sources.length + 1) + ' 条 · 图谱 ' + sources.length + ' 跳 · 用时 ' + (ms / 1000).toFixed(2) + 's · 本地演示'
        : '未命中 · 用时 ' + (ms / 1000).toFixed(2) + 's · 本地演示';
    }

    var index = 0;
    (function tick() {
      if (index >= answer.length) { reveal(); return; }
      index = Math.min(answer.length, index + step);
      kgAns.textContent = answer.slice(0, index);
      kgTimers.push(setTimeout(tick, 16));
    })();
  }

  doc.getElementById('kgRun').addEventListener('click', function () { runKG(kgInput.value); });
  kgInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') runKG(kgInput.value); });
  doc.querySelectorAll('[data-panel="kg"] .kchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var q = chip.getAttribute('data-q');
      kgInput.value = q;
      runKG(q);
    });
  });

  /* ---------------- 3. amazon agent ---------------- */

  var amzLog = doc.getElementById('amzLog');
  var amzReport = doc.getElementById('amzReport');
  var amzInput = doc.getElementById('amzInput');
  var amzBar = doc.getElementById('amzBar');
  var amzMeta = doc.getElementById('amzMeta');
  var AMZ_META_IDLE = amzMeta ? amzMeta.textContent : '';
  var amzSkills = ['amazon-one-shot，深度调研', 'amazon-keyword-research，关键词挖掘', 'amazon-listing-optimization，Listing 优化', 'amazon-fba-calculator，FBA 费用', 'amazon-ppc-campaign，PPC 广告', 'amazon-sales-estimator，销量估算', 'tariff-calculator-amazon，关税'];
  var amzTimers = [];

  function amzClear() {
    amzTimers.forEach(clearTimeout);
    amzTimers = [];
  }

  function fnv(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function amzReset() {
    amzClear();
    amzLog.innerHTML = '';
    amzReport.style.display = 'none';
    ['amzScore', 'amzKw', 'amzFba', 'amzRisk'].forEach(function (id) {
      var el = doc.getElementById(id);
      if (el) el.textContent = '—';
    });
    if (amzBar) amzBar.style.width = '0%';
    if (amzMeta) amzMeta.textContent = AMZ_META_IDLE;
    amzInput.value = '';
  }

  function runAMZ(raw) {
    var q = (raw || '').trim();
    if (!q) {
      amzInput.focus();
      toast('先输入品类或 ASIN，或点上面的示例');
      return;
    }
    amzClear();
    amzReport.style.display = 'none';
    amzLog.innerHTML = '';
    if (amzBar) amzBar.style.width = '0%';
    var base = Date.now();

    function line(text, cls, pct) {
      var row = doc.createElement('div');
      if (cls) row.className = cls;
      row.innerHTML = '<span class="ts">[' + ((Date.now() - base) / 1000).toFixed(1) + 's]</span> ' + text;
      amzLog.appendChild(row);
      amzLog.scrollTop = amzLog.scrollHeight;
      if (amzBar && typeof pct === 'number') amzBar.style.width = pct + '%';
    }

    var seq = [['▶ 接收指令：' + q, '', 6], ['▶ 初始化 Claude Agent SDK MessageQueue', '', 12]];
    amzSkills.forEach(function (skill, index) {
      seq.push(['✓ 调度 ' + skill, 'ok', 16 + Math.round((index + 1) / amzSkills.length * 68)]);
    });
    seq.push(['✓ 已加载 ' + amzSkills.length + ' 类核心技能（技能库共 56 个），正在汇总报告', 'hl', 96]);

    function finish() {
      var seed = fnv(q);
      var score = 78 + (seed % 15);
      var keywords = ['wireless earbuds', 'noise cancelling', 'long battery', 'gift 2026'];
      var keyword = keywords.slice(0, 2 + (seed % 2)).join('，');
      var fba = '$' + (2.1 + ((seed >>> 5) % 150) / 100).toFixed(2);
      doc.getElementById('amzScore').textContent = score + ' / 100';
      doc.getElementById('amzKw').textContent = keyword;
      doc.getElementById('amzFba').textContent = fba;
      doc.getElementById('amzRisk').textContent = '类目竞争激烈，建议先做长尾词 + 差评点优化';
      amzReport.style.display = 'grid';
      if (amzBar) amzBar.style.width = '100%';
      if (amzMeta) amzMeta.textContent = '口径：评分 = 78 + (FNV-1a(“' + q + '”) mod 15)，FBA 费用 = 2.1 + 哈希片段 / 100；同一输入结果固定，不调用真实 API。';
      toast('报告已生成（确定性演示数据）');
    }

    var index = 0;
    (function step() {
      if (index >= seq.length) { finish(); return; }
      line(seq[index][0], seq[index][1], seq[index][2]);
      index++;
      amzTimers.push(setTimeout(step, motion() ? 240 : 10));
    })();
  }

  doc.getElementById('amzRun').addEventListener('click', function () { runAMZ(amzInput.value); });
  amzInput.addEventListener('keydown', function (event) { if (event.key === 'Enter') runAMZ(amzInput.value); });
  doc.querySelectorAll('[data-panel="amazon"] .kchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var q = chip.getAttribute('data-q');
      amzInput.value = q;
      runAMZ(q);
    });
  });

  /* ---------------- 4. gongkao tutor ---------------- */

  var gkPanel = doc.getElementById('gkPanel');
  var gkNext = doc.getElementById('gkNext');
  var gkRetry = doc.getElementById('gkRetry');
  var gkWhy = doc.getElementById('gkWhy');
  var gkExplain = doc.getElementById('gkExplain');
  var GK_WHY = {
    'B. 甲因疏忽大意忘记履行合同': 'B 是当事人疏忽大意，属主观过失、可归责，不满足“不能预见、不能避免、不能克服”。',
    'C. 乙因个人原因临时毁约': 'C 是个人原因主动毁约，属人为可控，不属于客观不能。',
    'D. 丙为抬高价格拒绝供货': 'D 是为抬价拒绝供货，属主观违约，同样不可归责于“客观情况”。'
  };
  var gkStep = 0;
  var gkDone = false;

  function gkFrames() {
    return Array.prototype.slice.call(gkPanel.querySelectorAll('.gk-frame'));
  }

  function gkShow(count) {
    gkFrames().forEach(function (frame, index) { frame.classList.toggle('on', index < count); });
  }

  function gkReset() {
    gkDone = false;
    gkStep = 0;
    gkPanel.classList.remove('show');
    gkFrames().forEach(function (frame) { frame.classList.remove('on'); });
    if (gkWhy) { gkWhy.hidden = true; gkWhy.textContent = ''; }
    if (gkExplain) gkExplain.classList.remove('on');
    doc.querySelectorAll('[data-panel="gongkao"] .gk-opt').forEach(function (option) {
      option.classList.remove('correct', 'wrong');
      option.removeAttribute('aria-disabled');
    });
    if (gkNext) { gkNext.disabled = true; gkNext.textContent = '下一步 ▸'; }
    if (gkRetry) gkRetry.hidden = true;
  }

  function gkAnswer(option) {
    if (gkDone) return;
    gkDone = true;
    var correct = option.getAttribute('data-correct') === '1';
    doc.querySelectorAll('[data-panel="gongkao"] .gk-opt').forEach(function (other) {
      other.setAttribute('aria-disabled', 'true');
      if (other.getAttribute('data-correct') === '1') other.classList.add('correct');
    });
    if (!correct) option.classList.add('wrong');
    gkPanel.classList.add('show');
    gkStep = 1;
    gkShow(1);
    var why = GK_WHY[option.textContent.trim()];
    if (!correct && gkWhy && why) {
      gkWhy.hidden = false;
      gkWhy.textContent = '为什么不是它：' + why;
    }
    if (gkNext) gkNext.disabled = false;
    if (gkRetry) gkRetry.hidden = false;
    toast(correct ? '答对了，点“下一步”看私教分镜' : '看看错在哪，再点“下一步”');
  }

  doc.querySelectorAll('[data-panel="gongkao"] .gk-opt').forEach(function (option) {
    option.addEventListener('click', function () { gkAnswer(option); });
  });

  if (gkNext) {
    gkNext.addEventListener('click', function () {
      var max = gkFrames().length;
      if (gkStep < max) {
        gkStep++;
        gkShow(gkStep);
        if (gkExplain) gkExplain.classList.toggle('on', gkStep === max);
        if (gkStep === max) { gkNext.disabled = true; gkNext.textContent = '已展示全部'; }
      }
    });
  }

  if (gkRetry) {
    gkRetry.addEventListener('click', function () {
      gkReset();
      var first = doc.querySelector('[data-panel="gongkao"] .gk-opt');
      if (first) first.focus();
      toast('已重置本题，可以再答一次');
    });
  }

  /* keyboard 1-4 must work before the explanation panel is revealed,
     so the listener sits on the always-visible tabpanel, not on #gkPanel. */
  var gkRoot = doc.getElementById('panel-gongkao') || gkPanel;
  gkRoot.addEventListener('keydown', function (event) {
    if (!/^[1-4]$/.test(event.key)) return;
    var options = doc.querySelectorAll('[data-panel="gongkao"] .gk-opt');
    var option = options[+event.key - 1];
    if (option) { event.preventDefault(); gkAnswer(option); }
  });

  /* ---------------- 5. style prompt ---------------- */

  var stOut = doc.getElementById('stOut');
  var stCopy = doc.getElementById('stCopy');
  var stLen = doc.getElementById('stLen');
  var ST_IDS = ['stScene', 'stStyle', 'stBody', 'stSeason'];

  function buildPrompt() {
    var scene = doc.getElementById('stScene').value;
    var style = doc.getElementById('stStyle').value;
    var body = doc.getElementById('stBody').value;
    var season = doc.getElementById('stSeason').value;
    return '为一位亚洲女生生成一组' + scene + '形象方案，整体风格：' + style + '。\n' +
      '穿搭要求：' + body + '，' + season + '。\n' +
      '画面：自然光、真实质感、全身构图、背景干净不抢主体；\n' +
      '色彩协调、细节精致，突出高级感与亲和力。';
  }

  function escapeHtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function paintPrompt() {
    var text = buildPrompt();
    var html = escapeHtml(text);
    ST_IDS.forEach(function (id) {
      var value = escapeHtml(doc.getElementById(id).value);
      if (value) html = html.replace(value, '<span class="tok">' + value + '</span>');
    });
    stOut.innerHTML = html;
    if (stLen) stLen.textContent = text.length + ' 字';
  }

  function stReset() {
    ST_IDS.forEach(function (id) { doc.getElementById(id).selectedIndex = 0; });
    stOut.classList.remove('generating');
    paintPrompt();
  }

  ST_IDS.forEach(function (id) {
    doc.getElementById(id).addEventListener('change', function () {
      if (!motion()) { paintPrompt(); return; }
      stOut.classList.add('generating');
      setTimeout(function () {
        paintPrompt();
        stOut.classList.remove('generating');
      }, 160);
    });
  });

  if (stCopy) {
    stCopy.addEventListener('click', function () {
      copyText(buildPrompt(), '提示词已复制');
      var label = stCopy.textContent;
      stCopy.textContent = '✓ 已复制';
      setTimeout(function () { stCopy.textContent = label; }, 1400);
    });
  }

  paintPrompt();

  /* ---------------- 6. corner buddy ---------------- */

  var pet = doc.getElementById('pet');
  var petStatus = doc.getElementById('petStatus');
  var petWin = pet ? pet.closest('.pet-win') : null;
  var petState = { idle: '安静待机中', pat: '被你摸头，眯眼摇尾巴', dance: '跟着节奏蹦蹦跳跳', sleep: '蜷起来睡着了' };
  var petFace = { idle: '🐱', pat: '😽', dance: '😸', sleep: '😴' };

  function setPet(action) {
    if (!pet || !petFace[action]) return;
    if (pet.getAttribute('data-mood') === action) {
      pet.style.animation = 'none';
      void pet.offsetWidth;
      pet.style.animation = '';
    }
    pet.setAttribute('data-mood', action);
    pet.textContent = petFace[action];
    if (petWin) petWin.setAttribute('data-mood', action);
    if (petStatus) petStatus.textContent = '状态：' + petState[action];
  }

  doc.querySelectorAll('[data-panel="corner"] .pet-btns button').forEach(function (button) {
    button.addEventListener('click', function () { setPet(button.getAttribute('data-a')); });
  });

  function petReset() { setPet('idle'); }

  /* ---------------- 7. destiny duel ---------------- */

  var MAX_LP = 8000;
  var lpMe = MAX_LP;
  var lpFoe = MAX_LP;
  var duelRound = 1;
  var duelOver = false;
  var duelBusy = false;
  var duelLog = doc.getElementById('duelLog');
  var lpMeEl = doc.getElementById('lpMe');
  var lpFoeEl = doc.getElementById('lpFoe');
  var lpMeNum = doc.getElementById('lpMeNum');
  var lpFoeNum = doc.getElementById('lpFoeNum');
  var duelRoundEl = doc.getElementById('duelRound');
  var duelTurnEl = doc.getElementById('duelTurn');
  var duelCard = doc.getElementById('duelCard');
  var duelBtn = doc.getElementById('duelBtn');
  var DUEL_IDLE = duelLog ? duelLog.textContent : '';

  function duelPaint() {
    if (lpMeEl) lpMeEl.style.width = (lpMe / MAX_LP * 100) + '%';
    if (lpFoeEl) lpFoeEl.style.width = (lpFoe / MAX_LP * 100) + '%';
    if (lpMeNum) lpMeNum.textContent = String(lpMe);
    if (lpFoeNum) lpFoeNum.textContent = String(lpFoe);
    if (duelRoundEl) duelRoundEl.textContent = '第 ' + duelRound + ' 回合';
    if (duelTurnEl) duelTurnEl.textContent = duelOver ? '对局结束' : '你的回合';
  }

  function duelSay(html, color) {
    var row = doc.createElement('div');
    if (color) row.style.color = color;
    row.innerHTML = html;
    duelLog.appendChild(row);
    duelLog.scrollTop = duelLog.scrollHeight;
  }

  if (duelBtn) {
    duelBtn.addEventListener('click', function () {
      if (duelOver || duelBusy) return;
      duelBusy = true;
      var damage = 700 + Math.floor(Math.random() * 700);
      lpFoe = Math.max(0, lpFoe - damage);
      if (duelCard) {
        duelCard.setAttribute('data-face', 'front');
        duelCard.classList.remove('is-attack');
        void duelCard.offsetWidth;
        if (motion()) duelCard.classList.add('is-attack');
      }
      duelSay('⚔️ 你召唤青眼白龙攻击，造成 ' + damage + ' 伤害！');
      duelPaint();
      if (lpFoe <= 0) {
        duelSay('🏆 你击败了脚本 AI，获胜！', 'var(--green-9)');
        duelOver = true;
        duelBusy = false;
        duelPaint();
        return;
      }
      setTimeout(function () {
        var counter = 600 + Math.floor(Math.random() * 600);
        lpMe = Math.max(0, lpMe - counter);
        duelSay('🤖 AI 反击，对你造成 ' + counter + ' 伤害。');
        duelPaint();
        if (lpMe <= 0) {
          duelSay('💀 你被 AI 击败，再试一次？', 'var(--red-9)');
          duelOver = true;
        } else {
          duelRound++;
          duelPaint();
        }
        duelBusy = false;
      }, 520);
    });
  }

  function duelReset() {
    lpMe = MAX_LP;
    lpFoe = MAX_LP;
    duelRound = 1;
    duelOver = false;
    duelBusy = false;
    if (duelLog) duelLog.textContent = DUEL_IDLE;
    if (duelCard) {
      duelCard.setAttribute('data-face', 'back');
      duelCard.classList.remove('is-attack');
    }
    duelPaint();
  }

  (function () {
    var reset = doc.getElementById('duelReset');
    if (reset) reset.addEventListener('click', function () { duelReset(); toast('已重开一局'); });
  })();

  /* ---------------- 8. video notes ---------------- */

  var vidNotes = doc.getElementById('vidNotes');
  var vidInput = doc.getElementById('vidInput');
  var vidRun = doc.getElementById('vidRun');
  var vidBar = doc.getElementById('vidBar');
  var vidClock = doc.getElementById('vidClock');
  var vidCopyAll = doc.getElementById('vidCopyAll');
  var VID_IDLE = vidNotes ? vidNotes.innerHTML : '';
  var vidTimers = [];
  var demoNotes = [
    { ts: '00:30', nt: '本节介绍项目背景与目标', ns: '字幕原文：今天我们来看这个开源项目的整体架构' },
    { ts: '01:05', nt: '核心模块一：状态管理如何组织', ns: '字幕原文：这里用 reducer 把对战状态收口' },
    { ts: '01:48', nt: '核心模块二：脚本 AI 的决策逻辑', ns: '字幕原文：AI 会在每回合评估手牌优劣' },
    { ts: '02:33', nt: '小结与可复用思路', ns: '字幕原文：关键是把规则做成可测试的数据' }
  ];

  function seconds(ts) {
    var parts = ts.split(':');
    return (+parts[0]) * 60 + (+parts[1]);
  }

  function vidClear() {
    vidTimers.forEach(clearTimeout);
    vidTimers = [];
  }

  function vidReset() {
    vidClear();
    if (vidNotes) vidNotes.innerHTML = VID_IDLE;
    if (vidBar) vidBar.style.width = '0%';
    if (vidClock) vidClock.textContent = '00:00 / 03:10';
    if (vidCopyAll) vidCopyAll.hidden = true;
    if (vidInput) vidInput.value = vidInput.defaultValue;
  }

  if (vidRun) {
    vidRun.addEventListener('click', function () {
      var raw = (vidInput.value || '').trim();
      if (!/BV[0-9A-Za-z]{10}/.test(raw) && !/^https?:\/\/\S+$/.test(raw)) {
        toast('链接格式不对：需要包含 BV 号或完整视频地址');
        vidInput.focus();
        vidInput.classList.add('shake');
        setTimeout(function () { vidInput.classList.remove('shake'); }, 420);
        return;
      }
      vidClear();
      vidNotes.innerHTML = '';
      if (vidBar) vidBar.style.width = '0%';
      if (vidCopyAll) vidCopyAll.hidden = true;
      var index = 0;
      (function add() {
        if (index >= demoNotes.length) {
          if (vidCopyAll) vidCopyAll.hidden = false;
          toast('4 条笔记已按播放进度生成');
          return;
        }
        var note = demoNotes[index];
        var li = doc.createElement('li');
        li.className = 'note';
        li.innerHTML = '<span class="ts">' + note.ts + '</span><div class="nt">' + note.nt + '<span class="ns">' + note.ns + '</span></div>';
        vidNotes.appendChild(li);
        if (vidBar) vidBar.style.width = Math.min(100, seconds(note.ts) / 190 * 100) + '%';
        if (vidClock) vidClock.textContent = note.ts + ' / 03:10';
        index++;
        vidTimers.push(setTimeout(add, motion() ? 620 : 10));
      })();
    });
  }

  if (vidCopyAll) {
    vidCopyAll.addEventListener('click', function () {
      var text = demoNotes.map(function (note) {
        return '[' + note.ts + '] ' + note.nt + '\n' + note.ns;
      }).join('\n\n');
      copyText(text, '全部笔记已复制');
    });
  }

  /* ---------------- resets ---------------- */

  var RESET = {
    workbench: wbReset,
    kg: kgReset,
    amazon: amzReset,
    gongkao: gkReset,
    style: stReset,
    corner: petReset,
    duel: duelReset,
    video: vidReset
  };

  doc.querySelectorAll('.panel-reset').forEach(function (button) {
    button.addEventListener('click', function () {
      var fn = RESET[button.getAttribute('data-reset')];
      if (fn) { fn(); toast('已重置本演示'); }
    });
  });

  window.__playground = { activate: activate, reset: function (name) { if (RESET[name]) RESET[name](); } };
})();
