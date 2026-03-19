/**
 * Skills 页面 - 基于 openclaw skills CLI，按状态分组展示所有 Skills
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { icon } from '../lib/icons.js'
import { toast } from '../components/toast.js'

let _mainTab = 'installed'
let _filterText = ''
let _storeQuery = ''
let _installSource = 'skillhub'
let _uninstallTarget = null

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Skills')}</h1>
        <p class="page-desc">${t('Skills Desc')}</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" id="btn-refresh-skills">${icon('refresh-cw', 14)} ${t('Skills Refresh')}</button>
      </div>
    </div>

    <div class="page-tabs">
      <div class="tab ${_mainTab === 'installed' ? 'active' : ''}" data-tab="installed">${t('Skills Installed')}</div>
      <div class="tab ${_mainTab === 'store' ? 'active' : ''}" data-tab="store">${t('Skills Store')}</div>
    </div>

    <div id="skills-content" class="page-content">
      <div class="loading-placeholder" style="height:200px"></div>
    </div>

    <div id="skill-detail-modal" class="modal-overlay" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3 id="skill-detail-title">${t('Skills Details')}</h3>
          <button class="modal-close" id="skill-detail-close">&times;</button>
        </div>
        <div class="modal-body" id="skill-detail-body"></div>
      </div>
    </div>

    <div id="uninstall-modal" class="modal-overlay" style="display:none">
      <div class="modal-content">
        <div class="modal-header">
          <h3>${t('Skills Uninstall')}</h3>
          <button class="modal-close" id="uninstall-close">&times;</button>
        </div>
        <div class="modal-body">
          <p>${t('Skills Uninstall Confirm').replace('{{name}}', '<span id="uninstall-name"></span>')}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="uninstall-cancel">${t('Cancel')}</button>
          <button class="btn btn-danger" id="uninstall-confirm">${t('Skills Uninstall')}</button>
        </div>
      </div>
    </div>
  `

  loadSkills(page)

  page.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]')
    if (tab) {
      _mainTab = tab.dataset.tab
      page.querySelectorAll('.tab').forEach(t => t.classList.remove('active'))
      tab.classList.add('active')
      loadSkills(page)
      return
    }

    if (e.target.closest('#btn-refresh-skills')) {
      loadSkills(page)
    }

    if (e.target.closest('.skill-detail-btn')) {
      const name = e.target.closest('.skill-detail-btn').dataset.name
      showSkillDetail(name)
      return
    }

    if (e.target.closest('.skill-uninstall-btn')) {
      const name = e.target.closest('.skill-uninstall-btn').dataset.name
      _uninstallTarget = name
      page.querySelector('#uninstall-name').textContent = name
      page.querySelector('#uninstall-modal').style.display = 'flex'
      return
    }

    if (e.target.closest('#skill-detail-close')) {
      page.querySelector('#skill-detail-modal').style.display = 'none'
      return
    }

    if (e.target.closest('#uninstall-close') || e.target.closest('#uninstall-cancel')) {
      page.querySelector('#uninstall-modal').style.display = 'none'
      _uninstallTarget = null
      return
    }

    if (e.target.closest('#uninstall-confirm')) {
      confirmUninstall(page)
      return
    }

    if (e.target.closest('.skill-install-btn')) {
      const slug = e.target.closest('.skill-install-btn').dataset.slug
      installSkill(page, slug)
      return
    }

    if (e.target.closest('.skill-setup-cli-btn')) {
      setupCli(page)
      return
    }

    if (e.target.closest('.skill-search-btn')) {
      _storeQuery = page.querySelector('#store-search-input')?.value || ''
      loadSkills(page)
      return
    }

    if (e.target.closest('.skill-source-btn')) {
      _installSource = e.target.closest('.skill-source-btn').dataset.source
      loadSkills(page)
      return
    }

    if (e.target.closest('.skill-install-dep-btn')) {
      const name = e.target.closest('.skill-install-dep-btn').dataset.name
      const kind = e.target.closest('.skill-install-dep-btn').dataset.kind
      const spec = e.target.closest('.skill-install-dep-btn').dataset.spec
      installDep(page, name, kind, spec)
    }
  })

  return page
}

async function loadSkills(page) {
  const container = page.querySelector('#skills-content')

  if (_mainTab === 'installed') {
    try {
      const data = await api.skillsList()
      renderInstalledTab(container, data)
    } catch (e) {
      container.innerHTML = `<div class="error-state">${t('Skills Load Failed').replace('{{error}}', e.message)}</div>`
    }
  } else {
    try {
      const hubStatus = await api.skillsSkillHubCheck()
      renderStoreTab(container, hubStatus)
    } catch (e) {
      container.innerHTML = `<div class="error-state">${t('Skills Load Failed').replace('{{error}}', e.message)}</div>`
    }
  }
}

function classifySkills(skills) {
  const eligible = skills.filter(s => s.eligible && !s.disabled)
  const missing = skills.filter(s => !s.eligible && !s.disabled && !s.blockedByAllowlist)
  const disabled = skills.filter(s => s.disabled)
  const blocked = skills.filter(s => s.blockedByAllowlist && !s.disabled)
  return { eligible, missing, disabled, blocked }
}

function getSkillStatus(skill) {
  if (skill.disabled) return 'disabled'
  if (skill.blockedByAllowlist) return 'blocked'
  if (skill.eligible) return 'eligible'
  return 'missing'
}

function renderInstalledTab(container, data) {
  const skills = data?.skills || []
  const cliAvailable = data?.cliAvailable !== false
  const groups = classifySkills(skills)

  if (skills.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${t('Skills No Skills')}</p>
        <p class="text-muted-foreground" style="font-size:12px;margin-top:8px">${t('Skills No Skills Hint')}</p>
      </div>
    `
    return
  }

  let html = `
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
      <input type="text" class="form-input" id="skill-filter-input" placeholder="${t('Skills Filter')}" value="${_filterText}" style="max-width: 300px">
      <div class="flex items-center gap-2 ml-auto">
        <button class="btn btn-outline btn-sm" id="skill-refresh-btn">${icon('refresh-cw', 14)} ${t('Skills Refresh')}</button>
        <a href="https://clawhub.ai/skills" target="_blank" class="btn btn-outline btn-sm">
          ClawHub ${icon('external-link', 12)}
        </a>
      </div>
    </div>

    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-4">
      <span>${t('Skills Summary')
        .replace('{{available}}', groups.eligible.length)
        .replace('{{missing}}', groups.missing.length)
        .replace('{{disabled}}', groups.disabled.length)}</span>
      ${!cliAvailable ? `<span class="badge badge-warning">${t('Skills CLI Unavailable')}</span>` : ''}
    </div>

    <div class="space-y-6">
  `

  const filterFn = (skill) => {
    if (!_filterText) return true
    const q = _filterText.toLowerCase()
    return (skill.name || '').toLowerCase().includes(q) ||
           (skill.description || '').toLowerCase().includes(q)
  }

  const renderGroup = (groupSkills, status, statusConfig) => {
    const filtered = groupSkills.filter(filterFn)
    if (filtered.length === 0) return ''

    return `
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <span class="${statusConfig.iconColor}">${statusConfig.icon}</span>
          <span class="text-sm font-medium ${statusConfig.textColor}">
            ${t(statusConfig.labelKey)} (${filtered.length})
          </span>
        </div>
        <div class="border border-border">
          ${filtered.map(skill => renderSkillRow(skill, status)).join('')}
        </div>
      </div>
    `
  }

  const statusConfigs = {
    eligible: { icon: icon('check-circle', 16), iconColor: 'text-emerald-500', textColor: 'text-emerald-600', labelKey: 'Skills Available' },
    missing: { icon: icon('alert-triangle', 16), iconColor: 'text-amber-500', textColor: 'text-amber-600', labelKey: 'Skills Missing Deps' },
    disabled: { icon: icon('pause-circle', 16), iconColor: 'text-muted-foreground', textColor: 'text-muted-foreground', labelKey: 'Skills Disabled' },
    blocked: { icon: icon('x-circle', 16), iconColor: 'text-destructive', textColor: 'text-destructive', labelKey: 'Skills Blocked' }
  }

  html += renderGroup(groups.eligible, 'eligible', statusConfigs.eligible)
  html += renderGroup(groups.missing, 'missing', statusConfigs.missing)
  html += renderGroup(groups.disabled, 'disabled', statusConfigs.disabled)
  html += renderGroup(groups.blocked, 'blocked', statusConfigs.blocked)

  html += '</div>'
  container.innerHTML = html

  container.querySelector('#skill-filter-input')?.addEventListener('input', (e) => {
    _filterText = e.target.value
    renderInstalledTab(container, data)
  })
}

function renderSkillRow(skill, status) {
  const missingBins = skill.missing?.bins || []
  const missingEnv = skill.missing?.env || []
  const missingConfig = skill.missing?.config || []
  const installOpts = skill.install || []

  let statusBadge = ''
  switch (status) {
    case 'eligible': statusBadge = '<span class="badge badge-success">' + t('Skills Available') + '</span>'; break
    case 'missing': statusBadge = '<span class="badge badge-outline">' + t('Skills Missing Deps') + '</span>'; break
    case 'disabled': statusBadge = '<span class="badge badge-secondary">' + t('Skills Disabled') + '</span>'; break
    case 'blocked': statusBadge = '<span class="badge badge-danger">' + t('Skills Blocked') + '</span>'; break
  }

  let missingHtml = ''
  if (missingBins.length > 0) {
    missingHtml += `<p class="text-xs text-amber-600">${t('Skills Missing Bins')} ${missingBins.map(b => `<code class="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">${b}</code>`).join('')}</p>`
  }
  if (missingEnv.length > 0) {
    missingHtml += `<p class="text-xs text-amber-600">${t('Skills Missing Env')} ${missingEnv.map(e => `<code class="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">${e}</code>`).join('')}</p>`
  }
  if (missingConfig.length > 0) {
    missingHtml += `<p class="text-xs text-amber-600">${t('Skills Missing Config')} ${missingConfig.map(c => `<code class="mx-0.5 px-1 py-0.5 bg-muted rounded text-[11px]">${c}</code>`).join('')}</p>`
  }

  let installDepHtml = ''
  if (status === 'missing' && installOpts.length > 0) {
    installDepHtml = `<div class="flex flex-wrap gap-1.5 pt-1">
      ${installOpts.map(opt => `
        <button class="btn btn-sm skill-install-dep-btn" data-name="${skill.name}" data-kind="${opt.kind}" data-spec="${JSON.stringify(opt)}">
          ${icon('download', 12)} ${opt.label}
        </button>
      `).join('')}
    </div>`
  }

  return `
    <div class="flex items-start gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-b-0">
      <div class="flex-1 min-w-0 space-y-1">
        <div class="flex items-center gap-2">
          <span>${skill.emoji || '📦'}</span>
          <span class="text-sm font-medium truncate">${skill.name}</span>
          <span class="text-xs text-muted-foreground">
            ${skill.bundled ? t('Skills Bundled') : (skill.source || t('Skills Custom'))}
          </span>
          ${skill.homepage ? `<a href="${skill.homepage}" target="_blank" class="text-xs text-blue-500 hover:underline">${icon('external-link', 12)}</a>` : ''}
        </div>
        ${skill.description ? `<p class="text-xs text-muted-foreground truncate">${skill.description}</p>` : ''}
        ${missingHtml}
        ${installDepHtml}
      </div>
      <div class="flex items-center gap-2 shrink-0 pt-0.5">
        <button class="btn btn-ghost btn-sm skill-detail-btn" data-name="${skill.name}">
          ${icon('info', 14)} ${t('Skills Details')}
        </button>
        ${!skill.bundled ? `
          <button class="btn btn-ghost btn-sm text-danger hover:text-danger skill-uninstall-btn" data-name="${skill.name}">
            ${icon('trash', 14)} ${t('Skills Uninstall')}
          </button>
        ` : ''}
        ${statusBadge}
      </div>
    </div>
  `
}

async function renderStoreTab(container, hubStatus) {
  const cliInstalled = !!hubStatus?.installed
  const cliVersion = hubStatus?.version || ''

  let cliBadge = ''
  if (_installSource === 'skillhub') {
    if (cliInstalled) {
      cliBadge = `<span class="badge badge-success">${icon('check-circle', 12)} ${t('Skills CLI Version').replace('{{version}}', cliVersion)}</span>`
    } else {
      cliBadge = `<span class="badge badge-warning">${icon('alert-triangle', 12)} ${t('Skills CLI Missing')}</span>`
    }
  }

  let html = `
    <div class="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
      <div class="btn-group">
        <button class="btn btn-sm ${_installSource === 'skillhub' ? 'btn-primary' : 'btn-secondary'} skill-source-btn" data-source="skillhub">${t('Skills SkillHub')}</button>
        <button class="btn btn-sm ${_installSource === 'clawhub' ? 'btn-primary' : 'btn-secondary'} skill-source-btn" data-source="clawhub">${t('Skills ClawHub')}</button>
      </div>

      <div class="flex flex-1 items-center gap-2">
        <input type="text" class="form-input flex-1" id="store-search-input" placeholder="${t('Skills Search Placeholder')}" value="${_storeQuery}">
        <button class="btn btn-sm btn-primary skill-search-btn">${icon('search', 14)} ${t('Skills Search')}</button>
      </div>

      <div class="flex items-center gap-2">
        ${_installSource === 'skillhub' && !cliInstalled ? `
          <button class="btn btn-outline btn-sm skill-setup-cli-btn">
            ${icon('terminal', 14)} ${t('Skills Setup CLI')}
          </button>
        ` : ''}
        <a href="${_installSource === 'skillhub' ? 'https://skillhub.tencent.com' : 'https://clawhub.ai/skills'}" target="_blank" class="btn btn-outline btn-sm">
          ${t('Skills Browse')} ${icon('external-link', 12)}
        </a>
      </div>
    </div>

    <div class="flex items-center gap-2 text-xs text-muted-foreground mb-4">
      ${cliBadge}
    </div>
  `

  if (_storeQuery) {
    html += `<div id="store-results" class="border border-border min-h-[200px] max-h-[calc(100vh-320px)] overflow-y-auto">
      <div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
        ${t('Loading...')}
      </div>
    </div>`

    container.innerHTML = html

    try {
      const results = _installSource === 'skillhub'
        ? await api.skillsSkillHubSearch(_storeQuery)
        : await api.skillsClawHubSearch(_storeQuery)
      renderStoreResults(container, results)
    } catch (e) {
      container.querySelector('#store-results').innerHTML = `
        <div class="flex items-center justify-center h-48 text-sm text-destructive">
          ${t('Skills Search Failed').replace('{{error}}', e.message)}
        </div>
      `
    }
  } else {
    html += `
      <div class="border border-border min-h-[200px] flex items-center justify-center">
        <p class="text-sm text-muted-foreground">${t('Skills Search Empty')}</p>
      </div>
    `
    container.innerHTML = html
  }
}

function renderStoreResults(container, results) {
  const resultsEl = container.querySelector('#store-results')
  if (!results || results.length === 0) {
    resultsEl.innerHTML = `
      <div class="flex items-center justify-center h-48 text-sm text-muted-foreground">
        ${t('Skills Search No Results')}
      </div>
    `
    return
  }

  resultsEl.innerHTML = results.map(item => {
    const slug = item.slug || item.name || ''
    return `
      <div class="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors border-b border-border last:border-b-0">
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">${slug}</p>
          <p class="text-xs text-muted-foreground truncate">${item.description || item.summary || ''}</p>
        </div>
        <button class="btn btn-sm btn-primary shrink-0 skill-install-btn" data-slug="${slug}">
          ${icon('download', 14)} ${t('Skills Install')}
        </button>
      </div>
    `
  }).join('')
}

async function showSkillDetail(name) {
  const modal = document.querySelector('#skill-detail-modal')
  const title = document.querySelector('#skill-detail-title')
  const body = document.querySelector('#skill-detail-body')

  title.textContent = t('Loading...')
  body.innerHTML = `<div class="flex items-center justify-center py-8">${icon('loader', 20)}</div>`
  modal.style.display = 'flex'

  try {
    const skill = await api.skillsInfo(name)
    title.textContent = `${skill.emoji || '📦'} ${skill.name}`

    let html = `<div class="text-xs text-muted-foreground space-y-1">
      <p>${t('Skills Source')} ${skill.source || '—'}</p>
      ${skill.filePath ? `<p>${t('Skills Path')} <code class="px-1 py-0.5 bg-muted rounded text-[11px]">${skill.filePath}</code></p>` : ''}
      ${skill.homepage ? `<a href="${skill.homepage}" target="_blank" class="text-blue-500 hover:underline">${skill.homepage}</a>` : ''}
    </div>`

    const reqs = skill.requirements || {}
    const miss = skill.missing || {}

    if ((reqs.bins?.length || reqs.env?.length) && reqs.bins?.length > 0) {
      html += `<div class="mt-4"><p class="text-xs font-medium mb-2">${t('Skills Requirements')}</p>`
      if (reqs.bins?.length > 0) {
        html += `<div class="flex flex-wrap gap-1.5">`
        reqs.bins.forEach(b => {
          const ok = !(miss.bins ?? []).includes(b)
          html += `<code class="px-1.5 py-0.5 rounded text-[11px] ${ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}">${ok ? '✓' : '✗'} ${b}</code>`
        })
        html += `</div>`
      }
      if (reqs.env?.length > 0) {
        html += `<div class="flex flex-wrap gap-1.5 mt-2">`
        reqs.env.forEach(e => {
          const ok = !(miss.env ?? []).includes(e)
          html += `<code class="px-1.5 py-0.5 rounded text-[11px] ${ok ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}">${ok ? '✓' : '✗'} ${e}</code>`
        })
        html += `</div>`
      }
      html += `</div>`
    }

    if (skill.install?.length > 0 && !skill.eligible) {
      html += `<div class="mt-4"><p class="text-xs font-medium mb-1">${t('Skills Install Options')}</p>`
      html += skill.install.map(opt => `<span class="text-xs text-muted-foreground mr-2">→ ${opt.label}</span>`).join('')
      html += `</div>`
    }

    body.innerHTML = html
  } catch (e) {
    title.textContent = t('Error')
    body.innerHTML = `<p class="text-sm text-destructive">${e.message}</p>`
  }
}

async function confirmUninstall(page) {
  const name = _uninstallTarget
  if (!name) return

  const btn = page.querySelector('#uninstall-confirm')
  btn.disabled = true
  btn.textContent = t('Skills Uninstalling')

  try {
    await api.skillsUninstall(name)
    toast(t('Skills Uninstalled Success').replace('{{name}}', name), 'success')
    page.querySelector('#uninstall-modal').style.display = 'none'
    _uninstallTarget = null
    loadSkills(page)
  } catch (e) {
    toast(t('Skills Uninstall Failed').replace('{{error}}', e.message), 'error')
  } finally {
    btn.disabled = false
    btn.textContent = t('Skills Uninstall')
  }
}

async function installSkill(page, slug) {
  const btn = page.querySelector(`.skill-install-btn[data-slug="${slug}"]`)
  if (btn) {
    btn.disabled = true
    btn.innerHTML = `${icon('loader', 14)} ${t('Skills Installing')}`
  }

  try {
    if (_installSource === 'skillhub') {
      await api.skillsSkillHubInstall(slug)
    } else {
      await api.skillsClawHubInstall(slug)
    }
    toast(t('Skills Installed Success').replace('{{name}}', slug), 'success')
    loadSkills(page)
  } catch (e) {
    toast(t('Skills Install Failed').replace('{{error}}', e.message), 'error')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = `${icon('download', 14)} ${t('Skills Install')}`
    }
  }
}

async function installDep(page, skillName, kind, specStr) {
  const btn = page.querySelector(`.skill-install-dep-btn[data-name="${skillName}"][data-kind="${kind}"]`)
  if (btn) {
    btn.disabled = true
    btn.innerHTML = `${icon('loader', 12)} ${t('Skills Installing')}`
  }

  try {
    const spec = JSON.parse(specStr)
    await api.skillsInstallDep(kind, spec)
    toast(t('Skills Dep Installed').replace('{{name}}', skillName), 'success')
    loadSkills(page)
  } catch (e) {
    toast(t('Skills Install Failed').replace('{{error}}', e.message), 'error')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = `${icon('download', 12)} ${spec.label}`
    }
  }
}

async function setupCli(page) {
  const btn = page.querySelector('.skill-setup-cli-btn')
  if (btn) {
    btn.disabled = true
    btn.innerHTML = `${icon('loader', 14)} ${t('Skills CLI Installing')}`
  }

  try {
    await api.skillsSkillHubSetup(true)
    toast(t('Skills CLI Install Success'), 'success')
    loadSkills(page)
  } catch (e) {
    toast(t('Skills CLI Install Failed').replace('{{error}}', e.message), 'error')
    if (btn) {
      btn.disabled = false
      btn.innerHTML = `${icon('terminal', 14)} ${t('Skills Setup CLI')}`
    }
  }
}
