/**
 * 模型配置页面
 * 服务商管理 + 模型增删改查 + 主模型选择
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'
import { showModal, showConfirm } from '../components/modal.js'
import { icon, statusIcon } from '../lib/icons.js'
import { API_TYPES, PROVIDER_PRESETS, QTCOOL, MODEL_PRESETS, fetchQtcoolModels } from '../lib/model-presets.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <h1 class="page-title">${t('Model Config')}</h1>
      <p class="page-desc">${t('Model Config Desc')}</p>
    </div>
    <div class="config-actions">
      <button class="btn btn-primary btn-sm" id="btn-add-provider">${t('Add Provider')}</button>
      <button class="btn btn-secondary btn-sm" id="btn-undo" disabled>↩ ${t('Undo')}</button>
    </div>
    <div class="form-hint" style="margin-bottom:var(--space-md)">
      ${t('Model Config Desc')}
    </div>
    <div id="qtcool-promo" style="margin-bottom:var(--space-md);border-radius:var(--radius-lg);background:var(--bg-secondary);border:1px solid var(--border-primary);padding:14px 18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div style="flex:1;min-width:200px">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
          ${icon('zap', 16)}
          <span style="font-weight:600;font-size:var(--font-size-sm)">${t('Official')} Cloud</span>
          <span style="font-size:10px;background:var(--primary);color:#fff;padding:1px 6px;border-radius:8px">${t('Primary')}</span>
        </div>
        <div style="font-size:var(--font-size-xs);color:var(--text-secondary);line-height:1.5">
          Dynamic model list with unlimited access.
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
        <button class="btn btn-primary btn-sm" id="btn-qtcool-oneclick">${icon('plus', 14)} ${t('Get Model List')}</button>
        <a href="${QTCOOL.site}" target="_blank" class="btn btn-secondary btn-sm">${icon('external-link', 12)} ${t('About')}</a>
      </div>
    </div>
    <div id="default-model-bar"></div>
    <div style="margin-bottom:var(--space-md)">
      <input class="form-input" id="model-search" placeholder="${t('Search')}..." style="max-width:360px">
    </div>
    <div id="providers-list">
      <div class="config-section"><div class="stat-card loading-placeholder" style="height:120px"></div></div>
      <div class="config-section"><div class="stat-card loading-placeholder" style="height:120px"></div></div>
    </div>
  `

  const state = { config: null, search: '', undoStack: [] }
  // 非阻塞：先返回 DOM，后台加载数据
  loadConfig(page, state)
  bindTopActions(page, state)

  // 搜索框实时过滤
  page.querySelector('#model-search').oninput = (e) => {
    state.search = e.target.value.trim().toLowerCase()
    renderProviders(page, state)
  }

  return page
}

async function loadConfig(page, state) {
  const listEl = page.querySelector('#providers-list')
  try {
    state.config = await api.readOpenclawConfig()
    // 自动修复现有配置中的 baseUrl（如 Ollama 缺少 /v1），一次性迁移
    const before = JSON.stringify(state.config?.models?.providers || {})
    normalizeProviderUrls(state.config)
    const after = JSON.stringify(state.config?.models?.providers || {})
    if (before !== after) {
      await api.writeOpenclawConfig(state.config)
      toast(t('Success'), 'info')
    }
    renderDefaultBar(page, state)
    renderProviders(page, state)
  } catch (e) {
    listEl.innerHTML = `<div style="color:var(--error);padding:20px">${t('Error')}: ${e}</div>`
    toast(`${t('Error')}: ${e}`, 'error')
  }
}

function getCurrentPrimary(config) {
  return config?.agents?.defaults?.model?.primary || ''
}

function collectAllModels(config) {
  const result = []
  const providers = config?.models?.providers || {}
  for (const [pk, pv] of Object.entries(providers)) {
    for (const m of (pv.models || [])) {
      const id = typeof m === 'string' ? m : m.id
      if (id) result.push({ provider: pk, modelId: id, full: `${pk}/${id}` })
    }
  }
  return result
}

function getApiTypeLabel(apiType) {
  return API_TYPES.find(t => t.value === apiType)?.label || apiType || '—'
}

// 渲染当前主模型状态栏
function renderDefaultBar(page, state) {
  const bar = page.querySelector('#default-model-bar')
  const primary = getCurrentPrimary(state.config)
  const allModels = collectAllModels(state.config)
  const fallbacks = allModels.filter(m => m.full !== primary).map(m => m.full)

  bar.innerHTML = `
    <div class="config-section" style="margin-bottom:var(--space-lg)">
      <div class="config-section-title">${t('Current Active Config')}</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <span style="font-size:var(--font-size-sm);color:var(--text-tertiary)">${t('Primary')}: </span>
          <span style="font-family:var(--font-mono);font-size:var(--font-size-sm);color:${primary ? 'var(--success)' : 'var(--error)'}">${primary || t('Not Started')}</span>
        </div>
        <div>
          <span style="font-size:var(--font-size-sm);color:var(--text-tertiary)">${t('Fallback Models')}: </span>
          <span style="font-size:var(--font-size-sm);color:var(--text-secondary)">${fallbacks.length ? fallbacks.join(', ') : '—'}</span>
        </div>
      </div>
      <div class="form-hint" style="margin-top:6px">${t('Fallback Hint')}</div>
    </div>
  `
}

// 排序模型列表
function sortModels(models, sortBy) {
  if (!sortBy || sortBy === 'default') return models

  const sorted = [...models]
  switch (sortBy) {
    case 'name-asc':
      sorted.sort((a, b) => {
        const nameA = (a.name || a.id || '').toLowerCase()
        const nameB = (b.name || b.id || '').toLowerCase()
        return nameA.localeCompare(nameB)
      })
      break
    case 'name-desc':
      sorted.sort((a, b) => {
        const nameA = (a.name || a.id || '').toLowerCase()
        const nameB = (b.name || b.id || '').toLowerCase()
        return nameB.localeCompare(nameA)
      })
      break
    case 'latency-asc':
      sorted.sort((a, b) => {
        const latA = a.latency ?? Infinity
        const latB = b.latency ?? Infinity
        return latA - latB
      })
      break
    case 'latency-desc':
      sorted.sort((a, b) => {
        const latA = a.latency ?? -1
        const latB = b.latency ?? -1
        return latB - latA
      })
      break
    case 'context-asc':
      sorted.sort((a, b) => {
        const ctxA = a.contextWindow ?? 0
        const ctxB = b.contextWindow ?? 0
        return ctxA - ctxB
      })
      break
    case 'context-desc':
      sorted.sort((a, b) => {
        const ctxA = a.contextWindow ?? 0
        const ctxB = b.contextWindow ?? 0
        return ctxB - ctxA
      })
      break
  }
  return sorted
}

// 渲染服务商列表（渲染完后直接绑定事件）
function renderProviders(page, state) {
  const listEl = page.querySelector('#providers-list')
  const providers = state.config?.models?.providers || {}
  const keys = Object.keys(providers)
  const primary = getCurrentPrimary(state.config)
  const search = state.search || ''
  const sortBy = state.sortBy || 'default'

  if (!keys.length) {
    listEl.innerHTML = `
      <div style="color:var(--text-tertiary);padding:20px;text-align:center">
        ${t('No Agents Found')}
      </div>`
    return
  }

  listEl.innerHTML = keys.map(key => {
    const p = providers[key]
    const models = p.models || []
    const filtered = search
      ? models.filter((m) => {
          const id = (typeof m === 'string' ? m : m.id).toLowerCase()
          const name = (m.name || '').toLowerCase()
          return id.includes(search) || name.includes(search)
        })
      : models
    const sorted = sortModels(filtered, sortBy)
    const hiddenCount = models.length - sorted.length
    return `
      <div class="config-section" data-provider="${key}">
        <div class="config-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>${key} <span style="font-size:var(--font-size-xs);color:var(--text-tertiary);font-weight:400">${getApiTypeLabel(p.api)} · ${models.length} Models</span></span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm btn-secondary" data-action="edit-provider">${t('Edit')}</button>
            <button class="btn btn-sm btn-secondary" data-action="add-model">+ ${t('Model')}</button>
            <button class="btn btn-sm btn-secondary" data-action="fetch-models">${t('Get Model List')}</button>
            <button class="btn btn-sm btn-danger" data-action="delete-provider">${t('Delete')}</button>
          </div>
        </div>
        ${models.length >= 2 ? `
        <div style="display:flex;gap:6px;margin-bottom:var(--space-sm);align-items:center">
          <button class="btn btn-sm btn-secondary" data-action="batch-test">${t('Batch Test')}</button>
          <button class="btn btn-sm btn-secondary" data-action="select-all">${t('Select All')}</button>
          <button class="btn btn-sm btn-danger" data-action="batch-delete">${t('Batch Delete')}</button>
          <div style="margin-left:auto;display:flex;gap:6px;align-items:center">
            <span style="font-size:var(--font-size-xs);color:var(--text-tertiary)">${t('Sort')}:</span>
            <select class="form-input" data-action="sort-models" style="padding:4px 8px;font-size:var(--font-size-xs);width:auto">
              <option value="default">${t('Default Order')}</option>
              <option value="name-asc">${t('Name Asc')}</option>
              <option value="latency-asc">${t('Latency Asc')}</option>
            </select>
          </div>
        </div>` : ''}
        <div class="provider-models">
          ${renderModelCards(key, sorted, primary, search)}
          ${hiddenCount > 0 ? `<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);padding:4px 0">Hidden ${hiddenCount} unmatched</div>` : ''}
        </div>
      </div>
    `
  }).join('')

  // innerHTML 完成后，直接给每个按钮绑定 onclick
  bindProviderButtons(listEl, page, state)
}

// 渲染模型卡片（支持搜索高亮和批量选择 checkbox）
function renderModelCards(providerKey, models, primary, search) {
  if (!models.length) {
    return `<div style="color:var(--text-tertiary);font-size:var(--font-size-sm);padding:8px 0">${t('No Agents Found')}</div>`
  }
  return models.map((m) => {
    const id = typeof m === 'string' ? m : m.id
    const name = m.name || id
    const full = `${providerKey}/${id}`
    const isPrimary = full === primary
    const borderColor = isPrimary ? 'var(--success)' : 'var(--border-primary)'
    const bgColor = isPrimary ? 'var(--success-muted)' : 'var(--bg-tertiary)'
    const meta = []
    if (name !== id) meta.push(name)
    if (m.contextWindow) meta.push((m.contextWindow / 1000) + 'K Context')
    // 测试状态标签：成功显示耗时，失败显示不可用
    let latencyTag = ''
    if (m.testStatus === 'fail') {
      latencyTag = `<span style="font-size:var(--font-size-xs);padding:1px 6px;border-radius:var(--radius-sm);background:var(--error-muted, #fee2e2);color:var(--error)" title="${(m.testError || '').replace(/"/g, '&quot;')}">NA</span>`
    } else if (m.latency != null) {
      const color = m.latency < 3000 ? 'success' : m.latency < 8000 ? 'warning' : 'error'
      const bg = color === 'success' ? 'var(--success-muted)' : color === 'warning' ? 'var(--warning-muted, #fef3c7)' : 'var(--error-muted, #fee2e2)'
      const fg = color === 'success' ? 'var(--success)' : color === 'warning' ? 'var(--warning, #d97706)' : 'var(--error)'
      latencyTag = `<span style="font-size:var(--font-size-xs);padding:1px 6px;border-radius:var(--radius-sm);background:${bg};color:${fg}">${(m.latency / 1000).toFixed(1)}s</span>`
    }
    const testTime = m.lastTestAt ? formatTestTime(m.lastTestAt) : ''
    if (testTime) meta.push(testTime)
    return `
      <div class="model-card" data-model-id="${id}" data-full="${full}"
           style="background:${bgColor};border:1px solid ${borderColor};padding:10px 14px;border-radius:var(--radius-md);margin-bottom:8px;display:flex;align-items:center;gap:10px">
        <span class="drag-handle" style="color:var(--text-tertiary);cursor:grab;user-select:none;font-size:16px;padding:4px;touch-action:none">⋮⋮</span>
        <input type="checkbox" class="model-checkbox" data-model-id="${id}" style="flex-shrink:0;cursor:pointer">
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-family:var(--font-mono);font-size:var(--font-size-sm)">${id}</span>
            ${isPrimary ? `<span style="font-size:var(--font-size-xs);background:var(--success);color:var(--text-inverse);padding:1px 6px;border-radius:var(--radius-sm)">${t('Primary')}</span>` : ''}
            ${m.reasoning ? `<span style="font-size:var(--font-size-xs);background:var(--accent-muted);color:var(--accent);padding:1px 6px;border-radius:var(--radius-sm)">${t('Reasoning')}</span>` : ''}
            ${latencyTag}
          </div>
          <div style="font-size:var(--font-size-xs);color:var(--text-tertiary);margin-top:2px">${meta.join(' · ') || ''}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm btn-secondary" data-action="test-model">${t('Test')}</button>
          ${!isPrimary ? `<button class="btn btn-sm btn-secondary" data-action="set-primary">${t('Set As Primary')}</button>` : ''}
          <button class="btn btn-sm btn-secondary" data-action="edit-model">${t('Edit')}</button>
          <button class="btn btn-sm btn-danger" data-action="delete-model">${t('Delete')}</button>
        </div>
      </div>
    `
  }).join('')
}

// 格式化测试时间为相对时间
function formatTestTime(ts) {
  const diff = Date.now() - ts
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

// 根据 model-id 找到原始 index
function findModelIdx(provider, modelId) {
  return (provider.models || []).findIndex(m => (typeof m === 'string' ? m : m.id) === modelId)
}

// ===== 自动保存 + 撤销机制 =====

// 保存快照到撤销栈（变更前调用）
function pushUndo(state) {
  state.undoStack.push(JSON.parse(JSON.stringify(state.config)))
  if (state.undoStack.length > 20) state.undoStack.shift()
}

// 撤销上一步
async function undo(page, state) {
  if (!state.undoStack.length) return
  state.config = state.undoStack.pop()
  renderProviders(page, state)
  renderDefaultBar(page, state)
  updateUndoBtn(page, state)
  await doAutoSave(state)
  toast(t('Success'), 'info')
}

// 自动保存（防抖 300ms）
let _saveTimer = null
let _batchTestAbort = null 

export function cleanup() {
  clearTimeout(_saveTimer)
  _saveTimer = null
  if (_batchTestAbort) { _batchTestAbort.abort = true; _batchTestAbort = null }
}
function autoSave(state) {
  clearTimeout(_saveTimer)
  _saveTimer = setTimeout(() => doAutoSave(state), 300)
}

/** 保存前规范化所有服务商的 baseUrl，确保 Gateway 能正确调用 */
function normalizeProviderUrls(config) {
  const providers = config?.models?.providers
  if (!providers) return
  for (const [, p] of Object.entries(providers)) {
    if (!p.baseUrl) continue
    let url = p.baseUrl.replace(/\/+$/, '')
    // 去掉尾部的已知端点路径（用户可能粘贴了完整 URL）
    for (const suffix of ['/api/chat', '/api/generate', '/api/tags', '/api', '/chat/completions', '/completions', '/responses', '/messages', '/models']) {
      if (url.endsWith(suffix)) { url = url.slice(0, -suffix.length); break }
    }
    url = url.replace(/\/+$/, '')
    const apiType = (p.api || 'openai-completions').toLowerCase()
    if (apiType === 'anthropic-messages') {
      if (!url.endsWith('/v1')) url += '/v1'
    } else if (apiType !== 'google-gemini') {
      if (/:11434$/.test(url) && !url.endsWith('/v1')) url += '/v1'
    }
    p.baseUrl = url
  }
}

