// dropsub-notifications.js — shared notification bell for all DropSub pages
(function () {
  'use strict';

  var BASE = 'https://api.dropsub.com/api';
  var _notifications = [];
  var _loaded = false;

  // ── Inject styles ─────────────────────────────────────────────
  var _style = document.createElement('style');
  _style.textContent = [
    // Base button — provides styling for pages that don't define .notif-btn
    '.notif-btn{width:30px;height:30px;background:var(--bg-card,#132540);border:1px solid var(--border-bright,#1e3a5f);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.85rem;cursor:pointer;position:relative;color:var(--text-mid,#7a9cc8);flex-shrink:0;}',
    '.notif-btn:hover{background:var(--bg-hover,rgba(41,121,255,.08));color:var(--text-white,#e8f0ff);}',
    // Wrapper (injected by script)
    '.notif-wrap{position:relative;display:inline-flex;}',
    // Red badge
    '.notif-badge{position:absolute;top:-4px;right:-4px;min-width:16px;height:16px;background:#e53935;border-radius:8px;border:2px solid var(--bg-deepest,#080f1c);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;padding:0 3px;z-index:10;pointer-events:none;line-height:1;}',
    // Dropdown panel
    '.notif-panel{display:none;position:absolute;top:calc(100% + 10px);right:0;width:360px;background:var(--bg-panel,#0f1d35);border:1px solid var(--border-bright,#1e3a5f);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.65);z-index:400;overflow:hidden;}',
    '.notif-panel.open{display:block;animation:_notifIn .15s cubic-bezier(.22,1,.36,1);}',
    '@keyframes _notifIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}',
    // Panel header
    '.notif-panel-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px 10px;border-bottom:1px solid var(--border,#1a2f4e);}',
    '.notif-panel-title{font-size:.72rem;font-weight:700;color:var(--text-white,#e8f0ff);letter-spacing:.07em;text-transform:uppercase;}',
    '.notif-mark-all-btn{font-size:.72rem;color:var(--blue-bright,#2979ff);background:none;border:none;cursor:pointer;padding:2px 0;}',
    '.notif-mark-all-btn:hover{text-decoration:underline;}',
    // Scrollable list
    '.notif-list-inner{max-height:380px;overflow-y:auto;}',
    // Notification row
    '.notif-item{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;cursor:pointer;border-left:3px solid transparent;transition:background .12s;}',
    '.notif-item+.notif-item{border-top:1px solid var(--border,#1a2f4e);}',
    '.notif-item:hover{background:var(--bg-hover,rgba(41,121,255,.07));}',
    '.notif-item.unread{border-left-color:var(--blue-bright,#2979ff);background:rgba(41,121,255,.05);}',
    // Icon circle
    '.notif-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.notif-icon.follower{background:rgba(245,166,35,.13);color:#f5a623;}',
    '.notif-icon.subscriber{background:rgba(41,121,255,.15);color:var(--blue-bright,#2979ff);}',
    '.notif-icon.drop{background:rgba(76,175,80,.13);color:#66bb6a;}',
    // Text area
    '.notif-text{flex:1;min-width:0;}',
    '.notif-item-title{font-size:.8rem;font-weight:600;color:var(--text-white,#e8f0ff);line-height:1.3;}',
    '.notif-item-desc{font-size:.75rem;color:var(--text-mid,#7a9cc8);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.notif-item-time{font-size:.68rem;color:var(--text-dim,#3d5a8a);margin-top:3px;}',
    // Empty state
    '.notif-empty-state{padding:36px 16px;text-align:center;color:var(--text-dim,#3d5a8a);font-size:.8rem;}',
  ].join('');
  document.head.appendChild(_style);

  // ── Helpers ───────────────────────────────────────────────────
  function _token() {
    return (window.getAuthToken && window.getAuthToken()) ||
      localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || '';
  }

  function _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function _timeAgo(iso) {
    var diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)    return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function _iconCls(type) {
    if (type === 'new_follower')   return 'follower';
    if (type === 'new_subscriber') return 'subscriber';
    return 'drop';
  }

  // Inline SVG so no external dependencies
  function _iconSvg(type) {
    if (type === 'new_follower') {
      return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.6C6.4 16.1 1 11.3 1 7.2 1 3.4 4.1 2 6.3 2c1.3 0 4.2.5 5.7 4.5C13.6 2.5 16.5 2 17.7 2 20.3 2 23 3.6 23 7.2c0 4.1-5.1 8.7-11 14.4z"/></svg>';
    }
    if (type === 'new_subscriber') {
      return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
    }
    return '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"/></svg>';
  }

  // ── Badge: update all badges on the page ──────────────────────
  function _updateBadges(count) {
    var badges = document.querySelectorAll('.notif-badge');
    for (var i = 0; i < badges.length; i++) {
      if (count > 0) {
        badges[i].textContent = count > 99 ? '99+' : String(count);
        badges[i].style.display = 'flex';
      } else {
        badges[i].style.display = 'none';
      }
    }
  }

  // ── Render into a specific list element ───────────────────────
  function _renderList(listEl) {
    if (!_notifications.length) {
      listEl.innerHTML = '<div class="notif-empty-state">No notifications yet</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < _notifications.length; i++) {
      var n = _notifications[i];
      html += '<div class="notif-item' + (n.is_read ? '' : ' unread') + '" data-id="' + _esc(n.id) + '">' +
        '<div class="notif-icon ' + _iconCls(n.type) + '">' + _iconSvg(n.type) + '</div>' +
        '<div class="notif-text">' +
          '<div class="notif-item-title">' + _esc(n.title) + '</div>' +
          '<div class="notif-item-desc">'  + _esc(n.body)  + '</div>' +
          '<div class="notif-item-time">'  + _timeAgo(n.created_at) + '</div>' +
        '</div></div>';
    }
    listEl.innerHTML = html;

    var items = listEl.querySelectorAll('.notif-item');
    for (var j = 0; j < items.length; j++) {
      (function (el) {
        el.addEventListener('click', function () {
          _markRead(el.getAttribute('data-id'));
        });
      }(items[j]));
    }
  }

  // Re-render all open/loaded panels
  function _renderAll() {
    var lists = document.querySelectorAll('.notif-list-inner');
    for (var i = 0; i < lists.length; i++) {
      _renderList(lists[i]);
    }
  }

  // ── Count unread from in-memory array ────────────────────────
  function _unreadCount() {
    var n = 0;
    for (var i = 0; i < _notifications.length; i++) {
      if (!_notifications[i].is_read) n++;
    }
    return n;
  }

  // ── API: load unread count only (lightweight, on page load) ──
  function _loadCount() {
    var tok = _token();
    if (!tok) return;
    fetch(BASE + '/notifications/unread-count', {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(function (r) { return r.ok ? r.json() : { count: 0 }; })
      .then(function (d) { _updateBadges(d.count || 0); })
      .catch(function () {});
  }

  // ── API: load full notification list ─────────────────────────
  function _loadNotifications(listEl) {
    var tok = _token();
    if (!tok) {
      listEl.innerHTML = '<div class="notif-empty-state">Sign in to view notifications</div>';
      return;
    }
    listEl.innerHTML = '<div class="notif-empty-state" style="opacity:.5">Loading…</div>';
    fetch(BASE + '/notifications', {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(function (r) { return r.ok ? r.json() : { notifications: [] }; })
      .then(function (d) {
        _notifications = d.notifications || [];
        _loaded = true;
        _renderAll();
        _updateBadges(_unreadCount());
      })
      .catch(function () {
        listEl.innerHTML = '<div class="notif-empty-state">Failed to load — try again</div>';
      });
  }

  // ── Mark a single notification read ──────────────────────────
  function _markRead(id) {
    var tok = _token();
    for (var i = 0; i < _notifications.length; i++) {
      if (_notifications[i].id === id) {
        if (!_notifications[i].is_read) {
          _notifications[i].is_read = true;
          fetch(BASE + '/notifications/' + id + '/read', {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + tok },
          }).catch(function () {});
        }
        break;
      }
    }
    _renderAll();
    _updateBadges(_unreadCount());
  }

  // ── Mark all read ─────────────────────────────────────────────
  function _markAllRead() {
    var tok = _token();
    for (var i = 0; i < _notifications.length; i++) _notifications[i].is_read = true;
    _renderAll();
    _updateBadges(0);
    fetch(BASE + '/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer ' + tok },
    }).catch(function () {});
  }

  // ── Wire up one bell button ───────────────────────────────────
  function _initBell(btn) {
    // Remove old onclick / static dot
    btn.removeAttribute('onclick');
    btn.onclick = null;
    var oldDot = btn.querySelector('.notif-dot');
    if (oldDot) oldDot.remove();

    // Wrap button so the panel positions relative to it
    var wrap = document.createElement('div');
    wrap.className = 'notif-wrap';
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);

    // Red badge
    var badge = document.createElement('div');
    badge.className = 'notif-badge';
    badge.style.display = 'none';
    wrap.appendChild(badge);

    // Dropdown panel
    var panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.innerHTML =
      '<div class="notif-panel-head">' +
        '<span class="notif-panel-title">Notifications</span>' +
        '<button class="notif-mark-all-btn">Mark all read</button>' +
      '</div>' +
      '<div class="notif-list-inner"><div class="notif-empty-state">No notifications yet</div></div>';
    wrap.appendChild(panel);

    var listEl = panel.querySelector('.notif-list-inner');

    // Bell click — toggle panel
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = panel.classList.contains('open');
      // Close all other open panels first
      var others = document.querySelectorAll('.notif-panel.open');
      for (var k = 0; k < others.length; k++) others[k].classList.remove('open');
      if (!isOpen) {
        panel.classList.add('open');
        if (_loaded) {
          _renderList(listEl);
        } else {
          _loadNotifications(listEl);
        }
      }
    });

    // Mark all read
    panel.querySelector('.notif-mark-all-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      _markAllRead();
    });

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) panel.classList.remove('open');
    });
  }

  // ── Init all bells on DOMContentLoaded ───────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    var btns = document.querySelectorAll('.notif-btn');
    for (var i = 0; i < btns.length; i++) {
      _initBell(btns[i]);
    }
    _loadCount();
  });
}());
