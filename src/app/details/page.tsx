'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Card, CardBody, CardHeader, Select, SelectItem, Spinner } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { getStudentSession, setStudentSession } from '@/lib/auth';
import { calculateNumerology } from '@/lib/numerology';
import { getNumerologyDataForDestiny } from '@/lib/numerologyData';
import { extractFirstLastName, calculateNameNumber } from '@/lib/name-numerology';
import StudentNavbar from '@/components/StudentNavbar';

export default function DetailsPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const [fullName, setFullName] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const session = getStudentSession();
        if (!session) {
            router.push('/login');
            return;
        }

        // Check if profile is already complete
        const { data: student } = await supabase
            .from('students')
            .select('profile_complete, full_name')
            .eq('id', session.id)
            .single();

        if (student?.profile_complete) {
            router.push('/me');
            return;
        }

        // Pre-fill name if available
        if (student?.full_name) {
            setFullName(student.full_name);
        } else {
            setFullName(session.name);
        }

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const session = getStudentSession();
        if (!session) {
            router.push('/login');
            return;
        }

        try {
            // Update student profile
            const { error: updateError } = await supabase
                .from('students')
                .update({
                    full_name: fullName,
                    date_of_birth: dateOfBirth,
                    gender: gender,
                    profile_complete: true,
                })
                .eq('id', session.id);

            if (updateError) {
                setError(updateError.message);
                setSaving(false);
                return;
            }

            // Calculate numerology from DOB
            const dob = new Date(dateOfBirth);
            const numerology = calculateNumerology(dob);
            const destinyData = getNumerologyDataForDestiny(numerology.destinyNumber);

            // Extract first and last name from full name
            const { firstName, lastName } = extractFirstLastName(fullName);

            // Calculate name number using Chaldean system
            const nameNumber = calculateNameNumber(firstName, lastName);

            // Prepare full basic_info data
            const basicInfoData = {
                root_number: numerology.rootNumber,
                supportive_numbers: numerology.supportiveNumbers.map(String),
                destiny_number: numerology.destinyNumber,
                lord: destinyData?.lord || null,
                zodiac_sign: destinyData?.zodiac_sign || null,
                positive_traits: destinyData?.positive_traits || null,
                negative_traits: destinyData?.negative_traits || null,
                lucky_dates: destinyData?.lucky_dates || null,
                favorable_days: destinyData?.favorable_days || null,
                lucky_color: destinyData?.lucky_color || null,
                lucky_direction: destinyData?.lucky_direction || null,
                favorable_alphabets: destinyData?.favorable_alphabets || null,
                favourable_profession: destinyData?.favourable_profession || null,
                first_name: firstName,
                last_name: lastName,
                name_number: nameNumber,
                updated_at: new Date().toISOString(),
            };

            // Check if basic_info already exists for this student
            const { data: existingInfo } = await supabase
                .from('basic_info')
                .select('id')
                .eq('student_id', session.id)
                .single();

            if (existingInfo) {
                // Update existing record
                await supabase
                    .from('basic_info')
                    .update(basicInfoData)
                    .eq('student_id', session.id);
            } else {
                // Insert new record
                await supabase
                    .from('basic_info')
                    .insert({
                        student_id: session.id,
                        ...basicInfoData,
                    });
            }

            // Update session with new name
            setStudentSession({
                ...session,
                name: fullName,
            });

            router.push('/me');
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error(err);
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <StudentNavbar showLogout={true} />
            <div className="flex items-center justify-center p-4 mt-8">
                <Card className="w-full max-w-md">
                    <CardHeader className="flex flex-col gap-1 items-center pb-0 pt-6">
                        <h1 className="text-2xl font-bold">Complete Your Profile</h1>
                        <p className="text-default-500 text-sm">Please fill in your details to continue</p>
                    </CardHeader>
                    <CardBody className="p-6">
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <Input
                                type="text"
                                label="Full Name"
                                placeholder="Enter your full name"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                isRequired
                            />
                            <Input
                                type="date"
                                label="Date of Birth"
                                placeholder="Select your date of birth"
                                value={dateOfBirth}
                                onChange={(e) => setDateOfBirth(e.target.value)}
                                isRequired
                            />
                            <Select
                                label="Gender"
                                placeholder="Select your gender"
                                selectedKeys={gender ? [gender] : []}
                                onSelectionChange={(keys) => setGender(Array.from(keys)[0] as string)}
                                isRequired
                            >
                                <SelectItem key="male">Male</SelectItem>
                                <SelectItem key="female">Female</SelectItem>
                                <SelectItem key="other">Other</SelectItem>
                            </Select>
                            {error && (
                                <div className="text-danger text-sm p-2 bg-danger-50 rounded-lg">
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                isLoading={saving}
                                color="primary"
                                className="w-full"
                            >
                                Continue
                            </Button>
                        </form>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