// 仅保存配置，不重启 Gateway（用于测试结果等元数据持久化）
async function saveConfigOnly(state) {
  try {
    const primary = getCurrentPrimary(state.config)
    if (primary) applyDefaultModel(state)
    normalizeProviderUrls(state.config)
    await api.writeOpenclawConfig(state.config)
  } catch (e) {
    toast(t('Error') + ': ' + e, 'error')
  }
}

async function doAutoSave(state) {
  try {
    const primary = getCurrentPrimary(state.config)
    if (primary) applyDefaultModel(state)
    normalizeProviderUrls(state.config)
    await api.writeOpenclawConfig(state.config)

    toast(t('Loading...'), 'info')
    try {
      await api.restartGateway()
      toast(t('Success'), 'success')
    } catch (e) {
      // 重启失败时提供手动重试按钮
      const restartBtn = document.createElement('button')
      restartBtn.className = 'btn btn-sm btn-primary'
      restartBtn.textContent = t('Retry')
      restartBtn.style.marginLeft = '8px'
      restartBtn.onclick = async () => {
        try {
          toast(t('Loading...'), 'info')
          await api.restartGateway()
          toast(t('Success'), 'success')
        } catch (e2) {
          toast(t('Error') + ': ' + e2.message, 'error')
        }
      }
      toast(t('Warning'), 'warning', { action: restartBtn })
    }
  } catch (e) {
    toast(t('Error') + ': ' + e, 'error')
  }
}

