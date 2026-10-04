import { useTranslation } from 'react-i18next';
import { getLanguage } from './index';

export function useLanguage() {
  useTranslation();
  return getLanguage();
}
