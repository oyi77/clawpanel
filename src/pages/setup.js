/**
 * 初始设置页面
 * 环境检测：Node.js -> Git -> CLI -> Config
 */
import { api, invalidate } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'
import { icon, statusIcon } from '../lib/icons.js'
import { showUpgradeModal } from '../components/modal.js'
import { navigate, setDefaultRoute } from '../router.js'
import { detectOpenclawStatus, isOpenclawReady } from '../lib/app-state.js'

export async function render() {
  const page = document.createElement('div')
  page.className = 'page setup-page'

  page.innerHTML = `
    <div class="page-header center">
      <h1 class="page-title">${t('Welcome to ClawPanel')}</h1>
      <p class="page-desc">${t('ClawPanel Desc')}</p>
    </div>
    
    <div class="setup-container">
      <div id="setup-status"></div>
    </div>
  `

  loadStatus(page)
  return page
}

async function loadStatus(page) {
  const container = page.querySelector('#setup-status')
  container.innerHTML = `<div class="loading text-center py-10 opacity-50">${t('Loading...')}</div>`

  try {
    const [node, git, config, version] = await Promise.all([
      api.checkNode(),
      api.checkGit(),
      api.checkInstallation(),
      api.getVersionInfo()
    ])

    const nodeOk = node.installed
    const gitOk = git.installed
    const cliOk = config.installed // checkInstallation.installed includes CLI check
    const configOk = cliOk && config.path
    const allOk = nodeOk && cliOk && configOk

    let html = '<div class="space-y-6">'
    
    // Node.js
    html += `
      <div class="settings-card">
        <div class="flex items-center justify-between">
          <div class="settings-title">${statusIcon(nodeOk ? 'ok' : 'err', 18)} Node.js Runtime</div>
          <span class="text-xs ${nodeOk ? 'text-success' : 'text-error'}">${nodeOk ? node.version : 'Missing'}</span>
        </div>
        ${!nodeOk ? `
          <div class="settings-desc mt-2">Node.js >= 18 is required. Please install it from <a href="https://nodejs.org" target="_blank" class="text-accent">nodejs.org</a>.</div>
        ` : ''}
      </div>
    `

    // OpenClaw CLI
    html += `
      <div class="settings-card">
        <div class="flex items-center justify-between">
          <div class="settings-title">${statusIcon(cliOk ? 'ok' : 'err', 18)} OpenClaw CLI</div>
        </div>
        ${!cliOk ? `
          <div class="settings-desc mt-2">OpenClaw core is not installed. Click below to install it globally via npm.</div>
          <div class="mt-4 flex gap-4">
             <button class="btn btn-primary btn-sm" id="btn-install-cli">Install OpenClaw</button>
          </div>
        ` : `<div class="settings-desc mt-2 text-success">CLI is available at binary path.</div>`}
      </div>
    `

    // Config
    html += `
      <div class="settings-card">
        <div class="flex items-center justify-between">
          <div class="settings-title">${statusIcon(configOk ? 'ok' : 'err', 18)} Configuration</div>
        </div>
        ${!configOk && cliOk ? `
          <div class="settings-desc mt-2">No <code>openclaw.json</code> found. Click to initialize default config.</div>
          <div class="mt-4">
             <button class="btn btn-primary btn-sm" id="btn-init-config">Initialize Config</button>
          </div>
        ` : configOk ? `<div class="settings-desc mt-2">Config file found at <code>${config.path}</code></div>` : ''}
      </div>
    `

    if (allOk) {
      html += `
        <div class="flex justify-center mt-10">
          <button class="btn btn-primary" id="btn-enter-dashboard" style="min-width: 200px">Enter Dashboard</button>
        </div>
      `
    }

    html += '</div>'
    container.innerHTML = html

    // Bindings
    if (page.querySelector('#btn-install-cli')) {
        page.querySelector('#btn-install-cli').onclick = () => installCLI(page)
    }
    if (page.querySelector('#btn-init-config')) {
        page.querySelector('#btn-init-config').onclick = () => initConfig(page)
    }
    if (page.querySelector('#btn-enter-dashboard')) {
        page.querySelector('#btn-enter-dashboard').onclick = () => {
            setDefaultRoute('/dashboard')
            navigate('/dashboard')
        }
    }

  } catch (e) {
    container.innerHTML = `<div class="error-state">${e.message}</div>`
  }
}

async function installCLI(page) {
    const modal = showUpgradeModal('Installing OpenClaw')
    modal.appendLog('Starting global npm installation...')
    try {
        await api.upgradeOpenclaw('chinese', 'latest')
        modal.setDone('Installation complete')
        setTimeout(() => { modal.destroy(); loadStatus(page) }, 1500)
    } catch (e) {
        modal.setError(e.message)
    }
}

async function initConfig(page) {
    try {
        await api.initOpenclawConfig()
        toast('Configuration initialized', 'success')
        loadStatus(page)
    } catch (e) {
        toast(e.message, 'error')
    }
}
