/* 국가숲길 인터랙티브 지도 - 공통 모듈 (팝업, 확대/이동, 유틸) */
(function () {
  'use strict';
  var F = (window.FOREST = window.FOREST || {});
  // 캐시 방지 버전: <script src="...common.js?v=x"> 의 v 값을 동적으로 불러오는 파일에도 사용
  F.v = ((document.currentScript && document.currentScript.src.split('?v=')[1]) || '').split('&')[0];
  // 이미지 등 리소스 주소에 버전 붙이기 (Cloudflare/브라우저 캐시에 남은 옛 이미지 방지)
  F.url = function (src) { return F.v && src && src.indexOf('?') < 0 ? src + '?v=' + F.v : src; };

  /* ------------------------------------------------------------ icons */
  F.icon = {
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 6 10h3l-4 6h5v6h4v-6h5l-4-6h3z"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 5l7 7-7 7"/></svg>',
    route: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/></svg>',
    pointer: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 4 7 17 2.5-7.5L21 11z"/></svg>',
    hand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.4l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></svg>',
    image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
    mountain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>'
  };

  /* ------------------------------------------------------------ utils */
  F.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  F.el = function (tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.style.cssText = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html != null) e.innerHTML = html;
    return e;
  };
  F.svg = function (tag, attrs) {
    var e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  };
  function rgb(hex) {
    var h = hex.replace('#', '');
    return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
  }
  function lum(hex) {
    var c = rgb(hex).map(function (v) { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); });
    return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
  }
  /** 흰 배경에서 읽기 좋은 글자색 (너무 밝은 노선색은 어둡게) */
  F.textColor = function (hex) {
    var c = rgb(hex), k = 1;
    while ((1.05) / (lum('#' + c.map(function (v) { return ('0' + Math.round(v * k).toString(16)).slice(-2); }).join('')) + .05) < 3.2 && k > .3) k -= .05;
    return '#' + c.map(function (v) { return ('0' + Math.round(v * k).toString(16)).slice(-2); }).join('');
  };
  F.isSheet = function () { return window.matchMedia('(max-width: 640px)').matches; };
  F.canHover = function () { return window.matchMedia('(hover: hover) and (pointer: fine)').matches; };
  F.loadScript = function (src) {
    return new Promise(function (ok, fail) {
      var s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = function () { fail(new Error('load failed: ' + src)); };
      document.head.appendChild(s);
    });
  };
  F.loadImg = function (img, src) {
    return new Promise(function (ok) {
      img.onload = img.onerror = function () { ok(); };
      img.src = F.url(src);
      if (img.complete && img.naturalWidth) ok();
    });
  };
  F.toast = function (stage, msg) {
    var t = stage.querySelector('.map-toast');
    if (!t) { t = F.el('div', { class: 'map-toast', role: 'status' }); stage.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('show'); }, 1400);
  };
  /** 숲길 찾기: slug(naepo) · 번호(5) · 한글 이름(내포문화숲길) 모두 허용, 공백/대소문자/끝의 / 무시 */
  F.trailBySlug = function (key) {
    var k = String(key == null ? '' : key).trim().replace(/\/+$/, '').toLowerCase().replace(/\s+/g, '');
    if (!k) return null;
    var list = F.trails || [];
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (t.slug === k || String(t.id) === k || t.name.replace(/\s+/g, '').toLowerCase() === k) return t;
    }
    return null;
  };
  F.trailColor = function (id) {
    var o = F.overview && F.overview.trails;
    if (o) for (var i = 0; i < o.length; i++) if (o[i].id === id) return o[i].color;
    return '#2f6b45';
  };

  /* ------------------------------------------------------------ Popup */
  function Popup(extraClass) {
    this.el = F.el('div', { class: 'popup ' + (extraClass || ''), role: 'dialog', 'aria-live': 'polite' });
    this.el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.el);
    this.pinned = false;
    this.anchor = null;   // 고정 위치 계산 함수 () => {x, y}
    var self = this;
    this.el.addEventListener('click', function (e) {
      if (e.target.closest('.popup-close')) { e.stopPropagation(); self.onClose && self.onClose(); }
    });
  }
  Popup.prototype.set = function (html) { this.el.innerHTML = html; return this; };
  Popup.prototype.place = function (x, y) {
    var el = this.el;
    if (el.classList.contains('sheet')) return;
    var w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 18;
    var left = x + gap, top = y + gap;
    if (left + w > vw - 8) left = x - gap - w;
    if (left < 8) left = Math.max(8, Math.min(vw - w - 8, x - w / 2));
    if (top + h > vh - 8) top = y - gap - h;
    if (top < 8) top = Math.max(8, Math.min(vh - h - 8, y + gap));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  };
  /** 요소 옆(오른쪽 우선)에 표시 */
  Popup.prototype.placeBeside = function (rect) {
    var el = this.el;
    if (el.classList.contains('sheet')) return;
    var w = el.offsetWidth, h = el.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 12;
    var left = rect.right + gap;
    if (left + w > vw - 8) left = rect.left - gap - w;
    if (left < 8) left = Math.max(8, Math.min(vw - w - 8, rect.left));
    var top = rect.top + rect.height / 2 - h / 2;
    if (rect.minTop != null) top = Math.max(top, rect.minTop);   // 지도 제목 등을 가리지 않게
    top = Math.max(8, Math.min(vh - h - 8, top));
    el.style.left = Math.round(left) + 'px';
    el.style.top = Math.round(top) + 'px';
  };
  Popup.prototype.show = function (opts) {
    opts = opts || {};
    var el = this.el;
    this.pinned = !!opts.pinned;
    el.classList.toggle('pinned', this.pinned);
    el.classList.toggle('sheet', !!opts.sheet);
    el.setAttribute('aria-hidden', 'false');
    if (opts.rect) this.placeBeside(opts.rect);
    else if (opts.x != null) this.place(opts.x, opts.y);
    this.anchor = opts.anchor || null;
    // 다음 프레임에 표시 (위치 계산 후 애니메이션)
    requestAnimationFrame(function () { el.classList.add('show'); });
  };
  Popup.prototype.reposition = function () {
    if (!this.anchor || !this.el.classList.contains('show')) return;
    var p = this.anchor();
    if (p) this.place(p.x, p.y);
  };
  Popup.prototype.hide = function () {
    this.pinned = false;
    this.anchor = null;
    this.el.classList.remove('show', 'pinned');
    this.el.setAttribute('aria-hidden', 'true');
  };
  Popup.prototype.isOpen = function () { return this.el.classList.contains('show'); };
  F.Popup = Popup;

  /* ------------------------------------------------------------ PanZoom */
  /**
   * stage: 보이는 영역, canvas: 지도(transform 대상)
   * - contain: 지도 전체가 보이도록 / cover: 영역을 꽉 채우고 좌우로 이동 (모바일)
   * - 마우스 휠(Ctrl/⌘), 더블클릭, 버튼, 드래그, 핀치 확대 지원
   * - 움직이는 동안만 will-change 를 켜서, 멈추면 확대된 크기로 다시 선명하게 그린다
   */
  function PanZoom(stage, canvas, opts) {
    this.stage = stage; this.canvas = canvas;
    this.opts = opts || {};
    this.aspect = this.opts.aspect || 1;
    this.maxZoom = this.opts.max || 4;
    this.s = 1; this.x = 0; this.y = 0;
    this.cw = 1; this.ch = 1; this.min = 1; this.max = this.maxZoom;
    this.moved = false;
    this.pointers = {};
    this.layout(true);
    this._bind();
  }
  PanZoom.prototype.size = function () { return { w: this.stage.clientWidth, h: this.stage.clientHeight }; };
  /** 영역 크기에 맞춰 지도 기본 크기 계산 (reset: 초기 위치로) */
  PanZoom.prototype.layout = function (reset) {
    var z = this.size(), a = this.aspect;
    if (!z.w || !z.h) return;
    // 현재 화면 중심 (지도 비율 좌표) 기억
    var cf = this.cw > 1 ? { fx: (z.w / 2 - this.x) / (this.cw * this.s), fy: (z.h / 2 - this.y) / (this.ch * this.s) } : null;
    var contain = z.w / z.h > a ? { w: z.h * a, h: z.h } : { w: z.w, h: z.w / a };
    var cover = z.w / z.h > a ? { w: z.w, h: z.w / a } : { w: z.h * a, h: z.h };
    var useCover = this.opts.cover ? this.opts.cover() : false;
    var base = useCover ? cover : contain;
    this.cw = base.w; this.ch = base.h;
    this.min = Math.min(1, contain.w / base.w);
    this.max = this.maxZoom;
    this.canvas.style.width = this.cw + 'px';
    this.canvas.style.height = this.ch + 'px';
    if (reset || !cf) {
      this.s = 1;
      var f = this.opts.focus ? this.opts.focus() : { fx: .5, fy: .5 };
      this.x = z.w / 2 - f.fx * this.cw;
      this.y = z.h / 2 - f.fy * this.ch;
    } else {
      this.s = Math.max(this.min, Math.min(this.max, this.s));
      this.x = z.w / 2 - cf.fx * this.cw * this.s;
      this.y = z.h / 2 - cf.fy * this.ch * this.s;
    }
    this.apply(false);
  };
  PanZoom.prototype.clamp = function () {
    var z = this.size();
    this.s = Math.max(this.min, Math.min(this.max, this.s));
    var w = this.cw * this.s, h = this.ch * this.s;
    this.x = w <= z.w ? (z.w - w) / 2 : Math.min(0, Math.max(z.w - w, this.x));
    this.y = h <= z.h ? (z.h - h) / 2 : Math.min(0, Math.max(z.h - h, this.y));
  };
  PanZoom.prototype.canPan = function () {
    var z = this.size();
    return { x: this.cw * this.s > z.w + 1, y: this.ch * this.s > z.h + 1 };
  };
  PanZoom.prototype.apply = function (animate) {
    this.clamp();
    var c = this.canvas, self = this;
    c.classList.toggle('animate', !!animate);
    c.style.transform = 'translate(' + this.x + 'px,' + this.y + 'px) scale(' + this.s + ')';
    var p = this.canPan();
    this.stage.classList.toggle('is-zoomed', p.x || p.y);
    // 세로로 넘칠 때만 터치 스크롤을 막고, 가로만 넘치면 세로 페이지 스크롤은 허용
    this.stage.style.touchAction = p.y ? 'none' : (p.x ? 'pan-y' : 'pan-x pan-y');
    if (this.opts.onChange) this.opts.onChange(this);
    if (animate) {
      clearTimeout(this._at);
      this._at = setTimeout(function () { c.classList.remove('animate'); if (self.opts.onChange) self.opts.onChange(self); }, 300);
    }
  };
  /** 움직이는 동안 GPU 레이어 사용 → 멈추면 해제해서 선명하게 다시 그림 */
  PanZoom.prototype.moving = function () {
    var c = this.canvas;
    c.classList.add('is-moving');
    clearTimeout(this._mv);
    this._mv = setTimeout(function () { c.classList.remove('is-moving'); }, 180);
  };
  /** cx, cy: stage 기준 좌표 */
  PanZoom.prototype.zoomAt = function (factor, cx, cy, animate) {
    var ns = Math.max(this.min, Math.min(this.max, this.s * factor));
    var k = ns / this.s;
    this.x = cx - (cx - this.x) * k;
    this.y = cy - (cy - this.y) * k;
    this.s = ns;
    if (!animate) this.moving();
    this.apply(animate);
  };
  PanZoom.prototype.zoomBy = function (factor) {
    var z = this.size();
    this.zoomAt(factor, z.w / 2, z.h / 2, true);
  };
  PanZoom.prototype.reset = function () {
    var z = this.size(), f = this.opts.focus ? this.opts.focus() : { fx: .5, fy: .5 };
    this.s = 1;
    this.x = z.w / 2 - f.fx * this.cw;
    this.y = z.h / 2 - f.fy * this.ch;
    this.apply(true);
  };
  PanZoom.prototype.isInitial = function () { return Math.abs(this.s - 1) < .001; };
  /** 지도 비율 좌표 → 화면 좌표 */
  PanZoom.prototype.toClient = function (fx, fy) {
    var r = this.stage.getBoundingClientRect();
    return { x: r.left + this.x + fx * this.cw * this.s, y: r.top + this.y + fy * this.ch * this.s };
  };
  /** 화면 좌표 → 지도 비율 좌표 */
  PanZoom.prototype.toFrac = function (clientX, clientY) {
    var r = this.stage.getBoundingClientRect();
    return { fx: (clientX - r.left - this.x) / (this.cw * this.s), fy: (clientY - r.top - this.y) / (this.ch * this.s) };
  };
  /** 화면 px / 지도 1단위 (viewBox 폭 W 기준) */
  PanZoom.prototype.pxPer = function (W) { return this.cw * this.s / W; };
  PanZoom.prototype._bind = function () {
    var self = this, st = this.stage;
    st.addEventListener('wheel', function (e) {
      if (!(e.ctrlKey || e.metaKey) && !st.classList.contains('is-full')) {
        if (self.opts.onWheelHint) self.opts.onWheelHint();
        return;
      }
      e.preventDefault();
      var r = st.getBoundingClientRect();
      self.zoomAt(Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0022)), e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });
    st.addEventListener('dblclick', function (e) {
      if (e.target.closest('.map-tools')) return;
      e.preventDefault();
      var r = st.getBoundingClientRect();
      self.zoomAt(self.s >= self.max - .01 ? self.min / self.s : 2, e.clientX - r.left, e.clientY - r.top, true);
    });

    var start = null, pinch = null;
    st.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.map-tools, .full-exit')) { self.moved = false; return; }
      self.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(self.pointers);
      if (ids.length === 1) {
        start = { x: e.clientX, y: e.clientY, ox: self.x, oy: self.y };
        self.moved = false;
      } else if (ids.length === 2) {
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        var r = st.getBoundingClientRect();
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, s: self.s, x: self.x, y: self.y,
          cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top };
        self.moved = true;
      }
    });
    st.addEventListener('pointermove', function (e) {
      if (!self.pointers[e.pointerId]) return;
      self.pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(self.pointers);
      if (pinch && ids.length >= 2) {
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        var r = st.getBoundingClientRect();
        var ns = Math.max(self.min, Math.min(self.max, pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        var cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
        var k = ns / pinch.s;
        self.s = ns;
        self.x = cx - (pinch.cx - pinch.x) * k;
        self.y = cy - (pinch.cy - pinch.y) * k;
        self.moving();
        self.apply(false);
        e.preventDefault();
        return;
      }
      if (!start) return;
      var dx = e.clientX - start.x, dy = e.clientY - start.y;
      var can = self.canPan();
      if (!self.moved && Math.hypot(dx, dy) > 6) {
        self.moved = true;
        if (can.x || can.y) { st.classList.add('is-dragging'); try { st.setPointerCapture(e.pointerId); } catch (_) {} }
      }
      if (self.moved && (can.x || can.y)) {
        if (can.x) self.x = start.ox + dx;
        if (can.y) self.y = start.oy + dy;
        self.moving();
        self.apply(false);
      }
    });
    function end(e) {
      delete self.pointers[e.pointerId];
      var n = Object.keys(self.pointers).length;
      if (n < 2) pinch = null;
      if (n === 1) { // 핀치 후 한 손가락: 그 위치에서 이동 재시작
        var id = Object.keys(self.pointers)[0], p = self.pointers[id];
        start = { x: p.x, y: p.y, ox: self.x, oy: self.y };
      }
      if (n === 0) {
        start = null;
        st.classList.remove('is-dragging');
        // 드래그 직후 click 무시를 위해 moved 는 다음 pointerdown 에서 초기화
      }
    }
    st.addEventListener('pointerup', end);
    st.addEventListener('pointercancel', end);
    st.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') end(e); });
    // 드래그 후 발생하는 click 차단
    st.addEventListener('click', function (e) {
      if (e.target.closest('.map-tools, .full-exit')) { self.moved = false; return; }
      if (self.moved) { e.stopPropagation(); e.preventDefault(); self.moved = false; }
    }, true);
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { self.layout(false); }, 60); });
  };
  F.PanZoom = PanZoom;

  /** 확대/축소 + 전체화면 버튼 */
  F.mapTools = function (stage, pz) {
    var box = F.el('div', { class: 'map-tools' });
    var bFull = F.el('button', { type: 'button', class: 'tool-full', 'aria-label': '전체 화면', title: '전체 화면' }, F.icon.expand);
    var bIn = F.el('button', { type: 'button', 'aria-label': '확대', title: '확대' }, F.icon.plus);
    var bOut = F.el('button', { type: 'button', 'aria-label': '축소', title: '축소' }, F.icon.minus);
    var bReset = F.el('button', { type: 'button', 'aria-label': '처음 위치로', title: '처음 위치로' }, F.icon.reset);
    box.appendChild(bFull); box.appendChild(bIn); box.appendChild(bOut); box.appendChild(bReset);
    stage.appendChild(box);
    var bExit = F.el('button', { type: 'button', class: 'full-exit', 'aria-label': '전체 화면 닫기' }, F.icon.close + '<span>닫기</span>');
    stage.appendChild(bExit);
    bIn.addEventListener('click', function () { pz.zoomBy(1.6); });
    bOut.addEventListener('click', function () { pz.zoomBy(1 / 1.6); });
    bReset.addEventListener('click', function () { pz.reset(); });

    // 전체 화면 (iOS 에서도 동작하도록 CSS 고정 레이어 방식)
    function setFull(on) {
      if (on === stage.classList.contains('is-full')) return;
      stage.classList.toggle('is-full', on);
      document.documentElement.classList.toggle('map-full-open', on);
      bFull.innerHTML = on ? F.icon.shrink : F.icon.expand;
      bFull.setAttribute('aria-label', on ? '전체 화면 닫기' : '전체 화면');
      bFull.title = on ? '전체 화면 닫기' : '전체 화면';
      pz.layout(true);
      if (pz.opts.onFull) pz.opts.onFull(on);
    }
    bFull.addEventListener('click', function () { setFull(!stage.classList.contains('is-full')); });
    bExit.addEventListener('click', function () { setFull(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setFull(false); });

    return function update() {
      bOut.disabled = pz.s <= pz.min + .001;
      bIn.disabled = pz.s >= pz.max - .001;
    };
  };

  /** 상단 헤더 */
  F.header = function (opts) {
    var h = F.el('header', { class: 'app-header' });
    var brand = F.el('a', { class: 'brand', href: 'index.html', 'aria-label': '국가숲길 전체 지도' },
      '<span class="brand-mark">' + F.icon.tree + '</span>' +
      '<span class="brand-text"><span class="brand-title">국가숲길</span><span class="brand-sub">9개 숲길로 이루어진 1,466km</span></span>');
    h.appendChild(brand);
    h.appendChild(F.el('div', { class: 'header-spacer' }));
    if (opts && opts.current) {
      h.classList.add('has-nav');
      var nav = F.el('nav', { class: 'trail-nav', 'aria-label': '숲길 선택' });
      var sel = F.el('select', { class: 'trail-select', 'aria-label': '숲길 선택' });
      (F.trails || []).forEach(function (t) {
        var a = F.el('a', { href: 'map.html?trail=' + t.slug },
          '<span class="dot" style="background:' + F.trailColor(t.id) + '"></span>' + F.esc(t.name));
        if (t.slug === opts.current) a.setAttribute('aria-current', 'page');
        nav.appendChild(a);
        var o = F.el('option', { value: t.slug }, t.id + '. ' + F.esc(t.name));
        if (t.slug === opts.current) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () { location.href = 'map.html?trail=' + sel.value; });
      h.appendChild(nav);
      h.appendChild(sel);
      h.appendChild(F.el('a', { class: 'btn', href: 'index.html' }, F.icon.back + '<span class="btn-label">전체 지도</span>'));
      // 스크롤 가능한 쪽 가장자리만 흐리게
      var edges = function () {
        var max = nav.scrollWidth - nav.clientWidth;
        nav.classList.toggle('fade-l', nav.scrollLeft > 2);
        nav.classList.toggle('fade-r', nav.scrollLeft < max - 2);
      };
      nav.addEventListener('scroll', edges, { passive: true });
      window.addEventListener('resize', edges);
      setTimeout(function () {
        var cur = nav.querySelector('[aria-current]');
        if (cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = cur.offsetLeft - nav.clientWidth / 2 + cur.offsetWidth / 2;
        edges();
      }, 0);
    }
    document.body.insertBefore(h, document.body.firstChild);
  };
})();
