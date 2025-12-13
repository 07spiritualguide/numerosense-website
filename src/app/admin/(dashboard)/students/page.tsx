'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Spinner } from '@heroui/react';
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
}

export default function ManageStudentsPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
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

            setNewCredentials({ name, phone, password });
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
        <div className="p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Manage Students</h1>
                    <p className="text-default-500">Add new students and manage their access to the platform.</p>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
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
                                    placeholder="Enter phone number"
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
                                <p className="text-default-500 mb-4">Share these credentials with the student:</p>

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
                <Card className="mt-8">
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
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
