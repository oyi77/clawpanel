/**
 * ClawPanel 入口
 */
import { registerRoute, initRouter, navigate, setDefaultRoute } from './router.js'
import { renderSidebar, openMobileSidebar } from './components/sidebar.js'
import { initTheme } from './lib/theme.js'
import { detectOpenclawStatus, isOpenclawReady, isUpgrading, isGatewayRunning, onGatewayChange, startGatewayPoll, onGuardianGiveUp, resetAutoRestart, loadActiveInstance, getActiveInstance, onInstanceChange } from './lib/app-state.js'
import { wsClient } from './lib/ws-client.js'
import { api, checkBackendHealth, isBackendOnline, onBackendStatusChange } from './lib/tauri-api.js'
import { version as APP_VERSION } from '../package.json'
import { statusIcon } from './lib/icons.js'
import { tryShowEngagement } from './components/engagement.js'
import { t } from './lib/i18n.js'

// 样式
import './style/variables.css'
import './style/reset.css'
import './style/layout.css'
import './style/components.css'
import './style/pages.css'
import './style/chat.css'
import './style/agents.css'
import './style/debug.css'
import './style/assistant.css'
import './style/ai-drawer.css'

// 初始化主题
initTheme()

// === 访问密码保护（Web + 桌面端通用） ===
const isTauri = !!window.__TAURI_INTERNALS__

async function checkAuth() {
  if (isTauri) {
    try {
      const { api } = await import('./lib/tauri-api.js')
      const cfg = await api.readPanelConfig()
      if (!cfg.accessPassword) return { ok: true }
      if (sessionStorage.getItem('clawpanel_authed') === '1') return { ok: true }
      const defaultPw = (cfg.mustChangePassword && cfg.accessPassword) ? cfg.accessPassword : null
      return { ok: false, defaultPw }
    } catch { return { ok: true } }
  }
  try {
    const resp = await fetch('/__api/auth_check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
    const data = await resp.json()
    if (!data.required || data.authenticated) return { ok: true }
    return { ok: false, defaultPw: data.defaultPassword || null }
  } catch { return { ok: true } }
}

const _logoSvg = `<svg class="login-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"/>
</svg>`

function _hideSplash() {
  const splash = document.getElementById('splash')
  if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove(), 500) }
}

// === 后端离线检测（Web 模式） ===
let _backendRetryTimer = null

function showBackendDownOverlay() {
  if (document.getElementById('backend-down-overlay')) return
  _hideSplash()
  const overlay = document.createElement('div')
  overlay.id = 'backend-down-overlay'
  overlay.innerHTML = `
    <div class="login-card" style="text-align:center">
      ${_logoSvg}
      <div class="login-title" style="color:var(--error)">Backend Offline</div>
      <button class="login-btn" id="btn-backend-retry" style="margin-top:8px">
        <span id="backend-retry-text">${t('Refresh')}</span>
      </button>
      <div id="backend-retry-status" style="font-size:12px;color:var(--text-tertiary);margin-top:12px"></div>
    </div>
  `
  document.body.appendChild(overlay)

  let retrying = false
  const btn = overlay.querySelector('#btn-backend-retry')
  const statusEl = overlay.querySelector('#backend-retry-status')
  const textEl = overlay.querySelector('#backend-retry-text')

  btn.addEventListener('click', async () => {
    if (retrying) return
    retrying = true
    btn.disabled = true
    textEl.textContent = '...'
    statusEl.textContent = ''

    const ok = await checkBackendHealth()
    if (ok) {
        overlay.classList.add('hide')
        setTimeout(() => { overlay.remove(); location.reload() }, 600)
    } else {
        textEl.textContent = t('Refresh')
        btn.disabled = false; retrying = false
    }
  })
}

