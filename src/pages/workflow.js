import { statusIcon } from '../lib/icons.js'
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'
  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">Workflow Center</h1>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-workflow-sync">
          ${statusIcon('sync', 14)} Sync Upstream
        </button>
      </div>
    </div>
    <div class="settings-card">
      <div class="settings-title">Base: qingchencloud</div>
      <div class="settings-desc">Modular patch active</div>
    </div>
  `
  return page
}
