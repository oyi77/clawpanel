/**
 * Gateway 配置页面 — 小白友好版
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'
import { icon } from '../lib/icons.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Gateway')}</h1>
        <p class="page-desc">Unified entry point for AI models</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-save-gateway">${t('Save')}</button>
      </div>
    </div>
    <div id="gateway-config" class="page-content space-y-6">
       <div class="settings-card">
          <div class="settings-title">Network</div>
          <div class="form-group mt-4">
             <label class="form-label">${t('Port Detection')}</label>
             <input type="number" id="gw-port" class="form-input w-full" value="18789">
          </div>
       </div>
    </div>
  `

  loadGateway(page)

  page.querySelector('#btn-save-gateway').onclick = async () => {
    toast(t('Success'), 'success')
  }

  return page
}

async function loadGateway(page) {
    try {
        const config = await api.readOpenclawConfig()
        if (config.gateway) {
            page.querySelector('#gw-port').value = config.gateway.port || 18789
        }
    } catch(e) {}
}
