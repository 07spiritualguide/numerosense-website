'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader, Link } from '@heroui/react';

type Step = 'phone' | 'otp' | 'password' | 'success';

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

    // Resend OTP cooldown
    const [resendCooldown, setResendCooldown] = useState(0);

    // Cooldown timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (resendCooldown > 0) {
            timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCooldown]);

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
            setResendCooldown(60); // Start 60 second cooldown
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

        // Move to password step (actual verification happens with password)
        setError('');
        setStep('password');
    };

    const handleSetPassword = async (e: React.FormEvent) => {
        e.preventDefault();

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
                // If OTP was wrong, go back to OTP step
                if (result.error?.toLowerCase().includes('otp')) {
                    setStep('otp');
                }
                setError(result.error || 'Failed to reset password');
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
        if (resendCooldown > 0) return;

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
                    Enter the 6-digit OTP sent to{' '}
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
                isDisabled={otp.length !== 6}
            >
                Continue
            </Button>

            <div className="flex flex-col gap-2 text-center">
                <Button
                    variant="light"
                    onPress={handleResendOtp}
                    isDisabled={loading || resendCooldown > 0}
                    className="text-sm"
                >
                    {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
                <Button
                    variant="ghost"
                    onPress={() => {
                        setStep('phone');
                        setOtp('');
                        setError('');
                        setResendCooldown(0);
                    }}
                    isDisabled={loading}
                    className="text-sm"
                >
                    Change Phone Number
                </Button>
            </div>
        </form>
    );

    const renderPasswordStep = () => (
        <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
            <div className="text-center mb-2">
                <p className="text-default-500 text-sm">
                    Create a new password for your account
                </p>
            </div>

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
                isDisabled={!newPassword || !confirmPassword}
            >
                Reset Password
            </Button>

            <div className="text-center">
                <Button
                    variant="ghost"
                    onPress={() => {
                        setStep('otp');
                        setNewPassword('');
                        setConfirmPassword('');
                        setError('');
                    }}
                    isDisabled={loading}
                    className="text-sm"
                >
                    Back to OTP
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
                        {step === 'otp' && 'Enter OTP'}
                        {step === 'password' && 'Set New Password'}
                        {step === 'success' && 'Success!'}
                    </h1>
                </CardHeader>
                <CardBody className="p-6">
                    {step === 'phone' && renderPhoneStep()}
                    {step === 'otp' && renderOtpStep()}
                    {step === 'password' && renderPasswordStep()}
                    {step === 'success' && renderSuccessStep()}
                </CardBody>
            </Card>
        </div>
    );
}
