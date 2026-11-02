// Click a diagram or image to open it full screen. In the viewer, the wheel or + and - zoom,
// dragging pans, 0 or a double click resets, and Escape or a click outside the figure closes it.
(() => {
    const selector = '.content pre.mermaid svg, .content img';
    let overlay, stage, scale, x, y, drag;

    const apply = () => {
        stage.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    };
    const reset = () => {
        scale = 1;
        x = 0;
        y = 0;
        apply();
    };
    const zoom = (factor, cx = innerWidth / 2, cy = innerHeight / 2) => {
        const next = Math.min(20, Math.max(0.2, scale * factor));
        const rect = stage.getBoundingClientRect();
        // Keep the point under the cursor fixed while the scale changes.
        x += (cx - rect.left) * (1 - next / scale);
        y += (cy - rect.top) * (1 - next / scale);
        scale = next;
        apply();
    };
    const close = () => {
        overlay.remove();
        overlay = null;
        document.removeEventListener('keydown', onKey);
    };
    const onKey = (event) => {
        if (event.key === 'Escape') close();
        else if (event.key === '+' || event.key === '=') zoom(1.25);
        else if (event.key === '-') zoom(0.8);
        else if (event.key === '0') reset();
        else return;
        event.preventDefault();
    };

    const open = (figure) => {
        overlay = document.createElement('div');
        overlay.className = 'zoom-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Zoomed figure. Escape closes.');
        stage = document.createElement('div');
        stage.className = 'zoom-stage';
        const copy = figure.cloneNode(true);
        copy.removeAttribute('width');
        copy.removeAttribute('height');
        copy.style.maxWidth = 'none';
        stage.appendChild(copy);
        overlay.appendChild(stage);
        document.body.appendChild(overlay);
        reset();

        overlay.addEventListener('wheel', (event) => {
            event.preventDefault();
            zoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, event.clientX, event.clientY);
        }, { passive: false });
        overlay.addEventListener('pointerdown', (event) => {
            drag = { px: event.clientX, py: event.clientY, x, y, moved: false };
            overlay.setPointerCapture(event.pointerId);
        });
        overlay.addEventListener('pointermove', (event) => {
            if (!drag) return;
            x = drag.x + event.clientX - drag.px;
            y = drag.y + event.clientY - drag.py;
            drag.moved ||= Math.abs(event.clientX - drag.px) + Math.abs(event.clientY - drag.py) > 4;
            apply();
        });
        overlay.addEventListener('pointerup', (event) => {
            const clickedOutside = !drag?.moved && !stage.contains(event.target);
            drag = null;
            if (clickedOutside) close();
        });
        overlay.addEventListener('dblclick', reset);
        document.addEventListener('keydown', onKey);
    };

    document.addEventListener('click', (event) => {
        const figure = event.target.closest(selector);
        if (figure && !overlay && !figure.closest('a')) open(figure);
    });
})();
