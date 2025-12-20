'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Tabs, Tab, Chip, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, ButtonGroup } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { getStudentSession, StudentSession } from '@/lib/auth';
import { calculateMahadasha, expandTimeline, MahadashaEntry } from '@/lib/mahadasha';
import StudentNavbar from '@/components/StudentNavbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentProfile {
    full_name: string;
    date_of_birth: string;
    gender: string;
}

interface BasicInfo {
    root_number: number | null;
    supportive_numbers: string[] | null;
    destiny_number: number | null;
    lucky_number: number | null;
    zodiac_sign: string | null;
    lucky_color: string | null;
    lucky_direction: string | null;
    positive_traits: string[] | null;
    negative_traits: string[] | null;
}

export default function MePage() {
    const router = useRouter();
    const [session, setSession] = useState<StudentSession | null>(null);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
    const [mahadashaTimeline, setMahadashaTimeline] = useState<MahadashaEntry[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [calculatingMahadasha, setCalculatingMahadasha] = useState(false);
    const [selectedTab, setSelectedTab] = useState('basic');

    const currentYear = new Date().getFullYear();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const studentSession = getStudentSession();
        if (!studentSession) {
            router.push('/login');
            return;
        }
        setSession(studentSession);

        // Fetch profile data
        const { data: student } = await supabase
            .from('students')
            .select('full_name, date_of_birth, gender, profile_complete')
            .eq('id', studentSession.id)
            .single();

        if (!student?.profile_complete) {
            router.push('/details');
            return;
        }

        setProfile({
            full_name: student.full_name,
            date_of_birth: student.date_of_birth,
            gender: student.gender,
        });

        // Fetch basic_info data
        const { data: info } = await supabase
            .from('basic_info')
            .select('*')
            .eq('student_id', studentSession.id)
            .single();

        if (info) {
            setBasicInfo(info);
        }

        // Fetch mahadasha data
        const { data: mahadasha } = await supabase
            .from('mahadasha')
            .select('timeline')
            .eq('student_id', studentSession.id)
            .single();

        if (mahadasha?.timeline) {
            setMahadashaTimeline(mahadasha.timeline as MahadashaEntry[]);
        }

        setLoading(false);
    };

    const handleCalculateMahadasha = async () => {
        if (!profile || !basicInfo?.root_number || !session) return;

        setCalculatingMahadasha(true);

        try {
            const birthYear = new Date(profile.date_of_birth).getFullYear();
            const timeline = calculateMahadasha(birthYear, basicInfo.root_number, 100);
            const expanded = expandTimeline(timeline, birthYear + 100);

            // Check if record exists
            const { data: existing } = await supabase
                .from('mahadasha')
                .select('id')
                .eq('student_id', session.id)
                .maybeSingle();

            let error;
            if (existing) {
                // Update existing
                const result = await supabase
                    .from('mahadasha')
                    .update({
                        timeline: expanded,
                        calculated_at: new Date().toISOString(),
                    })
                    .eq('student_id', session.id);
                error = result.error;
            } else {
                // Insert new
                const result = await supabase
                    .from('mahadasha')
                    .insert({
                        student_id: session.id,
                        timeline: expanded,
                        calculated_at: new Date().toISOString(),
                    });
                error = result.error;
            }

            if (!error) {
                setMahadashaTimeline(expanded);
            } else {
                console.error('Mahadasha save error:', error);
            }

        } catch (err) {
            console.error('Error calculating Mahadasha:', err);
        } finally {
            setCalculatingMahadasha(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!mahadashaTimeline || !profile) return;

        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.text('Mahadasha Timeline', 14, 20);

        // Name and DOB
        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date of Birth: ${formatDate(profile.date_of_birth)}`, 14, 40);

        // Table data
        const tableData = mahadashaTimeline.map((entry) => [
            entry.year.toString() + (entry.year === currentYear ? ' ✨' : ''),
            entry.number.toString()
        ]);

        // Generate table
        autoTable(doc, {
            startY: 50,
            head: [['Year', 'Mahadasha']],
            body: tableData,
            didParseCell: (data) => {
                // Highlight current year row
                const cellText = data.cell.raw?.toString() || '';
                if (cellText.includes('✨')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 112, 243];
                }
            }
        });

        doc.save(`mahadasha_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadCSV = () => {
        if (!mahadashaTimeline || !profile) return;

        // Create CSV content
        let content = 'Year,Mahadasha,Current\n';

        mahadashaTimeline.forEach((entry) => {
            const isCurrent = entry.year === currentYear ? 'Yes' : 'No';
            content += `${entry.year},${entry.number},${isCurrent}\n`;
        });

        // Create and download file
        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mahadasha_${profile.full_name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner size="lg" />
            </div>
        );
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };

    const capitalizeFirst = (str: string) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    return (
        <div className="min-h-screen">
            <StudentNavbar />
            <div className="p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-6 mt-4">
                        <h1 className="text-2xl font-bold">Welcome, {profile?.full_name}</h1>
                        <p className="text-default-500">Your spiritual journey awaits</p>
                    </div>

                    {/* Tabs */}
                    <Tabs
                        selectedKey={selectedTab}
                        onSelectionChange={(key) => setSelectedTab(key as string)}
                        aria-label="Profile sections"
                        className="mb-6"
                    >
                        <Tab key="basic" title="Basic Info">
                            <Card className="mt-4">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-semibold mb-6">Basic Information</h2>

                                    {/* Numerology Numbers */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                        <Card className="bg-primary-50">
                                            <CardBody className="text-center p-4">
                                                <p className="text-sm text-default-500 mb-1">Root Number</p>
                                                <p className="text-3xl font-bold text-primary">
                                                    {basicInfo?.root_number ?? '-'}
                                                </p>
                                            </CardBody>
                                        </Card>
                                        <Card className="bg-secondary-50">
                                            <CardBody className="text-center p-4">
                                                <p className="text-sm text-default-500 mb-1">Supportive Numbers</p>
                                                <div className="flex justify-center gap-2">
                                                    {basicInfo?.supportive_numbers?.map((num, idx) => (
                                                        <Chip key={idx} color="secondary" variant="flat" size="lg">
                                                            {num}
                                                        </Chip>
                                                    )) ?? <span className="text-3xl font-bold">-</span>}
                                                </div>
                                            </CardBody>
                                        </Card>
                                        <Card className="bg-success-50">
                                            <CardBody className="text-center p-4">
                                                <p className="text-sm text-default-500 mb-1">Destiny Number</p>
                                                <p className="text-3xl font-bold text-success">
                                                    {basicInfo?.destiny_number ?? '-'}
                                                </p>
                                            </CardBody>
                                        </Card>
                                    </div>

                                    {/* Personal Details */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-default-500">Full Name</p>
                                            <p className="text-lg font-medium">{profile?.full_name}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Date of Birth</p>
                                            <p className="text-lg">{profile?.date_of_birth ? formatDate(profile.date_of_birth) : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Gender</p>
                                            <p className="text-lg">{profile?.gender ? capitalizeFirst(profile.gender) : '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Lucky Number</p>
                                            <p className="text-lg">{basicInfo?.lucky_number ?? <span className="text-default-400">Coming soon</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Zodiac Sign</p>
                                            <p className="text-lg">{basicInfo?.zodiac_sign ?? <span className="text-default-400">Coming soon</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Lucky Color</p>
                                            <p className="text-lg">{basicInfo?.lucky_color ?? <span className="text-default-400">Coming soon</span>}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500">Lucky Direction</p>
                                            <p className="text-lg">{basicInfo?.lucky_direction ?? <span className="text-default-400">Coming soon</span>}</p>
                                        </div>
                                    </div>

                                    {/* Traits */}
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Positive Traits</p>
                                            {basicInfo?.positive_traits ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.positive_traits.map((trait, idx) => (
                                                        <Chip key={idx} color="success" variant="flat" size="sm">
                                                            {trait}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Negative Traits</p>
                                            {basicInfo?.negative_traits ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.negative_traits.map((trait, idx) => (
                                                        <Chip key={idx} color="danger" variant="flat" size="sm">
                                                            {trait}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
                                        </div>
                                    </div>
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="mahadasha" title="Mahadasha">
                            <Card className="mt-4">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Mahadasha</h2>

                                    {!mahadashaTimeline ? (
                                        // Show button if not calculated yet
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Calculate your Mahadasha timeline based on your birth date
                                            </p>
                                            <Button
                                                color="primary"
                                                size="lg"
                                                onPress={handleCalculateMahadasha}
                                                isLoading={calculatingMahadasha}
                                            >
                                                See my Mahadasha
                                            </Button>
                                        </div>
                                    ) : (
                                        // Show timeline
                                        <div>
                                            {/* Name and DOB display */}
                                            <div className="mb-4 p-4 bg-default-100 rounded-lg">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-default-500">Name</p>
                                                        <p className="font-semibold">{profile?.full_name}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-default-500">Date of Birth</p>
                                                        <p className="font-semibold">{profile?.date_of_birth ? formatDate(profile.date_of_birth) : '-'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="max-h-96 overflow-y-auto mb-4">
                                                <Table aria-label="Mahadasha timeline" removeWrapper>
                                                    <TableHeader>
                                                        <TableColumn>YEAR</TableColumn>
                                                        <TableColumn>MAHADASHA</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {mahadashaTimeline.map((entry, idx) => (
                                                            <TableRow
                                                                key={idx}
                                                                className={entry.year === currentYear ? 'bg-primary-100' : ''}
                                                            >
                                                                <TableCell>
                                                                    <span className={entry.year === currentYear ? 'font-bold text-primary' : ''}>
                                                                        {entry.year}
                                                                        {entry.year === currentYear && ' ✨'}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell>
                                                                    <span className={entry.year === currentYear ? 'font-bold text-primary' : ''}>
                                                                        {entry.number}
                                                                    </span>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <ButtonGroup>
                                                <Button
                                                    color="primary"
                                                    onPress={handleDownloadPDF}
                                                >
                                                    Download PDF
                                                </Button>
                                                <Button
                                                    color="secondary"
                                                    variant="flat"
                                                    onPress={handleDownloadCSV}
                                                >
                                                    Download CSV
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="antar-dasha" title="Antar Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Antar Dasha</h2>
                                    <p className="text-default-500">Antar Dasha content coming soon...</p>
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="pratyantar-dasha" title="Pratyantar Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Pratyantar Dasha</h2>
                                    <p className="text-default-500">Pratyantar Dasha content coming soon...</p>
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="daily-dasha" title="Daily Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-6">
                                    <h2 className="text-xl font-semibold mb-4">Daily Dasha</h2>
                                    <p className="text-default-500">Daily Dasha content coming soon...</p>
                                </CardBody>
                            </Card>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
