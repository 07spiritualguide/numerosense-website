'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button, Input, Card, CardBody, CardHeader, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Spinner, Checkbox, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem, Switch, Tabs, Tab } from '@heroui/react';
import { supabase } from '@/lib/supabase';

interface Student {
    id: string;
    name: string;
    phone: string;
    is_active: boolean;
    created_at: string;
    last_login: string | null;
    trial_ends_at: string | null;
    extension_used: boolean;
}

interface NewStudentCredentials {
    name: string;
    phone: string;
    inviteCode: string;
    inviteLink: string;
    smsSent: boolean;
    smsError?: string;
}

export default function ManageStudentsPage() {
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [sendSms, setSendSms] = useState(true);
    const [isFreeTrial, setIsFreeTrial] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [students, setStudents] = useState<Student[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [newCredentials, setNewCredentials] = useState<NewStudentCredentials | null>(null);

    // Extend trial modal state
    const [extendModalOpen, setExtendModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [extensionDuration, setExtensionDuration] = useState('1');
    const [extendingTrial, setExtendingTrial] = useState(false);

    // Tab and search state
    const [activeTab, setActiveTab] = useState('add');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchStudents();
    }, []);

    // Filter students by search query
    const filteredStudents = useMemo(() => {
        if (!searchQuery.trim()) return students;
        return students.filter(s => s.phone.includes(searchQuery.trim()));
    }, [students, searchQuery]);

    const fetchStudents = async () => {
        setLoadingStudents(true);
        const { data, error } = await supabase
            .from('students')
            .select('id, name, phone, is_active, created_at, last_login, trial_ends_at, extension_used')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }
        setLoadingStudents(false);
    };

    // Generate a 12-character alphanumeric invite code
    const generateInviteCode = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const sendInviteSms = async (studentPhone: string, studentName: string, inviteLink: string) => {
        try {
            const message = `Hi ${studentName}, You've been invited to Numerosense!\n\nComplete your enrollment here:\n${inviteLink}`;

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

            // Generate invite code instead of password
            const inviteCode = generateInviteCode();

            // Calculate trial end date if free trial is enabled
            let trialEndsAt: string | null = null;
            if (isFreeTrial) {
                const trialEnd = new Date();
                trialEnd.setMonth(trialEnd.getMonth() + 1);
                trialEndsAt = trialEnd.toISOString();
            }

            // Insert student without password (they'll set it during enrollment)
            const { data: insertedStudent, error: insertError } = await supabase
                .from('students')
                .insert({
                    name,
                    phone,
                    password_hash: null,
                    is_active: true,
                    trial_ends_at: trialEndsAt,
                })
                .select('id')
                .single();

            if (insertError || !insertedStudent) {
                setError(insertError?.message || 'Failed to create student');
                setLoading(false);
                return;
            }

            // Create invite code in database
            const { error: inviteError } = await supabase
                .from('invite_codes')
                .insert({
                    student_id: insertedStudent.id,
                    code: inviteCode,
                });

            if (inviteError) {
                console.error('Failed to create invite code:', inviteError);
                // Don't fail - student is created, admin can manually share link
            }

            const inviteLink = `https://www.numerosense.in/enroll?code=${inviteCode}`;

            // Send SMS if checkbox is checked
            let smsSent = false;
            let smsError: string | undefined;

            if (sendSms) {
                const smsResult = await sendInviteSms(phone, name, inviteLink);
                smsSent = smsResult.success;
                smsError = smsResult.error;
            }

            setNewCredentials({ name, phone, inviteCode, inviteLink, smsSent, smsError });
            setName('');
            setPhone('');
            setIsFreeTrial(false);
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

    const openExtendModal = (student: Student) => {
        setSelectedStudent(student);
        setExtensionDuration('1');
        setExtendModalOpen(true);
    };

    const handleExtendTrial = async () => {
        if (!selectedStudent) return;

        setExtendingTrial(true);

        // Calculate new expiry date
        const baseDate = selectedStudent.trial_ends_at && new Date(selectedStudent.trial_ends_at) > new Date()
            ? new Date(selectedStudent.trial_ends_at)
            : new Date();

        baseDate.setMonth(baseDate.getMonth() + parseInt(extensionDuration));

        const { error } = await supabase
            .from('students')
            .update({
                trial_ends_at: baseDate.toISOString(),
                extension_used: true
            })
            .eq('id', selectedStudent.id);

        if (error) {
            console.error('Error extending trial:', error);
        } else {
            fetchStudents();
            setExtendModalOpen(false);
            setSelectedStudent(null);
        }

        setExtendingTrial(false);
    };

    const getTrialStatus = (student: Student) => {
        if (!student.trial_ends_at) {
            return { status: 'permanent', label: 'Permanent', color: 'success' as const };
        }

        const expiryDate = new Date(student.trial_ends_at);
        const now = new Date();

        if (expiryDate < now) {
            return { status: 'expired', label: 'Expired', color: 'danger' as const };
        }

        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        return {
            status: 'active',
            label: `${daysLeft} days left`,
            color: daysLeft <= 7 ? 'warning' as const : 'primary' as const
        };
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">Students</h1>
                    <p className="text-default-500 text-sm md:text-base">Add new students and manage their access to the platform.</p>
                </div>

                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) => setActiveTab(key as string)}
                    aria-label="Student management tabs"
                    className="mb-6"
                >
                    <Tab key="add" title="Add Student">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-4">
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
                                            Send invite link via SMS (₹5)
                                        </Checkbox>
                                        <div className="flex items-center justify-between p-3 bg-warning-50 rounded-lg">
                                            <div>
                                                <p className="font-medium text-sm">Free Trial</p>
                                                <p className="text-xs text-default-500">Access expires after 1 month</p>
                                            </div>
                                            <Switch
                                                isSelected={isFreeTrial}
                                                onValueChange={setIsFreeTrial}
                                                color="warning"
                                            />
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
                                            Add Student & Send Invite
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
                                                    <p className="text-success text-sm">✅ Invite link sent via SMS!</p>
                                                ) : (
                                                    <p className="text-danger text-sm">❌ SMS failed: {newCredentials.smsError}</p>
                                                )}
                                            </div>
                                        )}

                                        <p className="text-default-500 mb-4">
                                            {newCredentials.smsSent
                                                ? 'The invite link has been sent to the student:'
                                                : 'Share this invite link with the student:'}
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
                                                <p className="text-xs text-default-500 uppercase mb-1">Invite Link</p>
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="font-mono text-sm text-primary break-all">{newCredentials.inviteLink}</p>
                                                    <Button
                                                        size="sm"
                                                        variant="flat"
                                                        color="primary"
                                                        onPress={() => copyToClipboard(newCredentials.inviteLink)}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                                            <p className="text-primary text-sm">
                                                ℹ️ The student will create their own password when they visit the invite link.
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
                    </Tab>

                    <Tab key="manage" title="Manage Students">
                        {/* Students List */}
                        <Card className="mt-4">
                            <CardHeader className="border-b border-divider p-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-semibold">All Students</h2>
                                        <Chip variant="flat" color="primary">
                                            {filteredStudents.length} of {students.length}
                                        </Chip>
                                    </div>
                                    <Input
                                        placeholder="Search by phone number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="max-w-xs"
                                        isClearable
                                        onClear={() => setSearchQuery('')}
                                    />
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
                                            {filteredStudents.map((student) => {
                                                const trialStatus = getTrialStatus(student);
                                                return (
                                                    <div key={student.id} className="p-4 bg-default-50 rounded-lg space-y-2">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="font-medium">{student.name}</p>
                                                                <p className="text-sm font-mono text-default-500">{student.phone}</p>
                                                            </div>
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <Chip
                                                                    size="sm"
                                                                    variant="flat"
                                                                    color={student.is_active ? 'success' : 'danger'}
                                                                >
                                                                    {student.is_active ? 'Active' : 'Inactive'}
                                                                </Chip>
                                                                <Chip
                                                                    size="sm"
                                                                    variant="flat"
                                                                    color={trialStatus.color}
                                                                >
                                                                    {trialStatus.label}
                                                                </Chip>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-xs text-default-500">
                                                            <span>Created: {new Date(student.created_at).toLocaleDateString()}</span>
                                                            <span>Login: {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}</span>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                variant="flat"
                                                                color={student.is_active ? 'danger' : 'success'}
                                                                onPress={() => toggleStudentStatus(student)}
                                                                className="flex-1"
                                                            >
                                                                {student.is_active ? 'Deactivate' : 'Activate'}
                                                            </Button>
                                                            {student.trial_ends_at && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="flat"
                                                                    color={student.extension_used ? 'default' : 'warning'}
                                                                    onPress={() => openExtendModal(student)}
                                                                    className="flex-1"
                                                                    isDisabled={student.extension_used}
                                                                >
                                                                    {student.extension_used ? 'Extended' : 'Extend'}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        {/* Desktop Table View */}
                                        <div className="hidden md:block">
                                            <Table aria-label="Students table">
                                                <TableHeader>
                                                    <TableColumn>NAME</TableColumn>
                                                    <TableColumn>PHONE</TableColumn>
                                                    <TableColumn>STATUS</TableColumn>
                                                    <TableColumn>TRIAL</TableColumn>
                                                    <TableColumn>CREATED</TableColumn>
                                                    <TableColumn>LAST LOGIN</TableColumn>
                                                    <TableColumn>ACTIONS</TableColumn>
                                                </TableHeader>
                                                <TableBody>
                                                    {filteredStudents.map((student) => {
                                                        const trialStatus = getTrialStatus(student);
                                                        return (
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
                                                                <TableCell>
                                                                    <Chip
                                                                        size="sm"
                                                                        variant="flat"
                                                                        color={trialStatus.color}
                                                                    >
                                                                        {trialStatus.label}
                                                                    </Chip>
                                                                </TableCell>
                                                                <TableCell className="text-default-500">
                                                                    {new Date(student.created_at).toLocaleDateString()}
                                                                </TableCell>
                                                                <TableCell className="text-default-500">
                                                                    {student.last_login ? new Date(student.last_login).toLocaleDateString() : 'Never'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="flat"
                                                                            color={student.is_active ? 'danger' : 'success'}
                                                                            onPress={() => toggleStudentStatus(student)}
                                                                        >
                                                                            {student.is_active ? 'Deactivate' : 'Activate'}
                                                                        </Button>
                                                                        {student.trial_ends_at && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="flat"
                                                                                color={student.extension_used ? 'default' : 'warning'}
                                                                                onPress={() => openExtendModal(student)}
                                                                                isDisabled={student.extension_used}
                                                                            >
                                                                                {student.extension_used ? 'Extended' : 'Extend'}
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}
                            </CardBody>
                        </Card>
                    </Tab>
                </Tabs>
                <Modal isOpen={extendModalOpen} onClose={() => setExtendModalOpen(false)}>
                    <ModalContent>
                        <ModalHeader>Extend Access</ModalHeader>
                        <ModalBody>
                            {selectedStudent && (
                                <div className="space-y-4">
                                    <p className="text-default-500">
                                        Extend access for <span className="font-semibold text-foreground">{selectedStudent.name}</span>
                                    </p>
                                    {selectedStudent.trial_ends_at && (
                                        <div className="p-3 bg-default-100 rounded-lg text-sm">
                                            <p>Current expiry: {new Date(selectedStudent.trial_ends_at).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                    <Select
                                        label="Extension Duration"
                                        selectedKeys={[extensionDuration]}
                                        onSelectionChange={(keys) => setExtensionDuration(Array.from(keys)[0] as string)}
                                    >
                                        <SelectItem key="1" textValue="1 Month">1 Month</SelectItem>
                                        <SelectItem key="3" textValue="3 Months">3 Months</SelectItem>
                                        <SelectItem key="6" textValue="6 Months">6 Months</SelectItem>
                                        <SelectItem key="12" textValue="1 Year">1 Year</SelectItem>
                                    </Select>
                                </div>
                            )}
                        </ModalBody>
                        <ModalFooter>
                            <Button variant="flat" onPress={() => setExtendModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                color="warning"
                                onPress={handleExtendTrial}
                                isLoading={extendingTrial}
                            >
                                Extend Access
                            </Button>
                        </ModalFooter>
                    </ModalContent>
                </Modal>
            </div>
        </div>
    );
}
