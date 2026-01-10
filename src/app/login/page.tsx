'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { verifyPassword, setStudentSession } from '@/lib/auth';

export default function StudentLoginPage() {
    const router = useRouter();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { data: student, error: fetchError } = await supabase
                .from('students')
                .select('*')
                .eq('phone', phone)
                .single();

            if (fetchError || !student) {
                setError('Invalid phone number or password.');
                setLoading(false);
                return;
            }

            if (!student.is_active) {
                setError('Your account has been deactivated. Please contact support.');
                setLoading(false);
                return;
            }

            const isValid = await verifyPassword(password, student.password_hash);

            if (!isValid) {
                setError('Invalid phone number or password.');
                setLoading(false);
                return;
            }

            await supabase
                .from('students')
                .update({ last_login: new Date().toISOString() })
                .eq('id', student.id);

            setStudentSession({
                id: student.id,
                name: student.name,
                phone: student.phone,
                trial_ends_at: student.trial_ends_at,
            });

            router.push('/me');
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
