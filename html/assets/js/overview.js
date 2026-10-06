/* 국가숲길 - 통합형 지도 (숲길 hover 시 개별형 지도 미리보기) */
(function () {
  'use strict';
  var F = window.FOREST;
  var O = F.overview;
  F.header({});

  var totalKm = F.trails.reduce(function (a, t) { return a + t.km; }, 0);
  var totalSec = F.trails.reduce(function (a, t) { return a + t.sections; }, 0);

  var main = document.getElementById('main');
  main.innerHTML =
    '<div class="overview">' +
    '  <div class="map-col"><div class="map-shell"><div class="map-stage" tabindex="-1"><div class="map-loading">지도를 불러오는 중…</div></div></div></div>' +
    '  <aside class="side">' +
    '    <div class="side-intro">' +
    '      <h1>국가숲길 노선도</h1>' +
    '      <p>지도에서 숲길에 마우스를 올리면 상세 노선도를 미리 볼 수 있고, 클릭하면 구간별 정보를 확인할 수 있습니다.</p>' +
    '      <div class="stats">' +
    '        <div class="stat"><b>' + totalKm.toLocaleString() + 'km</b><span>총 거리</span></div>' +
    '        <div class="stat"><b>' + F.trails.length + '개</b><span>숲길</span></div>' +
    '        <div class="stat"><b>' + totalSec + '개</b><span>구간</span></div>' +
    '      </div>' +
    '    </div>' +
    '    <nav class="trail-list" aria-label="숲길 목록"></nav>' +
    '  </aside>' +
    '</div>';

  var W = O.size[0], H = O.size[1];
  var stage = main.querySelector('.map-stage');
  var loading = stage.querySelector('.map-loading');
  var canvas = F.el('div', { class: 'map-canvas' });
  var base = F.el('img', { alt: '국가숲길 통합 노선도', draggable: 'false', decoding: 'async' });
  var overlays = F.el('div', { class: 'overlays', style: 'position:absolute;inset:0' });
  var hits = F.svg('svg', { class: 'hits', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
  // 지도 제목 (지도와 함께 확대/축소)
  var title = F.el('div', { class: 'ov-title', 'aria-hidden': 'true' },
    '<span class="ov-km">' + totalKm.toLocaleString() + '<small>km</small></span>' +
    '<span class="ov-sub">' + F.trails.length + '개 숲길로 이루어진</span>' +
    '<span class="ov-name">국가숲길</span>');
  // 숲길 선을 벡터로 한 번 더 그림: 원본 선(0.7~1pt)이 화면에서 1px 미만이라 흐리게 보이는 문제 보완
  var lines = F.svg('svg', { class: 'ov-lines', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
  canvas.appendChild(base); canvas.appendChild(title); canvas.appendChild(lines); canvas.appendChild(overlays); canvas.appendChild(hits);
  stage.insertBefore(canvas, loading);

  var loads = [F.loadImg(base, O.base)];
  var items = O.trails.map(function (t) {
    var img = F.el('img', { alt: '', draggable: 'false', style:
      'left:' + (t.overlay.x / W * 100) + '%;top:' + (t.overlay.y / H * 100) + '%;width:' + (t.overlay.w / W * 100) + '%;height:' + (t.overlay.h / H * 100) + '%;--c:' + t.color });
    overlays.appendChild(img);
    var line = F.svg('path', { d: t.d, stroke: t.color });
    lines.appendChild(line);
    loads.push(F.loadImg(img, t.overlay.src));
    var g = F.svg('g', { 'data-id': t.id, role: 'link', 'aria-label': t.name + ' 상세 지도 보기', style: '--c:' + t.color });
    var path = F.svg('path', { d: t.d + (t.leader || '') });
    g.appendChild(path);
    t.marker.forEach(function (m) { g.appendChild(F.svg('circle', { cx: m.cx, cy: m.cy, r: m.r + 2 })); });
    var box = null;
    if (t.label) {
      box = F.svg('rect', { class: 'label-box', x: t.label.x, y: t.label.y, width: t.label.w, height: t.label.h, rx: 6 });
      g.appendChild(box);
    }
    hits.appendChild(g);
    return { t: t, img: img, line: line, g: g, path: path, box: box, meta: F.trailBySlug(t.slug) };
  });
  Promise.all(loads).then(function () { loading.classList.add('done'); });

  // 미리보기 이미지 미리 받아두기
  setTimeout(function () { items.forEach(function (x) { (new Image()).src = x.t.preview; }); }, 1200);

  var active = null, pinned = null, cards = {};
  var curLw = 1.6;  // 현재 숲길 선 굵기 (확대 비율에 따라 바뀜)
  var updateTools;
  var popup = new F.Popup('preview');
  var pz = new F.PanZoom(stage, canvas, {
    max: 4,
    aspect: W / H,
    onChange: function (pz) {
      var z = pz.pxPer(W);
      // 화면에서 약 1.8px 이상, 확대해도 원본보다 가늘어지지 않게
      var lw = Math.max(0.9, 1.8 / z);
      items.forEach(function (x) { x.path.style.strokeWidth = (18 / z) + 'px'; x.line.style.strokeWidth = (x.t.id === active ? lw * 1.7 : lw) + 'px'; });
      curLw = lw;
      if (updateTools) updateTools();
      popup.reposition();
    },
    onWheelHint: function () { F.toast(stage, 'Ctrl + 스크롤로 지도를 확대/축소할 수 있습니다'); }
  });
  updateTools = F.mapTools(stage, pz);

  function setActive(id) {
    active = id;
    stage.classList.toggle('has-active', id != null);
    items.forEach(function (x) {
      var on = x.t.id === id;
      x.img.classList.toggle('is-active', on);
      x.line.classList.toggle('is-active', on);
      x.line.style.strokeWidth = (on ? curLw * 1.7 : curLw) + 'px';
      if (x.box) x.box.classList.toggle('is-active', on);
      if (cards[x.t.id]) cards[x.t.id].classList.toggle('is-active', on);
    });
  }
  function html(x, pinnedMode) {
    var t = x.t;
    return '<div class="popup-photo"><img src="' + t.preview + '" alt="' + F.esc(t.name) + ' 개별 노선도"></div>' +
      '<div class="popup-body">' +
      '<h3 class="popup-title"><span class="num" style="background:' + t.color + '">' + t.id + '</span><span style="color:' + F.textColor(t.color) + '">' + F.esc(t.name) + '</span></h3>' +
      '<p class="popup-km">' + t.km + 'km · ' + t.sections + '개 구간</p>' +
      '<div class="go">' + F.icon.pointer + '클릭하면 상세 노선도로 이동합니다</div>' +
      (pinnedMode ? '<a class="btn btn-primary popup-cta" href="map.html?trail=' + t.slug + '">상세 노선도 보기 ' + F.icon.arrow + '</a>' : '') +
      '</div><button type="button" class="popup-close" aria-label="닫기">' + F.icon.close + '</button>';
  }
  function itemOf(el) {
    var g = el.closest && el.closest('g[data-id]');
    if (!g) return null;
    var id = +g.getAttribute('data-id');
    return items.filter(function (x) { return x.t.id === id; })[0];
  }
  function clear() { pinned = null; setActive(null); popup.hide(); }
  popup.onClose = clear;

  hits.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse' || pinned != null) return;
    var x = itemOf(e.target);
    if (!x) return;
    cancelLeave();
    if (active !== x.t.id) {
      setActive(x.t.id);
      popup.set(html(x, false));
    }
    popup.show({ x: e.clientX, y: e.clientY });
  });
  hits.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || pinned != null) return;
    if (itemOf(e.target) && popup.isOpen()) popup.place(e.clientX, e.clientY);
  });
  hits.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse' || pinned != null) return;
    var to = e.relatedTarget;
    if (to && itemOf(to)) return;
    // 선이 가늘어 잠깐 벗어나도 깜빡이지 않도록 약간 늦게 해제
    leaveSoon();
  });
  var leaveTimer = null;
  function cancelLeave() { clearTimeout(leaveTimer); leaveTimer = null; }
  function leaveSoon() {
    cancelLeave();
    leaveTimer = setTimeout(function () {
      leaveTimer = null;
      if (pinned != null) return;
      setActive(null);
      popup.hide();
    }, 220);
  }
  hits.addEventListener('click', function (e) {
    var x = itemOf(e.target);
    if (!x) return;
    e.stopPropagation();
    // 마우스: 바로 상세 지도로 이동 / 터치: 먼저 미리보기 표시
    if (e.pointerType === 'mouse' || (F.canHover() && !e.pointerType)) {
      location.href = 'map.html?trail=' + x.t.slug;
      return;
    }
    if (pinned === x.t.id) { location.href = 'map.html?trail=' + x.t.slug; return; }
    pinned = x.t.id;
    setActive(x.t.id);
    popup.set(html(x, true));
    var sheet = F.isSheet();
    var r = stage.getBoundingClientRect();
    var f = pz.toFrac(e.clientX, e.clientY);
    popup.show({ pinned: true, sheet: sheet, x: e.clientX, y: e.clientY,
      anchor: sheet ? null : function () { return pz.toClient(f.fx, f.fy); } });
  });
  stage.addEventListener('click', function (e) {
    if (e.target.closest('.map-tools')) return;
    if (pinned != null) clear();
  });
  document.addEventListener('click', function (e) {
    if (pinned == null) return;
    if (e.target.closest('.popup') || e.target.closest('.map-stage')) return;
    clear();
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') clear(); });
  window.addEventListener('scroll', function () { popup.reposition(); }, { passive: true });

  /* ---------- 숲길 카드 */
  var list = main.querySelector('.trail-list');
  F.trails.forEach(function (m) {
    var color = F.trailColor(m.id);
    var a = F.el('a', { class: 'trail-card', href: 'map.html?trail=' + m.slug, style: '--c:' + color },
      '<span class="thumb"><img src="' + m.preview + '" alt="" loading="lazy"></span>' +
      '<span><span class="t"><span class="num">' + m.id + '</span>' + F.esc(m.name) + '</span>' +
      '<span class="m" style="display:block">' + m.km + 'km · ' + m.sections + '개 구간</span></span>' +
      '<span class="arrow">' + F.icon.arrow + '</span>');
    a.addEventListener('mouseenter', function () { if (pinned == null) { cancelLeave(); setActive(m.id); } });
    a.addEventListener('mouseleave', function () { if (pinned == null) leaveSoon(); });
    a.addEventListener('focus', function () { if (pinned == null) setActive(m.id); });
    a.addEventListener('blur', function () { if (pinned == null) setActive(null); });
    cards[m.id] = a;
    list.appendChild(a);
  });

  pz.apply(false);
})();
