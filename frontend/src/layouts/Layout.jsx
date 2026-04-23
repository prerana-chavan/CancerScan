import Sidebar from '../components/Sidebar';
import TopNavbar from '../components/TopNavbar';
import NotificationToast from '../components/NotificationToast';
import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-[color:var(--bg-primary)] transition-colors duration-300">
            {/* Sidebar width is handled inside the Sidebar component itself (260px) */}
            <Sidebar />

            {/* Container for Navbar and Content */}
            <div className="flex-1 flex flex-col h-screen min-w-0">
                <TopNavbar />

                {/* Main Content Area - PRD specifies 24px padding */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[color:var(--bg-primary)] relative p-[24px]">
                    <div className="max-w-[1600px] mx-auto w-full h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Global UI Components */}
            <NotificationToast />
        </div>
    );
}
