/**
 * Card Designer — Interactive drag/resize tool for card face elements.
 * Toggle: Ctrl+Shift+D
 *
 * CLICK an element to select it (gold highlight).
 * DRAG to reposition (updates CSS top/left).
 * KEYBOARD (while element is selected):
 *   Arrow keys      — nudge position 1px (hold Shift for 10px)
 *   +/=  or  -/_    — font-size ±0.5px (hold Shift for ±2px)
 *   ]  or  [        — width ±2px (hold Shift for ±10px)
 *   '  or  ;        — height ±2px (hold Shift for ±10px)
 * Click away or Escape to deselect.
 * Trackpad scroll over element also adjusts font-size (Shift+scroll = width).
 * Click "Copy CSS" to copy generated rules to clipboard.
 *
 * SCALE-AWARE: All mouse/drag operations account for ancestor CSS transforms
 * (e.g. fate cards zoomed via transform:scale inside #sbZoomPortal).
 */
(function () {
  'use strict';

  let active = false;
  let badge = null;
  let panel = null;
  let selectedEl = null; // Currently keyboard-selected element

  // Track all modifications: selector → { prop: value }
  const mods = new Map();

  // Which elements inside cards are designable
  const ELEMENT_SELECTORS = [
    '.sb-card-back .sb-card-title',
    '.sb-card-back .sb-card-desc',
    '.sb-card-front .sb-card-title',
    '.sb-card-front .sb-card-desc',
    '.sb-card-arc-flavors',
    '.pressure-front-flavors',
    '.pressure-front-flavors .sb-flavor-btn',
    '.sb-zoom-content',
    '.sb-zoom-flavors',
    '.sb-zoom-flavors .sb-flavor-btn',
    '.sb-zoom-flavor-arc',
  ];

  // Selectors for fate card elements (petition, tempt, etc.)
  const FATE_ELEMENT_SELECTORS = [
    '.petition-zoom-overlay .petition-top-zone',
    '.petition-zoom-overlay .petition-suggest-header',
    '.petition-zoom-overlay .petition-write-toggle',
    '.petition-zoom-overlay .petition-lower-zone',
    '.petition-zoom-overlay .petition-fortune-tiers',
    '.petition-zoom-overlay .petition-tier-btn',
    '.petition-zoom-overlay .petition-suggest-panel',
    '.tempt-zoom-overlay .tempt-wish-zone',
    '.tempt-zoom-overlay .tempt-wish-columns',
    '.tempt-zoom-overlay .tempt-wish-col',
    '.tempt-zoom-overlay .tempt-lower-zone',
  ];

  // ── Helpers ──────────────────────────────────────────────────────────

  function px(v) { return Math.round(v * 2) / 2 + 'px'; }

  /** Force-set an inline style with !important to override stylesheet rules. */
  function forceStyle(el, prop, value) {
    el.style.setProperty(prop, value, 'important');
  }

  /**
   * Compute the cumulative CSS transform scale on all ancestors of `el`.
   * Fate cards zoom via `transform: scale(N)` inside #sbZoomPortal —
   * mouse coordinates are in screen space but CSS values are in pre-transform space.
   * Returns the multiplier (e.g. 3.2 if the element is inside a 3.2× scaled container).
   */
  function getAncestorScale(el) {
    let scale = 1;
    let cur = el.parentElement;
    while (cur) {
      const transform = getComputedStyle(cur).transform;
      if (transform && transform !== 'none') {
        // matrix(a, b, c, d, tx, ty) — scaleX = sqrt(a² + b²)
        const m2d = transform.match(/^matrix\(([^,]+),\s*([^,]+)/);
        if (m2d) {
          const a = parseFloat(m2d[1]);
          const b = parseFloat(m2d[2]);
          scale *= Math.sqrt(a * a + b * b);
        } else {
          // matrix3d(m11, m12, m13, m14, m21, ...) — scaleX = sqrt(m11² + m12²)
          const m3d = transform.match(/^matrix3d\(([^,]+),\s*([^,]+)/);
          if (m3d) {
            const a = parseFloat(m3d[1]);
            const b = parseFloat(m3d[2]);
            const s = Math.sqrt(a * a + b * b);
            // Only count as scale if significantly > 0 (rotateY(180) gives -1,0 → s=1)
            if (s > 0.01) scale *= s;
          }
        }
      }
      cur = cur.parentElement;
    }
    return scale;
  }

  /** Kill CSS transitions on the entire ancestor chain up to body. */
  function killAncestorTransitions(el) {
    const killed = [];
    let cur = el.parentElement;
    while (cur && cur !== document.body) {
      const t = getComputedStyle(cur).transition;
      if (t && t !== 'none' && t !== 'all 0s ease 0s') {
        cur.style.setProperty('transition', 'none', 'important');
        killed.push(cur);
      }
      cur = cur.parentElement;
    }
    return killed;
  }

  /** Build a unique-ish CSS selector for an element (for the output log). */
  function cssSelectorFor(el) {
    const parts = [];
    let cur = el;
    while (cur && cur !== document.body) {
      let seg = cur.tagName.toLowerCase();
      if (cur.id) { seg = '#' + cur.id; parts.unshift(seg); break; }
      const cls = Array.from(cur.classList)
        .filter(c => !c.startsWith('design-'))
        .join('.');
      if (cls) seg += '.' + cls;
      if (cur.dataset.grp) seg += `[data-grp="${cur.dataset.grp}"]`;
      if (cur.dataset.val) seg += `[data-val="${cur.dataset.val}"]`;
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join(' > ');
  }

  function recordMod(el, prop, value) {
    const sel = cssSelectorFor(el);
    if (!mods.has(sel)) mods.set(sel, {});
    mods.get(sel)[prop] = value;
    refreshPanel();
  }

  // ── Selection (click to select for keyboard control) ─────────────────

  function selectDesignEl(el) {
    if (selectedEl) deselectDesignEl();
    selectedEl = el;
    el.style.outline = '2px solid #d4a844';
    el.style.outlineOffset = '2px';
    // Kill transitions so position/size changes are instant
    forceStyle(el, 'transition', 'none');
    // Kill ancestor transitions (card zoom, flip, etc.)
    killAncestorTransitions(el);
    // Blur any focused input/textarea so keyboard shortcuts work
    const focused = document.activeElement;
    if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
      focused.blur();
    }
    updateBadgeHint();
    showTooltipForSelected();
  }

  function deselectDesignEl() {
    if (!selectedEl) return;
    // Restore dashed outline
    selectedEl.style.outline = '2px solid rgba(212,168,68,0.7)';
    selectedEl.style.outlineOffset = '2px';
    // Keep transition disabled to prevent snap-back after deselect
    selectedEl = null;
    hideTooltip();
    updateBadgeHint();
  }

  function updateBadgeHint() {
    if (!badge) return;
    if (selectedEl) {
      const tag = selectedEl.className.split(' ').find(c => !c.startsWith('design-')) || selectedEl.tagName;
      badge.textContent = `DESIGN: ${tag}`;
    } else {
      badge.textContent = 'DESIGN MODE';
    }
  }

  /**
   * Convert any bottom/right positioning to top/left, and lock width/height
   * when both left+right or top+bottom are set (prevents stretch-on-drag).
   */
  function ensureTopLeft(el) {
    const cs = getComputedStyle(el);
    const parent = el.offsetParent || el.parentElement;
    if (!parent) return;

    // Use getBoundingClientRect relative to parent for reliable pixel positions
    const parentRect = parent.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const scale = getAncestorScale(el);

    // Convert bottom → top
    if (cs.top === 'auto' && cs.bottom !== 'auto') {
      const top = (elRect.top - parentRect.top) / scale;
      forceStyle(el, 'top', px(top));
      forceStyle(el, 'bottom', 'auto');
    }

    // Convert right → left
    if (cs.left === 'auto' && cs.right !== 'auto') {
      const left = (elRect.left - parentRect.left) / scale;
      forceStyle(el, 'left', px(left));
      forceStyle(el, 'right', 'auto');
    }

    // If BOTH left and right are set (not auto), lock width and clear right
    if (cs.left !== 'auto' && cs.right !== 'auto') {
      forceStyle(el, 'right', 'auto');
      recordMod(el, 'right', 'auto');
    }

    // If BOTH top and bottom are set (not auto), lock height and clear bottom
    if (cs.top !== 'auto' && cs.bottom !== 'auto') {
      forceStyle(el, 'bottom', 'auto');
      recordMod(el, 'bottom', 'auto');
    }

    // Ensure top/left have pixel values (not auto/percent)
    const computedTop = parseFloat(getComputedStyle(el).top);
    const computedLeft = parseFloat(getComputedStyle(el).left);
    if (isNaN(computedTop)) {
      const top = (elRect.top - parentRect.top) / scale;
      forceStyle(el, 'top', px(top));
    }
    if (isNaN(computedLeft)) {
      const left = (elRect.left - parentRect.left) / scale;
      forceStyle(el, 'left', px(left));
    }
  }

  // ── Badge (top-right indicator) ──────────────────────────────────────

  function createBadge() {
    badge = document.createElement('div');
    badge.textContent = 'DESIGN MODE';
    Object.assign(badge.style, {
      position: 'fixed', top: '8px', right: '8px', zIndex: '99999',
      background: '#d4a844', color: '#1a1408', fontFamily: 'Cinzel, serif',
      fontWeight: '700', fontSize: '11px', padding: '4px 12px',
      borderRadius: '3px', letterSpacing: '0.15em', pointerEvents: 'none',
      textTransform: 'uppercase', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
    });
    document.body.appendChild(badge);
  }

  // ── CSS Output Panel ─────────────────────────────────────────────────

  function createPanel() {
    panel = document.createElement('div');
    Object.assign(panel.style, {
      position: 'fixed', bottom: '12px', left: '12px', zIndex: '99999',
      background: 'rgba(20,16,10,0.95)', border: '1px solid #d4a844',
      borderRadius: '6px', padding: '10px 14px', maxWidth: '480px',
      maxHeight: '300px', overflowY: 'auto', fontFamily: 'monospace',
      fontSize: '11px', color: '#d4a844', lineHeight: '1.5',
      boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    });
    panel.innerHTML = helpText();

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy CSS';
    Object.assign(copyBtn.style, {
      position: 'sticky', bottom: '0', marginTop: '8px',
      background: '#d4a844', color: '#1a1408', border: 'none',
      borderRadius: '3px', padding: '4px 14px', cursor: 'pointer',
      fontFamily: 'Cinzel, serif', fontWeight: '700', fontSize: '11px',
    });
    copyBtn.onclick = () => {
      const css = buildCSS();
      navigator.clipboard.writeText(css).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => copyBtn.textContent = 'Copy CSS', 1500);
      });
    };
    panel.appendChild(copyBtn);
    document.body.appendChild(panel);
  }

  function helpText() {
    return '<em style="color:#f5d77e">Click element to select, then:</em><br>' +
      '&nbsp;&nbsp;Arrows = move &nbsp;(+Shift = 10px)<br>' +
      '&nbsp;&nbsp;+/- = font-size &nbsp;(+Shift = 2px)<br>' +
      '&nbsp;&nbsp;]/[ = width &nbsp;(+Shift = 10px)<br>' +
      '&nbsp;&nbsp;\'/; = height &nbsp;(+Shift = 10px)<br>' +
      '&nbsp;&nbsp;Esc = deselect<br><br>';
  }

  function refreshPanel() {
    if (!panel) return;
    let html = '';
    for (const [sel, props] of mods) {
      html += `<div style="margin-bottom:6px"><strong style="color:#f5d77e">${sel}</strong><br>`;
      for (const [p, v] of Object.entries(props)) {
        html += `&nbsp;&nbsp;${p}: ${v};<br>`;
      }
      html += '</div>';
    }
    if (!html) html = helpText();
    const btn = panel.querySelector('button');
    panel.innerHTML = html;
    if (btn) panel.appendChild(btn);
  }

  function buildCSS() {
    let css = '/* Card Designer output */\n\n';
    for (const [sel, props] of mods) {
      css += `${sel} {\n`;
      for (const [p, v] of Object.entries(props)) {
        css += `    ${p}: ${v};\n`;
      }
      css += '}\n\n';
    }
    return css;
  }

  // ── Tooltip (live readout near element) ──────────────────────────────

  let tooltip = null;

  function showTooltip(el, x, y) {
    if (!tooltip) {
      tooltip = document.createElement('div');
      Object.assign(tooltip.style, {
        position: 'fixed', zIndex: '100000', pointerEvents: 'none',
        background: 'rgba(20,16,10,0.92)', border: '1px solid #d4a844',
        borderRadius: '4px', padding: '4px 8px', fontFamily: 'monospace',
        fontSize: '10px', color: '#f5d77e', whiteSpace: 'pre', lineHeight: '1.4',
      });
      document.body.appendChild(tooltip);
    }
    const cs = getComputedStyle(el);
    const scale = getAncestorScale(el);
    const scaleNote = scale > 1.01 ? `  (scale: ${scale.toFixed(1)}×)` : '';
    const lines = [
      `top: ${cs.top}`,
      `left: ${cs.left}`,
      `bottom: ${cs.bottom}`,
      `font-size: ${cs.fontSize}${scaleNote}`,
      `width: ${cs.width}`,
      `height: ${cs.height}`,
    ];
    tooltip.textContent = lines.join('\n');
    tooltip.style.left = (x + 16) + 'px';
    tooltip.style.top = (y + 16) + 'px';
    tooltip.style.display = '';
  }

  function showTooltipForSelected() {
    if (!selectedEl) return;
    const rect = selectedEl.getBoundingClientRect();
    showTooltip(selectedEl, rect.right, rect.top);
  }

  function hideTooltip() {
    if (tooltip) tooltip.style.display = 'none';
  }

  // ── Drag Logic ───────────────────────────────────────────────────────

  let dragTarget = null;
  let dragStartX = 0, dragStartY = 0;
  let elStartTop = 0, elStartLeft = 0;
  let dragScale = 1; // ancestor scale factor at drag start
  let didDrag = false;

  function onMouseDown(e) {
    if (!active) return;
    const el = e.target.closest('.design-handle');
    if (!el) {
      // Clicked outside any handle — deselect
      if (selectedEl) deselectDesignEl();
      return;
    }
    e.preventDefault();
    e.stopPropagation();

    const target = el.__designEl || el;
    dragTarget = target;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    didDrag = false;

    // Kill transitions on drag target AND all ancestors (card zoom, flip, etc.)
    forceStyle(target, 'transition', 'none');
    killAncestorTransitions(target);

    // Blur focused inputs so keyboard shortcuts work after drag
    const focused = document.activeElement;
    if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
      focused.blur();
    }

    // Compute ancestor scale ONCE at drag start — used in onMouseMove
    dragScale = getAncestorScale(target);

    ensureTopLeft(target);
    const cs = getComputedStyle(target);
    elStartTop = parseFloat(cs.top) || 0;
    elStartLeft = parseFloat(cs.left) || 0;

    document.addEventListener('mousemove', onMouseMove, true);
    document.addEventListener('mouseup', onMouseUp, true);
  }

  /** Block click events on design handles so the app's card handlers don't fire */
  function onClick(e) {
    if (!active) return;
    // Block clicks on handles, corners, and any card ancestor
    const el = e.target.closest('.design-handle') || e.target.closest('.design-corner');
    if (el) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  function onMouseMove(e) {
    if (!dragTarget) return;
    e.preventDefault();
    e.stopPropagation();
    didDrag = true;

    // Divide screen-pixel deltas by ancestor scale so 1px mouse = 1 visual px
    const dx = (e.clientX - dragStartX) / dragScale;
    const dy = (e.clientY - dragStartY) / dragScale;
    const newTop = elStartTop + dy;
    const newLeft = elStartLeft + dx;

    forceStyle(dragTarget, 'top', px(newTop));
    forceStyle(dragTarget, 'left', px(newLeft));
    forceStyle(dragTarget, 'bottom', 'auto');
    forceStyle(dragTarget, 'right', 'auto');

    recordMod(dragTarget, 'top', px(newTop));
    recordMod(dragTarget, 'left', px(newLeft));
    recordMod(dragTarget, 'bottom', 'auto');

    showTooltip(dragTarget, e.clientX, e.clientY);
  }

  function onMouseUp(e) {
    const target = dragTarget;
    if (target) {
      e.preventDefault();
      e.stopPropagation();
    }
    dragTarget = null;
    dragScale = 1;
    document.removeEventListener('mousemove', onMouseMove, true);
    document.removeEventListener('mouseup', onMouseUp, true);

    // If we didn't drag, treat as a click → select element for keyboard
    if (target && !didDrag) {
      selectDesignEl(target);
    } else {
      hideTooltip();
    }
  }

  // ── Keyboard Resize/Nudge ────────────────────────────────────────────

  function onKeyDown(e) {
    if (!active) return;

    // Toggle off
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      deactivate();
      return;
    }

    if (!selectedEl) return;

    const big = e.shiftKey;

    // Escape — deselect
    if (e.key === 'Escape') {
      e.preventDefault();
      deselectDesignEl();
      return;
    }

    // Arrow keys — nudge position (CSS px, not visual px)
    if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      ensureTopLeft(selectedEl);
      const cs = getComputedStyle(selectedEl);
      const step = big ? 10 : 1;

      if (e.key === 'ArrowUp') {
        const v = (parseFloat(cs.top) || 0) - step;
        forceStyle(selectedEl, 'top', px(v));
        recordMod(selectedEl, 'top', px(v));
      } else if (e.key === 'ArrowDown') {
        const v = (parseFloat(cs.top) || 0) + step;
        forceStyle(selectedEl, 'top', px(v));
        recordMod(selectedEl, 'top', px(v));
      } else if (e.key === 'ArrowLeft') {
        const v = (parseFloat(cs.left) || 0) - step;
        forceStyle(selectedEl, 'left', px(v));
        recordMod(selectedEl, 'left', px(v));
      } else if (e.key === 'ArrowRight') {
        const v = (parseFloat(cs.left) || 0) + step;
        forceStyle(selectedEl, 'left', px(v));
        recordMod(selectedEl, 'left', px(v));
      }
      showTooltipForSelected();
      return;
    }

    // +/= — increase font-size
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const cur = parseFloat(cs.fontSize) || 14;
      // Proportional step for tiny values (em-based fate card text)
      const step = big ? Math.max(0.2, cur * 0.15) : Math.max(0.1, cur * 0.05);
      const v = Math.max(0.5, cur + step);
      forceStyle(selectedEl, 'font-size', px(v));
      recordMod(selectedEl, 'font-size', px(v));
      showTooltipForSelected();
      return;
    }

    // -/_ — decrease font-size
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const cur = parseFloat(cs.fontSize) || 14;
      const step = big ? Math.max(0.2, cur * 0.15) : Math.max(0.1, cur * 0.05);
      const v = Math.max(0.5, cur - step);
      forceStyle(selectedEl, 'font-size', px(v));
      recordMod(selectedEl, 'font-size', px(v));
      showTooltipForSelected();
      return;
    }

    // ] — increase width
    if (e.key === ']') {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const step = big ? 10 : 2;
      const v = Math.max(10, (parseFloat(cs.width) || 100) + step);
      forceStyle(selectedEl, 'width', px(v));
      recordMod(selectedEl, 'width', px(v));
      showTooltipForSelected();
      return;
    }

    // [ — decrease width
    if (e.key === '[') {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const step = big ? 10 : 2;
      const v = Math.max(10, (parseFloat(cs.width) || 100) - step);
      forceStyle(selectedEl, 'width', px(v));
      recordMod(selectedEl, 'width', px(v));
      showTooltipForSelected();
      return;
    }

    // ' — increase height
    if (e.key === "'") {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const step = big ? 10 : 2;
      const v = Math.max(5, (parseFloat(cs.height) || 20) + step);
      forceStyle(selectedEl, 'height', px(v));
      recordMod(selectedEl, 'height', px(v));
      showTooltipForSelected();
      return;
    }

    // ; — decrease height
    if (e.key === ';') {
      e.preventDefault();
      const cs = getComputedStyle(selectedEl);
      const step = big ? 10 : 2;
      const v = Math.max(5, (parseFloat(cs.height) || 20) - step);
      forceStyle(selectedEl, 'height', px(v));
      recordMod(selectedEl, 'height', px(v));
      showTooltipForSelected();
      return;
    }
  }

  // ── Scroll-to-Resize (trackpad compatible) ───────────────────────────

  // Throttle scroll events — trackpads fire dozens per gesture
  let lastWheelTime = 0;
  const WHEEL_THROTTLE_MS = 60; // ~16 events/sec max

  function onWheel(e) {
    if (!active) return;
    const el = e.target.closest('.design-handle');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();

    // Throttle to prevent trackpad rapid-fire
    const now = Date.now();
    if (now - lastWheelTime < WHEEL_THROTTLE_MS) return;
    lastWheelTime = now;

    const target = el.__designEl || el;

    // Kill transitions on scroll target
    forceStyle(target, 'transition', 'none');

    const delta = e.deltaY > 0 ? -0.5 : 0.5;

    if (e.shiftKey) {
      const cs = getComputedStyle(target);
      let w = parseFloat(cs.width) || 100;
      w = Math.max(20, w + delta * 4);
      forceStyle(target, 'width', px(w));
      recordMod(target, 'width', px(w));
    } else {
      const cs = getComputedStyle(target);
      let fs = parseFloat(cs.fontSize) || 14;
      // Proportional step for tiny em-based values
      const step = Math.max(0.1, fs * 0.05);
      fs = Math.max(0.5, fs + (delta > 0 ? step : -step));
      forceStyle(target, 'font-size', px(fs));
      recordMod(target, 'font-size', px(fs));
    }

    // Auto-select on scroll interaction
    if (target !== selectedEl) selectDesignEl(target);
    showTooltipForSelected();
  }

  // ── Element Decoration ───────────────────────────────────────────────

  const handles = [];

  function decorateEl(el) {
    if (el.classList.contains('design-handle')) return;
    if (el.offsetParent === null && getComputedStyle(el).display === 'none') return;

    el.classList.add('design-handle');
    el.style.cursor = 'move';
    el.style.outline = '2px solid rgba(212,168,68,0.7)';
    el.style.outlineOffset = '2px';
    // Ensure positioned for top/left to work
    const pos = el.style.position || getComputedStyle(el).position;
    if (!pos || pos === 'static') {
      forceStyle(el, 'position', 'relative');
    }
    // Disable transitions so designer changes are instant
    forceStyle(el, 'transition', 'none');

    // Add visible corner handles (4 corners)
    const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    corners.forEach(pos => {
      const corner = document.createElement('div');
      corner.className = 'design-corner';
      corner.dataset.corner = pos;
      Object.assign(corner.style, {
        position: 'absolute', width: '8px', height: '8px',
        background: '#d4a844', border: '1px solid #1a1408',
        zIndex: '100000', pointerEvents: 'none', boxSizing: 'border-box',
      });
      if (pos.includes('top')) corner.style.top = '-5px';
      if (pos.includes('bottom')) corner.style.bottom = '-5px';
      if (pos.includes('left')) corner.style.left = '-5px';
      if (pos.includes('right')) corner.style.right = '-5px';
      el.appendChild(corner);
    });

    handles.push(el);
  }

  function decorateElements() {
    // Only decorate elements that are actually visible / in the viewport.
    // When a card is zoomed into #sbZoomPortal, only decorate inside the portal
    // to avoid layout shifts on unzoomed cards.
    const portal = document.getElementById('sbZoomPortal');
    const portalHasCard = portal && portal.querySelector('.sb-card, .fate-card');

    // Standard corridor cards
    const cardScope = portalHasCard ? portal : document;
    const cards = cardScope.querySelectorAll('.sb-card');
    cards.forEach(card => {
      ELEMENT_SELECTORS.forEach(sel => {
        const base = sel.split(' > ').pop();
        card.querySelectorAll(base).forEach(decorateEl);
      });
    });

    // Fate cards (petition, tempt, etc.)
    const fateCards = cardScope.querySelectorAll('.fate-card');
    fateCards.forEach(card => {
      FATE_ELEMENT_SELECTORS.forEach(sel => {
        const base = sel.split(' > ').pop();
        card.querySelectorAll(base).forEach(decorateEl);
      });
    });
  }

  function unDecorateElements() {
    handles.forEach(el => {
      el.classList.remove('design-handle');
      el.style.cursor = '';
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.removeProperty('transition');
      // Remove corner handles
      el.querySelectorAll('.design-corner').forEach(c => c.remove());
    });
    handles.length = 0;
  }

  // ── Activate / Deactivate ────────────────────────────────────────────

  let observer = null;
  let decorateTimer = null;

  function activate() {
    active = true;
    createBadge();
    createPanel();
    decorateElements();

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('wheel', onWheel, { capture: true, passive: false });

    // Debounced observer — avoids re-decoration storms from class mutations
    observer = new MutationObserver((mutations) => {
      if (!active) return;
      // Skip mutations caused by the designer's own UI or decoration
      const isDesignerNoise = mutations.every(m => {
        // Class changes on already-decorated elements (design-handle adds)
        if (m.type === 'attributes' && m.attributeName === 'class' &&
            m.target.classList.contains('design-handle')) return true;
        // Mutations inside the designer's panel, badge, or tooltip
        const node = m.target;
        if (node === panel || node === badge || node === tooltip) return true;
        if (panel && panel.contains(node)) return true;
        if (tooltip && tooltip.contains(node)) return true;
        return false;
      });
      if (isDesignerNoise) return;
      clearTimeout(decorateTimer);
      decorateTimer = setTimeout(decorateElements, 150);
    });
    // Observe both #setup (corridor cards) and body (zoom portal is a body child)
    observer.observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class'],
    });

    console.log('%c[Card Designer] ON — Click to select, arrow keys to move, +/- for font-size, ]/[ for width, \'/; for height', 'color: #d4a844; font-weight: bold');
  }

  function deactivate() {
    active = false;
    deselectDesignEl();
    unDecorateElements();
    if (badge) { badge.remove(); badge = null; }
    if (panel) { panel.remove(); panel = null; }
    if (tooltip) { tooltip.remove(); tooltip = null; }
    if (observer) { observer.disconnect(); observer = null; }
    clearTimeout(decorateTimer);
    document.removeEventListener('mousedown', onMouseDown, true);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('wheel', onWheel, { capture: true, passive: false });

    if (mods.size) {
      console.log('%c[Card Designer] Generated CSS:', 'color: #d4a844; font-weight: bold');
      console.log(buildCSS());
    }
    console.log('%c[Card Designer] OFF', 'color: #d4a844; font-weight: bold');
  }

  // ── Keyboard Toggle ──────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      if (active) deactivate();
      else activate();
    }
  });

  // Expose active state so app.js can skip DOM rebuilds during design mode
  window.__cardDesignerActive = () => active;

  console.log('%c[Card Designer] Ready — Press Ctrl+Shift+D to toggle', 'color: #d4a844');
})();
