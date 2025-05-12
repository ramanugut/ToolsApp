/*
  ToolsApp 2.0 – main.js
  --------------------------------------------------------------
  Handles site‑wide behaviour that every page shares:
    • Sidebar toggle & ESC close
    • Dark‑mode persistence
    • Recent‑tools tracking (index page rendering)
    • Dynamic‑list rows (add / remove)
    • Simple tab system (Converters)
    • Helper: ZAR currency formatter
    • (Optional) service‑worker registration
*/

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    /* =========================================================
       1. Sidebar toggle
       ========================================================= */
    const sidebar = document.getElementById('sidebar');
    const menuBtn = document.querySelector('.menu-toggle');
    const closeBtn = sidebar ? sidebar.querySelector('.sidebar-close') : null;

    function openSidebar() {
      sidebar?.classList.add('open');
      menuBtn?.setAttribute('aria-expanded', 'true');
    }
    function closeSidebar() {
      sidebar?.classList.remove('open');
      menuBtn?.setAttribute('aria-expanded', 'false');
    }

    menuBtn?.addEventListener('click', openSidebar);
    closeBtn?.addEventListener('click', closeSidebar);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });

    /* =========================================================
       2. Dark‑mode toggle (stored in localStorage)
       ========================================================= */
    const body = document.body;
    const dmToggle = document.getElementById('darkModeToggle');

    // Apply stored preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') body.classList.add('dark');

    dmToggle?.addEventListener('click', () => {
      body.classList.toggle('dark');
      localStorage.setItem('theme', body.classList.contains('dark') ? 'dark' : 'light');
    });

    /* =========================================================
       3. Recent‑tools list (max 5 pages)
       ========================================================= */
    const page = location.pathname.split('/').pop();
    const excluded = ['', 'index.html'];
    if (!excluded.includes(page)) saveRecent(page);
    renderRecent();

    function saveRecent(p) {
      let recents = JSON.parse(localStorage.getItem('recentTools') || '[]');
      recents = recents.filter((f) => f !== p);
      recents.unshift(p);
      if (recents.length > 5) recents.pop();
      localStorage.setItem('recentTools', JSON.stringify(recents));
    }

    function renderRecent() {
      const listEl = document.querySelector('.recent-list');
      if (!listEl) return;
      const recents = JSON.parse(localStorage.getItem('recentTools') || '[]');
      if (!recents.length) {
        listEl.innerHTML = '<li>No recent tools yet.</li>';
        return;
      }
      const labelMap = {
        'payslip.html': 'Payslip Maker',
        'tax.html': 'Tax Calculator',
        'loan.html': 'Loan & Bond Calculator',
        'budget.html': 'Budget Planner',
        'retirement.html': 'Retirement Planner',
        'invoice.html': 'Invoice Generator',
        'converters.html': 'Converters',
      };
      listEl.innerHTML = '';
      recents.forEach((file) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = file;
        a.textContent = labelMap[file] || prettyName(file);
        li.appendChild(a);
        listEl.appendChild(li);
      });
    }

    function prettyName(filename) {
      return filename.replace('.html', '').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    /* =========================================================
       4. Dynamic‑list rows (allowances, items, etc.)
       ========================================================= */
    document.addEventListener('click', (e) => {
      const addBtn = e.target.closest('.add-row');
      if (addBtn) {
        const container = document.getElementById(addBtn.dataset.target);
        if (container) createRow(container);
      }
      const removeBtn = e.target.closest('.remove-row');
      if (removeBtn) {
        const row = removeBtn.closest('.row');
        if (row) row.remove();
      }
    });

    function createRow(container) {
      const type = container.dataset.type || 'item';
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = `
        <input type="text" placeholder="${capitalize(type)} description" required>
        <input type="number" min="0" step="0.01" placeholder="R" required>
        <button type="button" class="remove-row" aria-label="Remove">&times;</button>`;
      container.appendChild(row);
    }

    function capitalize(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    /* =========================================================
       5. Tab system (Converters page)
       ========================================================= */
    document.querySelectorAll('.tabs').forEach((tabSet) => {
      const buttons = tabSet.querySelectorAll('[role="tab"]');
      const panels = Array.from(buttons).map(btn => 
        document.getElementById(btn.getAttribute('aria-controls'))
      );
      
      buttons.forEach((btn, index) => {
        btn.addEventListener('click', () => {
          if (btn.classList.contains('active')) return;
          
          // Deactivate all tabs and hide all panels
          buttons.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });
          panels.forEach(panel => {
            if (panel) panel.hidden = true;
          });
          
          // Activate current tab and show its panel
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
          
          const panel = document.getElementById(btn.getAttribute('aria-controls'));
          if (panel) panel.hidden = false;
        });
      });
    });

    /* =========================================================
       6. Global helper – ZAR currency formatter
       ========================================================= */
    window.formatZAR = (value) => {
      return new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' }).format(Number(value) || 0);
    };

    /* =========================================================
       7. Optional: service‑worker support
       ========================================================= */
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        })
        .catch(error => {
          console.error('ServiceWorker registration failed: ', error);
        });
    }
  });
})();