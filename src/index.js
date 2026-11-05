import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Root, { AUTH_KEY } from './Root';
import reportWebVitals from './reportWebVitals';

// 모든 /api 요청에 로그인 토큰 자동 첨부, 만료(401)되면 다시 로그인 화면으로
const _fetch = window.fetch.bind(window);
window.fetch = function (input, init) {
  const url = typeof input === 'string' ? input : (input && input.url) || '';
  const isApi = url.startsWith('/api/') && !url.startsWith('/api/login') && !url.startsWith('/api/model-portal');
  if (!isApi) return _fetch(input, init);
  let token = null;
  try { const s = JSON.parse(sessionStorage.getItem(AUTH_KEY) || 'null'); token = s && s.token; } catch (e) {}
  const opts = Object.assign({}, init || {});
  opts.headers = Object.assign({}, (init && init.headers) || {}, token ? { Authorization: 'Bearer ' + token } : {});
  return _fetch(input, opts).then(function (r) {
    if (r.status === 401) {
      try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
      if (!window.__momoReloading) { window.__momoReloading = true; alert('로그인이 만료되었습니다. 다시 로그인해주세요.'); window.location.reload(); }
    }
    return r;
  });
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
