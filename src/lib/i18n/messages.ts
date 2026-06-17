import type { Locale } from '@/lib/product';

export const i18nMessages = {
  en: {
    common: {
      language: 'Language',
      english: 'English',
      hindi: 'Hindi',
      switchLanguage: 'Switch language',
      languageTooltip: 'Choose English or Hindi for this workspace',
      allUsers: 'All users',
      admins: 'Admins',
      regularUsers: 'Regular users',
      searchUsers: 'Search users',
      deleteUser: 'Delete user',
      cancel: 'Cancel',
      delete: 'Delete',
    },
  },
  hi: {
    common: {
      language: 'भाषा',
      english: 'अंग्रेज़ी',
      hindi: 'हिंदी',
      switchLanguage: 'भाषा बदलें',
      languageTooltip: 'इस वर्कस्पेस के लिए अंग्रेज़ी या हिंदी चुनें',
      allUsers: 'सभी उपयोगकर्ता',
      admins: 'व्यवस्थापक',
      regularUsers: 'सामान्य उपयोगकर्ता',
      searchUsers: 'उपयोगकर्ता खोजें',
      deleteUser: 'उपयोगकर्ता हटाएं',
      cancel: 'रद्द करें',
      delete: 'हटाएं',
    },
  },
} as const satisfies Record<Locale, Record<string, Record<string, string>>>;
