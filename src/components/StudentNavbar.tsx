'use client';

import { Navbar, NavbarBrand, NavbarContent, Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import { clearStudentSession } from '@/lib/auth';

interface StudentNavbarProps {
    showLogout?: boolean;
}

export default function StudentNavbar({ showLogout = true }: StudentNavbarProps) {
    const router = useRouter();

    const handleLogout = () => {
        clearStudentSession();
        router.push('/login');
    };

    return (
        <Navbar maxWidth="xl" isBordered>
            <NavbarBrand>
                <p className="font-bold text-inherit text-lg">Numerosense</p>
            </NavbarBrand>
            {showLogout && (
                <NavbarContent justify="end">
                    <Button
                        onPress={handleLogout}
                        variant="flat"
                        size="sm"
                    >
                        Logout
                    </Button>
                </NavbarContent>
            )}
        </Navbar>
    );
}
