'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader, Link } from '@heroui/react';
import { setStudentSession, setSessionToken } from '@/lib/auth';

export default function StudentLoginPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        // Input validation
        const phoneClean = phone.trim().replace(/\D/g, '');
        if (phoneClean.length < 5 || phoneClean.length > 15) {
            setError('Please enter a valid phone number');
            return;
        }

        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Use server-side password verification
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone, password }),
            });

            const result = await response.json();

            if (!result.valid) {
                setError(result.error || 'Invalid phone number or password.');
                setLoading(false);
                return;
            }

            // Save session token (JWT)
            if (result.sessionToken) {
                setSessionToken(result.sessionToken);
            }

            // Save session data
            setStudentSession({
                id: result.student.id,
                name: result.student.name,
                phone: result.student.phone,
                trial_ends_at: result.student.trial_ends_at,
            });

            router.push(result.student.profile_complete ? '/me' : '/details');
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
                    <h1 className="text-2xl font-bold">Welcome Back</h1>
                    <p className="text-default-500 text-sm">Sign in to access your courses</p>
                </CardHeader>
                <CardBody className="p-6">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <Input
                            type="tel"
                            label="Phone Number"
                            placeholder="Enter your phone number"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            isRequired
                        />
                        <Input
                            type="password"
                            label="Password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            isRequired
                        />

                        <div className="flex justify-end -mt-2">
                            <Link href="/forgot-password" className="text-sm text-primary">
                                Forgot Password?
                            </Link>
                        </div>

                        {error && (
                            <div className="text-danger text-sm p-2 bg-danger-50 rounded-lg">
                                {error}
                            </div>
                        )}
                        <Button
                            type="submit"
                            isLoading={loading}
                            color="primary"
                            className="w-full"
                        >
                            Sign In
                        </Button>
                    </form>
                </CardBody>
            </Card>
        </div>
    );
}
