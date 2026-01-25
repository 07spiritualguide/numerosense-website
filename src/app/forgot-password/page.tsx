'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader, Link } from '@heroui/react';

type Step = 'phone' | 'otp' | 'success';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<Step>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phone.trim()) {
            setError('Please enter your phone number');
            return;
        }

        const phoneClean = phone.trim().replace(/\D/g, '');
        if (phoneClean.length < 10) {
            setError('Please enter a valid phone number');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone.trim() }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Failed to send OTP');
                return;
            }

            setMessage(result.message || 'OTP sent successfully');
            setStep('otp');
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();

        if (otp.length !== 6) {
            setError('Please enter the complete 6-digit OTP');
            return;
        }

        if (!newPassword) {
            setError('Please enter a new password');
            return;
        }

        if (newPassword.length < 4) {
            setError('Password must be at least 4 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: phone.trim(), otp, newPassword }),
            });

            const result = await response.json();

            if (!response.ok) {
                setError(result.error || 'Failed to verify OTP');
                return;
            }

            setMessage(result.message || 'Password reset successful!');
            setStep('success');
        } catch (err) {
            setError('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setOtp('');
        setError('');
        await handleSendOtp({ preventDefault: () => { } } as React.FormEvent);
    };

    const renderPhoneStep = () => (
        <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="text-center mb-2">
                <p className="text-default-500 text-sm">
                    Enter your phone number and we'll send you an OTP to reset your password.
                </p>
            </div>

            <Input
                type="tel"
                label="Phone Number"
                placeholder="Enter your registered phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                Send OTP
            </Button>

            <div className="text-center">
                <Link href="/login" className="text-sm">
                    Back to Login
                </Link>
            </div>
        </form>
    );

    const renderOtpStep = () => (
        <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="text-center mb-2">
                <p className="text-default-500 text-sm">
                    Enter the OTP sent to{' '}
                    <span className="font-semibold text-foreground">{phone}</span>
                </p>
            </div>

            <Input
                type="text"
                label="Enter OTP"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                isRequired
                classNames={{
                    input: 'text-center text-xl tracking-widest font-mono',
                }}
            />

            <Input
                type="password"
                label="New Password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                isRequired
            />

            <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                isDisabled={otp.length !== 6 || !newPassword || !confirmPassword}
            >
                Reset Password
            </Button>

            <div className="flex flex-col gap-2 text-center">
                <Button
                    variant="light"
                    onPress={handleResendOtp}
                    isDisabled={loading}
                    className="text-sm"
                >
                    Resend OTP
                </Button>
                <Button
                    variant="ghost"
                    onPress={() => {
                        setStep('phone');
                        setOtp('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                    }}
                    isDisabled={loading}
                    className="text-sm"
                >
                    Change Phone Number
                </Button>
            </div>
        </form>
    );

    const renderSuccessStep = () => (
        <div className="flex flex-col gap-4 items-center">
            <div className="w-20 h-20 rounded-full bg-success-100 flex items-center justify-center mb-2">
                <span className="text-4xl">✓</span>
            </div>

            <div className="text-center">
                <h2 className="text-xl font-semibold text-foreground mb-2">
                    Password Reset!
                </h2>
                <p className="text-default-500 text-sm">
                    Your password has been reset successfully. You can now login with your new password.
                </p>
            </div>

            <div className="w-full p-4 bg-success-50 rounded-lg text-center">
                <p className="text-success text-sm">
                    ✓ {message}
                </p>
            </div>

            <Button
                color="primary"
                className="w-full"
                onPress={() => router.push('/login')}
            >
                Back to Login
            </Button>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
                    <h1 className="text-2xl font-bold">
                        {step === 'phone' && 'Forgot Password'}
                        {step === 'otp' && 'Reset Password'}
                        {step === 'success' && 'Success!'}
                    </h1>
                </CardHeader>
                <CardBody className="p-6">
                    {step === 'phone' && renderPhoneStep()}
                    {step === 'otp' && renderOtpStep()}
                    {step === 'success' && renderSuccessStep()}
                </CardBody>
            </Card>
        </div>
    );
}