// 更新撤销按钮状态
function updateUndoBtn(page, state) {
  const btn = page.querySelector('#btn-undo')
  if (!btn) return
  const n = state.undoStack.length
  btn.disabled = !n
  btn.textContent = n ? `${t('Undo')} (${n})` : t('Undo')
}

// 渲染完成后，直接给每个 [data-action] 按钮绑定 onclick
function bindProviderButtons(listEl, page, state) {
  // 绑定排序下拉框
  listEl.querySelectorAll('select[data-action="sort-models"]').forEach(select => {
    select.onchange = (e) => {
      const val = e.target.value
      const section = select.closest('[data-provider]')
      if (!section) return
      const providerKey = section.dataset.provider
      const provider = state.config.models.providers[providerKey]

      if (val === 'default') {
        state.sortBy = 'default'
        renderProviders(page, state)
      } else {
        // 将排序固化到底层数据并保存
        pushUndo(state)
        provider.models = sortModels(provider.models, val)
        // 恢复下拉框显示 "默认顺序"，因为新顺序已经变成了默认顺序
        state.sortBy = 'default'
        renderProviders(page, state)
        autoSave(state)
        toast(t('Success'), 'success')
      }
    }
  })

  // 绑定拖拽排序（Pointer 事件实现，兼容 Tauri WebView2/WKWebView）
  listEl.querySelectorAll('.provider-models').forEach(container => {
    let dragged = null
    let placeholder = null
    let startY = 0

    // 仅从拖拽手柄启动
    container.addEventListener('pointerdown', e => {
      const handle = e.target.closest('.drag-handle')
      if (!handle) return
      const card = handle.closest('.model-card')
      if (!card) return

      e.preventDefault()
      dragged = card
      startY = e.clientY

      // 创建占位符
      placeholder = document.createElement('div')
      placeholder.style.cssText = `height:${card.offsetHeight}px;border:2px dashed var(--border);border-radius:var(--radius-md);margin-bottom:8px;background:var(--bg-secondary)`
      card.after(placeholder)

      // 浮动拖拽元素
      const rect = card.getBoundingClientRect()
      card.style.position = 'fixed'
      card.style.left = rect.left + 'px'
      card.style.top = rect.top + 'px'
      card.style.width = rect.width + 'px'
      card.style.zIndex = '9999'
      card.style.opacity = '0.85'
      card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
      card.style.pointerEvents = 'none'
      card.setPointerCapture(e.pointerId)
    })

    container.addEventListener('pointermove', e => {
      if (!dragged || !placeholder) return
      e.preventDefault()

      // 移动浮动元素
      const dy = e.clientY - startY
      const origTop = parseFloat(dragged.style.top)
      dragged.style.top = (origTop + dy) + 'px'
      startY = e.clientY

      // 查找目标位置
      const siblings = [...container.querySelectorAll('.model-card:not([style*="position: fixed"])')].filter(c => c !== dragged)
      for (const sibling of siblings) {
        const rect = sibling.getBoundingClientRect()
        const midY = rect.top + rect.height / 2
        if (e.clientY < midY) {
          sibling.before(placeholder)
          return
        }
      }
      // 放到最后
      if (siblings.length) siblings[siblings.length - 1].after(placeholder)
    })

    container.addEventListener('pointerup', e => {
      if (!dragged || !placeholder) return

      // 恢复样式
      dragged.style.position = ''
      dragged.style.left = ''
      dragged.style.top = ''
      dragged.style.width = ''
      dragged.style.zIndex = ''
      dragged.style.opacity = ''
      dragged.style.boxShadow = ''
      dragged.style.pointerEvents = ''

      // 把卡片放到占位符位置
      placeholder.before(dragged)
      placeholder.remove()

      // 保存新顺序
      const section = container.closest('[data-provider]')
      if (section) {
        const providerKey = section.dataset.provider
        const provider = state.config.models.providers[providerKey]
        if (provider) {
          const newOrderIds = [...container.querySelectorAll('.model-card')].map(c => c.dataset.modelId)
          pushUndo(state)
          const oldModels = [...provider.models]
          provider.models = newOrderIds.map(id => oldModels.find(m => (typeof m === 'string' ? m : m.id) === id))
          autoSave(state)
        }
      }

      dragged = null
      placeholder = null
    })
  })

  // 绑定按钮
  listEl.querySelectorAll('button[data-action], input[data-action]').forEach(btn => {
    const action = btn.dataset.action
    const section = btn.closest('[data-provider]')
    if (!section) return
    const providerKey = section.dataset.provider
    const provider = state.config.models.providers[providerKey]
    if (!provider) return
    const card = btn.closest('.model-card')

    if (btn.type === 'checkbox') {
      btn.onchange = (e) => {
        handleAction(action, btn, card, section, providerKey, provider, page, state)
      }
    } else {
      btn.onclick = (e) => {
        e.stopPropagation()
        handleAction(action, btn, card, section, providerKey, provider, page, state)
      }
    }
  })
}

