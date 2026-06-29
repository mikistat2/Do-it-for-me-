import { useDark, useToggle } from '@vueuse/core';

const isDark = useDark({
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: '',
  storageKey: 'jobbot.theme',
});

const toggleDark = useToggle(isDark);

export const useTheme = () => ({ isDark, toggleDark });
