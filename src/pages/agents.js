/**
 * Agent 管理页面
 * Agent 增删改查 + 身份编辑
 */
import { api, invalidate } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'
import { showModal, showConfirm } from '../components/modal.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Agent Management')}</h1>
        <p class="page-desc">${t('Agent Desc')}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="btn-add-agent">${t('New Agent')}</button>
      </div>
    </div>
    <div class="page-content">
      <div id="agents-list"></div>
    </div>
  `

  const state = { agents: [] }
  // 非阻塞：先返回 DOM，后台加载数据
  loadAgents(page, state)

  page.querySelector('#btn-add-agent').addEventListener('click', () => showAddAgentDialog(page, state))

  return page
}

function renderSkeleton(container) {
  const item = () => `
    <div class="agent-card" style="pointer-events:none">
      <div class="agent-card-header">
        <div class="skeleton" style="width:40px;height:40px;border-radius:50%"></div>
        <div style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div class="skeleton" style="width:45%;height:16px;border-radius:4px"></div>
          <div class="skeleton" style="width:60%;height:12px;border-radius:4px"></div>
        </div>
      </div>
    </div>`
  container.innerHTML = [item(), item(), item()].join('')
}

async function loadAgents(page, state) {
  const container = page.querySelector('#agents-list')
  renderSkeleton(container)
  try {
    state.agents = await api.listAgents()
    renderAgents(page, state)

    // 只在第一次加载时绑定事件（避免重复绑定）
    if (!state.eventsAttached) {
      attachAgentEvents(page, state)
      state.eventsAttached = true
    }
  } catch (e) {
    container.innerHTML = `<div style="color:var(--error);padding:20px">${t('Error')}: ${e}</div>`
    toast(`${t('Error')}: ${e}`, 'error')
  }
}

function renderAgents(page, state) {
  const container = page.querySelector('#agents-list')
  if (!state.agents.length) {
    container.innerHTML = `<div style="color:var(--text-tertiary);padding:20px;text-align:center">${t('No Agents Found')}</div>`
    return
  }

  container.innerHTML = state.agents.map(a => {
    const isDefault = a.isDefault || a.id === 'main'
    const name = a.identityName ? a.identityName.split(',')[0].trim() : t('Identity')
    return `
      <div class="agent-card" data-id="${a.id}">
        <div class="agent-card-header">
          <div class="agent-card-title">
            <span class="agent-id">${a.id}</span>
            ${isDefault ? `<span class="badge badge-success">${t('Default')}</span>` : ''}
          </div>
          <div class="agent-card-actions">
            <button class="btn btn-sm btn-secondary" data-action="backup" data-id="${a.id}">${t('Create Backup')}</button>
            <button class="btn btn-sm btn-secondary" data-action="edit" data-id="${a.id}">${t('Edit')}</button>
            ${!isDefault ? `<button class="btn btn-sm btn-danger" data-action="delete" data-id="${a.id}">${t('Delete')}</button>` : ''}
          </div>
        </div>
        <div class="agent-card-body">
          <div class="agent-info-row">
            <span class="agent-info-label">${t('Name')}:</span>
            <span class="agent-info-value">${name}</span>
          </div>
          <div class="agent-info-row">
            <span class="agent-info-label">${t('Model')}:</span>
            <span class="agent-info-value">${a.model || t('Not Started')}</span>
          </div>
          <div class="agent-info-row">
            <span class="agent-info-label">${t('Workspace')}:</span>
            <span class="agent-info-value" style="font-family:var(--font-mono);font-size:var(--font-size-xs)">${a.workspace || t('Not Started')}</span>
          </div>
        </div>
      </div>
    `
  }).join('')
}

function attachAgentEvents(page, state) {
  const container = page.querySelector('#agents-list')
  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const action = btn.dataset.action
    const id = btn.dataset.id

    if (action === 'edit') showEditAgentDialog(page, state, id)
    else if (action === 'delete') await deleteAgent(page, state, id)
    else if (action === 'backup') await backupAgent(id)
  })
}

async function showAddAgentDialog(page, state) {
  // 获取模型列表
  let models = []
  try {
    const config = await api.readOpenclawConfig()
    const providers = config?.models?.providers || {}
    for (const [pk, pv] of Object.entries(providers)) {
      for (const m of (pv.models || [])) {
        const id = typeof m === 'string' ? m : m.id
        if (id) models.push({ value: `${pk}/${id}`, label: `${pk}/${id}` })
      }
    }
  } catch { models = [{ value: 'newapi/claude-opus-4-6', label: 'newapi/claude-opus-4-6' }] }

  if (!models.length) {
    toast(t('Select Model First'), 'warning')
    return
  }

  showModal({
    title: t('New Agent'),
    fields: [
      { name: 'id', label: 'Agent ID', value: '', placeholder: 'e.g. translator' },
      { name: 'name', label: t('Name'), value: '', placeholder: 'e.g. Translation Bot' },
      { name: 'emoji', label: 'Emoji', value: '', placeholder: 'e.g. 🌐' },
      { name: 'model', label: t('Model'), type: 'select', value: models[0]?.value || '', options: models },
      { name: 'workspace', label: t('Workspace'), value: '', placeholder: '/absolute/path' },
    ],
    onConfirm: async (result) => {
      const id = (result.id || '').trim()
      if (!id) { toast('ID required', 'warning'); return }
      if (!/^[a-z0-9_-]+$/.test(id)) { toast('Invalid ID', 'warning'); return }

      const name = (result.name || '').trim()
      const emoji = (result.emoji || '').trim()
      const model = result.model || models[0]?.value || ''
      const workspace = (result.workspace || '').trim()

      try {
        await api.addAgent(id, model, workspace || null)
        if (name || emoji) {
          await api.updateAgentIdentity(id, name || null, emoji || null)
        }
        toast(t('Agent Created'), 'success')

        // 强制清除缓存并重新加载
        invalidate('list_agents')
        await loadAgents(page, state)
      } catch (e) {
        toast(t('Creation Failed') + ': ' + e, 'error')
      }
    }
  })
}

async function showEditAgentDialog(page, state, id) {
  const agent = state.agents.find(a => a.id === id)
  if (!agent) return

  const name = agent.identityName ? agent.identityName.split(',')[0].trim() : ''

  // 获取模型列表
  let models = []
  try {
    const config = await api.readOpenclawConfig()
    const providers = config?.models?.providers || {}
    for (const [pk, pv] of Object.entries(providers)) {
      for (const m of (pv.models || [])) {
        const mid = typeof m === 'string' ? m : m.id
        if (mid) models.push({ value: `${pk}/${mid}`, label: `${pk}/${mid}` })
      }
    }
  } catch (e) {
    console.error('[Agent edit] failed:', e)
  }

  const fields = [
    { name: 'name', label: t('Name'), value: name, placeholder: 'Translation Bot' },
    { name: 'emoji', label: 'Emoji', value: agent.identityEmoji || '', placeholder: '🌐' },
  ]

  if (models.length) {
    const modelField = {
      name: 'model', label: t('Model'), type: 'select',
      value: agent.model || models[0]?.value || '',
      options: models,
    }
    fields.push(modelField)
  }

  fields.push({
    name: 'workspace', label: t('Workspace'),
    value: agent.workspace || t('Not Started'),
    readonly: true,
  })

  showModal({
    title: `${t('Edit')} Agent — ${id}`,
    fields,
    onConfirm: async (result) => {
      const newName = (result.name || '').trim()
      const emoji = (result.emoji || '').trim()
      const model = (result.model || '').trim()

      try {
        if (newName || emoji) {
          await api.updateAgentIdentity(id, newName || null, emoji || null)
        }
        if (model && model !== agent.model) {
          await api.updateAgentModel(id, model)
        }

        // 手动更新 state 并重新渲染，确保立即生效
        if (newName) agent.identityName = newName
        if (emoji) agent.identityEmoji = emoji
        if (model) agent.model = model
        renderAgents(page, state)

        toast(t('Success'), 'success')
      } catch (e) {
        toast(t('Error') + ': ' + e, 'error')
      }
    }
  })
}

async function deleteAgent(page, state, id) {
  const yes = await showConfirm(t('Delete Agent Confirm') + ` (${id})`)
  if (!yes) return

  try {
    await api.deleteAgent(id)
    toast(t('Success'), 'success')
    await loadAgents(page, state)
  } catch (e) {
    toast(t('Error') + ': ' + e, 'error')
  }
}

async function backupAgent(id) {
  toast(`${t('Loading...')} (${id})`, 'info')
  try {
    const zipPath = await api.backupAgent(id)
    try {
      const { open } = await import('@tauri-apps/plugin-shell')
      const dir = zipPath.substring(0, zipPath.lastIndexOf('/')) || zipPath
      await open(dir)
    } catch { /* fallback */ }
    toast(t('Backup Done'), 'success')
  } catch (e) {
    toast(t('Error') + ': ' + e, 'error')
  }
}