// 统一处理按钮动作
async function handleAction(action, btn, card, section, providerKey, provider, page, state) {
  switch (action) {
    case 'edit-provider':
      editProvider(page, state, providerKey)
      break
    case 'add-model':
      addModel(page, state, providerKey)
      break
    case 'fetch-models':
      fetchRemoteModels(btn, page, state, providerKey)
      break
    case 'delete-provider': {
      const yes = await showConfirm(`${t('Delete')} ${providerKey}?`)
      if (!yes) return
      pushUndo(state)
      delete state.config.models.providers[providerKey]
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
      toast(t('Success'), 'info')
      break
    }
    case 'select-all':
      handleSelectAll(section)
      break
    case 'batch-delete':
      handleBatchDelete(section, page, state, providerKey)
      break
    case 'batch-test':
      handleBatchTest(section, state, providerKey)
      break
    case 'delete-model': {
      if (!card) return
      const modelId = card.dataset.modelId
      const yes = await showConfirm(`${t('Delete')} ${modelId}?`)
      if (!yes) return
      pushUndo(state)
      const idx = findModelIdx(provider, modelId)
      if (idx >= 0) provider.models.splice(idx, 1)
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
      toast(t('Success'), 'info')
      break
    }
    case 'edit-model': {
      if (!card) return
      const idx = findModelIdx(provider, card.dataset.modelId)
      if (idx >= 0) editModel(page, state, providerKey, idx)
      break
    }
    case 'set-primary': {
      if (!card) return
      pushUndo(state)
      setPrimary(state, card.dataset.full)
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
      toast(t('Success'), 'success')
      break
    }
    case 'test-model': {
      if (!card) return
      const idx = findModelIdx(provider, card.dataset.modelId)
      if (idx >= 0) testModel(btn, state, providerKey, idx)
      break
    }
  }
}

