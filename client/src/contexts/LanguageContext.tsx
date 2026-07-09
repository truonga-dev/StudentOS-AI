import React, { createContext, useContext, useState, useEffect } from 'react'

type Language = 'vi' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    'nav.dashboard': 'Tổng quan',
    'nav.subjects': 'Môn học',
    'nav.calendar': 'Lịch học',
    'nav.tasks': 'Công việc',
    'nav.notes': 'Ghi chú',
    'nav.files': 'Tài liệu',
    'nav.flashcards': 'Flashcards',
    'nav.chat': 'AI Chat',
    'nav.community': 'Cộng đồng',
    'nav.analytics': 'Thống kê',
    'nav.settings': 'Cài đặt & Hồ sơ',
    
    'settings.title': 'Cài đặt',
    'settings.subtitle': 'Quản lý tài khoản và tuỳ chỉnh ứng dụng',
    'settings.tab.profile': 'Tài khoản',
    'settings.tab.appear': 'Giao diện',
    'settings.tab.notifs': 'Thông báo',
    'settings.tab.security': 'Bảo mật',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.subjects': 'Subjects',
    'nav.calendar': 'Calendar',
    'nav.tasks': 'Tasks',
    'nav.notes': 'Notes',
    'nav.files': 'Files',
    'nav.flashcards': 'Flashcards',
    'nav.chat': 'AI Chat',
    'nav.community': 'Community',
    'nav.analytics': 'Analytics',
    'nav.settings': 'Settings & Profile',

    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your account and preferences',
    'settings.tab.profile': 'Profile',
    'settings.tab.appear': 'Appearance',
    'settings.tab.notifs': 'Notifications',
    'settings.tab.security': 'Security',
  }
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('app-language') as Language) || 'vi'
  })

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app-language', lang)
    setLanguageState(lang)
  }

  const t = (key: string) => {
    return translations[language][key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
