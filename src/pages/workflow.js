/**
 * Workflow Center Page (v1.2 Diagnostic)
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
      <div>
        <h1 class="page-title">${t('Workflow Center')} (v1.2)</h1>
        <p class="page-desc">System integration and automation center</p>
      </div>
      <div class="page-actions">
        <div id="diag-msg" style="font-size:10px;color:var(--text-tertiary);margin-right:12px">Initializing...</div>
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
          <div class="settings-card mb-6">
            <div class="settings-title">${t('Workflow AI Settings')}</div>
            <div class="settings-desc">${t('Workflow AI Desc')}</div>
            
            <div class="grid grid-cols-2 gap-4 mt-6">
              <div class="form-group">
                <label class="form-label">${t('Enable Workflow Interception')}</label>
                <select class="form-select w-full" id="setting-enabled" style="width: 100%">
                  <option value="true">ON</option>
                  <option value="false">OFF</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('Workflow Model')}</label>
                <select class="form-select w-full" id="setting-model" style="width: 100%">
                  <option value="">Default (GPT-4o)</option>
                  <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">${t('Approval Level')}</label>
                <select class="form-select w-full" id="setting-approval" style="width: 100%">
                  <option value="1">Level 1 (Direct)</option>
                  <option value="2">Level 2 (Confirm Actions)</option>
                  <option value="3">Level 3 (Strict Approval)</option>
                </select>
              </div>
              <div class="form-group" style="padding-top: 10px">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" id="setting-auto-create">
                    <span class="text-sm">${t('Auto-create matching instances')}</span>
                </label>
                <label class="flex items-center gap-2 mt-2 cursor-pointer">
                    <input type="checkbox" id="setting-push-progress">
                    <span class="text-sm">${t('Sync progress to center')}</span>
                </label>
              </div>
            </div>

            <div class="mt-6 flex justify-end">
               <button class="btn btn-primary" id="btn-save-settings">${t('Save Settings')}</button>
            </div>
          </div>

          <!-- Templates -->
          <div class="settings-card">
            <div class="flex items-center justify-between mb-4">
              <div>
                <div class="settings-title">${t('Templates')}</div>
                <div class="settings-desc">Available automation patterns</div>
              </div>
            </div>
            <div class="space-y-3" id="template-list-container">
               <div class="loading text-center py-4 opacity-50">Syncing templates...</div>
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
            <div id="runs-list-container" class="space-y-4">
               <div class="loading text-center py-4 opacity-50">Syncing run history...</div>
            </div>
          </div>
       </div>
    </div>
  `

  const diag = page.querySelector('#diag-msg')

  // Data Loading
  async function loadAll() {
    if (diag) diag.textContent = 'Loading...'
    try {
      if (diag) diag.textContent = 'Fetching settings...'
      const settings = await api.workflowSettingsGet()
      if (settings) {
        page.querySelector('#setting-enabled').value = String(settings.enabled)
        page.querySelector('#setting-model').value = settings.model || ''
        page.querySelector('#setting-approval').value = String(settings.approvalLevel)
        page.querySelector('#setting-auto-create').checked = !!settings.autoCreate
        page.querySelector('#setting-push-progress').checked = !!settings.pushProgress
      }

      if (diag) diag.textContent = 'Fetching templates...'
      const templates = await api.workflowTemplateList()
      const tContainer = page.querySelector('#template-list-container')
      if (templates && Array.isArray(templates) && templates.length > 0) {
        tContainer.innerHTML = templates.map(t => `
          <div class="template-card">
            <div class="template-info">
              <div class="template-name">${t.name}</div>
              <div class="template-meta">${t.meta}</div>
            </div>
            <button class="btn btn-icon">${icon('edit', 14)}</button>
          </div>
        `).join('')
      } else {
        tContainer.innerHTML = `<div class="empty-state text-center py-8 text-muted-foreground italic">No templates available yet</div>`
      }

      if (diag) diag.textContent = 'Fetching run list...'
      const runs = await api.workflowRunList()
      const rContainer = page.querySelector('#runs-list-container')
      if (runs && Array.isArray(runs) && runs.length > 0) {
        rContainer.innerHTML = runs.map(r => `
          <div class="run-item">
            <div class="run-header">
              <span class="run-badge ${r.status}">${t(r.status.charAt(0).toUpperCase() + r.status.slice(1))}</span>
              <span class="run-time">${r.time}</span>
            </div>
            <div class="run-title">${r.title}</div>
            <div class="run-time">${r.meta}</div>
            <div class="run-progress-bg">
              <div class="run-progress-fill" style="width: ${r.progress}%"></div>
            </div>
          </div>
        `).join('')
      } else {
        rContainer.innerHTML = `<div class="empty-state text-center py-8 text-muted-foreground italic">No run history found</div>`
      }
      if (diag) { diag.textContent = 'API OK'; diag.style.color = 'var(--success)' }
    } catch (e) {
      if (diag) { diag.textContent = 'API Error: ' + e.message; diag.style.color = 'var(--error)' }
      toast(e.message, 'error')
    }
  }

  // Logic bindings
  const refreshBtn = page.querySelector('#btn-refresh-all')
  refreshBtn.addEventListener('click', () => {
    loadAll()
    toast('Workflow status refreshed', 'success')
  })

  const saveBtn = page.querySelector('#btn-save-settings')
  saveBtn.addEventListener('click', async () => {
    const settings = {
        enabled: page.querySelector('#setting-enabled').value === 'true',
        model: page.querySelector('#setting-model').value,
        approvalLevel: parseInt(page.querySelector('#setting-approval').value),
        autoCreate: page.querySelector('#setting-auto-create').checked,
        pushProgress: page.querySelector('#setting-push-progress').checked,
        progressMode: 'detailed'
    }
    saveBtn.disabled = true
    try {
        await api.workflowSettingsSave(settings)
        toast('Workflow AI settings saved successfully', 'success')
        loadAll()
    } catch(e) {
        toast(e.message, 'error')
    } finally {
        saveBtn.disabled = false
    }
  })

  // Initial load
  loadAll()

  return page
}