// 设置主模型（仅修改 state，不写入文件）
function setPrimary(state, full) {
  if (!state.config.agents) state.config.agents = {}
  if (!state.config.agents.defaults) state.config.agents.defaults = {}
  if (!state.config.agents.defaults.model) state.config.agents.defaults.model = {}
  state.config.agents.defaults.model.primary = full
}

// 应用默认模型：primary + 其余自动成为备选
function ensureValidPrimary(state) {
  const primary = getCurrentPrimary(state.config)
  const allModels = collectAllModels(state.config)
  if (allModels.length === 0) {
    if (state.config.agents?.defaults?.model) {
      state.config.agents.defaults.model.primary = ''
    }
    return
  }
  const exists = allModels.some(m => m.full === primary)
  if (!exists) {
    const newPrimary = allModels[0].full
    setPrimary(state, newPrimary)
    toast(t('Primary') + ': ' + newPrimary, 'info')
  }
}

function applyDefaultModel(state) {
  ensureValidPrimary(state)
  const primary = getCurrentPrimary(state.config)
  const allModels = collectAllModels(state.config)
  const fallbacks = allModels.filter(m => m.full !== primary).map(m => m.full)

  const defaults = state.config.agents.defaults
  defaults.model.primary = primary
  defaults.model.fallbacks = fallbacks

  const modelsMap = {}
  modelsMap[primary] = {}
  for (const fb of fallbacks) modelsMap[fb] = {}
  defaults.models = modelsMap

  const list = state.config.agents?.list
  if (Array.isArray(list)) {
    for (const agent of list) {
      if (agent.model && typeof agent.model === 'object' && agent.model.primary) {
        agent.model.primary = primary
      }
    }
  }
}

