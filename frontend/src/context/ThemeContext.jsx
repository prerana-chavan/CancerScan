import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ThemeContext = createContext();

const DARK_ONLY_ROUTES = ['/welcome', '/login', '/register'];

export function ThemeProvider({ children }) {
    const location = useLocation();
    
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const saved = localStorage.getItem('cancerscan_theme');
        return saved ? saved === 'dark' : true;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        
        // Force dark mode on specific routes
        const isDarkOnlyRoute = DARK_ONLY_ROUTES.includes(location.pathname);
        
        if (isDarkMode || isDarkOnlyRoute) {
            root.classList.remove('light-mode');
        } else {
            root.classList.add('light-mode');
        }

        // Persist preference only if not forced by route
        if (!isDarkOnlyRoute) {
            localStorage.setItem('cancerscan_theme', isDarkMode ? 'dark' : 'light');
        }
    }, [isDarkMode, location.pathname]);

    const toggleTheme = () => setIsDarkMode(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
