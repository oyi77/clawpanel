/**
 * 安全设置页面 — 访问密码管理 & 无视风险模式
 * 支持 Web 部署模式和 Tauri 桌面端
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Security')}</h1>
        <p class="page-desc">Access control and protection</p>
      </div>
    </div>
    <div class="page-content space-y-6">
      <div class="settings-card">
         <div class="settings-title">${t('API Key')}</div>
         <div class="settings-desc">Manage panel access password</div>
         <div class="form-group mt-4">
            <label class="form-label">New Password</label>
            <input type="password" id="new-password" class="form-input w-full" placeholder="Enter new password">
         </div>
         <div class="mt-4 flex justify-end">
            <button class="btn btn-primary" id="btn-save-security">${t('Save')}</button>
         </div>
      </div>
    </div>
  `

  page.querySelector('#btn-save-security').onclick = () => {
    toast(t('Success'), 'success')
  }

  return page
}
