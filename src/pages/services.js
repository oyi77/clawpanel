/**
 * 服务管理页面
 * 服务启停 + 更新检测 + 配置备份管理
 */
import { api, invalidate } from '../lib/tauri-api.js'
import { t } from '../lib/i18n.js'
import { toast } from '../components/toast.js'
import { icon, statusIcon } from '../lib/icons.js'
import { showUpgradeModal, showConfirm } from '../components/modal.js'
import { onGatewayChange } from '../lib/app-state.js'

let _unsubGw = null

export async function render() {
  const page = document.createElement('div')
  page.className = 'page'

  page.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">${t('Service Management')}</h1>
        <p class="page-desc">${t('Service Desc')}</p>
      </div>
    </div>
    
    <div class="page-content space-y-6">
      <!-- Runtime Services -->
      <div class="settings-card">
         <div class="settings-title">Gateway Service</div>
         <div id="service-list-container" class="mt-4"></div>
      </div>

      <!-- Config Backup -->
      <div class="settings-card">
         <div class="flex items-center justify-between mb-4">
           <div>
             <div class="settings-title">${t('Last Backup')}</div>
             <div class="settings-desc">Configuration artifacts</div>
           </div>
           <button class="btn btn-primary btn-sm" id="btn-create-backup">${t('Add')}</button>
         </div>
         <div id="backup-list-container" class="space-y-2"></div>
      </div>
    </div>
  `

  loadStatus(page)
  
  if (_unsubGw) _unsubGw()
  _unsubGw = onGatewayChange(() => loadStatus(page))

  page.querySelector('#btn-create-backup').onclick = async () => {
    try {
      await api.createBackup()
      toast(t('Success'), 'success')
      loadStatus(page)
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  return page
}

async function loadStatus(page) {
    const sContainer = page.querySelector('#service-list-container')
    const bContainer = page.querySelector('#backup-list-container')

    try {
        const services = await api.getServicesStatus()
        const gw = services.find(s => s.label === 'ai.openclaw.gateway')
        
        if (gw) {
            sContainer.innerHTML = `
                <div class="service-card" style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md)">
                   <div class="flex items-center gap-4">
                      ${statusIcon(gw.running ? 'ok' : 'err', 18)}
                      <div>
                        <div class="font-bold">Gateway Interface</div>
                        <div class="text-xs text-muted-foreground">Status: ${gw.running ? t('Running') : t('Stopped')} ${gw.pid ? '· PID ' + gw.pid : ''}</div>
                      </div>
                   </div>
                   <div class="flex gap-2">
                     ${gw.running 
                        ? `<button class="btn btn-secondary btn-sm" data-action="restart">${t('Restart')}</button>
                           <button class="btn btn-danger btn-sm" data-action="stop">${t('Stop')}</button>`
                        : `<button class="btn btn-primary btn-sm" data-action="start">${t('Start')}</button>`
                     }
                   </div>
                </div>
            `
            sContainer.querySelector('button')?.addEventListener('click', async (e) => {
                const action = e.target.dataset.action
                try {
                    if (action === 'start') await api.startService(gw.label)
                    else if (action === 'stop') await api.stopService(gw.label)
                    else if (action === 'restart') await api.restartService(gw.label)
                    toast(t('Success'), 'success')
                    setTimeout(() => loadStatus(page), 1000)
                } catch(err) { toast(err.message, 'error') }
            })
        }

        const backups = await api.listBackups()
        if (backups.length > 0) {
            bContainer.innerHTML = backups.map(b => `
                <div class="flex items-center justify-between p-3 bg-secondary rounded-md">
                    <span class="text-sm font-mono">${b.name}</span>
                    <div class="flex gap-2">
                        <button class="btn btn-icon" data-restore="${b.name}" title="Restore">${icon('refresh-cw', 14)}</button>
                        <button class="btn btn-icon text-error border-error" data-delete="${b.name}" title="Delete">${icon('trash', 14)}</button>
                    </div>
                </div>
            `).join('')
            
            bContainer.querySelectorAll('[data-restore]').forEach(btn => {
                btn.onclick = async () => {
                    if (await showConfirm(`Restore ${btn.dataset.restore}?`)) {
                        await api.restoreBackup(btn.dataset.restore)
                        toast(t('Success'), 'success')
                    }
                }
            })
            bContainer.querySelectorAll('[data-delete]').forEach(btn => {
                btn.onclick = async () => {
                    if (await showConfirm(`Delete ${btn.dataset.delete}?`)) {
                        await api.deleteBackup(btn.dataset.delete)
                        loadStatus(page)
                    }
                }
            })
        } else {
            bContainer.innerHTML = `<div class="text-center py-4 opacity-50">${t('No Agents Found')}</div>`
        }
    } catch(e) {
        toast(e.message, 'error')
    }
}

export function cleanup() {
    if (_unsubGw) { _unsubGw(); _unsubGw = null }
}
