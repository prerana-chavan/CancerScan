import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([
        { id: 1, title: 'System Security', message: 'Secure login from Pathologist Console.', time: 'Just Now', type: 'info' }
    ]);
    const [unreadCount, setUnreadCount] = useState(notifications.length);

    const addNotification = useCallback((title, message, type = 'info') => {
        const newNotif = {
            id: Date.now(),
            title,
            message,
            time: 'Just Now',
            type
        };
        setNotifications(prev => [newNotif, ...prev].slice(0, 10)); // Keep last 10
        setUnreadCount(prev => prev + 1);
    }, []);

    const markAsRead = useCallback(() => {
        setUnreadCount(0);
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
