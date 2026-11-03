// Reading helpers: a scroll box with a sticky header for each table, monospace styling for the data
// columns (offset, size, type and similar), and a copy-link action on each heading anchor.
(() => {
  const DATA_HEADERS = new Set([
    'offset', 'address', 'size', 'type', 'bits', 'id', 'value', 'values', 'stride', 'count',
    'range', 'bytes', 'entry size', 'slot', 'mask',
  ]);

  for (const table of document.querySelectorAll('.sl-markdown-content table')) {
    const box = document.createElement('div');
    box.className = 'table-wrap';
    table.replaceWith(box);
    box.appendChild(table);
    const head = table.querySelector('thead tr');
    if (!head) continue;
    const marks = [...head.children].map((cell) => DATA_HEADERS.has(cell.textContent.trim().toLowerCase()));
    for (const row of table.querySelectorAll('tbody tr')) {
      [...row.children].forEach((cell, i) => {
        if (marks[i]) cell.classList.add('col-data');
      });
    }
  }

  for (const link of document.querySelectorAll('.sl-markdown-content .sl-anchor-link')) {
    link.addEventListener('click', (event) => {
      const url = location.origin + location.pathname + link.getAttribute('href');
      history.replaceState(null, '', link.getAttribute('href'));
      event.preventDefault();
      navigator.clipboard?.writeText(url).then(() => {
        link.dataset.copied = '';
        setTimeout(() => delete link.dataset.copied, 1500);
      }, () => {});
    });
  }
})();
