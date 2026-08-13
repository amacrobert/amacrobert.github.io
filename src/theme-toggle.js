(function() {
    'use strict';

    var STORAGE_KEY = 'theme-preference';

    function getThemePreference() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return stored;
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        var toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            var isDark = theme === 'dark';
            toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }

    function saveTheme(theme) {
        localStorage.setItem(STORAGE_KEY, theme);
    }

    function toggleTheme() {
        var current = document.documentElement.getAttribute('data-theme');
        var next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
        saveTheme(next);
    }

    function init() {
        var toggle = document.querySelector('.theme-toggle');
        if (toggle) {
            toggle.addEventListener('click', toggleTheme);
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
            if (!localStorage.getItem(STORAGE_KEY)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(getThemePreference());

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