// 顶部按钮事件
function bindTopActions(page, state) {
  page.querySelector('#btn-add-provider').onclick = () => addProvider(page, state)
  page.querySelector('#btn-undo').onclick = () => undo(page, state)

  // 晴辰云：获取模型列表 → 弹窗让用户选择要添加的模型
  page.querySelector('#btn-qtcool-oneclick').onclick = async () => {
    if (!state.config) { toast(t('Warning'), 'warning'); return }

    const btn = page.querySelector('#btn-qtcool-oneclick')
    btn.textContent = '...'
    btn.disabled = true

    const models = await fetchQtcoolModels()

    btn.innerHTML = `${icon('plus', 14)} ${t('Get Model List')}`
    btn.disabled = false

    if (!models.length) {
      toast(t('Error'), 'error')
      return
    }

    const existingProvider = (state.config.models?.providers || {})[QTCOOL.providerKey]
    const existingIds = new Set((existingProvider?.models || []).map(m => typeof m === 'string' ? m : m.id))

    // 弹窗让用户勾选要添加的模型
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `
      <div class="modal" style="max-height:80vh;overflow-y:auto">
        <div class="modal-title">${t('Add')}</div>
        <div class="form-hint" style="margin-bottom:12px">Found ${models.length} models.</div>
        <div style="margin-bottom:12px;display:flex;gap:8px">
          <button class="btn btn-sm btn-secondary" id="qtsel-all">${t('Select All')}</button>
          <button class="btn btn-sm btn-secondary" id="qtsel-none">${t('Cancel')}</button>
        </div>
        <div id="qtmodel-list" style="display:flex;flex-direction:column;gap:6px;max-height:40vh;overflow-y:auto;padding-right:4px">
          ${models.map(m => {
            const already = existingIds.has(m.id)
            return `<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--radius-md);cursor:pointer;background:var(--bg-tertiary);opacity:${already ? '0.5' : '1'}">
              <input type="checkbox" value="${m.id}" ${already ? 'disabled' : 'checked'}>
              <span style="font-size:var(--font-size-sm);flex:1">${m.id}</span>
            </label>`
          }).join('')}
        </div>
        <div class="modal-actions" style="margin-top:16px">
          <button class="btn btn-primary" id="qtsel-confirm">${t('Add')}</button>
          <button class="btn btn-secondary" id="qtsel-cancel">${t('Cancel')}</button>
        </div>
      </div>
    `
    document.body.appendChild(overlay)
    overlay.querySelector('#qtsel-cancel').onclick = () => overlay.remove()
    overlay.querySelector('#qtsel-all').onclick = () => {
      overlay.querySelectorAll('#qtmodel-list input:not(:disabled)').forEach(cb => cb.checked = true)
    }
    overlay.querySelector('#qtsel-none').onclick = () => {
      overlay.querySelectorAll('#qtmodel-list input:not(:disabled)').forEach(cb => cb.checked = false)
    }
    overlay.querySelector('#qtsel-confirm').onclick = () => {
      const selected = [...overlay.querySelectorAll('#qtmodel-list input:checked:not(:disabled)')].map(cb => cb.value)
      overlay.remove()
      if (!selected.length) { toast(t('Warning'), 'info'); return }

      pushUndo(state)
      if (!state.config.models) state.config.models = {}
      if (!state.config.models.providers) state.config.models.providers = {}

      const selectedModels = models.filter(m => selected.includes(m.id))
      if (existingProvider) {
        let added = 0
        for (const m of selectedModels) {
          if (!existingIds.has(m.id)) { existingProvider.models.push({ ...m }); added++ }
        }
        toast(t('Success'), added ? 'success' : 'info')
      } else {
        state.config.models.providers[QTCOOL.providerKey] = {
          baseUrl: QTCOOL.baseUrl,
          apiKey: QTCOOL.defaultKey,
          api: QTCOOL.api,
          models: selectedModels.map(m => ({ ...m })),
        }
        toast(t('Success'), 'success')
      }
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
    }
  }
}

