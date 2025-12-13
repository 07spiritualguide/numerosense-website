'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader } from '@heroui/react';
import { supabase } from '@/lib/supabase';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) {
                setError(authError.message);
                setLoading(false);
                return;
            }

            if (!data.user) {
                setError('Login failed. Please try again.');
                setLoading(false);
                return;
            }

            const { data: adminData, error: adminError } = await supabase
                .from('admins')
                .select('id')
                .eq('email', email)
                .single();

            if (adminError || !adminData) {
                setError('You are not authorized as an admin.');
                await supabase.auth.signOut();
                setLoading(false);
                return;
            }

            router.push('/admin/students');
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
                    <h1 className="text-2xl font-bold">Admin Login</h1>
                    <p className="text-default-500 text-sm">Sign in to manage students</p>
                </CardHeader>
                <CardBody className="p-6">
                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <Input
                            type="email"
                            label="Email"
                            placeholder="admin@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
