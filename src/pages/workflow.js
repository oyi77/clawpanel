/**
 * Workflow Center Page - Full CRUD for templates and runs
 */
import { icon } from '../lib/icons.js'
import { api } from '../lib/tauri-api.js'
import { toast } from '../components/toast.js'
import { t } from '../lib/i18n.js'

let _filterRuns = ''
let _editTemplate = null
let _selectedRun = null

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Workflow Center')}</h1>
        <p class="page-desc">${t('Workflow AI Desc')}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" id="btn-refresh-all">${icon('refresh-cw', 14)} ${t('Refresh')}</button>
        <button class="btn btn-primary btn-sm" id="btn-new-template">${icon('plus', 14)} ${t('New Template')}</button>
      </div>
    </div>

    <div class="grid-layout" style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
       <div class="main-column space-y-6">
          <!-- AI Settings -->
          <div class="settings-card">
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
               <button class="btn btn-primary btn-sm" id="btn-save-settings">${t('Save Settings')}</button>
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
               <div class="loading text-center py-4 opacity-50">${t('Loading...')}</div>
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
                <option value="failed">${t('Failed')}</option>
                <option value="waiting">${t('Waiting')}</option>
                <option value="paused">${t('Pause')}</option>
              </select>
            </div>
            <div id="runs-list-container" class="space-y-3">
               <div class="loading text-center py-4 opacity-50">${t('Loading...')}</div>
            </div>
          </div>
       </div>
    </div>

    <!-- Template Edit Modal -->
    <div id="template-modal" class="modal-overlay" style="display:none">
      <div class="modal-content" style="max-width:600px">
        <div class="modal-header">
          <h3 id="template-modal-title">${t('New Template')}</h3>
          <button class="modal-close" id="template-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">${t('Name')}</label>
            <input class="form-input" id="tmpl-name" placeholder="My Workflow Template">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="tmpl-description" rows="2" placeholder="What does this workflow do?"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Steps (one per line)</label>
            <textarea class="form-input" id="tmpl-steps" rows="4" placeholder="Step 1: Research&#10;Step 2: Generate&#10;Step 3: Publish"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="tmpl-cancel">${t('Cancel')}</button>
          <button class="btn btn-danger btn-sm" id="tmpl-delete" style="display:none">${t('Delete')}</button>
          <button class="btn btn-primary btn-sm" id="tmpl-save">${t('Save')}</button>
        </div>
      </div>
    </div>

    <!-- Run Detail Modal -->
    <div id="run-modal" class="modal-overlay" style="display:none">
      <div class="modal-content" style="max-width:600px">
        <div class="modal-header">
          <h3 id="run-modal-title">Run Details</h3>
          <button class="modal-close" id="run-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div id="run-detail-body"></div>
          <div class="mt-4">
            <div class="settings-title mb-2">${t('workflow_runLog')}</div>
            <div id="run-log-body" class="run-log-container"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="run-close">${t('Close')}</button>
          <button class="btn btn-danger btn-sm" id="run-stop-btn">${icon('stop', 14)} ${t('Stop')}</button>
          <button class="btn btn-primary btn-sm" id="run-pause-btn">${icon('pause', 14)} ${t('Pause')}</button>
          <button class="btn btn-primary btn-sm" id="run-resume-btn">${icon('play', 14)} ${t('Resume')}</button>
        </div>
      </div>
    </div>

    <!-- New Run Modal -->
    <div id="run-new-modal" class="modal-overlay" style="display:none">
      <div class="modal-content" style="max-width:500px">
        <div class="modal-header">
          <h3>${t('workflow_start')}</h3>
          <button class="modal-close" id="run-new-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Template</label>
            <select class="form-select w-full" id="run-new-template"></select>
          </div>
          <div class="form-group">
            <label class="form-label">Run Title</label>
            <input class="form-input" id="run-new-title" placeholder="My workflow run">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" id="run-new-cancel">${t('Cancel')}</button>
          <button class="btn btn-primary btn-sm" id="run-new-start">${icon('play', 14)} ${t('workflow_start')}</button>
        </div>
      </div>
    </div>
  `

  loadAll(page)

  // --- Event Delegation ---
  page.addEventListener('click', (e) => {
    if (e.target.closest('#btn-refresh-all')) {
      loadAll(page)
      toast(t('Success'), 'success')
      return
    }
    if (e.target.closest('#btn-new-template')) {
      _editTemplate = null
      page.querySelector('#template-modal-title').textContent = t('New Template')
      page.querySelector('#tmpl-name').value = ''
      page.querySelector('#tmpl-description').value = ''
      page.querySelector('#tmpl-steps').value = ''
      page.querySelector('#tmpl-delete').style.display = 'none'
      page.querySelector('#template-modal').style.display = 'flex'
      return
    }
    if (e.target.closest('#template-modal-close') || e.target.closest('#tmpl-cancel')) {
      page.querySelector('#template-modal').style.display = 'none'
      return
    }
    if (e.target.closest('#tmpl-save')) {
      saveTemplate(page)
      return
    }
    if (e.target.closest('#tmpl-delete')) {
      deleteTemplate(page)
      return
    }
    if (e.target.closest('.tmpl-edit-btn')) {
      const id = e.target.closest('.tmpl-edit-btn').dataset.id
      editTemplate(page, id)
      return
    }
    if (e.target.closest('.tmpl-run-btn')) {
      const id = e.target.closest('.tmpl-run-btn').dataset.id
      const name = e.target.closest('.tmpl-run-btn').dataset.name
      openRunNewModal(page, id, name)
      return
    }
    if (e.target.closest('.run-item')) {
      const id = e.target.closest('.run-item').dataset.id
      openRunDetail(page, id)
      return
    }
    if (e.target.closest('#filter-runs')) {
      return
    }
    if (e.target.closest('#run-modal-close') || e.target.closest('#run-close')) {
      page.querySelector('#run-modal').style.display = 'none'
      _selectedRun = null
      return
    }
    if (e.target.closest('#run-stop-btn')) {
      stopRun(page)
      return
    }
    if (e.target.closest('#run-pause-btn')) {
      pauseRun(page)
      return
    }
    if (e.target.closest('#run-resume-btn')) {
      resumeRun(page)
      return
    }
    if (e.target.closest('#run-new-modal-close') || e.target.closest('#run-new-cancel')) {
      page.querySelector('#run-new-modal').style.display = 'none'
      return
    }
    if (e.target.closest('#run-new-start')) {
      startRun(page)
      return
    }
  })

  page.addEventListener('change', (e) => {
    if (e.target.id === 'filter-runs') {
      _filterRuns = e.target.value
      loadRuns(page)
    }
  })

  const saveBtn = page.querySelector('#btn-save-settings')
  saveBtn?.addEventListener('click', async () => {
    const settings = {
      enabled: page.querySelector('#setting-enabled').value === 'true',
      model: page.querySelector('#setting-model').value,
      approvalLevel: parseInt(page.querySelector('#setting-approval').value),
      autoCreate: page.querySelector('#setting-auto-create').checked,
      pushProgress: page.querySelector('#setting-push-progress').checked,
      progressMode: 'detailed',
    }
    saveBtn.disabled = true
    try {
      await api.workflowSettingsSave(settings)
      toast(t('Success'), 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      saveBtn.disabled = false
    }
  })

  return page
}

async function loadAll(page) {
  loadSettings(page)
  loadTemplates(page)
  loadRuns(page)
}

async function loadSettings(page) {
  try {
    const settings = await api.workflowSettingsGet()
    if (settings) {
      page.querySelector('#setting-enabled').value = String(settings.enabled)
      page.querySelector('#setting-model').value = settings.model || ''
      page.querySelector('#setting-approval').value = String(settings.approvalLevel || 2)
      page.querySelector('#setting-auto-create').checked = !!settings.autoCreate
      page.querySelector('#setting-push-progress').checked = !!settings.pushProgress
    }
  } catch {}
}

async function loadTemplates(page) {
  const container = page.querySelector('#template-list-container')
  try {
    const templates = await api.workflowTemplateList()
    if (!templates || templates.length === 0) {
      container.innerHTML = `<div class="empty-state text-center py-8 text-muted-foreground italic">${t('workflow_noWorkflows')}</div>`
      return
    }
    container.innerHTML = templates.map(tmpl => `
      <div class="template-card">
        <div class="template-info">
          <div class="template-name">${tmpl.name}</div>
          <div class="template-meta">${tmpl.meta || ''}</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-ghost btn-sm tmpl-run-btn" data-id="${tmpl.id}" data-name="${tmpl.name}" title="${t('workflow_start')}">${icon('play', 14)}</button>
          <button class="btn btn-ghost btn-sm tmpl-edit-btn" data-id="${tmpl.id}" title="${t('Edit')}">${icon('edit', 14)}</button>
        </div>
      </div>
    `).join('')
  } catch (e) {
    container.innerHTML = `<div class="error-state">${e.message}</div>`
  }
}

async function loadRuns(page) {
  const container = page.querySelector('#runs-list-container')
  const filterSelect = page.querySelector('#filter-runs')
  if (filterSelect) filterSelect.value = _filterRuns
  try {
    const runs = await api.workflowRunList(_filterRuns || null)
    if (!runs || runs.length === 0) {
      container.innerHTML = `<div class="empty-state text-center py-8 text-muted-foreground italic">No runs found</div>`
      return
    }
    container.innerHTML = runs.map(r => `
      <div class="run-item cursor-pointer" data-id="${r.id}">
        <div class="run-header">
          <span class="run-badge ${r.status}">${r.status}</span>
          <span class="run-time text-xs text-muted-foreground">${r.time}</span>
        </div>
        <div class="run-title text-sm font-medium">${r.title}</div>
        <div class="run-time text-xs text-muted-foreground">${r.meta || ''}</div>
        ${r.status !== 'completed' && r.status !== 'failed' && r.status !== 'stopped' ? `
          <div class="run-progress-bg mt-2">
            <div class="run-progress-fill" style="width: ${r.progress}%"></div>
          </div>
          <div class="text-xs text-muted-foreground mt-1">${r.progress}% ${r.currentStep ? `· Step ${r.currentStep}/${r.steps}` : ''}</div>
        ` : ''}
      </div>
    `).join('')
  } catch (e) {
    container.innerHTML = `<div class="error-state">${e.message}</div>`
  }
}

async function editTemplate(page, id) {
  try {
    const tmpl = await api.workflowTemplateGet(id)
    _editTemplate = tmpl
    page.querySelector('#template-modal-title').textContent = t('workflow_editTemplate')
    page.querySelector('#tmpl-name').value = tmpl.name || ''
    page.querySelector('#tmpl-description').value = tmpl.description || ''
    page.querySelector('#tmpl-steps').value = Array.isArray(tmpl.steps) ? tmpl.steps.join('\n') : ''
    page.querySelector('#tmpl-delete').style.display = 'inline-flex'
    page.querySelector('#template-modal').style.display = 'flex'
  } catch (e) {
    toast(e.message, 'error')
  }
}

async function saveTemplate(page) {
  const name = page.querySelector('#tmpl-name').value.trim()
  if (!name) { toast('Name is required', 'error'); return }
  const description = page.querySelector('#tmpl-description').value.trim()
  const stepsRaw = page.querySelector('#tmpl-steps').value.trim()
  const steps = stepsRaw ? stepsRaw.split('\n').map(s => s.trim()).filter(Boolean) : []

  const saveBtn = page.querySelector('#tmpl-save')
  saveBtn.disabled = true
  try {
    if (_editTemplate) {
      await api.workflowTemplateUpdate(_editTemplate.id, name, description, steps)
      toast('Template updated', 'success')
    } else {
      await api.workflowTemplateCreate(name, description, steps)
      toast('Template created', 'success')
    }
    page.querySelector('#template-modal').style.display = 'none'
    loadTemplates(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    saveBtn.disabled = false
  }
}

async function deleteTemplate(page) {
  if (!_editTemplate) return
  if (!confirm(t('Delete Agent Confirm'))) return
  const btn = page.querySelector('#tmpl-delete')
  btn.disabled = true
  try {
    await api.workflowTemplateDelete(_editTemplate.id)
    toast('Template deleted', 'success')
    page.querySelector('#template-modal').style.display = 'none'
    loadTemplates(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}

async function openRunDetail(page, id) {
  try {
    const run = await api.workflowRunGet(id)
    _selectedRun = run
    page.querySelector('#run-modal-title').textContent = run.title
    page.querySelector('#run-detail-body').innerHTML = `
      <div class="flex items-center gap-3 mb-4">
        <span class="run-badge ${run.status}">${run.status}</span>
        <span class="text-sm text-muted-foreground">${run.time}</span>
        <span class="text-sm text-muted-foreground">${run.meta || ''}</span>
      </div>
      ${run.steps ? `
        <div class="mb-3">
          <div class="text-xs text-muted-foreground mb-1">Progress</div>
          <div class="run-progress-bg">
            <div class="run-progress-fill" style="width: ${run.progress}%"></div>
          </div>
          <div class="text-xs mt-1">${run.progress}%${run.currentStep ? ` · Step ${run.currentStep}/${run.steps}` : ''}</div>
        </div>
      ` : ''}
    `
    const stopBtn = page.querySelector('#run-stop-btn')
    const pauseBtn = page.querySelector('#run-pause-btn')
    const resumeBtn = page.querySelector('#run-resume-btn')
    if (run.status === 'running' || run.status === 'waiting') {
      stopBtn.style.display = 'inline-flex'
      pauseBtn.style.display = run.status === 'running' ? 'inline-flex' : 'none'
      resumeBtn.style.display = 'none'
    } else if (run.status === 'paused') {
      stopBtn.style.display = 'inline-flex'
      pauseBtn.style.display = 'none'
      resumeBtn.style.display = 'inline-flex'
    } else {
      stopBtn.style.display = 'none'
      pauseBtn.style.display = 'none'
      resumeBtn.style.display = 'none'
    }

    const logBody = page.querySelector('#run-log-body')
    try {
      const logs = await api.workflowLogList(run.id)
      logBody.innerHTML = logs.map(l => `
        <div class="flex gap-2 text-xs py-1 border-b border-border last:border-b-0">
          <span class="text-muted-foreground shrink-0">${l.ts}</span>
          <span class="px-1.5 rounded text-[10px] font-mono ${l.level === 'info' ? 'bg-blue-500/10 text-blue-500' : l.level === 'success' ? 'bg-emerald-500/10 text-emerald-500' : l.level === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-yellow-500/10 text-yellow-500'}">${l.level}</span>
          <span class="text-muted-foreground">${l.msg}</span>
        </div>
      `).join('')
    } catch {
      logBody.innerHTML = `<div class="text-xs text-muted-foreground">${t('workflow_noLogs')}</div>`
    }

    page.querySelector('#run-modal').style.display = 'flex'
  } catch (e) {
    toast(e.message, 'error')
  }
}

async function openRunNewModal(page, templateId, templateName) {
  const templates = await api.workflowTemplateList()
  const select = page.querySelector('#run-new-template')
  select.innerHTML = templates.map(t => `<option value="${t.id}" ${t.id === templateId ? 'selected' : ''}>${t.name}</option>`).join('')
  page.querySelector('#run-new-title').value = `Run: ${templateName}`
  page.querySelector('#run-new-modal').style.display = 'flex'
}

async function startRun(page) {
  const templateId = page.querySelector('#run-new-template').value
  const title = page.querySelector('#run-new-title').value.trim()
  if (!title) { toast('Title is required', 'error'); return }
  const btn = page.querySelector('#run-new-start')
  btn.disabled = true
  try {
    await api.workflowRunStart(templateId, title)
    toast('Workflow started', 'success')
    page.querySelector('#run-new-modal').style.display = 'none'
    loadRuns(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}

async function stopRun(page) {
  if (!_selectedRun) return
  const btn = page.querySelector('#run-stop-btn')
  btn.disabled = true
  try {
    await api.workflowRunStop(_selectedRun.id)
    toast('Workflow stopped', 'success')
    page.querySelector('#run-modal').style.display = 'none'
    loadRuns(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}

async function pauseRun(page) {
  if (!_selectedRun) return
  const btn = page.querySelector('#run-pause-btn')
  btn.disabled = true
  try {
    await api.workflowRunPause(_selectedRun.id)
    toast('Workflow paused', 'success')
    page.querySelector('#run-modal').style.display = 'none'
    loadRuns(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}

async function resumeRun(page) {
  if (!_selectedRun) return
  const btn = page.querySelector('#run-resume-btn')
  btn.disabled = true
  try {
    await api.workflowRunResume(_selectedRun.id)
    toast('Workflow resumed', 'success')
    page.querySelector('#run-modal').style.display = 'none'
    loadRuns(page)
  } catch (e) {
    toast(e.message, 'error')
  } finally {
    btn.disabled = false
  }
}
