/**
 * Skills 页面
 * 基于 openclaw skills CLI，按状态分组展示所有 Skills
 */
import { api } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { icon, statusIcon } from '../lib/icons.js'
import { toast } from '../components/toast.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Skills')}</h1>
        <p class="page-desc">Agent skill management</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary btn-sm" id="btn-refresh-skills">${t('Refresh')}</button>
      </div>
    </div>
    <div class="page-tabs">
      <div class="tab active" data-main-tab="installed">${t('Configured')}</div>
      <div class="tab" data-main-tab="store">${t('Search')}</div>
    </div>
    <div id="skills-list" class="page-content">
       <div class="loading-placeholder" style="height:200px"></div>
    </div>
  `

  loadSkills(page)

  page.querySelector('#btn-refresh-skills').addEventListener('click', () => loadSkills(page))

  return page
}

async function loadSkills(page) {
  const container = page.querySelector('#skills-list')
  try {
    const data = await api.skillsList()
    renderSkills(container, data)
  } catch (e) {
    container.innerHTML = `<div class="error-state">${e.message}</div>`
  }
}

function renderSkills(container, data) {
  if (!data?.skills?.length) {
    container.innerHTML = `<div class="empty-state">${t('No Agents Found')}</div>`
    return
  }
  container.innerHTML = `<div class="grid grid-cols-2 gap-4">
    ${data.skills.map(s => `
        <div class="skill-card">
            <strong>${s.name}</strong>
            <p>${s.description}</p>
        </div>
    `).join('')}
  </div>`
}
