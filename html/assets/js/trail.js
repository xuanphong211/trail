/* 국가숲길 - 개별형 지도 (노선 hover 설명창 + 하이라이트) */
(function () {
  'use strict';
  var F = window.FOREST;
  var params = new URLSearchParams(location.search);
  var key = params.get('trail');
  var meta = key ? F.trailBySlug(key) : F.trails[0];
  if (!meta) {
    // 잘못된 주소: 다른 숲길을 몰래 보여주지 않고 안내
    F.header({});
    document.getElementById('main').innerHTML =
      '<div class="notfound"><h1>숲길을 찾을 수 없습니다</h1><p>주소의 <b>trail=' + F.esc(key) + '</b> 값을 확인해 주세요.</p>' +
      '<div class="nf-list">' + F.trails.map(function (t) {
        return '<a class="btn" href="map.html?trail=' + t.slug + '">' + t.id + '. ' + F.esc(t.name) + '</a>';
      }).join('') + '</div></div>';
    return;
  }

  F.header({ current: meta.slug });
  document.title = meta.name + ' | 국가숲길';

  var main = document.getElementById('main');
  main.innerHTML =
    '<div class="trail-wrap">' +
    '<div class="trail-head">' +
    '  <div class="trail-title"><h1>' + F.esc(meta.name) + '<small>' + meta.km + 'km</small></h1></div>' +
    '  <div class="trail-meta">' +
    '    <span class="chip">' + F.icon.route + meta.sections + '개 구간</span>' +
    '    <span class="hint desktop">' + F.icon.pointer + '노선에 마우스를 올리면 정보가 표시됩니다 · Ctrl + 스크롤로 확대</span>' +
    '    <span class="hint touch">' + F.icon.hand + '노선을 누르면 정보가 표시됩니다 · 두 손가락으로 확대 · 좌우로 밀어서 이동</span>' +
    '  </div>' +
    '</div>' +
    '<div class="map-shell"><div class="map-stage" tabindex="-1"><div class="map-loading">지도를 불러오는 중…</div></div></div>' +
    '<section class="section-block" aria-labelledby="sec-h">' +
    '  <div class="section-block-head"><h2 id="sec-h">구간 안내</h2><p>구간을 선택하면 지도에서 위치를 보여줍니다.</p></div>' +
    '  <div class="sec-list"></div>' +
    '</section>' +
    '</div>';

  F.loadScript('assets/data/trail-' + meta.slug + '.js' + (F.v ? '?v=' + F.v : '')).then(function () {
    init(F.detail[meta.slug]);
  }).catch(function (err) {
    main.querySelector('.map-loading').textContent = '지도 데이터를 불러오지 못했습니다.';
    console.error(err);
  });

  // 모든 숲길 · 모든 구간의 노선 굵기를 통일 (원본 AI 파일마다 1.2~2.5pt 로 제각각)
  var LINE_W = 2.4;

  function init(D) {
    var W = D.size[0], H = D.size[1];
    var wrap = main.querySelector('.trail-wrap');
    var stage = main.querySelector('.map-stage');
    var loading = stage.querySelector('.map-loading');
    // 화면 높이에 맞춰 지도 전체가 보이도록 (모바일은 지도를 크게: 영역을 높이고 좌우 이동)
    function fit() {
      if (F.isSheet()) {
        stage.style.aspectRatio = 'auto';
        stage.style.height = Math.round(Math.min(window.innerHeight * 0.62, window.innerWidth * 1.25)) + 'px';
        wrap.style.maxWidth = '';
        return;
      }
      stage.style.aspectRatio = W + ' / ' + H;
      stage.style.height = '';
      var top = stage.getBoundingClientRect().top + window.scrollY;
      var avail = window.innerHeight - Math.min(top, 200) - 24;
      // 제목 · 지도 · 구간 목록을 같은 폭으로 맞춰 가운데 정렬
      wrap.style.maxWidth = Math.max(720, avail * W / H) + 'px';
    }
    fit();
    window.addEventListener('resize', fit);

    var canvas = F.el('div', { class: 'map-canvas' });
    var base = F.el('img', { alt: D.name + ' 지도', draggable: 'false', decoding: 'async' });
    var labels = F.el('img', { class: 'labels-img', alt: '', draggable: 'false', decoding: 'async' });
    // 평상시 노선 = 디자인 원본 그대로의 이미지, 강조할 때만 SVG 선을 위에 그림
    var routesImg = F.el('img', { class: 'routes-img', alt: '', draggable: 'false', decoding: 'async' });
    var routes = F.svg('svg', { class: 'routes', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    var hits = F.svg('svg', { class: 'hits', viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'none' });
    canvas.appendChild(base);
    // 지도 제목 (원본 위치·크기, 지도와 함께 확대/축소)
    if (D.title) {
      var tc = F.trailColor(D.id);
      canvas.appendChild(F.el('div', { class: 'map-title', 'aria-hidden': 'true',
        style: 'left:' + (D.title.x / W * 100) + '%;top:' + (D.title.y / H * 100) + '%;' +
          '--fs:' + (D.title.size / W * 100) + 'cqw;--ks:' + (D.title.kmSize / W * 100) + 'cqw;--c:' + F.textColor(tc) },
        '<span class="mt-name">' + F.esc(D.name) + '</span><span class="mt-km">' + D.km + '<small>km</small></span>'));
    }
    canvas.appendChild(routesImg); canvas.appendChild(routes); canvas.appendChild(labels); canvas.appendChild(hits);
    stage.insertBefore(canvas, loading);

    Promise.all([F.loadImg(base, D.base), F.loadImg(labels, D.labels), F.loadImg(routesImg, D.routes)]).then(function () {
      loading.classList.add('done');
    });

    /* ---------- routes */
    var gExtra = F.svg('g'), gSec = F.svg('g');
    routes.appendChild(gExtra); routes.appendChild(gSec);
    D.extras.forEach(function (x) {
      // 노선과 같은 굵은 선은 통일된 굵기로, 얇은 연결선(점선 등)은 원본 굵기 유지
      var p = F.svg('path', { class: 'extra', d: x.d, stroke: x.color, 'stroke-width': x.width >= 1.5 ? LINE_W : x.width });
      if (x.dash) {
        var m = /\[([^\]]*)\]/.exec(x.dash);
        if (m && m[1].trim()) p.setAttribute('stroke-dasharray', m[1].trim().split(/\s+/).join(' '));
      }
      gExtra.appendChild(p);
    });
    var secs = D.sections.map(function (s, i) {
      var g = F.svg('g', { class: 'sec', 'data-i': i });
      var casing = F.svg('path', { class: 'casing', d: s.d });
      var line = F.svg('path', { class: 'line', d: s.d, stroke: s.color });
      casing.style.strokeWidth = (LINE_W + 2.4) + 'px';
      line.style.strokeWidth = LINE_W + 'px';
      g.appendChild(casing); g.appendChild(line);
      gSec.appendChild(g);
      var hit = F.svg('path', { d: s.d, 'data-i': i, role: 'button', 'aria-label': s.label + '. ' + s.name + ' ' + s.km + 'km' });
      hits.appendChild(hit);
      return { data: s, g: g, line: line, casing: casing, hit: hit, text: F.textColor(s.color) };
    });
    var groups = {};
    (D.groups || []).forEach(function (g) { groups[g.key] = g; });

    /* ---------- legend hotspots (지도 안 범례) */
    var legendRows = (D.legend || []).map(function (r) {
      var rect = F.svg('rect', { class: 'legend-row', x: r.x, y: r.y, width: r.w, height: r.h, rx: 4,
        role: 'button', 'aria-label': (r.title || '') + ' 범례' });
      hits.appendChild(rect);
      return { data: r, el: rect };
    });

    /* ---------- pan / zoom */
    var updateTools;
    // 처음 화면에서 노선 전체의 가운데가 보이도록
    var routeBox = gSec.getBBox();
    var pz = new F.PanZoom(stage, canvas, {
      max: 4,
      aspect: W / H,
      cover: function () { return F.isSheet(); },
      focus: function () {
        return routeBox.width ? { fx: (routeBox.x + routeBox.width / 2) / W, fy: (routeBox.y + routeBox.height / 2) / H } : { fx: .5, fy: .5 };
      },
      onChange: function (pz) {
        var z = pz.pxPer(W);                                // 화면 px / 지도 단위
        hits.querySelectorAll('path').forEach(function (p) { p.style.strokeWidth = (16 / z) + 'px'; });
        if (updateTools) updateTools();
        if (popup) popup.reposition();
      },
      onWheelHint: function () { F.toast(stage, 'Ctrl + 스크롤로 지도를 확대/축소할 수 있습니다'); }
    });
    updateTools = F.mapTools(stage, pz);

    /* ---------- popup */
    var popup = new F.Popup();
    popup.onClose = function () { clear(); };
    var activeSet = [], pinnedKey = null, cards = [];

    function km(v) { return v ? v + 'km' : ''; }
    function sectionHtml(s, txt, photoIndex) {
      var ph = s.photos || [], pi = photoIndex || 0;
      var photo;
      if (ph.length) {
        photo = '<div class="popup-photo"><img src="' + ph[pi].src + '" alt="' + F.esc(ph[pi].caption) + '">' +
          '<span class="badge" style="background:' + s.color + '">' + F.esc(s.label) + '</span>' +
          (ph.length > 1 ? '<span class="count">사진 ' + ph.length + '장</span>' : '') + '</div>';
      } else {
        photo = '<div class="popup-photo placeholder">' +
          '<span class="badge" style="background:' + s.color + '">' + F.esc(s.label) + '</span>' +
          '<span class="ph">' + F.icon.image + '이미지 없음</span></div>';
      }
      var centers = (s.centers || []).map(function (c) {
        var phone = c.phone ? '<br>(' + (popup.pinned ? '<a href="tel:' + c.phone.replace(/-/g, '') + '">' + c.phone + '</a>' : c.phone) + ')' : '';
        return '<div class="center">' + F.esc(c.name) + phone + '</div>';
      }).join('');
      var res = s.resources && s.resources.length ? '<div class="res">대표 자원: ' + F.esc(s.resources.join(', ')) + '</div>' : '';
      var gallery = ph.length > 1 ? '<div class="popup-gallery">' + ph.map(function (p, k) {
        return '<button type="button" data-k="' + k + '" aria-pressed="' + (k === pi) + '" aria-label="' + F.esc(p.caption) + '"><img src="' + p.src + '" alt=""></button>';
      }).join('') + '</div>' : '';
      return photo +
        '<div class="popup-body" style="--popup-color:' + s.color + '">' +
        '<h3 class="popup-title" style="color:' + txt + '">' + F.esc(s.name) + '</h3>' +
        '<p class="popup-km" style="color:' + txt + '">' + km(s.km) + '</p>' +
        '<div class="popup-info">' + centers + res + '</div>' + gallery +
        '</div><button type="button" class="popup-close" aria-label="닫기">' + F.icon.close + '</button>';
    }
    function groupHtml(r) {
      var list = secs.filter(function (x) { return r.sections.indexOf(x.data.no) >= 0; });
      var first = list[0].data, total = 0;
      list.forEach(function (x) { total += parseFloat(x.data.km) || 0; });
      var withPhoto = list.filter(function (x) { return x.data.photos && x.data.photos.length; })[0];
      var color = first.color, txt = F.textColor(color);
      var photo = withPhoto
        ? '<div class="popup-photo"><img src="' + withPhoto.data.photos[0].src + '" alt=""></div>'
        : '<div class="popup-photo placeholder"><span class="ph">' + F.icon.image + '이미지 없음</span></div>';
      return photo + '<div class="popup-body"><h3 class="popup-title" style="color:' + txt + '">' + F.esc(r.title || '') + '</h3>' +
        '<p class="popup-km" style="color:' + txt + '">' + list.length + '개 코스 · ' + (Math.round(total * 10) / 10) + 'km</p>' +
        '<div class="popup-info">' + list.map(function (x) { return '<span style="white-space:nowrap">' + F.esc(x.data.label + '코스') + '</span>'; }).join(' · ') + '</div></div>' +
        '<button type="button" class="popup-close" aria-label="닫기">' + F.icon.close + '</button>';
    }

    /* ---------- highlight */
    function setActive(idxs) {
      activeSet.forEach(function (i) {
        var x = secs[i];
        x.g.classList.remove('is-active');
        x.line.style.strokeWidth = LINE_W + 'px';
        x.casing.style.strokeWidth = (LINE_W + 2.4) + 'px';
      });
      activeSet = idxs.slice();
      stage.classList.toggle('has-active', idxs.length > 0);
      idxs.forEach(function (i) {
        var x = secs[i];
        x.g.classList.add('is-active');
        x.line.style.strokeWidth = (LINE_W * 1.9) + 'px';
        x.casing.style.strokeWidth = (LINE_W * 1.9 + 2.6) + 'px';
        gSec.appendChild(x.g); // 맨 위로
      });
      var nos = idxs.map(function (i) { return secs[i].data.no; });
      legendRows.forEach(function (r) {
        r.el.classList.toggle('is-active', nos.length > 0 && r.data.sections.some(function (n) { return nos.indexOf(n) >= 0; }));
      });
      cards.forEach(function (c, i) { c.classList.toggle('is-active', idxs.indexOf(i) >= 0); });
    }
    function idxOfNos(nos) {
      var out = [];
      secs.forEach(function (x, i) { if (nos.indexOf(x.data.no) >= 0) out.push(i); });
      return out;
    }
    function clear() {
      pinnedKey = null;
      setActive([]);
      popup.hide();
    }
    // 섹션 경로 위 기준점 (지도 비율 좌표)
    function anchorOf(i) {
      var p = secs[i].line, len = p.getTotalLength ? p.getTotalLength() : 0;
      var pt = len ? p.getPointAtLength(len / 2) : { x: W / 2, y: H / 2 };
      return { fx: pt.x / W, fy: pt.y / H };
    }
    function clientToFrac(x, y) {
      return pz.toFrac(x, y);
    }
    function anchorFn(f) { return function () { return pz.toClient(f.fx, f.fy); }; }

    function showSection(i, opts) {
      var x = secs[i];
      popup.el.className = 'popup';
      popup.pinned = !!opts.pinned;
      popup.set(sectionHtml(x.data, x.text, 0));
      popup.show(opts);
    }
    function showGroup(r, opts) {
      popup.el.className = 'popup';
      popup.pinned = !!opts.pinned;
      popup.set(groupHtml(r));
      popup.show(opts);
    }

    // 갤러리 썸네일
    popup.el.addEventListener('click', function (e) {
      var b = e.target.closest('.popup-gallery button');
      if (!b || pinnedKey == null || typeof pinnedKey !== 'number') return;
      var x = secs[pinnedKey], k = +b.getAttribute('data-k');
      var img = popup.el.querySelector('.popup-photo img');
      img.src = x.data.photos[k].src;
      img.alt = x.data.photos[k].caption;
      popup.el.querySelectorAll('.popup-gallery button').forEach(function (bb) {
        bb.setAttribute('aria-pressed', bb === b ? 'true' : 'false');
      });
    });

    function pinSection(i, clientPt) {
      pinnedKey = i;
      setActive([i]);
      var f = clientPt ? clientToFrac(clientPt.x, clientPt.y) : anchorOf(i);
      var sheet = F.isSheet();
      var p = pz.toClient(f.fx, f.fy);
      showSection(i, { pinned: true, sheet: sheet, x: p.x, y: p.y, anchor: sheet ? null : anchorFn(f) });
    }
    // 범례 옆 팝업 위치: 가로는 범례 전체의 오른쪽(다른 줄 글자를 가리지 않게), 세로는 해당 줄
    function legendRect(el) {
      var b = el.getBoundingClientRect(), right = b.right;
      legendRows.forEach(function (q) { right = Math.max(right, q.el.getBoundingClientRect().right); });
      if (D.legendBox) right = Math.max(right, pz.toClient(D.legendBox[2] / W, 0).x);   // 범례 흰 상자 오른쪽 끝
      var t = canvas.querySelector('.map-title'), minTop = null;
      if (t && getComputedStyle(t).display !== 'none') minTop = t.getBoundingClientRect().bottom + 8;  // 지도 제목 아래로
      return { left: b.left, right: right, top: b.top, bottom: b.bottom, width: right - b.left, height: b.height, minTop: minTop };
    }
    function pinGroup(r) {
      pinnedKey = 'g' + legendRows.indexOf(r);
      setActive(idxOfNos(r.data.sections));
      var rc = legendRect(r.el);
      if (r.data.sections.length === 1) {
        var i = idxOfNos(r.data.sections)[0];
        pinnedKey = i;
        showSection(i, { pinned: true, sheet: F.isSheet(), rect: rc, anchor: function () { var b = legendRect(r.el); return { x: b.right - 6, y: b.top }; } });
      } else {
        showGroup(r.data, { pinned: true, sheet: F.isSheet(), rect: rc });
      }
    }

    /* ---------- events: map routes */
    // 선이 가늘어 마우스가 잠깐 벗어나도 깜빡이지 않도록 해제를 약간 늦춘다
    var hoverKey = null, leaveTimer = null;
    function cancelLeave() { clearTimeout(leaveTimer); leaveTimer = null; }
    function leaveSoon() {
      cancelLeave();
      leaveTimer = setTimeout(function () {
        leaveTimer = null;
        if (pinnedKey != null) return;
        hoverKey = null;
        setActive([]);
        popup.hide();
      }, 220);
    }
    hits.addEventListener('pointerover', function (e) {
      if (e.pointerType !== 'mouse' || pinnedKey != null || pz.pointers && Object.keys(pz.pointers).length) return;
      var t = e.target, key;
      if (t.tagName === 'path') {
        cancelLeave();
        var i = +t.getAttribute('data-i');
        key = 's' + i;
        if (hoverKey === key && popup.isOpen()) return; // 같은 노선 재진입: 다시 그리지 않음
        hoverKey = key;
        setActive([i]);
        showSection(i, { x: e.clientX, y: e.clientY });
      } else if (t.classList.contains('legend-row')) {
        cancelLeave();
        var r = legendRows.filter(function (q) { return q.el === t; })[0];
        key = 'l' + legendRows.indexOf(r);
        if (hoverKey === key && popup.isOpen()) return;
        hoverKey = key;
        setActive(idxOfNos(r.data.sections));
        if (r.data.sections.length === 1) showSection(idxOfNos(r.data.sections)[0], { rect: legendRect(t) });
        else showGroup(r.data, { rect: legendRect(t) });
      }
    });
    hits.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse' || pinnedKey != null) return;
      if (e.target.tagName === 'path' && popup.isOpen()) popup.place(e.clientX, e.clientY);
    });
    hits.addEventListener('pointerout', function (e) {
      if (e.pointerType !== 'mouse' || pinnedKey != null) return;
      var to = e.relatedTarget;
      if (to && to.closest && to.closest('.hits') && (to.tagName === 'path' || to.classList.contains('legend-row'))) return;
      leaveSoon();
    });
    hits.addEventListener('click', function (e) {
      var t = e.target;
      if (t.tagName === 'path') {
        e.stopPropagation();
        var i = +t.getAttribute('data-i');
        if (pinnedKey === i) { clear(); return; }
        pinSection(i, { x: e.clientX, y: e.clientY });
      } else if (t.classList.contains('legend-row')) {
        e.stopPropagation();
        var r = legendRows.filter(function (q) { return q.el === t; })[0];
        pinGroup(r);
      }
    });
    stage.addEventListener('click', function (e) {
      if (e.target.closest('.map-tools')) return;
      if (pinnedKey != null) clear();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') clear(); });
    document.addEventListener('click', function (e) {
      if (pinnedKey == null) return;
      if (e.target.closest('.popup') || e.target.closest('.map-stage') || e.target.closest('.sec-card')) return;
      clear();
    });
    window.addEventListener('scroll', function () { popup.reposition(); }, { passive: true });
    window.addEventListener('resize', function () { popup.reposition(); });

    /* ---------- section list */
    var listEl = main.querySelector('.sec-list');
    function card(x, i) {
      var s = x.data;
      var c = F.el('button', { type: 'button', class: 'sec-card', style: '--c:' + s.color },
        '<span class="num">' + F.esc(s.label) + '</span>' +
        '<span class="name">' + F.esc(s.name) + '</span>' +
        '<span class="meta"><span><b>' + km(s.km) + '</b></span>' +
        (s.centers[0] ? '<span>' + F.esc(s.centers[0].name) + '</span>' : '') +
        (s.resources[0] ? '<span>' + F.esc(s.resources.slice(0, 2).join(', ')) + (s.resources.length > 2 ? ' 외' : '') + '</span>' : '') +
        '</span>');
      c.addEventListener('mouseenter', function () { if (pinnedKey == null) { cancelLeave(); hoverKey = null; popup.hide(); setActive([i]); } });
      c.addEventListener('mouseleave', function () { if (pinnedKey == null) leaveSoon(); });
      c.addEventListener('focus', function () { if (pinnedKey == null) setActive([i]); });
      c.addEventListener('blur', function () { if (pinnedKey == null) setActive([]); });
      c.addEventListener('click', function (e) {
        e.stopPropagation();
        var r = stage.getBoundingClientRect();
        var visible = r.top >= 0 && r.bottom <= window.innerHeight;
        if (!visible) {
          window.scrollTo({ top: window.scrollY + r.top - 80, behavior: 'smooth' });
          setTimeout(function () { pinSection(i); }, 420);
        } else pinSection(i);
      });
      cards[i] = c;
      return c;
    }
    if (D.groups) {
      D.groups.forEach(function (g) {
        var items = secs.map(function (x, i) { return [x, i]; }).filter(function (p) { return p[0].data.group === g.key; });
        if (!items.length) return;
        listEl.appendChild(F.el('h3', { class: 'group-title', style: '--c:' + g.color }, F.esc(g.title) + ' <small style="color:var(--muted);font-weight:600">' + items.length + '개 코스</small>'));
        var grid = F.el('div', { class: 'sec-grid' });
        items.forEach(function (p) { grid.appendChild(card(p[0], p[1])); });
        listEl.appendChild(grid);
      });
    } else {
      var grid = F.el('div', { class: 'sec-grid' });
      secs.forEach(function (x, i) { grid.appendChild(card(x, i)); });
      listEl.appendChild(grid);
    }

    pz.apply(false);
    // URL 해시로 특정 구간 열기 (#sec-3)
    var m = /^#sec-(\d+)$/.exec(location.hash);
    if (m) {
      var idx = idxOfNos([+m[1]])[0];
      if (idx != null) setTimeout(function () { pinSection(idx); }, 400);
    }
  }
})();
