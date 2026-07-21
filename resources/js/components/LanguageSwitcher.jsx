// resources/js/components/LanguageSwitcher.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { setDirection } from '../i18n';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setDirection(lang);
    localStorage.setItem('lang', lang);
  };
  
  return (
    <select 
      value={i18n.language} 
      onChange={(e) => changeLanguage(e.target.value)}
      className="border rounded px-2 py-1"
    >
      <option value="en">English</option>
      <option value="fa">دری</option>
      <option value="ps">پښتو</option>
    </select>
  );
};

export default LanguageSwitcher;