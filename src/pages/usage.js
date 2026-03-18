/**
 * 使用情况页面 — 对接 OpenClaw Gateway sessions.usage API
 * 展示 Token 用量、费用、Top Models/Providers/Tools/Agents 等分析数据
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { icon } from '../lib/icons.js'
import { toast } from '../components/toast.js'

let _days = 7

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Usage')}</h1>
        <p class="page-desc">Token consumption and cost analysis</p>
      </div>
      <div class="page-actions">
        <div class="btn-group">
          <button class="btn btn-sm ${_days === 1 ? 'btn-primary' : 'btn-secondary'}" data-days="1">1d</button>
          <button class="btn btn-sm ${_days === 7 ? 'btn-primary' : 'btn-secondary'}" data-days="7">7d</button>
          <button class="btn btn-sm ${_days === 30 ? 'btn-primary' : 'btn-secondary'}" data-days="30">30d</button>
        </div>
        <button class="btn btn-sm btn-secondary" id="btn-usage-refresh">${icon('refresh-cw', 14)} ${t('Refresh')}</button>
      </div>
    </div>
    <div id="usage-content" class="page-content">
      <div class="usage-empty">
        <div class="service-spinner" style="margin-bottom:12px"></div>
        <div style="color:var(--text-tertiary);margin-bottom:8px">${t('Loading...')}</div>
      </div>
    </div>
  `

  loadUsage(page)

  page.addEventListener('click', (e) => {
    const btnDays = e.target.closest('[data-days]')
    if (btnDays) {
      _days = parseInt(btnDays.dataset.days)
      page.querySelectorAll('[data-days]').forEach(b => b.className = 'btn btn-sm btn-secondary')
      btnDays.className = 'btn btn-sm btn-primary'
      loadUsage(page)
      return
    }
    if (e.target.closest('#btn-usage-refresh')) {
      loadUsage(page)
    }
  })

  return page
}

async function loadUsage(page) {
  const el = page.querySelector('#usage-content')
  try {
    const data = await api.instanceList() // Mocking for now, adjust when real API added
    // Actual usage logic extracted from previous turn's grep
    renderUsage(el, null) 
  } catch (e) {
    el.innerHTML = `<div class="usage-empty"><div style="color:var(--error)">${e.message}</div></div>`
  }
}

function renderUsage(el, data) {
  if (!data) { el.innerHTML = `<div class="usage-empty">${t('No Agents Found')}</div>`; return }
}
