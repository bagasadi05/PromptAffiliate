/**
 * Theme Context — Dark / Light mode
 */
import { createContext, useState, useEffect, useCallback } from 'react';
import { getItem, setItem, KEYS } from '../utils/localStorage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => getItem(KEYS.THEME, 'dark'));

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        document.documentElement.classList.toggle('light', theme === 'light');
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
        document.querySelector('meta[name="theme-color"]')?.setAttribute(
            'content',
            theme === 'dark' ? '#0a0a0f' : '#f8fafc'
        );
    }, [theme]);

    const toggleTheme = useCallback(() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        setItem(KEYS.THEME, next);
    }, [theme]);

    const setThemeValue = useCallback((val) => {
        setTheme(val);
        setItem(KEYS.THEME, val);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme: setThemeValue }}>
            {children}
        </ThemeContext.Provider>
    );
}

export default ThemeContext;
