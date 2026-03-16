/**
 * 极简 i18n 插件 (Vanilla JS 版)
 */
const STORAGE_KEY = 'clawpanel_lang'

const translations = {
  zh: {
    'Dashboard': '仪表盘',
    'Assistant': '晴辰助手',
    'Real-time Chat': '实时聊天',
    'Services': '服务管理',
    'Logs': '日志查看',
    'Models': '模型配置',
    'Agents': 'Agent 管理',
    'Gateway': 'Gateway',
    'Channels': '消息渠道',
    'Automation': '通信与自动化',
    'Security': '安全设置',
    'Memory': '记忆文件',
    'Cron': '定时任务',
    'Usage': '使用情况',
    'Skills': 'Skills',
    'Workflow': '工作流',
    'Panel Settings': '面板设置',
    'System Diagnosis': '系统诊断',
    'About': '关于',
    'Theme Mode': '模式切换',
    'Dark Mode': '夜间模式',
    'Light Mode': '日间模式',
    'Overview': '概览',
    'Configuration': '配置',
    'Data': '数据',
    'Extension': '扩展',
    'Sync': '同步',
    'Update': '更新'
  },
  en: {
    'Dashboard': 'Dashboard',
    'Assistant': 'Assistant',
    'Real-time Chat': 'Live Chat',
    'Services': 'Services',
    'Logs': 'Logs',
    'Models': 'Models',
    'Agents': 'Agents',
    'Gateway': 'Gateway',
    'Channels': 'Channels',
    'Automation': 'Auto & Comm',
    'Security': 'Security',
    'Memory': 'Memory',
    'Cron': 'Cron',
    'Usage': 'Usage',
    'Skills': 'Skills',
    'Workflow': 'Workflow',
    'Panel Settings': 'Settings',
    'System Diagnosis': 'Diagnosis',
    'About': 'About',
    'Theme Mode': 'Theme',
    'Dark Mode': 'Dark',
    'Light Mode': 'Light',
    'Overview': 'Overview',
    'Configuration': 'Config',
    'Data': 'Data',
    'Extension': 'Extension',
    'Sync': 'Sync',
    'Update': 'Update'
  },
  id: {
    'Dashboard': 'Dasbor',
    'Assistant': 'Asisten',
    'Real-time Chat': 'Obrolan Langsung',
    'Services': 'Layanan',
    'Logs': 'Log',
    'Models': 'Model',
    'Agents': 'Agen',
    'Gateway': 'Gateway',
    'Channels': 'Saluran',
    'Automation': 'Auto & Komunikasi',
    'Security': 'Keamanan',
    'Memory': 'Memori',
    'Cron': 'Jadwal',
    'Usage': 'Penggunaan',
    'Skills': 'Skill',
    'Workflow': 'Alur Kerja',
    'Panel Settings': 'Pengaturan',
    'System Diagnosis': 'Diagnosis',
    'About': 'Tentang',
    'Theme Mode': 'Tema',
    'Dark Mode': 'Gelap',
    'Light Mode': 'Terang',
    'Overview': 'Ikhtisar',
    'Configuration': 'Konfigurasi',
    'Data': 'Data',
    'Extension': 'Ekstensi',
    'Sync': 'Sinkron',
    'Update': 'Perbarui'
  },
  ru: {
    'Dashboard': 'Панель',
    'Assistant': 'Ассистент',
    'Real-time Chat': 'Чат',
    'Services': 'Сервисы',
    'Logs': 'Логи',
    'Models': 'Модели',
    'Agents': 'Агенты',
    'Gateway': 'Гейтвей',
    'Channels': 'Каналы',
    'Automation': 'Автоматизация',
    'Security': 'Безопасность',
    'Memory': 'Память',
    'Cron': 'Задачи',
    'Usage': 'Использование',
    'Skills': 'Навыки',
    'Workflow': 'Воркфлоу',
    'Panel Settings': 'Настройки',
    'System Diagnosis': 'Диагностика',
    'About': 'О проекте',
    'Theme Mode': 'Тема',
    'Dark Mode': 'Темная',
    'Light Mode': 'Светлая',
    'Overview': 'Обзор',
    'Configuration': 'Настройка',
    'Data': 'Данные',
    'Extension': 'Дополнения',
    'Sync': 'Синх.',
    'Update': 'Обновить'
  }
}

let _current = localStorage.getItem(STORAGE_KEY) || 'en'

export function t(key) {
  const dict = translations[_current] || translations.en
  return dict[key] || key
}

export function getLang() { return _current }

export function setLang(lang) {
  if (translations[lang]) {
    _current = lang
    localStorage.setItem(STORAGE_KEY, lang)
    location.reload()
  }
}
