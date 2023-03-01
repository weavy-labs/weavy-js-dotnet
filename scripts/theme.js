const storedTheme = localStorage.getItem('theme');

const getPreferredTheme = () => {
  if (storedTheme) {
    return storedTheme;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const setTheme = function (theme) {
  if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.dataset.bsTheme = 'dark';
  } else {
    document.documentElement.dataset.bsTheme = theme;
  }
};

setTheme(getPreferredTheme());

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (storedTheme !== 'light' || storedTheme !== 'dark') {
    setTheme(getPreferredTheme());
  }
})

window.addEventListener('DOMContentLoaded', () => {
  const themeSwitcher = document.querySelector('.theme-switcher');
  if (themeSwitcher) {
    themeSwitcher.addEventListener('click', () => {
      const theme = document.documentElement.dataset.bsTheme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', theme);
      setTheme(theme);
    });
  }
});
