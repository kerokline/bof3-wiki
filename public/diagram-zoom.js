// Diagrams and figures: each one scales to the column and opens in a full-screen zoom view on
// click, Enter or Space. The view supports wheel and pinch zoom, drag to pan and keyboard control.
(() => {
  const SCOPE = '.sl-markdown-content';
  const MIN_SCALE = 0.55; // smallest inline text scale before the frame scrolls instead
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  let view = null;

  const natural = (el) => {
    if (el instanceof SVGElement) {
      const b = el.viewBox && el.viewBox.baseVal;
      if (b && b.width) return [b.width, b.height];
      const r = el.getBoundingClientRect();
      return [r.width || 300, r.height || 150];
    }
    return [el.naturalWidth || el.width || 300, el.naturalHeight || el.height || 150];
  };

  // Keep the viewBox, fit the column, and scroll inside the frame below a readable size.
  const sizeInline = (svg) => {
    const [w] = natural(svg);
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
    svg.style.minWidth = Math.round(w * MIN_SCALE) + 'px';
  };

  const source = (frame) => frame.querySelector(':scope > svg, :scope > img');

  // ---- zoom view ----
  const icon = (d) => {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    s.append(p);
    return s;
  };
  const ICONS = {
    in: 'M12 5v14M5 12h14',
    out: 'M5 12h14',
    reset: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
    close: 'M6 6l12 12M18 6L6 18',
  };

  const open = (frame) => {
    if (view) return;
    const src = source(frame);
    if (!src) return;
    const root = document.createElement('div');
    root.className = 'dz';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-label', 'Diagram zoom view');
    const stage = document.createElement('div');
    stage.className = 'dz-stage';
    stage.tabIndex = 0;
    stage.setAttribute('aria-label', 'Diagram. Drag to pan, scroll or pinch to zoom, plus and minus to zoom, 0 to reset.');
    const content = document.createElement('div');
    content.className = 'dz-content';
    stage.append(content);
    const bar = document.createElement('div');
    bar.className = 'dz-bar';
    const buttons = {};
    for (const [key, label] of [['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset zoom'], ['close', 'Close']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.title = label;
      b.append(icon(ICONS[key]));
      bar.append(b);
      buttons[key] = b;
    }
    root.append(stage, bar);

    const state = { s: 1, x: 0, y: 0, fit: 1, w: 1, h: 1 };
    const apply = () => {
      content.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.s})`;
    };
    const fill = () => {
      const copy = source(frame).cloneNode(true);
      // NOTE: the id stays; Mermaid scopes its styles to it.
      copy.removeAttribute('style');
      copy.removeAttribute('tabindex');
      const [w, h] = natural(source(frame));
      state.w = w;
      state.h = h;
      copy.setAttribute('width', w);
      copy.setAttribute('height', h);
      copy.style.cssText = `width:${w}px;height:${h}px;max-width:none;min-width:0;display:block`;
      copy.setAttribute('aria-hidden', 'true');
      content.replaceChildren(copy);
    };
    const reset = () => {
      const r = stage.getBoundingClientRect();
      state.fit = Math.min((r.width * 0.94) / state.w, (r.height * 0.9) / state.h, 2);
      state.s = state.fit;
      state.x = (r.width - state.w * state.s) / 2;
      state.y = (r.height - state.h * state.s) / 2;
      apply();
    };
    const zoomAt = (factor, cx, cy) => {
      const next = Math.min(Math.max(state.s * factor, state.fit * 0.5), state.fit * 16);
      const k = next / state.s;
      state.x = cx - (cx - state.x) * k;
      state.y = cy - (cy - state.y) * k;
      state.s = next;
      apply();
    };
    const center = () => {
      const r = stage.getBoundingClientRect();
      return [r.width / 2, r.height / 2];
    };

    buttons.in.onclick = () => zoomAt(1.4, ...center());
    buttons.out.onclick = () => zoomAt(1 / 1.4, ...center());
    buttons.reset.onclick = reset;
    buttons.close.onclick = close;
    root.addEventListener('pointerdown', (e) => {
      if (e.target === root) close(); // backdrop
    });

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    const pts = new Map();
    let pinch = 0;
    stage.addEventListener('pointerdown', (e) => {
      stage.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      pinch = 0;
      stage.classList.add('dragging');
    });
    stage.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) {
        state.x += e.clientX - prev[0];
        state.y += e.clientY - prev[1];
        apply();
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const r = stage.getBoundingClientRect();
        if (pinch) zoomAt(d / pinch, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top);
        pinch = d;
      }
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      pinch = 0;
      if (!pts.size) stage.classList.remove('dragging');
    };
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);

    const keys = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        const list = [stage, ...Object.values(buttons)];
        const i = list.indexOf(document.activeElement);
        const next = list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length];
        e.preventDefault();
        next.focus();
      } else if (document.activeElement === stage) {
        const step = 60;
        const map = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
        if (map[e.key]) {
          e.preventDefault();
          state.x += map[e.key][0];
          state.y += map[e.key][1];
          apply();
        } else if (e.key === '+' || e.key === '=') zoomAt(1.4, ...center());
        else if (e.key === '-') zoomAt(1 / 1.4, ...center());
        else if (e.key === '0') reset();
      }
    };
    document.addEventListener('keydown', keys, true);

    // A theme change re-renders the source diagram: copy the new one in.
    const watch = new MutationObserver(() => {
      if (source(frame)) fill();
    });
    watch.observe(frame, { childList: true });

    const onResize = () => reset();
    addEventListener('resize', onResize);

    const inerted = [...document.body.children].filter((el) => !el.inert);
    for (const el of inerted) el.inert = true;
    document.body.append(root);
    document.documentElement.classList.add('dz-open');
    fill();
    reset();
    stage.focus({ preventScroll: true });

    function close() {
      document.removeEventListener('keydown', keys, true);
      removeEventListener('resize', onResize);
      watch.disconnect();
      root.remove();
      for (const el of inerted) el.inert = false;
      document.documentElement.classList.remove('dz-open');
      view = null;
      frame.focus({ preventScroll: true });
    }
    view = { close };
  };

  // ---- inline frames ----
  const arm = (frame) => {
    if (frame.dataset.zoom) return;
    frame.dataset.zoom = '';
    frame.classList.add('zoom-frame');
    frame.tabIndex = 0;
    frame.setAttribute('role', 'button');
    frame.setAttribute('aria-label', frame.dataset.label || 'Expand diagram');
    frame.addEventListener('click', (e) => {
      if (e.target.closest('a')) return;
      open(frame);
    });
    frame.addEventListener('keydown', (e) => {
      if (e.target !== frame || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      open(frame);
    });
  };

  const isFigure = (el) => {
    if (el.closest('pre.mermaid, a, button, .zoom-frame, .sl-anchor-link, .expressive-code, .starlight-aside')) return false;
    if (el instanceof SVGElement && el.closest('svg') !== el) return false;
    const [w, h] = natural(el);
    return w >= 120 && h >= 60;
  };

  const scan = () => {
    for (const pre of document.querySelectorAll(`${SCOPE} pre.mermaid[data-processed]`)) {
      const svg = pre.querySelector(':scope > svg');
      if (!svg) continue;
      arm(pre);
      if (svg.dataset.sized !== String(svg.viewBox.baseVal.width)) {
        svg.dataset.sized = String(svg.viewBox.baseVal.width);
        sizeInline(svg);
      }
    }
    for (const el of document.querySelectorAll(`${SCOPE} img, ${SCOPE} > svg, ${SCOPE} figure > svg`)) {
      if (!isFigure(el)) continue;
      const frame = document.createElement('span');
      frame.className = 'zoom-wrap';
      el.replaceWith(frame);
      frame.append(el);
      frame.dataset.label = (el.getAttribute('alt') || 'Figure') + '. Expand';
      arm(frame);
      if (el instanceof SVGElement) sizeInline(el);
    }
  };

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });
  scan();
})();
