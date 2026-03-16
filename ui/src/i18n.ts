import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "Dashboard": "Dashboard",
      "Inbox": "Inbox",
      "Issues": "Issues",
      "Goals": "Goals",
      "Org": "Org",
      "Costs": "Costs",
      "Activity": "Activity",
      "Settings": "Settings",
      "Work": "Work",
      "Company": "Company",
      "New Issue": "New Issue",
      "Workflow Center": "Workflow Center",
      "Update": "Update",
      "Sync": "Sync",
      "Select Language": "Select Language"
    }
  },
  id: {
    translation: {
      "Dashboard": "Dasbor",
      "Inbox": "Kotak Masuk",
      "Issues": "Isu",
      "Goals": "Target",
      "Org": "Org",
      "Costs": "Biaya",
      "Activity": "Aktivitas",
      "Settings": "Pengaturan",
      "Work": "Kerja",
      "Company": "Perusahaan",
      "New Issue": "Isu Baru",
      "Workflow Center": "Pusat Alur Kerja",
      "Update": "Perbarui",
      "Sync": "Sinkron",
      "Select Language": "Pilih Bahasa"
    }
  },
  zh: {
    translation: {
      "Dashboard": "仪表盘",
      "Inbox": "收件箱",
      "Issues": "问题",
      "Goals": "目标",
      "Org": "组织架构",
      "Costs": "成本",
      "Activity": "活动",
      "Settings": "设置",
      "Work": "工作",
      "Company": "公司",
      "New Issue": "新问题",
      "Workflow Center": "工作流中心",
      "Update": "更新",
      "Sync": "同步",
      "Select Language": "选择语言"
    }
  },
  ru: {
    translation: {
      "Dashboard": "Панель",
      "Inbox": "Входящие",
      "Issues": "Задачи",
      "Goals": "Цели",
      "Org": "Оргструктура",
      "Costs": "Расходы",
      "Activity": "Активность",
      "Settings": "Настройки",
      "Work": "Работа",
      "Company": "Компания",
      "New Issue": "Новая задача",
      "Workflow Center": "Центр рабочих процессов",
      "Update": "Обновить",
      "Sync": "Синхронизация",
      "Select Language": "Выбрать язык"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
