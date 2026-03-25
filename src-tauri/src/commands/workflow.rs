use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::State;
use uuid::Uuid;

use crate::commands::openclaw_dir;

// Global state for workflow runtime
pub struct WorkflowState {
    pub settings: Mutex<WorkflowSettings>,
    pub templates: Mutex<Vec<WorkflowTemplate>>,
    pub runs: Mutex<Vec<WorkflowRun>>,
    pub logs: Mutex<HashMap<String, Vec<WorkflowLogEntry>>>,
}

impl WorkflowState {
    pub fn new() -> Self {
        let settings = load_workflow_settings();
        let templates = load_workflow_templates();
        let runs = load_workflow_runs();
        let logs = load_workflow_logs();
        
        Self {
            settings: Mutex::new(settings),
            templates: Mutex::new(templates),
            runs: Mutex::new(runs),
            logs: Mutex::new(logs),
        }
    }
}

impl Default for WorkflowState {
    fn default() -> Self {
        Self::new()
    }
}

// Data Models
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowSettings {
    pub enabled: bool,
    pub model: String,
    pub approval_level: i32,
    pub auto_create: bool,
    pub push_progress: bool,
    pub progress_mode: String,
}

impl Default for WorkflowSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            model: String::new(),
            approval_level: 2,
            auto_create: false,
            push_progress: false,
            progress_mode: "detailed".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowTemplate {
    pub id: String,
    pub name: String,
    pub description: String,
    pub steps: Vec<String>,
    pub meta: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowRun {
    pub id: String,
    pub template_id: String,
    pub title: String,
    pub status: String, // running, completed, failed, waiting, paused, stopped
    pub progress: i32,
    pub current_step: i32,
    pub steps: i32,
    pub time: String,
    pub meta: String,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowLogEntry {
    pub ts: String,
    pub level: String,
    pub msg: String,
}

// File paths
fn workflow_dir() -> PathBuf {
    let dir = openclaw_dir().join("clawpanel").join("workflows");
    std::fs::create_dir_all(&dir).ok();
    dir
}

fn settings_path() -> PathBuf {
    workflow_dir().join("settings.json")
}

fn templates_path() -> PathBuf {
    workflow_dir().join("templates.json")
}

fn runs_path() -> PathBuf {
    workflow_dir().join("runs.json")
}

fn logs_path() -> PathBuf {
    workflow_dir().join("logs.json")
}

// Load/Save functions
fn load_workflow_settings() -> WorkflowSettings {
    let path = settings_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(settings) = serde_json::from_str(&content) {
            return settings;
        }
    }
    WorkflowSettings::default()
}

fn save_workflow_settings(settings: &WorkflowSettings) -> Result<(), String> {
    let path = settings_path();
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn load_workflow_templates() -> Vec<WorkflowTemplate> {
    let path = templates_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(templates) = serde_json::from_str(&content) {
            return templates;
        }
    }
    Vec::new()
}

fn save_workflow_templates(templates: &[WorkflowTemplate]) -> Result<(), String> {
    let path = templates_path();
    let content = serde_json::to_string_pretty(templates).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn load_workflow_runs() -> Vec<WorkflowRun> {
    let path = runs_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(runs) = serde_json::from_str(&content) {
            return runs;
        }
    }
    Vec::new()
}

fn save_workflow_runs(runs: &[WorkflowRun]) -> Result<(), String> {
    let path = runs_path();
    let content = serde_json::to_string_pretty(runs).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn load_workflow_logs() -> HashMap<String, Vec<WorkflowLogEntry>> {
    let path = logs_path();
    if let Ok(content) = std::fs::read_to_string(&path) {
        if let Ok(logs) = serde_json::from_str(&content) {
            return logs;
        }
    }
    HashMap::new()
}

fn save_workflow_logs(logs: &HashMap<String, Vec<WorkflowLogEntry>>) -> Result<(), String> {
    let path = logs_path();
    let content = serde_json::to_string_pretty(logs).map_err(|e| e.to_string())?;
    std::fs::write(&path, content).map_err(|e| e.to_string())
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

fn format_time(ts: u64) -> String {
    let dt = chrono::DateTime::from_timestamp(ts as i64, 0)
        .unwrap_or_else(|| chrono::Utc::now());
    dt.format("%Y-%m-%d %H:%M").to_string()
}

// Tauri Commands
#[tauri::command]
pub fn workflow_settings_get(state: State<WorkflowState>) -> Result<WorkflowSettings, String> {
    let settings = state.settings.lock().map_err(|e| e.to_string())?;
    Ok(settings.clone())
}

#[tauri::command]
pub fn workflow_settings_save(
    settings: WorkflowSettings,
    state: State<WorkflowState>,
) -> Result<(), String> {
    save_workflow_settings(&settings)?;
    let mut state_settings = state.settings.lock().map_err(|e| e.to_string())?;
    *state_settings = settings;
    Ok(())
}

#[tauri::command]
pub fn workflow_template_list(state: State<WorkflowState>) -> Result<Vec<WorkflowTemplate>, String> {
    let templates = state.templates.lock().map_err(|e| e.to_string())?;
    Ok(templates.clone())
}

#[tauri::command]
pub fn workflow_template_get(
    id: String,
    state: State<WorkflowState>,
) -> Result<WorkflowTemplate, String> {
    let templates = state.templates.lock().map_err(|e| e.to_string())?;
    templates
        .iter()
        .find(|t| t.id == id)
        .cloned()
        .ok_or_else(|| "Template not found".to_string())
}

#[tauri::command]
pub fn workflow_template_create(
    name: String,
    description: String,
    steps: Vec<String>,
    state: State<WorkflowState>,
) -> Result<WorkflowTemplate, String> {
    let id = Uuid::new_v4().to_string();
    let now = current_timestamp();
    let template = WorkflowTemplate {
        id: id.clone(),
        name: name.clone(),
        description,
        steps: steps.clone(),
        meta: format!("{} steps", steps.len()),
        created_at: format_time(now),
        updated_at: format_time(now),
    };

    let mut templates = state.templates.lock().map_err(|e| e.to_string())?;
    templates.push(template.clone());
    save_workflow_templates(&templates)?;

    Ok(template)
}

#[tauri::command]
pub fn workflow_template_update(
    id: String,
    name: String,
    description: String,
    steps: Vec<String>,
    state: State<WorkflowState>,
) -> Result<(), String> {
    let mut templates = state.templates.lock().map_err(|e| e.to_string())?;
    
    if let Some(template) = templates.iter_mut().find(|t| t.id == id) {
        template.name = name;
        template.description = description;
        template.steps = steps.clone();
        template.meta = format!("{} steps", steps.len());
        template.updated_at = format_time(current_timestamp());
        save_workflow_templates(&templates)?;
        Ok(())
    } else {
        Err("Template not found".to_string())
    }
}

#[tauri::command]
pub fn workflow_template_delete(
    id: String,
    state: State<WorkflowState>,
) -> Result<(), String> {
    let mut templates = state.templates.lock().map_err(|e| e.to_string())?;
    templates.retain(|t| t.id != id);
    save_workflow_templates(&templates)?;
    Ok(())
}

#[tauri::command]
pub fn workflow_run_list(
    status: Option<String>,
    state: State<WorkflowState>,
) -> Result<Vec<WorkflowRun>, String> {
    let runs = state.runs.lock().map_err(|e| e.to_string())?;
    
    let filtered: Vec<WorkflowRun> = if let Some(filter) = status {
        if filter.is_empty() {
            runs.clone()
        } else {
            runs.iter()
                .filter(|r| r.status == filter)
                .cloned()
                .collect()
        }
    } else {
        runs.clone()
    };
    
    // Sort by created_at desc
    let mut sorted = filtered;
    sorted.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    
    Ok(sorted)
}

#[tauri::command]
pub fn workflow_run_get(
    id: String,
    state: State<WorkflowState>,
) -> Result<WorkflowRun, String> {
    let runs = state.runs.lock().map_err(|e| e.to_string())?;
    runs.iter()
        .find(|r| r.id == id)
        .cloned()
        .ok_or_else(|| "Run not found".to_string())
}

#[tauri::command]
pub fn workflow_run_start(
    template_id: String,
    title: String,
    state: State<WorkflowState>,
) -> Result<WorkflowRun, String> {
    // Get template to determine steps count
    let templates = state.templates.lock().map_err(|e| e.to_string())?;
    let template = templates
        .iter()
        .find(|t| t.id == template_id)
        .cloned()
        .ok_or_else(|| "Template not found".to_string())?;
    drop(templates);

    let id = Uuid::new_v4().to_string();
    let now = current_timestamp();
    let run = WorkflowRun {
        id: id.clone(),
        template_id: template_id.clone(),
        title: title.clone(),
        status: "running".to_string(),
        progress: 0,
        current_step: 0,
        steps: template.steps.len() as i32,
        time: format_time(now),
        meta: format!("From: {}", template.name),
        created_at: now,
        updated_at: now,
    };

    let mut runs = state.runs.lock().map_err(|e| e.to_string())?;
    runs.push(run.clone());
    save_workflow_runs(&runs)?;
    drop(runs);

    // Add initial log
    let mut logs = state.logs.lock().map_err(|e| e.to_string())?;
    let run_logs = logs.entry(id.clone()).or_default();
    run_logs.push(WorkflowLogEntry {
        ts: format_time(now),
        level: "info".to_string(),
        msg: format!("Workflow started: {}", title),
    });
    save_workflow_logs(&logs)?;

    Ok(run)
}

#[tauri::command]
pub fn workflow_run_stop(
    id: String,
    state: State<WorkflowState>,
) -> Result<(), String> {
    let mut runs = state.runs.lock().map_err(|e| e.to_string())?;
    
    if let Some(run) = runs.iter_mut().find(|r| r.id == id) {
        run.status = "stopped".to_string();
        run.updated_at = current_timestamp();
        save_workflow_runs(&runs)?;
        drop(runs);

        // Add log
        let mut logs = state.logs.lock().map_err(|e| e.to_string())?;
        let run_logs = logs.entry(id).or_default();
        run_logs.push(WorkflowLogEntry {
            ts: format_time(current_timestamp()),
            level: "info".to_string(),
            msg: "Workflow stopped by user".to_string(),
        });
        save_workflow_logs(&logs)?;
        
        Ok(())
    } else {
        Err("Run not found".to_string())
    }
}

#[tauri::command]
pub fn workflow_run_pause(
    id: String,
    state: State<WorkflowState>,
) -> Result<(), String> {
    let mut runs = state.runs.lock().map_err(|e| e.to_string())?;
    
    if let Some(run) = runs.iter_mut().find(|r| r.id == id) {
        run.status = "paused".to_string();
        run.updated_at = current_timestamp();
        save_workflow_runs(&runs)?;
        drop(runs);

        // Add log
        let mut logs = state.logs.lock().map_err(|e| e.to_string())?;
        let run_logs = logs.entry(id).or_default();
        run_logs.push(WorkflowLogEntry {
            ts: format_time(current_timestamp()),
            level: "info".to_string(),
            msg: "Workflow paused".to_string(),
        });
        save_workflow_logs(&logs)?;
        
        Ok(())
    } else {
        Err("Run not found".to_string())
    }
}

#[tauri::command]
pub fn workflow_run_resume(
    id: String,
    state: State<WorkflowState>,
) -> Result<(), String> {
    let mut runs = state.runs.lock().map_err(|e| e.to_string())?;
    
    if let Some(run) = runs.iter_mut().find(|r| r.id == id) {
        run.status = "running".to_string();
        run.updated_at = current_timestamp();
        save_workflow_runs(&runs)?;
        drop(runs);

        // Add log
        let mut logs = state.logs.lock().map_err(|e| e.to_string())?;
        let run_logs = logs.entry(id).or_default();
        run_logs.push(WorkflowLogEntry {
            ts: format_time(current_timestamp()),
            level: "info".to_string(),
            msg: "Workflow resumed".to_string(),
        });
        save_workflow_logs(&logs)?;
        
        Ok(())
    } else {
        Err("Run not found".to_string())
    }
}

#[tauri::command]
pub fn workflow_log_list(
    run_id: String,
    state: State<WorkflowState>,
) -> Result<Vec<WorkflowLogEntry>, String> {
    let logs = state.logs.lock().map_err(|e| e.to_string())?;
    Ok(logs.get(&run_id).cloned().unwrap_or_default())
}