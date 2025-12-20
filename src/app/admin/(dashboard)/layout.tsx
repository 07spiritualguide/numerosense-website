'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button, Spinner } from '@heroui/react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);
    const [adminEmail, setAdminEmail] = useState('');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        checkAuth();
    }, []);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            router.push('/admin');
            return;
        }

        const { data: adminData } = await supabase
            .from('admins')
            .select('id')
            .eq('email', session.user.email)
            .single();

        if (!adminData) {
            await supabase.auth.signOut();
            router.push('/admin');
            return;
        }

        setAdminEmail(session.user.email || '');
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/admin');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const navItems = [
        { name: 'Manage Students', href: '/admin/students' },
    ];

    return (
        <div className="min-h-screen flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center justify-between p-4 border-b border-divider">
                <h1 className="text-lg font-bold">Admin Panel</h1>
                <Button
                    variant="flat"
                    size="sm"
                    onPress={() => setSidebarOpen(!sidebarOpen)}
                >
                    {sidebarOpen ? '✕' : '☰'}
                </Button>
            </header>

            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed md:static inset-y-0 left-0 z-50
                w-64 border-r border-divider flex flex-col
                bg-background
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                <div className="p-6 border-b border-divider">
                    <h1 className="text-xl font-bold">Admin Panel</h1>
                </div>

                <nav className="flex-1 p-4">
                    <ul className="space-y-2">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={`block px-4 py-2 rounded-lg transition-colors ${pathname === item.href
                                        ? 'bg-primary text-primary-foreground'
                                        : 'hover:bg-default-100'
                                        }`}
                                >
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="p-4 border-t border-divider">
                    <p className="text-xs text-default-500 mb-1">Signed in as</p>
                    <p className="text-sm truncate mb-3">{adminEmail}</p>
                    <Button
                        onPress={handleLogout}
                        variant="flat"
                        className="w-full"
                    >
                        Logout
                    </Button>
                </div>
            </aside>

            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    );
}
