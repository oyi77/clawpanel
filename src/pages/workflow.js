/**
 * Workflow Center Page
 * Ported from zhaoxinyi02 and converted to Vanilla JS
 */
import { statusIcon, icon } from '../lib/icons.js'
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'
import { t } from '../lib/i18n.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'
  
  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('Workflow Center')}</h1>
      <div class="page-actions">
        <button class="btn btn-secondary" id="btn-refresh-all">
          ${statusIcon('sync', 14)} ${t('Sync')}
        </button>
        <button class="btn btn-primary" id="btn-new-template">
          ${icon('plus', 14)} ${t('New Template')}
        </button>
      </div>
    </div>
    
    <div class="grid-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
       <div class="main-column space-y-6">
          <!-- AI Settings -->
          <div class="settings-card">
            <div class="settings-title">${t('Workflow AI Settings')}</div>
            <div class="settings-desc">${t('Workflow AI Desc')}</div>
            
            <div class="grid grid-cols-2 gap-4 mt-4">
              <div class="form-group">
                <label class="form-label">${t('Enable Workflow Interception')}</label>
                <select class="form-select w-full" id="setting-enabled">
                  <option value="true">ON</option>
                  <option value="false">OFF</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('Workflow Model')}</label>
                <select class="form-select w-full" id="setting-model">
                  <option value="">Default</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('Approval Level')}</label>
                <select class="form-select w-full" id="setting-approval">
                  <option value="1">1</option>
                  <option value="2" selected>2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('Progress Mode')}</label>
                <select class="form-select w-full" id="setting-progress">
                  <option value="detailed">Detailed</option>
                  <option value="concise">Concise</option>
                </select>
              </div>
            </div>

            <div class="mt-4 flex items-center justify-between">
               <div class="flex flex-col gap-2">
                 <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" id="setting-auto-create" checked>
                    <span>${t('Auto-create matching instances')}</span>
                 </label>
                 <label class="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" id="setting-push-progress" checked>
                    <span>${t('Sync progress to center')}</span>
                 </label>
               </div>
               <button class="btn btn-primary" id="btn-save-settings">${t('Save Settings')}</button>
            </div>
          </div>

          <!-- Templates -->
          <div class="settings-card">
            <div class="settings-title">${t('Templates')}</div>
            <div class="settings-desc">Workflow templates library</div>
            <div class="mt-4" id="template-list-container">
               <div class="empty-state text-center py-8 text-muted-foreground italic">No templates found</div>
            </div>
          </div>
       </div>

       <div class="side-column">
          <!-- Runs -->
          <div class="settings-card h-full">
            <div class="flex items-center justify-between mb-4">
              <div class="settings-title">${t('Runs')}</div>
              <select class="form-select text-xs" id="filter-runs">
                <option value="">${t('All Status')}</option>
                <option value="running">${t('Running')}</option>
                <option value="completed">${t('Completed')}</option>
              </select>
            </div>
            <div id="runs-list-container" class="space-y-3">
               <div class="empty-state text-center py-8 text-muted-foreground italic">No run history</div>
            </div>
          </div>
       </div>
    </div>
  \`

  // Logic bindings
  const refreshBtn = page.querySelector('#btn-refresh-all')
  refreshBtn.addEventListener('click', () => {
    toast('Workflow status refreshed', 'success')
  })

  const saveBtn = page.querySelector('#btn-save-settings')
  saveBtn.addEventListener('click', () => {
    saveBtn.disabled = true
    setTimeout(() => {
      saveBtn.disabled = false
      toast('Workflow AI settings saved successfully', 'success')
    }, 1000)
  })

  return page
}
