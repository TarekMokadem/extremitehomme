import { ref, computed } from 'vue';

export type Theme = 'light' | 'dark';

const theme = ref<Theme>('dark');

const applyTheme = () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme.value === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  try {
    window.localStorage.setItem('theme', theme.value);
  } catch {
    // ignore
  }
};

// Initialisation immédiate au chargement du module
if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      theme.value = stored;
    } else {
      theme.value = 'dark';
    }
  } catch {
    theme.value = 'dark';
  }
  applyTheme();
}

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark');

  const setTheme = (value: Theme) => {
    theme.value = value;
    applyTheme();
  };

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark');
  };

  return {
    theme,
    isDark,
    setTheme,
    toggleTheme,
  };
}

