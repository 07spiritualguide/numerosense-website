'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Card, CardBody, Spinner } from '@heroui/react';
import { getStudentSession, clearStudentSession, StudentSession } from '@/lib/auth';

export default function HomePage() {
    const router = useRouter();
    const [session, setSession] = useState<StudentSession | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const studentSession = getStudentSession();
        if (!studentSession) {
            router.push('/login');
            return;
        }
        setSession(studentSession);
        setLoading(false);
    }, [router]);

    const handleLogout = () => {
        clearStudentSession();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">
                    Hello, {session?.name}
                </h1>
                <p className="text-default-500 text-lg mb-8">
                    Welcome to your learning journey
                </p>

                <Card className="max-w-md mx-auto mb-6">
                    <CardBody className="p-6">
                        <h2 className="font-semibold mb-2">Your Courses</h2>
                        <p className="text-default-500 text-sm">
                            Course content and materials will be available here. Stay tuned!
                        </p>
                    </CardBody>
                </Card>

                <Button
                    onPress={handleLogout}
                    variant="flat"
                >
                    Logout
                </Button>
            </div>
        </div>
    );
}
