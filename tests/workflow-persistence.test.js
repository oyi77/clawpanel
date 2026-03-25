import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import os from 'os'

// Replicate persistence helpers from dev-api.js
function makeHelpers(tmpDir) {
  const RUNS_PATH = path.join(tmpDir, 'workflow-runs.json')
  const LOGS_DIR = path.join(tmpDir, 'workflow-logs')

  return {
    _loadRuns() {
      if (fs.existsSync(RUNS_PATH)) {
        try { return JSON.parse(fs.readFileSync(RUNS_PATH, 'utf8')) } catch { return [] }
      }
      return []
    },
    _saveRuns(runs) {
      fs.writeFileSync(RUNS_PATH, JSON.stringify(runs, null, 2))
    },
    _loadLogs(runId) {
      const p = path.join(LOGS_DIR, `${runId}.json`)
      if (fs.existsSync(p)) {
        try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return [] }
      }
      return []
    },
    _appendLog(runId, level, msg) {
      if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })
      const p = path.join(LOGS_DIR, `${runId}.json`)
      const logs = this._loadLogs(runId)
      logs.push({ ts: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), level, msg })
      fs.writeFileSync(p, JSON.stringify(logs, null, 2))
    },
  }
}

test('run persistence: _loadRuns returns [] when no file exists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  assert.deepEqual(h._loadRuns(), [])
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: _saveRuns writes valid JSON', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  h._saveRuns([{ id: 'run-1', status: 'running' }])
  const content = JSON.parse(fs.readFileSync(path.join(tmp, 'workflow-runs.json'), 'utf8'))
  assert.deepEqual(content, [{ id: 'run-1', status: 'running' }])
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: save then load preserves data', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  const runs = [{ id: 'run-1', status: 'running' }, { id: 'run-2', status: 'completed' }]
  h._saveRuns(runs)
  const loaded = h._loadRuns()
  assert.equal(loaded.length, 2)
  assert.equal(loaded[0].id, 'run-1')
  assert.equal(loaded[1].status, 'completed')
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: start creates run with correct fields', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  const id = 'run-' + Date.now()
  const run = {
    id,
    templateId: 'tiktok-viral',
    title: 'Test Run',
    status: 'running',
    progress: 0,
    stepCount: 3,
    startedAt: new Date().toISOString(),
    meta: 'Started'
  }
  const runs = h._loadRuns()
  runs.push(run)
  h._saveRuns(runs)
  h._appendLog(id, 'info', 'Workflow started')

  const loaded = h._loadRuns()
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].status, 'running')
  assert.equal(loaded[0].title, 'Test Run')
  assert.equal(loaded[0].stepCount, 3)

  const logs = h._loadLogs(id)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].level, 'info')
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: stop changes status and persists', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  const id = 'run-stop-test'
  h._saveRuns([{ id, status: 'running', progress: 65, templateId: 'test', title: 'Stop Test', stepCount: 3, startedAt: new Date().toISOString(), meta: 'Running' }])

  const runs = h._loadRuns()
  const run = runs.find(r => r.id === id)
  run.status = 'stopped'
  run.progress = 65
  run.stoppedAt = new Date().toISOString()
  run.meta = 'Stopped by user'
  h._saveRuns(runs)
  h._appendLog(id, 'warn', 'Workflow stopped by user')

  const loaded = h._loadRuns()
  assert.equal(loaded[0].status, 'stopped')
  assert.equal(loaded[0].progress, 65)
  assert.equal(loaded[0].meta, 'Stopped by user')

  const logs = h._loadLogs(id)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].level, 'warn')
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: pause and resume transitions work', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  const id = 'run-pause-test'
  h._saveRuns([{ id, status: 'running', templateId: 'test', title: 'Pause Test', stepCount: 2, startedAt: new Date().toISOString(), meta: 'Running' }])

  // Pause
  let runs = h._loadRuns()
  let run = runs.find(r => r.id === id)
  run.status = 'paused'
  run.pausedAt = new Date().toISOString()
  run.meta = 'Paused'
  h._saveRuns(runs)

  let loaded = h._loadRuns()
  assert.equal(loaded[0].status, 'paused')

  // Resume
  runs = h._loadRuns()
  run = runs.find(r => r.id === id)
  run.status = 'running'
  run.meta = 'Resumed'
  h._saveRuns(runs)

  loaded = h._loadRuns()
  assert.equal(loaded[0].status, 'running')
  assert.equal(loaded[0].meta, 'Resumed')
  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: _appendLog creates directory and writes entries', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  const id = 'log-test'

  // Should create dir automatically
  h._appendLog(id, 'info', 'Step 1 completed')
  h._appendLog(id, 'info', 'Step 2 completed')

  const logs = h._loadLogs(id)
  assert.equal(logs.length, 2)
  assert.equal(logs[0].level, 'info')
  assert.equal(logs[1].msg, 'Step 2 completed')
  assert.ok(logs[0].ts.match(/\d{2}:\d{2}:\d{2}/)) // timestamp format

  // Verify directory was created
  assert.ok(fs.existsSync(path.join(tmp, 'workflow-logs')))

  fs.rmSync(tmp, { recursive: true })
})

test('run persistence: filter by status returns correct subset', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-test-'))
  const h = makeHelpers(tmp)
  h._saveRuns([
    { id: 'run-a', status: 'running' },
    { id: 'run-b', status: 'running' },
    { id: 'run-c', status: 'completed' },
  ])

  const all = h._loadRuns()
  const running = all.filter(r => r.status === 'running')
  const completed = all.filter(r => r.status === 'completed')

  assert.equal(all.length, 3)
  assert.equal(running.length, 2)
  assert.equal(completed.length, 1)
  fs.rmSync(tmp, { recursive: true })
})
