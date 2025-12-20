'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Spinner, Checkbox } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { generatePassword, hashPassword } from '@/lib/auth';

interface Student {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
}

interface NewStudentCredentials {
    name: string;
    phone: string;
    password: string;
    smsSent: boolean;
    smsError?: string;
}

export default function ManageStudentsPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [sendSms, setSendSms] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [newCredentials, setNewCredentials] = useState<NewStudentCredentials | null>(null);

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        const { data, error } = await supabase
            .from('students')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }
        setLoadingStudents(false);
    };

    const sendCredentialsSms = async (studentPhone: string, studentName: string, password: string) => {
        try {
            const message = `Welcome to Spiritual Guide! Your login credentials:\nPhone: ${studentPhone}\nPassword: ${password}`;

            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: studentPhone,
                    message: message,
                }),
            });

            const data = await response.json();
            return { success: response.ok, error: data.error };
        } catch (error) {
            return { success: false, error: 'Failed to send SMS' };
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setNewCredentials(null);

        try {
            const { data: existingStudent } = await supabase
                .from('students')
                .select('id')
                .eq('phone', phone)
                .single();

            if (existingStudent) {
                setError('A student with this phone number already exists.');
                setLoading(false);
                return;
            }

            const password = generatePassword();
            const passwordHash = await hashPassword(password);

            const { error: insertError } = await supabase
                .from('students')
                .insert({
                    name,
                    phone,
                    password_hash: passwordHash,
                    is_active: true,
                });

            if (insertError) {
                setError(insertError.message);
                setLoading(false);
                return;
            }

            // Send SMS if checkbox is checked
            let smsSent = false;
            let smsError: string | undefined;

            if (sendSms) {
                const smsResult = await sendCredentialsSms(phone, name, password);
                smsSent = smsResult.success;
                smsError = smsResult.error;
            }

            setNewCredentials({ name, phone, password, smsSent, smsError });
            setName('');
            setPhone('');
            fetchStudents();
        } catch (err) {
            setError('An unexpected error occurred.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const toggleStudentStatus = async (student: Student) => {
        const { error } = await supabase
            .from('students')
            .update({ is_active: !student.is_active })
            .eq('id', student.id);

        if (error) {
            console.error('Error updating student:', error);
        } else {
            fetchStudents();
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">Manage Students</h1>
                    <p className="text-default-500 text-sm md:text-base">Add new students and manage their access to the platform.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                    {/* Add Student Form */}
                    <Card>
                        <CardHeader className="border-b border-divider p-6">
                            <h2 className="text-xl font-semibold">Add New Student</h2>
                        </CardHeader>
                        <CardBody className="p-6">
                            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                                <Input
                                    type="text"
                                    label="Student Name"
                                    placeholder="Enter student's name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    isRequired
                                />
                                <Input
                                    type="tel"
                                    label="Phone Number"
                                    placeholder="Enter phone number (10 digits)"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    isRequired
                                />
                                <Checkbox
                                    isSelected={sendSms}
                                    onValueChange={setSendSms}
                                >
                                    Send credentials via SMS (₹5)
                                </Checkbox>
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
                                    Add Student & Generate Password
                                </Button>
                            </form>
                        </CardBody>
                    </Card>

                    {/* Generated Credentials */}
                    {newCredentials && (
                        <Card className="border-success">
                            <CardHeader className="border-b border-divider p-6">
                                <h2 className="text-xl font-semibold text-success">Student Created!</h2>
                            </CardHeader>
                            <CardBody className="p-6">
                                {/* SMS Status */}
                                {sendSms && (
                                    <div className={`mb-4 p-3 rounded-lg ${newCredentials.smsSent ? 'bg-success-50' : 'bg-danger-50'}`}>
                                        {newCredentials.smsSent ? (
                                            <p className="text-success text-sm">✅ Credentials sent via SMS!</p>
                                        ) : (
                                            <p className="text-danger text-sm">❌ SMS failed: {newCredentials.smsError}</p>
                                        )}
                                    </div>
                                )}

                                <p className="text-default-500 mb-4">
                                    {newCredentials.smsSent
                                        ? 'Credentials have been sent to the student:'
                                        : 'Share these credentials with the student:'}
                                </p>

                                <div className="space-y-4">
                                    <div className="bg-default-100 rounded-lg p-4">
                                        <p className="text-xs text-default-500 uppercase mb-1">Name</p>
                                        <p className="font-medium">{newCredentials.name}</p>
                                    </div>

                                    <div className="bg-default-100 rounded-lg p-4">
                                        <p className="text-xs text-default-500 uppercase mb-1">Phone Number</p>
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-lg">{newCredentials.phone}</p>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                onPress={() => copyToClipboard(newCredentials.phone)}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="bg-default-100 rounded-lg p-4">
                                        <p className="text-xs text-default-500 uppercase mb-1">Password</p>
                                        <div className="flex items-center justify-between">
                                            <p className="font-mono text-xl font-bold text-success">{newCredentials.password}</p>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="success"
                                                onPress={() => copyToClipboard(newCredentials.password)}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 bg-warning-50 rounded-lg">
                                    <p className="text-warning text-sm">
                                        ⚠️ Save these credentials! The password cannot be retrieved later.
                                    </p>
                                </div>

                                <Button
                                    onPress={() => setNewCredentials(null)}
                                    variant="flat"
                                    className="w-full mt-4"
                                >
                                    Dismiss
                                </Button>
                            </CardBody>
                        </Card>
                    )}
                </div>

                {/* Students List */}
                <Card className="mt-6 md:mt-8">
                    <CardHeader className="border-b border-divider p-6">
                        <div className="flex items-center justify-between w-full">
                            <h2 className="text-xl font-semibold">All Students</h2>
                            <Chip variant="flat" color="primary">
                                {students.length} students
                            </Chip>
                        </div>
                    </CardHeader>
                    <CardBody className="p-0">
                        {loadingStudents ? (
                            <div className="flex items-center justify-center py-12">
                                <Spinner />
                            </div>
                        ) : students.length === 0 ? (
                            <div className="text-center py-12 text-default-500">
                                <p>No students yet. Add your first student above.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {/* Mobile Card View */}
                                <div className="md:hidden space-y-4 p-4">
                                    {students.map((student) => (
                                        <div key={student.id} className="p-4 bg-default-50 rounded-lg space-y-2">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">{student.name}</p>
                                                    <p className="text-sm font-mono text-default-500">{student.phone}</p>
                                                </div>
                                                <Chip
                                                    size="sm"
                                                    variant="flat"
                                                    color={student.is_active ? 'success' : 'danger'}
                                                >
                                                    {student.is_active ? 'Active' : 'Inactive'}
                                                </Chip>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-default-500">
                                                <span>Created: {new Date(student.created_at).toLocaleDateString()}</span>
                                                <span>Login: {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color={student.is_active ? 'danger' : 'success'}
                                                onPress={() => toggleStudentStatus(student)}
                                                className="w-full"
                                            >
                                                {student.is_active ? 'Deactivate' : 'Activate'}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                    <Table aria-label="Students table">
                                        <TableHeader>
                                            <TableColumn>NAME</TableColumn>
                                            <TableColumn>PHONE</TableColumn>
                                            <TableColumn>STATUS</TableColumn>
                                            <TableColumn>CREATED</TableColumn>
                                            <TableColumn>LAST LOGIN</TableColumn>
                                            <TableColumn>ACTIONS</TableColumn>
                                        </TableHeader>
                                        <TableBody>
                                            {students.map((student) => (
                                                <TableRow key={student.id}>
                                                    <TableCell className="font-medium">{student.name}</TableCell>
                                                    <TableCell className="font-mono">{student.phone}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            size="sm"
                                                            variant="flat"
                                                            color={student.is_active ? 'success' : 'danger'}
                                                        >
                                                            {student.is_active ? 'Active' : 'Inactive'}
                                                        </Chip>
                                                    </TableCell>
                                                    <TableCell className="text-default-500">
                                                        {new Date(student.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                    <TableCell className="text-default-500">
                                                        {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            color={student.is_active ? 'danger' : 'success'}
                                                            onPress={() => toggleStudentStatus(student)}
                                                        >
                                                            {student.is_active ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