// 添加服务商（带预设快捷选择）
function addProvider(page, state) {
  const presetsHtml = PROVIDER_PRESETS.filter(p => !p.hidden).map(p =>
    `<button class="btn btn-sm btn-secondary preset-btn" data-preset="${p.key}" style="margin:0 6px 6px 0">${p.label}</button>`
  ).join('')

  const overlay = document.createElement('div')
  overlay.className = 'modal-overlay'
  overlay.innerHTML = `
    <div class="modal" style="max-height:85vh;overflow-y:auto">
      <div class="modal-title">${t('Add Provider')}</div>
      <div class="form-group">
        <label class="form-label">Presets</label>
        <div style="display:flex;flex-wrap:wrap">${presetsHtml}</div>
      </div>
      <div class="form-group">
        <label class="form-label">${t('Provider Name')}</label>
        <input class="form-input" data-name="key" placeholder="e.g. openai">
      </div>
      <div class="form-group">
        <label class="form-label">${t('API URL')}</label>
        <input class="form-input" data-name="baseUrl" placeholder="https://api.openai.com/v1">
      </div>
      <div class="form-group">
        <label class="form-label">${t('API Key')}</label>
        <input class="form-input" data-name="apiKey" placeholder="sk-...">
      </div>
      <div class="form-group">
        <label class="form-label">${t('API Type')}</label>
        <select class="form-input" data-name="api">
          ${API_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('')}
        </select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-sm" data-action="cancel">${t('Cancel')}</button>
        <button class="btn btn-primary btn-sm" data-action="confirm">${t('Confirm')}</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  overlay.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
      const preset = PROVIDER_PRESETS.find(p => p.key === btn.dataset.preset)
      if (!preset) return
      overlay.querySelector('[data-name="key"]').value = preset.key
      overlay.querySelector('[data-name="baseUrl"]').value = preset.baseUrl
      overlay.querySelector('[data-name="api"]').value = preset.api
      overlay.querySelectorAll('.preset-btn').forEach(b => b.style.opacity = '0.5')
      btn.style.opacity = '1'
    }
  })

  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove() })
  overlay.querySelector('[data-action="cancel"]').onclick = () => overlay.remove()

  overlay.querySelector('[data-action="confirm"]').onclick = () => {
    const key = overlay.querySelector('[data-name="key"]').value.trim()
    const baseUrl = overlay.querySelector('[data-name="baseUrl"]').value.trim()
    const apiKey = overlay.querySelector('[data-name="apiKey"]').value.trim()
    const apiType = overlay.querySelector('[data-name="api"]').value
    if (!key) { toast(t('Warning'), 'warning'); return }
    pushUndo(state)
    if (!state.config.models) state.config.models = { mode: 'replace', providers: {} }
    if (!state.config.models.providers) state.config.models.providers = {}
    state.config.models.providers[key] = {
      baseUrl: baseUrl || '',
      apiKey: apiKey || '',
      api: apiType,
      models: [],
    }
    overlay.remove()
    renderProviders(page, state)
    updateUndoBtn(page, state)
    autoSave(state)
    toast(t('Success'), 'success')
  }
}

// 编辑服务商
function editProvider(page, state, providerKey) {
  const p = state.config.models.providers[providerKey]
  showModal({
    title: `${t('Edit')} ${providerKey}`,
    fields: [
      { name: 'baseUrl', label: t('API URL'), value: p.baseUrl || '' },
      { name: 'apiKey', label: t('API Key'), value: p.apiKey || '' },
      {
        name: 'api', label: t('API Type'), type: 'select', value: p.api || 'openai-completions',
        options: API_TYPES,
      },
    ],
    onConfirm: ({ baseUrl, apiKey, api: apiType }) => {
      pushUndo(state)
      p.baseUrl = baseUrl
      p.apiKey = apiKey
      p.api = apiType
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
      toast(t('Success'), 'success')
    },
  })
}

// 添加模型（带预设快捷选择）
function addModel(page, state, providerKey) {
  const presets = MODEL_PRESETS[providerKey] || []
  const existingIds = (state.config.models.providers[providerKey].models || [])
    .map(m => typeof m === 'string' ? m : m.id)

  const available = presets.filter(p => !existingIds.includes(p.id))

  const fields = [
    { name: 'id', label: 'ID', placeholder: 'e.g. gpt-4o' },
    { name: 'name', label: t('Name'), placeholder: 'e.g. GPT-4o' },
    { name: 'contextWindow', label: t('Context Window'), placeholder: 'e.g. 128000' },
    { name: 'reasoning', label: t('Reasoning'), type: 'checkbox', value: false },
  ]

  if (available.length) {
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'

    const presetBtns = available.map(p =>
      `<button class="btn btn-sm btn-secondary preset-btn" data-mid="${p.id}" style="margin:0 6px 6px 0">${p.id}</button>`
    ).join('')

    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-title">${t('Add')} to ${providerKey}</div>
        <div class="form-group">
          <label class="form-label">Presets</label>
          <div style="display:flex;flex-wrap:wrap">${presetBtns}</div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" data-action="cancel">${t('Cancel')}</button>
          <button class="btn btn-primary btn-sm" data-action="confirm">${t('Confirm')}</button>
        </div>
      </div>
    `

    document.body.appendChild(overlay)
    overlay.querySelector('[data-action="cancel"]').onclick = () => overlay.remove()
    overlay.querySelector('[data-action="confirm"]').onclick = () => { overlay.remove() }

    overlay.querySelectorAll('.preset-btn').forEach(btn => {
      btn.onclick = () => {
        const preset = available.find(p => p.id === btn.dataset.mid)
        if (!preset) return
        pushUndo(state)
        const model = { ...preset, input: ['text', 'image'] }
        state.config.models.providers[providerKey].models.push(model)
        overlay.remove()
        renderProviders(page, state)
        renderDefaultBar(page, state)
        updateUndoBtn(page, state)
        autoSave(state)
        toast(t('Success'), 'success')
      }
    })
  } else {
    showModal({
      title: `${t('Add')} ${t('Model')}`,
      fields,
      onConfirm: (vals) => {
        pushUndo(state)
        doAddModel(state, providerKey, vals)
        renderProviders(page, state)
        renderDefaultBar(page, state)
        updateUndoBtn(page, state)
        autoSave(state)
      },
    })
  }
}

function doAddModel(state, providerKey, vals) {
  if (!vals.id) return
  const model = {
    id: vals.id.trim(),
    name: vals.name?.trim() || vals.id.trim(),
    reasoning: !!vals.reasoning,
    input: ['text', 'image'],
  }
  if (vals.contextWindow) model.contextWindow = parseInt(vals.contextWindow) || 0
  state.config.models.providers[providerKey].models.push(model)
  toast(t('Success'), 'success')
}