function showLoginOverlay(defaultPw) {
  const hasDefault = !!defaultPw
  const overlay = document.createElement('div')
  overlay.id = 'login-overlay'
  overlay.innerHTML = `
    <div class="login-card">
      ${_logoSvg}
      <div class="login-title">ClawPanel</div>
      <div class="login-desc">${isTauri ? 'App Locked' : 'Login Required'}</div>
      <form id="login-form">
        <input class="login-input" type="password" id="login-pw" placeholder="Password" autocomplete="current-password" autofocus value="${defaultPw || ''}" />
        <button class="login-btn" type="submit">Login</button>
        <div class="login-error" id="login-error"></div>
      </form>
    </div>
  `
  document.body.appendChild(overlay)
  _hideSplash()

  return new Promise((resolve) => {
    overlay.querySelector('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const pw = overlay.querySelector('#login-pw').value
      const errorEl = overlay.querySelector('#login-error')
      const btn = overlay.querySelector('.login-btn')
      
      if (errorEl) errorEl.textContent = ''
      if (btn) {
        btn.disabled = true
        btn.textContent = '...'
      }
      
      try {
        if (isTauri) {
          const { api } = await import('./lib/tauri-api.js')
          const cfg = await api.readPanelConfig()
          if (!cfg.accessPassword || cfg.accessPassword === pw) {
            sessionStorage.setItem('clawpanel_authed', '1')
            overlay.classList.add('hide')
            setTimeout(() => overlay.remove(), 400)
            resolve()
          } else {
            if (errorEl) errorEl.textContent = 'Invalid password'
          }
        } else {
          const resp = await fetch('/__api/auth_login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pw }),
          })
          if (resp.ok) {
            overlay.classList.add('hide')
            setTimeout(() => overlay.remove(), 400)
            resolve()
          } else {
            const data = await resp.json().catch(() => ({}))
            if (errorEl) errorEl.textContent = data.error || 'Invalid credentials or login failed'
          }
        }
      } catch (err) {
        if (errorEl) errorEl.textContent = err.message || 'Network error occurred'
      } finally {
        if (btn) {
          btn.disabled = false
          btn.textContent = 'Login'
        }
      }
    })
  })
}

async function boot() {
  registerRoute('/dashboard', () => import('./pages/dashboard.js'))
  registerRoute('/chat', () => import('./pages/chat.js'))
  registerRoute('/chat-debug', () => import('./pages/chat-debug.js'))
  registerRoute('/services', () => import('./pages/services.js'))
  registerRoute('/logs', () => import('./pages/logs.js'))
  registerRoute('/models', () => import('./pages/models.js'))
  registerRoute('/agents', () => import('./pages/agents.js'))
  registerRoute('/gateway', () => import('./pages/gateway.js'))
  registerRoute('/memory', () => import('./pages/memory.js'))
  registerRoute('/skills', () => import('./pages/skills.js'))
  registerRoute('/security', () => import('./pages/security.js'))
  registerRoute('/about', () => import('./pages/about.js'))
  registerRoute('/assistant', () => import('./pages/assistant.js'))
  registerRoute('/setup', () => import('./pages/setup.js'))
  registerRoute('/channels', () => import('./pages/channels.js'))
  registerRoute('/cron', () => import('./pages/cron.js'))
  registerRoute('/usage', () => import('./pages/usage.js'))
  registerRoute('/communication', () => import('./pages/communication.js'))
  registerRoute('/settings', () => import('./pages/settings.js'))
  registerRoute('/workflow', () => import('./pages/workflow.js'))

  renderSidebar(sidebar)
  initRouter(content)

  const splash = document.getElementById('splash')
  if (splash) { splash.classList.add('hide'); setTimeout(() => splash.remove(), 500) }

  loadActiveInstance().then(() => detectOpenclawStatus()).then(() => {
    renderSidebar(sidebar)
    if (!isOpenclawReady()) {
      setDefaultRoute('/setup'); navigate('/setup')
    } else {
      if (window.location.hash === '#/setup') navigate('/dashboard')
      startGatewayPoll()
      if (isGatewayRunning()) autoConnectWebSocket()

      onGatewayChange((running) => {
        if (running) { autoConnectWebSocket(); setTimeout(tryShowEngagement, 5000) }
        else wsClient.disconnect()
      })
    }
  })
}

async function autoConnectWebSocket() {
    const config = await api.readOpenclawConfig()
    const port = config?.gateway?.port || 18789
    const rawToken = config?.gateway?.auth?.token
    const token = (typeof rawToken === 'string') ? rawToken : ''
    wsClient.connect(location.host, token)
}

// 启动
;(async () => {
  const backendOk = await checkBackendHealth()
  if (!backendOk) { showBackendDownOverlay(); return }
  const auth = await checkAuth()
  if (!auth.ok) await showLoginOverlay(auth.defaultPw)
  await boot()
})()
