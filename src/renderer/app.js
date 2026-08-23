/**
 * XenoMenu Renderer Logic
 * Keyboard navigation, status polling, menu actions.
 * Pure client-side; all privileged ops via xenoAPI (preload).
 */

'use strict';

(function () {
  const MENU_ITEMS = [
    { id: 'status', label: 'STATUS', desc: 'Detailed system metrics & diagnostics' },
    { id: 'launch', label: 'LAUNCH', desc: 'Quick launch applications & folders' },
    { id: 'inventory', label: 'INVENTORY', desc: 'Pinned files, folders & favorites' },
    { id: 'skills', label: 'SKILLS', desc: 'Shortcuts, scripts & power tools' },
    { id: 'config', label: 'CONFIG', desc: 'Appearance, behavior & security settings' },
    { id: 'about', label: 'ABOUT', desc: 'About XenoMenu & credits' },
    { id: 'exit', label: 'EXIT', desc: 'Hide or quit the application' }
  ];

  let selectedIndex = 0;
  let statusData = null;
  let pollTimer = null;
  let clockTimer = null;

  const els = {
    menuItems: document.getElementById('menu-items'),
    partyStatus: document.getElementById('party-status'),
    footerFree: document.getElementById('footer-free'),
    footerTime: document.getElementById('footer-time'),
    footerOs: document.getElementById('footer-os'),
    btnClose: document.getElementById('btn-close'),
    detailOverlay: document.getElementById('detail-overlay'),
    detailTitle: document.getElementById('detail-title'),
    detailContent: document.getElementById('detail-content'),
    detailClose: document.getElementById('detail-close'),
    cursor: document.getElementById('cursor')
  };

  // ---------- Init ----------
  function init() {
    renderMenu();
    updateSelection();
    bindEvents();
    startPolling();
    startClock();
    // Initial load
    refreshStatus();
  }

  function renderMenu() {
    els.menuItems.innerHTML = MENU_ITEMS.map((item, i) => `
      <li data-index="${i}" data-id="${item.id}" role="menuitem" tabindex="-1">
        <span class="cmd-key">${i + 1}</span>${item.label}
      </li>
    `).join('');
  }

  function updateSelection() {
    const items = els.menuItems.querySelectorAll('li');
    items.forEach((li, i) => {
      li.classList.toggle('selected', i === selectedIndex);
    });
    // Move visual cursor (optional enhancement)
    const selected = items[selectedIndex];
    if (selected && els.cursor) {
      const rect = selected.getBoundingClientRect();
      const parentRect = selected.closest('.frame-inner').getBoundingClientRect();
      // Position relative; for simplicity we rely on CSS selected state
    }
  }

  // ---------- Status ----------
  async function refreshStatus() {
    if (!window.xenoAPI) {
      console.warn('xenoAPI not available');
      return;
    }
    try {
      statusData = await window.xenoAPI.getSystemStatus();
      renderPartyStatus();
      updateFooter();
    } catch (e) {
      console.error('Status refresh failed', e);
    }
  }

  function renderPartyStatus() {
    if (!statusData || statusData.error) {
      els.partyStatus.innerHTML = `<div class="status-card"><div class="name">SYSTEM</div><div class="stats">Unavailable</div></div>`;
      return;
    }

    const cards = [];

    // CPU
    if (statusData.cpu) {
      const c = statusData.cpu;
      const low = c.hp < 30;
      cards.push(`
        <div class="status-card ${low ? 'low' : ''}">
          <div class="name">${c.name}</div>
          <div class="stats">
            <span>LOAD ${c.usage}%</span>
            <span>${c.cores} CORES</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${c.hp}%"></div>
            <span class="bar-label">HP ${c.hp}/100</span>
          </div>
        </div>
      `);
    }

    // Memory
    if (statusData.memory) {
      const m = statusData.memory;
      const low = m.hp < 20;
      cards.push(`
        <div class="status-card ${low ? 'low' : ''}">
          <div class="name">${m.name}</div>
          <div class="stats">
            <span>${m.used} / ${m.total} GB</span>
            <span>${m.usage}% USED</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${m.hp}%"></div>
            <span class="bar-label">HP ${m.hp}/100</span>
          </div>
        </div>
      `);
    }

    // Storage
    if (statusData.storage) {
      const s = statusData.storage;
      const low = s.hp < 15;
      cards.push(`
        <div class="status-card ${low ? 'low' : ''}">
          <div class="name">${s.name}</div>
          <div class="stats">
            <span>${s.free} GB FREE</span>
            <span>${s.usage}% USED</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${s.hp}%"></div>
            <span class="bar-label">HP ${s.hp}/100</span>
          </div>
        </div>
      `);
    }

    // Battery (if present)
    if (statusData.battery) {
      const b = statusData.battery;
      const low = b.hp < 20;
      cards.push(`
        <div class="status-card ${low ? 'low' : ''}">
          <div class="name">${b.name}${b.isCharging ? ' ⚡' : ''}</div>
          <div class="stats">
            <span>${b.percent}%</span>
            <span>${b.isCharging ? 'CHARGING' : 'ON BATTERY'}</span>
          </div>
          <div class="bar-container">
            <div class="bar-fill" style="width: ${b.hp}%"></div>
            <span class="bar-label">HP ${b.hp}/100</span>
          </div>
        </div>
      `);
    }

    els.partyStatus.innerHTML = cards.join('') || '<div class="status-card"><div class="name">NO DATA</div></div>';
  }

  function updateFooter() {
    if (statusData && statusData.storage) {
      els.footerFree.textContent = `${statusData.storage.free} GB`;
    }
    if (statusData && statusData.os) {
      const os = statusData.os;
      els.footerOs.textContent = `${os.platform} ${os.arch}`;
    }
  }

  function startClock() {
    function tick() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      els.footerTime.textContent = `${h}:${m}:${s}`;
    }
    tick();
    clockTimer = setInterval(tick, 1000);
  }

  function startPolling() {
    pollTimer = setInterval(refreshStatus, 3000); // every 3s
  }

  // ---------- Navigation & Actions ----------
  function selectNext(delta) {
    selectedIndex = (selectedIndex + delta + MENU_ITEMS.length) % MENU_ITEMS.length;
    updateSelection();
  }

  function activateSelected() {
    const item = MENU_ITEMS[selectedIndex];
    if (!item) return;
    handleCommand(item.id);
  }

  function handleCommand(id) {
    switch (id) {
      case 'status':
        showDetail('SYSTEM STATUS', renderStatusDetail());
        break;
      case 'launch':
        showDetail('LAUNCH', `
          <h3>Quick Launch</h3>
          <p>This panel will list frequently used applications and folders.</p>
          <p class="dim">In a future update you will be able to pin apps here (like party members).</p>
          <ul>
            <li>• Drag & drop support planned</li>
            <li>• macOS Spotlight / Windows Search integration</li>
          </ul>
          <p style="margin-top:12px;color:var(--accent-gold)">Press Esc or ◀ BACK to return.</p>
        `);
        break;
      case 'inventory':
        showDetail('INVENTORY', `
          <h3>Pinned Items</h3>
          <p>Your favorite files and folders appear here.</p>
          <p class="dim">Currently empty. Use Config to manage favorites (coming soon).</p>
        `);
        break;
      case 'skills':
        showDetail('SKILLS', `
          <h3>Power Tools & Shortcuts</h3>
          <ul>
            <li><strong>Toggle Menu</strong> — ${window.xenoAPI?.platform === 'darwin' ? '⌘⇧X' : 'Ctrl+Shift+X'}</li>
            <li><strong>Navigate</strong> — ↑ ↓ or number keys 1-7</li>
            <li><strong>Confirm</strong> — Enter / Return</li>
            <li><strong>Back / Hide</strong> — Esc</li>
          </ul>
          <p style="margin-top:10px">Custom scripts and system actions can be bound here in future releases.</p>
        `);
        break;
      case 'config':
        showConfigDetail();
        break;
      case 'about':
        showDetail('ABOUT XENOMENU', `
          <h3>XenoMenu v1.0.0</h3>
          <p>A live desktop companion inspired by the iconic 1998 <em>Xenogears</em> menu interface.</p>
          <p>Designed to enhance everyday desktop workflow with a nostalgic yet practical system dashboard and launcher.</p>
          <br>
          <p><strong>Platform focus:</strong> macOS (Mac mini & Apple Silicon first), Windows 11 supported.</p>
          <p><strong>Security:</strong> Context isolation, sandboxed renderer, minimal IPC surface, no remote code.</p>
          <br>
          <p style="color:var(--accent-gold)">Created for galacticlight · github.com/galacticlight/xeno-menu</p>
          <p style="font-size:11px;color:var(--text-dim);margin-top:8px">Xenogears is a trademark of Square Enix. This is an unofficial fan-inspired utility.</p>
        `);
        break;
      case 'exit':
        // Soft hide by default
        if (window.xenoAPI) {
          window.xenoAPI.hideWindow();
        }
        break;
      default:
        break;
    }
  }

  function renderStatusDetail() {
    if (!statusData || statusData.error) {
      return '<p>Unable to retrieve live system data.</p>';
    }
    const d = statusData;
    let html = '<h3>Live Diagnostics</h3>';
    if (d.cpu) {
      html += `<div class="metric"><span>CPU Load</span><span>${d.cpu.usage}%</span></div>`;
      html += `<div class="metric"><span>Logical Cores</span><span>${d.cpu.cores}</span></div>`;
    }
    if (d.memory) {
      html += `<div class="metric"><span>Memory Used</span><span>${d.memory.used} / ${d.memory.total} GB</span></div>`;
    }
    if (d.storage) {
      html += `<div class="metric"><span>Storage Free</span><span>${d.storage.free} GB</span></div>`;
      html += `<div class="metric"><span>Storage Used</span><span>${d.storage.usage}%</span></div>`;
    }
    if (d.battery) {
      html += `<div class="metric"><span>Battery</span><span>${d.battery.percent}% ${d.battery.isCharging ? '(Charging)' : ''}</span></div>`;
    }
    if (d.os) {
      html += `<div class="metric"><span>OS</span><span>${d.os.distro || d.os.platform} ${d.os.release || ''}</span></div>`;
      html += `<div class="metric"><span>Architecture</span><span>${d.os.arch}</span></div>`;
    }
    if (d.uptime) {
      const hrs = Math.floor(d.uptime / 3600);
      const mins = Math.floor((d.uptime % 3600) / 60);
      html += `<div class="metric"><span>Uptime</span><span>${hrs}h ${mins}m</span></div>`;
    }
    return html;
  }

  async function showConfigDetail() {
    let config = { alwaysOnTop: true, opacity: 0.95, theme: 'classic' };
    try {
      if (window.xenoAPI) config = await window.xenoAPI.getConfig();
    } catch (_) {}

    const html = `
      <h3>Configuration</h3>
      <div class="metric">
        <span>Always on Top</span>
        <span>${config.alwaysOnTop ? 'ON' : 'OFF'}</span>
      </div>
      <div class="metric">
        <span>Opacity</span>
        <span>${Math.round((config.opacity || 0.95) * 100)}%</span>
      </div>
      <div class="metric">
        <span>Theme</span>
        <span>${(config.theme || 'classic').toUpperCase()}</span>
      </div>
      <p style="margin-top:14px;font-size:12px;color:var(--text-dim)">
        Toggle Always-on-Top from the system tray menu.<br>
        More options (opacity slider, theme switcher, favorites manager) coming in future updates.
      </p>
    `;
    showDetail('CONFIG', html);
  }

  function showDetail(title, contentHtml) {
    els.detailTitle.textContent = title;
    els.detailContent.innerHTML = contentHtml;
    els.detailOverlay.classList.remove('hidden');
  }

  function hideDetail() {
    els.detailOverlay.classList.add('hidden');
  }

  // ---------- Events ----------
  function bindEvents() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!els.detailOverlay.classList.contains('hidden')) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          hideDetail();
        }
        return;
      }

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          selectNext(-1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          selectNext(1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          activateSelected();
          break;
        case 'Escape':
          e.preventDefault();
          if (window.xenoAPI) window.xenoAPI.hideWindow();
          break;
        default:
          // Number keys 1-7
          if (e.key >= '1' && e.key <= '7') {
            const idx = parseInt(e.key, 10) - 1;
            if (idx < MENU_ITEMS.length) {
              selectedIndex = idx;
              updateSelection();
              activateSelected();
            }
          }
          break;
      }
    });

    // Mouse click on menu items
    els.menuItems.addEventListener('click', (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const idx = parseInt(li.dataset.index, 10);
      if (!isNaN(idx)) {
        selectedIndex = idx;
        updateSelection();
        activateSelected();
      }
    });

    // Close / Back buttons
    els.btnClose.addEventListener('click', () => {
      if (window.xenoAPI) window.xenoAPI.hideWindow();
    });
    els.detailClose.addEventListener('click', hideDetail);

    // Prevent context menu for cleaner feel
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
