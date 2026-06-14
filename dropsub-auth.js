// dropsub-auth.js — shared auth utility
(function () {
  'use strict';

  // ── Storage helpers ───────────────────────────────────────────
  function _get(key) {
    return localStorage.getItem(key) || sessionStorage.getItem(key) || null;
  }

  function _set(key, value) {
    // Mirror into whichever storage holds the access_token
    var s = localStorage.getItem('access_token') ? localStorage : sessionStorage;
    s.setItem(key, value);
  }

  function _clearAll() {
    ['access_token', 'refresh_token', 'expires_at', 'user', 'ds_profile'].forEach(function (k) {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
  }

  // ── Token expiry ──────────────────────────────────────────────
  function _isExpired() {
    var exp = _get('expires_at');
    if (!exp) return false;
    return Date.now() / 1000 >= Number(exp) - 30; // 30 s buffer
  }

  // ── Token refresh (deduplicated) ──────────────────────────────
  var _refreshPending = null;
  var _originalFetch = window.fetch.bind(window);

  function _doRefresh() {
    if (_refreshPending) return _refreshPending;
    var rt = _get('refresh_token');
    if (!rt) return Promise.reject(new Error('no_refresh_token'));

    _refreshPending = _originalFetch('https://api.dropsub.com/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    })
      .then(function (r) {
        return r.ok ? r.json() : Promise.reject(new Error('refresh_failed'));
      })
      .then(function (data) {
        if (!data.access_token) return Promise.reject(new Error('no_token'));
        _set('access_token', data.access_token);
        if (data.refresh_token) _set('refresh_token', data.refresh_token);
        if (data.expires_at)    _set('expires_at',    String(data.expires_at));
        _refreshPending = null;
        return data.access_token;
      })
      .catch(function (err) {
        _refreshPending = null;
        return Promise.reject(err);
      });

    return _refreshPending;
  }

  // ── Public: sync token read ───────────────────────────────────
  window.getAuthToken = function () {
    return _get('access_token') || '';
  };

  // ── Public: logout ────────────────────────────────────────────
  window.dsLogout = function () {
    _clearAll();
    window.location.replace('dropsub-login.html');
  };

  // ── Fetch interceptor: transparent 401 → refresh → retry ─────
  window.fetch = function (url, options) {
    var sUrl = String(url);
    // Only intercept DropSub API calls; never intercept the refresh endpoint itself
    if (sUrl.indexOf('api.dropsub.com/api') === -1 ||
        sUrl.indexOf('/api/auth/refresh') !== -1) {
      return _originalFetch(url, options);
    }

    return _originalFetch(url, options).then(function (response) {
      if (response.status !== 401) return response;

      if (!_get('refresh_token')) {
        _clearAll();
        window.location.replace('dropsub-login.html');
        return response;
      }

      return _doRefresh()
        .then(function (newToken) {
          var headers = {};
          if (options && options.headers) {
            if (typeof options.headers.forEach === 'function') {
              options.headers.forEach(function (v, k) { headers[k] = v; });
            } else {
              Object.assign(headers, options.headers);
            }
          }
          headers['Authorization'] = 'Bearer ' + newToken;
          return _originalFetch(url, Object.assign({}, options || {}, { headers: headers }));
        })
        .catch(function () {
          _clearAll();
          window.location.replace('dropsub-login.html');
          return response;
        });
    });
  };

  // ── Proactive refresh on page load (expired token at startup) ─
  (function () {
    if (_get('access_token') && _isExpired()) {
      _doRefresh().catch(function () {
        _clearAll();
        window.location.replace('dropsub-login.html');
      });
    }
  }());
}());