function editModel(page, state, providerKey, idx) {
  const m = state.config.models.providers[providerKey].models[idx]
  showModal({
    title: `${t('Edit')} ${m.id}`,
    fields: [
      { name: 'id', label: 'ID', value: m.id || '' },
      { name: 'name', label: t('Name'), value: m.name || '' },
      { name: 'contextWindow', label: t('Context Window'), value: String(m.contextWindow || '') },
      { name: 'reasoning', label: t('Reasoning'), type: 'checkbox', value: !!m.reasoning },
    ],
    onConfirm: (vals) => {
      if (!vals.id) return
      pushUndo(state)
      m.id = vals.id.trim()
      m.name = vals.name?.trim() || vals.id.trim()
      m.reasoning = !!vals.reasoning
      if (vals.contextWindow) m.contextWindow = parseInt(vals.contextWindow) || 0
      renderProviders(page, state)
      renderDefaultBar(page, state)
      updateUndoBtn(page, state)
      autoSave(state)
      toast(t('Success'), 'success')
    },
  })
}

function handleSelectAll(section) {
  const boxes = section.querySelectorAll('.model-checkbox')
  const allChecked = [...boxes].every(cb => cb.checked)
  boxes.forEach(cb => { cb.checked = !allChecked })
}

async function handleBatchDelete(section, page, state, providerKey) {
  const checked = [...section.querySelectorAll('.model-checkbox:checked')]
  if (!checked.length) return
  const ids = checked.map(cb => cb.dataset.modelId)
  const yes = await showConfirm(`${t('Delete')} ${ids.length} models?`)
  if (!yes) return
  pushUndo(state)
  const provider = state.config.models.providers[providerKey]
  provider.models = (provider.models || []).filter(m => !ids.includes(typeof m === 'string' ? m : m.id))
  renderProviders(page, state)
  renderDefaultBar(page, state)
  updateUndoBtn(page, state)
  autoSave(state)
  toast(t('Success'), 'info')
}

async function handleBatchTest(section, state, providerKey) {
  if (_batchTestAbort) { _batchTestAbort.abort = true; return }
  const provider = state.config.models.providers[providerKey]
  const checked = [...section.querySelectorAll('.model-checkbox:checked')]
  const ids = checked.length ? checked.map(cb => cb.dataset.modelId) : (provider.models || []).map(m => typeof m === 'string' ? m : m.id)
  if (!ids.length) return

  const ctrl = { abort: false }; _batchTestAbort = ctrl
  const page = section.closest('.page')
  let ok = 0, fail = 0
  for (const modelId of ids) {
    if (ctrl.abort) break
    const start = Date.now()
    try {
      await api.testModel(provider.baseUrl, provider.apiKey || '', modelId, provider.api || 'openai-completions')
      ok++
    } catch (e) { fail++ }
    if (page) renderProviders(page, state)
  }
  _batchTestAbort = null
  autoSave(state)
  toast(`${ok} Passed, ${fail} Failed`, 'info')
}

async function fetchRemoteModels(btn, page, state, providerKey) {
  const provider = state.config.models.providers[providerKey]
  btn.disabled = true; btn.textContent = '...'
  try {
    const remoteIds = await api.listRemoteModels(provider.baseUrl, provider.apiKey || '', provider.api || 'openai-completions')
    btn.disabled = false; btn.textContent = t('Get Model List')
    const existingIds = (provider.models || []).map(m => typeof m === 'string' ? m : m.id)
    const overlay = document.createElement('div')
    overlay.className = 'modal-overlay'
    overlay.innerHTML = `<div class="modal">
        <div class="modal-title">${providerKey} (${remoteIds.length})</div>
        <div id="remote-model-list" style="margin-top:12px;max-height:50vh;overflow-y:auto">
          ${remoteIds.map(id => {
            const exists = existingIds.includes(id)
            return `<label style="display:flex;align-items:center;gap:8px;padding:6px;opacity:${exists ? '0.5' : '1'}">
              <input type="checkbox" class="remote-cb" data-id="${id}" ${exists ? 'disabled' : ''}>
              <span>${id}</span>
            </label>`
          }).join('')}
        </div>
        <div class="modal-actions" style="margin-top:16px">
          <button class="btn btn-primary" id="remote-confirm">${t('Add')}</button>
          <button class="btn btn-secondary" id="remote-cancel">${t('Cancel')}</button>
        </div>
    </div>`
    document.body.appendChild(overlay)
    overlay.querySelector('#remote-cancel').onclick = () => overlay.remove()
    overlay.querySelector('#remote-confirm').onclick = () => {
      const sel = [...overlay.querySelectorAll('.remote-cb:checked')].map(cb => cb.dataset.id)
      pushUndo(state)
      for (const id of sel) provider.models.push({ id, input: ['text', 'image'] })
      overlay.remove()
      renderProviders(page, state); renderDefaultBar(page, state); updateUndoBtn(page, state); autoSave(state)
      toast(t('Success'), 'success')
    }
  } catch (e) {
    btn.disabled = false; btn.textContent = t('Get Model List')
    toast(t('Error'), 'error')
  }
}

async function testModel(btn, state, providerKey, idx) {
  const provider = state.config.models.providers[providerKey]
  const model = provider.models[idx]
  const modelId = typeof model === 'string' ? model : model.id
  btn.disabled = true; btn.textContent = '...'
  const start = Date.now()
  try {
    await api.testModel(provider.baseUrl, provider.apiKey || '', modelId, provider.api || 'openai-completions')
    toast(`${modelId} OK`, 'success')
  } catch (e) { toast(`${modelId} Fail`, 'error') }
  finally { btn.disabled = false; saveConfigOnly(state) }
}
