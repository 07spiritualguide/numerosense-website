'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader, Link, Spinner } from '@heroui/react';
import { setStudentSession, setSessionToken } from '@/lib/auth';

type Step = 'validating' | 'phone' | 'password' | 'success';

function EnrollmentForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');

    const [step, setStep] = useState<Step>('validating');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [studentName, setStudentName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Validate code on mount
    useEffect(() => {
        if (!code) {
            setError('No invite code provided. Please use the link from your SMS.');
            setStep('phone'); // Show error state
            return;
        }

        validateCode();
    }, [code]);

    const validateCode = async () => {
        try {
            const response = await fetch('/api/enroll/validate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });

            const result = await response.json();

            if (!result.valid) {
                if (result.reason === 'used') {
                    // Code already used - redirect to login
                    router.push('/login?message=invite_used');
                    return;
                }
                setError(result.error || 'Invalid invite code');
                setStep('phone'); // Show error state
                return;
            }

            setStep('phone');
        } catch (err) {
            setError('Failed to validate invite code. Please try again.');
            setStep('phone');
        }
    };

    const handleVerifyPhone = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const phoneClean = phone.trim().replace(/\D/g, '');
        if (phoneClean.length < 5 || phoneClean.length > 15) {
            setError('Please enter a valid phone number');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/enroll/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, phone: phone.trim() }),
            });

            const result = await response.json();

            if (!result.valid) {
                if (result.reason === 'used') {
                    router.push('/login?message=invite_used');
                    return;
                }
                setError(result.error || 'Verification failed');
                setLoading(false);
                return;
            }

            setStudentName(result.studentName);
            setStep('password');
        } catch (err) {
            setError('Failed to verify phone number. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/enroll/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, phone: phone.trim(), password }),
            });

            const result = await response.json();

            if (!result.success) {
                setError(result.error || 'Failed to complete enrollment');
                setLoading(false);
                return;
            }

            // Save session
            if (result.sessionToken) {
                setSessionToken(result.sessionToken);
            }

            setStudentSession({
                id: result.student.id,
                name: result.student.name,
                phone: result.student.phone,
                trial_ends_at: result.student.trial_ends_at,
            });

            // Redirect to details page
            router.push('/details');
        } catch (err) {
            setError('Failed to complete enrollment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Loading state while validating code
    if (step === 'validating') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardBody className="p-8 flex flex-col items-center gap-4">
                        <Spinner size="lg" />
                        <p className="text-default-500">Validating your invite...</p>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Phone verification step
    if (step === 'phone') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
                        <h1 className="text-2xl font-bold">Welcome to Numerosense</h1>
                        <p className="text-default-500 text-sm">Enter your phone number to continue</p>
                    </CardHeader>
                    <CardBody className="p-6">
                        <form onSubmit={handleVerifyPhone} className="flex flex-col gap-4">
                            <Input
                                type="tel"
                                label="Phone Number"
                                placeholder="Enter your registered phone number"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                isRequired
                                isDisabled={!code}
                            />

                            {error && (
                                <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg">
                                    {error}
                                </div>
                            )}

                            {!code ? (
                                <div className="text-center">
                                    <p className="text-default-500 text-sm mb-4">
                                        No valid invite code found.
                                    </p>
                                    <Link href="/login" className="text-primary">
                                        Go to Login
                                    </Link>
                                </div>
                            ) : (
                                <Button
                                    type="submit"
                                    isLoading={loading}
                                    color="primary"
                                    className="w-full"
                                >
                                    Continue
                                </Button>
                            )}
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-default-400 text-sm">
                                Already have an account?{' '}
                                <Link href="/login" className="text-primary">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </CardBody>
                </Card>
            </div>
        );
    }

    // Password creation step
    if (step === 'password') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
                        <h1 className="text-2xl font-bold">Create Your Password</h1>
                        <p className="text-default-500 text-sm">
                            Hi {studentName}, set a password for your account
                        </p>
                    </CardHeader>
                    <CardBody className="p-6">
                        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
                            <Input
                                type="password"
                                label="Password"
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                isRequired
                            />
                            <Input
                                type="password"
                                label="Confirm Password"
                                placeholder="Confirm your password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                isRequired
                            />

                            {error && (
                                <div className="text-danger text-sm p-3 bg-danger-50 rounded-lg">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                isLoading={loading}
                                color="primary"
                                className="w-full"
                            >
                                Complete Setup & Login
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        );
    }

    return null;
}

export default function EnrollPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardBody className="p-8 flex flex-col items-center gap-4">
                        <Spinner size="lg" />
                        <p className="text-default-500">Loading...</p>
                    </CardBody>
                </Card>
            </div>
        }>
            <EnrollmentForm />
        </Suspense>
    );
}
