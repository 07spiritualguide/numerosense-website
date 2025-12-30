'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Tabs, Tab, Chip, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, ButtonGroup } from '@heroui/react';
import { supabase } from '@/lib/supabase';
import { getStudentSession, StudentSession } from '@/lib/auth';
import { calculateMahadasha, MahadashaEntry, isCurrentMahadasha } from '@/lib/mahadasha';
import { calculateAntardasha, AntardashaEntry, isCurrentAntardasha } from '@/lib/antardasha';
import { calculatePratyantardasha, YearPratyantardasha, isCurrentPratyantardasha } from '@/lib/pratyantardasha';
import { calculateDailyDasha, calculateAllHourlyDasha, formatDateForDisplay, isCurrentHour } from '@/lib/dailydasha';
import {
    calculateNatalGrid,
    calculateBasicGrid,
    calculateDestinyGrid,
    calculateMahadashaGrid,
    calculatePersonalYearGrid,
    calculateMonthlyGrid,
    MONTH_NAMES,
    DigitSource
} from '@/lib/loshu-grid';
import LoShuGridComponent from '@/components/grids/LoShuGrid';
import GridLegend from '@/components/grids/GridLegend';
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
    lord: string | null;
    lucky_dates: string[] | null;
    favourable_profession: string[] | null;
    favorable_days: string[] | null;
    favorable_alphabets: string[] | null;
}

export default function MePage() {
    const router = useRouter();
    const [session, setSession] = useState<StudentSession | null>(null);
    const [profile, setProfile] = useState<StudentProfile | null>(null);
    const [basicInfo, setBasicInfo] = useState<BasicInfo | null>(null);
    const [mahadashaTimeline, setMahadashaTimeline] = useState<MahadashaEntry[] | null>(null);
    const [antardashaTimeline, setAntardashaTimeline] = useState<AntardashaEntry[] | null>(null);
    const [pratyantardashaTimeline, setPratyantardashaTimeline] = useState<YearPratyantardasha[] | null>(null);
    const [selectedPratyantarYear, setSelectedPratyantarYear] = useState<number>(new Date().getFullYear());
    const [selectedDailyDate, setSelectedDailyDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [calculatingMahadasha, setCalculatingMahadasha] = useState(false);
    const [calculatingAntardasha, setCalculatingAntardasha] = useState(false);
    const [calculatingPratyantardasha, setCalculatingPratyantardasha] = useState(false);
    const [selectedTab, setSelectedTab] = useState('basic');
    const [selectedGridTab, setSelectedGridTab] = useState('natal');
    const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<number>(new Date().getFullYear());

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

        // Fetch antardasha data
        const { data: antardasha } = await supabase
            .from('antardasha')
            .select('timeline')
            .eq('student_id', studentSession.id)
            .maybeSingle();

        if (antardasha?.timeline) {
            setAntardashaTimeline(antardasha.timeline as AntardashaEntry[]);
        }

        // Fetch pratyantardasha data
        const { data: pratyantardasha } = await supabase
            .from('pratyantardasha')
            .select('timeline')
            .eq('student_id', studentSession.id)
            .maybeSingle();

        if (pratyantardasha?.timeline) {
            setPratyantardashaTimeline(pratyantardasha.timeline as YearPratyantardasha[]);
        }

        setLoading(false);
    };

    const handleCalculateMahadasha = async () => {
        if (!profile || !basicInfo?.root_number || !session) return;

        setCalculatingMahadasha(true);

        try {
            const dob = new Date(profile.date_of_birth);
            const birthDay = dob.getDate();
            const birthMonth = dob.getMonth() + 1;
            const birthYear = dob.getFullYear();

            const timeline = calculateMahadasha(birthDay, birthMonth, birthYear, basicInfo.root_number, 100);

            // Check if record exists
            const { data: existing } = await supabase
                .from('mahadasha')
                .select('id')
                .eq('student_id', session.id)
                .maybeSingle();

            let error;
            if (existing) {
                const result = await supabase
                    .from('mahadasha')
                    .update({
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    })
                    .eq('student_id', session.id);
                error = result.error;
            } else {
                const result = await supabase
                    .from('mahadasha')
                    .insert({
                        student_id: session.id,
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    });
                error = result.error;
            }

            if (!error) {
                setMahadashaTimeline(timeline);
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

        doc.setFontSize(20);
        doc.text('Mahadasha Timeline', 14, 20);

        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date of Birth: ${formatDate(profile.date_of_birth)}`, 14, 40);

        const tableData = mahadashaTimeline.map((entry) => {
            const isCurrent = isCurrentMahadasha(entry);
            return [
                entry.fromDate + (isCurrent ? ' ✨' : ''),
                entry.toDate,
                entry.number.toString()
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['From Date', 'To Date', 'Number']],
            body: tableData,
            didParseCell: (data) => {
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

        let content = 'From Date,To Date,Number,Current\n';

        mahadashaTimeline.forEach((entry) => {
            const isCurrent = isCurrentMahadasha(entry) ? 'Yes' : 'No';
            content += `${entry.fromDate},${entry.toDate},${entry.number},${isCurrent}\n`;
        });

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

    // Antardasha functions
    const handleCalculateAntardasha = async () => {
        if (!profile || !session) return;

        setCalculatingAntardasha(true);

        try {
            const dob = new Date(profile.date_of_birth);
            const birthDay = dob.getDate();
            const birthMonth = dob.getMonth() + 1;
            const birthYear = dob.getFullYear();

            const timeline = calculateAntardasha(birthDay, birthMonth, birthYear, 100);

            // Check if record exists
            const { data: existing } = await supabase
                .from('antardasha')
                .select('id')
                .eq('student_id', session.id)
                .maybeSingle();

            let error;
            if (existing) {
                const result = await supabase
                    .from('antardasha')
                    .update({
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    })
                    .eq('student_id', session.id);
                error = result.error;
            } else {
                const result = await supabase
                    .from('antardasha')
                    .insert({
                        student_id: session.id,
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    });
                error = result.error;
            }

            if (!error) {
                setAntardashaTimeline(timeline);
            } else {
                console.error('Antardasha save error:', error);
            }
        } catch (err) {
            console.error('Error calculating Antardasha:', err);
        } finally {
            setCalculatingAntardasha(false);
        }
    };

    const handleCalculatePratyantardasha = async () => {
        if (!profile || !antardashaTimeline || !session) return;

        setCalculatingPratyantardasha(true);

        try {
            const dob = new Date(profile.date_of_birth);
            const birthDay = dob.getDate();

            const timeline = calculatePratyantardasha(birthDay, antardashaTimeline as any);

            // Check if record exists
            const { data: existing } = await supabase
                .from('pratyantardasha')
                .select('id')
                .eq('student_id', session.id)
                .maybeSingle();

            let error;
            if (existing) {
                const result = await supabase
                    .from('pratyantardasha')
                    .update({
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    })
                    .eq('student_id', session.id);
                error = result.error;
            } else {
                const result = await supabase
                    .from('pratyantardasha')
                    .insert({
                        student_id: session.id,
                        timeline: timeline,
                        calculated_at: new Date().toISOString(),
                    });
                error = result.error;
            }

            if (!error) {
                setPratyantardashaTimeline(timeline);
            } else {
                console.error('Pratyantardasha save error:', error);
            }
        } catch (err) {
            console.error('Error calculating Pratyantardasha:', err);
        } finally {
            setCalculatingPratyantardasha(false);
        }
    };

    const handleDownloadAntardashaPDF = () => {
        if (!antardashaTimeline || !profile) return;

        const doc = new jsPDF();

        doc.setFontSize(20);
        doc.text('Antardasha Timeline', 14, 20);

        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date of Birth: ${formatDate(profile.date_of_birth)}`, 14, 40);

        const tableData = antardashaTimeline.map((entry) => {
            const isCurrent = isCurrentAntardasha(entry);
            return [
                entry.fromDate + (isCurrent ? ' ✨' : ''),
                entry.toDate,
                entry.antardasha.toString()
            ];
        });

        autoTable(doc, {
            startY: 50,
            head: [['From Date', 'To Date', 'Number']],
            body: tableData,
            didParseCell: (data) => {
                const cellText = data.cell.raw?.toString() || '';
                if (cellText.includes('✨')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 112, 243];
                }
            }
        });

        doc.save(`antardasha_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadAntardashaCSV = () => {
        if (!antardashaTimeline || !profile) return;

        let content = 'From Date,To Date,Number,Current\n';

        antardashaTimeline.forEach((entry) => {
            const isCurrent = isCurrentAntardasha(entry) ? 'Yes' : 'No';
            content += `${entry.fromDate},${entry.toDate},${entry.antardasha},${isCurrent}\n`;
        });

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `antardasha_${profile.full_name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadPratyantardashaPDF = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const doc = new jsPDF();
        const yearData = pratyantardashaTimeline.find(y => y.year === selectedPratyantarYear);
        if (!yearData) return;

        doc.setFontSize(20);
        doc.text(`Pratyantardasha Timeline - ${selectedPratyantarYear}`, 14, 20);

        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date of Birth: ${formatDate(profile.date_of_birth)}`, 14, 40);
        doc.text(`Year Period: ${yearData.fromDate} to ${yearData.toDate}`, 14, 48);

        const tableData = yearData.periods.map((period) => {
            const isCurrent = isCurrentPratyantardasha(period);
            return [
                period.fromDate + (isCurrent ? ' ✨' : ''),
                period.toDate,
                period.pratyantardasha.toString()
            ];
        });

        autoTable(doc, {
            startY: 56,
            head: [['From Date', 'To Date', 'Pratyantardasha']],
            body: tableData,
            didParseCell: (data) => {
                const cellText = data.cell.raw?.toString() || '';
                if (cellText.includes('✨')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 112, 243];
                }
            }
        });

        doc.save(`pratyantardasha_${selectedPratyantarYear}_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadPratyantardashaCSV = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const yearData = pratyantardashaTimeline.find(y => y.year === selectedPratyantarYear);
        if (!yearData) return;

        let content = 'From Date,To Date,Pratyantardasha,Current\n';

        yearData.periods.forEach((period) => {
            const isCurrent = isCurrentPratyantardasha(period) ? 'Yes' : 'No';
            content += `${period.fromDate},${period.toDate},${period.pratyantardasha},${isCurrent}\n`;
        });

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pratyantardasha_${selectedPratyantarYear}_${profile.full_name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadDailyDashaPDF = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const doc = new jsPDF();
        const today = new Date();

        doc.setFontSize(20);
        doc.text('Daily Dasha Timeline', 14, 20);

        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date of Birth: ${formatDate(profile.date_of_birth)}`, 14, 40);
        doc.text('Showing 60 days (20 past + 40 future)', 14, 48);

        const tableData: string[][] = [];
        for (let i = -20; i <= 40; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);
            if (!dailyResult) continue;
            const isToday = i === 0;
            tableData.push([
                formatDateForDisplay(date) + (isToday ? ' ✨' : ''),
                dailyResult.dayName,
                dailyResult.dailyDasha.toString()
            ]);
        }

        autoTable(doc, {
            startY: 56,
            head: [['Date', 'Day', 'Daily Dasha']],
            body: tableData,
            didParseCell: (data) => {
                const cellText = data.cell.raw?.toString() || '';
                if (cellText.includes('✨')) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [0, 112, 243];
                }
            }
        });

        doc.save(`daily_dasha_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadDailyDashaCSV = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const today = new Date();
        let content = 'Date,Day,Daily Dasha,Today\n';

        for (let i = -20; i <= 40; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);
            if (!dailyResult) continue;
            const isToday = i === 0 ? 'Yes' : 'No';
            content += `${formatDateForDisplay(date)},${dailyResult.dayName},${dailyResult.dailyDasha},${isToday}\n`;
        }

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_dasha_${profile.full_name.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadHourlyDashaPDF = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const doc = new jsPDF();
        const date = new Date(selectedDailyDate);
        const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);
        if (!dailyResult) return;

        const hourlyData = calculateAllHourlyDasha(dailyResult.dailyDasha);

        doc.setFontSize(20);
        doc.text('Hourly Dasha Timeline', 14, 20);

        doc.setFontSize(12);
        doc.text(`Name: ${profile.full_name}`, 14, 32);
        doc.text(`Date: ${formatDateForDisplay(date)} (${dailyResult.dayName})`, 14, 40);
        doc.text(`Daily Dasha: ${dailyResult.dailyDasha}`, 14, 48);

        const tableData = hourlyData.map((item) => [
            item.hour,
            item.hourlyDasha.toString()
        ]);

        autoTable(doc, {
            startY: 56,
            head: [['Time', 'Hourly Dasha']],
            body: tableData,
        });

        doc.save(`hourly_dasha_${formatDateForDisplay(date).replace(/\s+/g, '_')}_${profile.full_name.replace(/\s+/g, '_')}.pdf`);
    };

    const handleDownloadHourlyDashaCSV = () => {
        if (!pratyantardashaTimeline || !profile) return;

        const date = new Date(selectedDailyDate);
        const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);
        if (!dailyResult) return;

        const hourlyData = calculateAllHourlyDasha(dailyResult.dailyDasha);

        let content = 'Time,Hourly Dasha\n';
        hourlyData.forEach((item) => {
            content += `${item.hour},${item.hourlyDasha}\n`;
        });

        const blob = new Blob([content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hourly_dasha_${formatDateForDisplay(date).replace(/\s+/g, '_')}_${profile.full_name.replace(/\s+/g, '_')}.csv`;
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
            <div className="p-3 md:p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 md:mb-6 mt-2 md:mt-4">
                        <h1 className="text-xl md:text-2xl font-bold truncate">Welcome, {profile?.full_name}</h1>
                        <p className="text-default-500 text-sm md:text-base">Your spiritual journey awaits</p>
                    </div>

                    {/* Tabs */}
                    <Tabs
                        selectedKey={selectedTab}
                        onSelectionChange={(key) => setSelectedTab(key as string)}
                        aria-label="Profile sections"
                        className="mb-4 md:mb-6"
                        classNames={{
                            tabList: "overflow-x-auto flex-nowrap scrollbar-hide",
                            tab: "min-w-fit px-3 text-sm md:text-base whitespace-nowrap",
                            base: "w-full"
                        }}
                    >
                        <Tab key="basic" title="Basic Info">
                            <Card className="mt-3 md:mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Basic Information</h2>

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
                                            <p className="text-sm text-default-500">Lord</p>
                                            <p className="text-lg">{basicInfo?.lord ?? <span className="text-default-400">Coming soon</span>}</p>
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

                                    {/* New Fields Section */}
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Lucky Dates</p>
                                            {basicInfo?.lucky_dates ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.lucky_dates.map((date, idx) => (
                                                        <Chip key={idx} color="primary" variant="flat" size="sm">
                                                            {date}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Favorable Days</p>
                                            {basicInfo?.favorable_days ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.favorable_days.map((day, idx) => (
                                                        <Chip key={idx} color="secondary" variant="flat" size="sm">
                                                            {day}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Favorable Alphabets</p>
                                            {basicInfo?.favorable_alphabets ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.favorable_alphabets.map((letter, idx) => (
                                                        <Chip key={idx} color="warning" variant="flat" size="sm">
                                                            {letter}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-default-500 mb-2">Favourable Profession</p>
                                            {basicInfo?.favourable_profession ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {basicInfo.favourable_profession.map((prof, idx) => (
                                                        <Chip key={idx} color="default" variant="flat" size="sm">
                                                            {prof}
                                                        </Chip>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-default-400">Coming soon</p>
                                            )}
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
                            <Card className="mt-3 md:mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Mahadasha</h2>

                                    {!mahadashaTimeline ? (
                                        // Show button if not calculated yet
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Calculate your Mahadasha timeline
                                            </p>
                                            <Button
                                                color="primary"
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
                                                        <TableColumn>FROM DATE</TableColumn>
                                                        <TableColumn>TO DATE</TableColumn>
                                                        <TableColumn>MAHADASHA</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {mahadashaTimeline.map((entry, idx) => {
                                                            const isCurrent = isCurrentMahadasha(entry);
                                                            return (
                                                                <TableRow
                                                                    key={idx}
                                                                    className={isCurrent ? 'bg-primary-100' : ''}
                                                                >
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.fromDate}
                                                                            {isCurrent && ' ✨'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.toDate}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.number}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
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
                            <Card className="mt-3 md:mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Antar Dasha</h2>

                                    {!antardashaTimeline ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Calculate your Antardasha sub-periods
                                            </p>
                                            <Button
                                                color="primary"
                                                onPress={handleCalculateAntardasha}
                                                isLoading={calculatingAntardasha}
                                            >
                                                See my Antardasha
                                            </Button>
                                        </div>
                                    ) : (
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
                                                <Table aria-label="Antardasha timeline" removeWrapper>
                                                    <TableHeader>
                                                        <TableColumn>FROM DATE</TableColumn>
                                                        <TableColumn>TO DATE</TableColumn>
                                                        <TableColumn>ANTARDASHA</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {antardashaTimeline.map((entry, idx) => {
                                                            const isCurrent = isCurrentAntardasha(entry);
                                                            return (
                                                                <TableRow
                                                                    key={idx}
                                                                    className={isCurrent ? 'bg-primary-100' : ''}
                                                                >
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.fromDate}
                                                                            {isCurrent && ' ✨'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.toDate}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                            {entry.antardasha}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <ButtonGroup>
                                                <Button
                                                    color="primary"
                                                    onPress={handleDownloadAntardashaPDF}
                                                >
                                                    Download PDF
                                                </Button>
                                                <Button
                                                    color="secondary"
                                                    variant="flat"
                                                    onPress={handleDownloadAntardashaCSV}
                                                >
                                                    Download CSV
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="pratyantar-dasha" title="Pratyantar Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Pratyantar Dasha</h2>

                                    {!antardashaTimeline ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Please calculate Antardasha first
                                            </p>
                                            <Button
                                                color="primary"
                                                onPress={() => setSelectedTab('antar-dasha')}
                                            >
                                                Go to Antar Dasha
                                            </Button>
                                        </div>
                                    ) : !pratyantardashaTimeline ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Calculate your Pratyantardasha sub-periods
                                            </p>
                                            <Button
                                                color="primary"
                                                size="lg"
                                                onPress={handleCalculatePratyantardasha}
                                                isLoading={calculatingPratyantardasha}
                                            >
                                                See my Pratyantardasha
                                            </Button>
                                        </div>
                                    ) : (
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

                                            {/* Year selector */}
                                            <div className="mb-4">
                                                <label className="text-sm text-default-500 block mb-2">Select Year</label>
                                                <select
                                                    className="w-full md:w-48 p-2 border border-default-300 rounded-lg bg-background"
                                                    value={selectedPratyantarYear}
                                                    onChange={(e) => setSelectedPratyantarYear(parseInt(e.target.value))}
                                                >
                                                    {pratyantardashaTimeline.map((yearData) => (
                                                        <option key={yearData.year} value={yearData.year}>
                                                            {yearData.year} {yearData.year === new Date().getFullYear() ? '(Current)' : ''}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Periods table */}
                                            {(() => {
                                                const yearData = pratyantardashaTimeline.find(y => y.year === selectedPratyantarYear);
                                                if (!yearData) return <p className="text-default-500">No data for selected year</p>;

                                                return (
                                                    <>
                                                        <p className="text-sm text-default-500 mb-2">
                                                            Year: {yearData.fromDate} to {yearData.toDate}
                                                        </p>
                                                        <div className="max-h-96 overflow-y-auto mb-4">
                                                            <Table aria-label="Pratyantardasha timeline" removeWrapper>
                                                                <TableHeader>
                                                                    <TableColumn>FROM DATE</TableColumn>
                                                                    <TableColumn>TO DATE</TableColumn>
                                                                    <TableColumn>PRATYANTARDASHA</TableColumn>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {yearData.periods.map((period, idx) => {
                                                                        const isCurrent = isCurrentPratyantardasha(period);
                                                                        return (
                                                                            <TableRow
                                                                                key={idx}
                                                                                className={isCurrent ? 'bg-primary-100' : ''}
                                                                            >
                                                                                <TableCell>
                                                                                    <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                                        {period.fromDate}
                                                                                        {isCurrent && ' ✨'}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                                        {period.toDate}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                                        {period.pratyantardasha}
                                                                                    </span>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        <ButtonGroup>
                                                            <Button
                                                                color="primary"
                                                                onPress={handleDownloadPratyantardashaPDF}
                                                            >
                                                                Download PDF
                                                            </Button>
                                                            <Button
                                                                color="secondary"
                                                                variant="flat"
                                                                onPress={handleDownloadPratyantardashaCSV}
                                                            >
                                                                Download CSV
                                                            </Button>
                                                        </ButtonGroup>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="daily-dasha" title="Daily Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Daily Dasha</h2>

                                    {!pratyantardashaTimeline ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Please calculate Pratyantardasha first
                                            </p>
                                            <Button
                                                color="primary"
                                                onPress={() => setSelectedTab('pratyantar-dasha')}
                                            >
                                                Go to Pratyantar Dasha
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm text-default-500 mb-4">Showing 60 days (20 past + 40 future)</p>
                                            <div className="max-h-[500px] overflow-y-auto">
                                                <Table aria-label="Daily Dasha" removeWrapper>
                                                    <TableHeader>
                                                        <TableColumn>DATE</TableColumn>
                                                        <TableColumn>DAY</TableColumn>
                                                        <TableColumn>DAILY DASHA</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {(() => {
                                                            const today = new Date();
                                                            const rows = [];

                                                            for (let i = -20; i <= 40; i++) {
                                                                const date = new Date(today);
                                                                date.setDate(today.getDate() + i);

                                                                const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);
                                                                if (!dailyResult) continue;

                                                                const isToday = i === 0;

                                                                rows.push(
                                                                    <TableRow
                                                                        key={i}
                                                                        className={isToday ? 'bg-primary-100' : ''}
                                                                    >
                                                                        <TableCell>
                                                                            <span className={isToday ? 'font-bold text-primary' : ''}>
                                                                                {formatDateForDisplay(date)}
                                                                                {isToday && ' ✨'}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <span className={isToday ? 'font-bold text-primary' : ''}>
                                                                                {dailyResult.dayName}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <span className={isToday ? 'font-bold text-primary' : ''}>
                                                                                {dailyResult.dailyDasha}
                                                                            </span>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            }

                                                            return rows;
                                                        })()}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                            <ButtonGroup className="mt-4">
                                                <Button
                                                    color="primary"
                                                    onPress={handleDownloadDailyDashaPDF}
                                                >
                                                    Download PDF
                                                </Button>
                                                <Button
                                                    color="secondary"
                                                    variant="flat"
                                                    onPress={handleDownloadDailyDashaCSV}
                                                >
                                                    Download CSV
                                                </Button>
                                            </ButtonGroup>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="hourly-dasha" title="Hourly Dasha">
                            <Card className="mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Hourly Dasha</h2>

                                    {!pratyantardashaTimeline ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500 mb-4">
                                                Please calculate Pratyantardasha first
                                            </p>
                                            <Button
                                                color="primary"
                                                onPress={() => setSelectedTab('pratyantar-dasha')}
                                            >
                                                Go to Pratyantar Dasha
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Date Picker */}
                                            <div className="mb-6">
                                                <label className="text-sm text-default-500 block mb-2">Select Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full md:w-64 p-2 border border-default-300 rounded-lg bg-background"
                                                    value={selectedDailyDate}
                                                    onChange={(e) => setSelectedDailyDate(e.target.value)}
                                                />
                                            </div>

                                            {(() => {
                                                const date = new Date(selectedDailyDate);
                                                const dailyResult = calculateDailyDasha(date, pratyantardashaTimeline);

                                                if (!dailyResult) {
                                                    return (
                                                        <div className="text-center py-8">
                                                            <p className="text-default-500">No Pratyantardasha data found for this date.</p>
                                                            <p className="text-sm text-default-400 mt-2">Date may be outside calculated range.</p>
                                                        </div>
                                                    );
                                                }

                                                const hourlyData = calculateAllHourlyDasha(dailyResult.dailyDasha);
                                                const currentHour = new Date().getHours();
                                                const isToday = selectedDailyDate === new Date().toISOString().split('T')[0];

                                                return (
                                                    <>
                                                        {/* Daily Dasha Summary */}
                                                        <div className="mb-4 p-4 bg-default-100 rounded-lg">
                                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                                <div>
                                                                    <p className="text-xs text-default-500">Date</p>
                                                                    <p className="font-semibold text-sm">{formatDateForDisplay(date)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-default-500">Day</p>
                                                                    <p className="font-semibold">{dailyResult.dayName}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-default-500">Daily Dasha</p>
                                                                    <p className="font-bold text-xl text-primary">{dailyResult.dailyDasha}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Hourly Dasha Table */}
                                                        <div className="max-h-96 overflow-y-auto">
                                                            <Table aria-label="Hourly Dasha" removeWrapper>
                                                                <TableHeader>
                                                                    <TableColumn>TIME</TableColumn>
                                                                    <TableColumn>HOURLY DASHA</TableColumn>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {hourlyData.map((item, idx) => {
                                                                        const isCurrent = isToday && currentHour === idx;
                                                                        return (
                                                                            <TableRow
                                                                                key={idx}
                                                                                className={isCurrent ? 'bg-primary-100' : ''}
                                                                            >
                                                                                <TableCell>
                                                                                    <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                                        {item.hour}
                                                                                        {isCurrent && ' ✨'}
                                                                                    </span>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <span className={isCurrent ? 'font-bold text-primary' : ''}>
                                                                                        {item.hourlyDasha}
                                                                                    </span>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                        <ButtonGroup className="mt-4">
                                                            <Button
                                                                color="primary"
                                                                onPress={handleDownloadHourlyDashaPDF}
                                                            >
                                                                Download PDF
                                                            </Button>
                                                            <Button
                                                                color="secondary"
                                                                variant="flat"
                                                                onPress={handleDownloadHourlyDashaCSV}
                                                            >
                                                                Download CSV
                                                            </Button>
                                                        </ButtonGroup>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="grids" title="Grids">
                            <Card className="mt-3 md:mt-4">
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4">Grids</h2>

                                    {!profile || !basicInfo ? (
                                        <div className="text-center py-8">
                                            <p className="text-default-500">
                                                Profile data not available
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Grid Sub-Tabs */}
                                            <Tabs
                                                selectedKey={selectedGridTab}
                                                onSelectionChange={(key) => setSelectedGridTab(key as string)}
                                                aria-label="Grid types"
                                                className="mb-4"
                                                size="sm"
                                                classNames={{
                                                    tabList: "overflow-x-auto flex-nowrap scrollbar-hide",
                                                    tab: "min-w-fit px-2 text-xs md:text-sm whitespace-nowrap"
                                                }}
                                            >
                                                {/* NATAL GRID */}
                                                <Tab key="natal" title="Natal">
                                                    <div className="mt-4">
                                                        <GridLegend sources={['natal'] as DigitSource[]} />
                                                        <div className="mt-4 flex justify-center">
                                                            <LoShuGridComponent
                                                                grid={calculateNatalGrid(profile.date_of_birth)}
                                                                title="Natal Grid"
                                                            />
                                                        </div>
                                                        <p className="text-center text-sm text-default-500 mt-4">
                                                            Based on birth date digits only
                                                        </p>
                                                    </div>
                                                </Tab>

                                                {/* BASIC GRID */}
                                                <Tab key="basic-grid" title="Basic">
                                                    <div className="mt-4">
                                                        <GridLegend sources={['natal', 'root'] as DigitSource[]} />
                                                        <div className="mt-4 flex justify-center">
                                                            <LoShuGridComponent
                                                                grid={calculateBasicGrid(
                                                                    profile.date_of_birth,
                                                                    basicInfo.root_number || 1
                                                                )}
                                                                title="Basic Grid"
                                                            />
                                                        </div>
                                                        <p className="text-center text-sm text-default-500 mt-4">
                                                            Natal + Root Number (if not already present)
                                                        </p>
                                                    </div>
                                                </Tab>

                                                {/* DESTINY GRID */}
                                                <Tab key="destiny-grid" title="Destiny">
                                                    <div className="mt-4">
                                                        <GridLegend sources={['natal', 'root', 'destiny'] as DigitSource[]} />
                                                        <div className="mt-4 flex justify-center">
                                                            <LoShuGridComponent
                                                                grid={calculateDestinyGrid(
                                                                    profile.date_of_birth,
                                                                    basicInfo.root_number || 1,
                                                                    basicInfo.destiny_number || 1
                                                                )}
                                                                title="Destiny Grid"
                                                            />
                                                        </div>
                                                        <p className="text-center text-sm text-default-500 mt-4">
                                                            Basic + Destiny Number
                                                        </p>
                                                    </div>
                                                </Tab>

                                                {/* MAHADASHA GRID */}
                                                <Tab key="mahadasha-grid" title="Mahadasha">
                                                    <div className="mt-4">
                                                        {!mahadashaTimeline ? (
                                                            <div className="text-center py-4">
                                                                <p className="text-default-500 mb-4">
                                                                    Please calculate Mahadasha first
                                                                </p>
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    onPress={() => setSelectedTab('mahadasha')}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <GridLegend sources={['natal', 'root', 'destiny', 'mahadasha'] as DigitSource[]} />
                                                                <div className="mt-4 flex justify-center">
                                                                    <LoShuGridComponent
                                                                        grid={calculateMahadashaGrid(
                                                                            profile.date_of_birth,
                                                                            basicInfo.root_number || 1,
                                                                            basicInfo.destiny_number || 1,
                                                                            mahadashaTimeline
                                                                        )}
                                                                        title="Current Mahadasha Grid"
                                                                    />
                                                                </div>
                                                                <p className="text-center text-sm text-default-500 mt-4">
                                                                    Destiny + Current Mahadasha Number
                                                                </p>
                                                            </>
                                                        )}
                                                    </div>
                                                </Tab>

                                                {/* PERSONAL YEAR GRIDS */}
                                                <Tab key="personal-year" title="Personal Year">
                                                    <div className="mt-4">
                                                        {!mahadashaTimeline || !antardashaTimeline ? (
                                                            <div className="text-center py-4">
                                                                <p className="text-default-500 mb-4">
                                                                    Please calculate Mahadasha and Antardasha first
                                                                </p>
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    onPress={() => setSelectedTab('mahadasha')}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <GridLegend
                                                                    sources={['natal', 'root', 'destiny', 'mahadasha', 'antardasha'] as DigitSource[]}
                                                                    compact
                                                                />
                                                                <p className="text-sm text-default-500 mt-2 mb-4">
                                                                    16 years from current year
                                                                </p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    {Array.from({ length: 16 }, (_, i) => {
                                                                        const year = new Date().getFullYear() + i;
                                                                        return (
                                                                            <div key={year} className="flex flex-col items-center">
                                                                                <LoShuGridComponent
                                                                                    grid={calculatePersonalYearGrid(
                                                                                        profile.date_of_birth,
                                                                                        basicInfo.root_number || 1,
                                                                                        basicInfo.destiny_number || 1,
                                                                                        year,
                                                                                        mahadashaTimeline,
                                                                                        antardashaTimeline
                                                                                    )}
                                                                                    title={year.toString()}
                                                                                    compact
                                                                                />
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </Tab>

                                                {/* MONTHLY GRIDS */}
                                                <Tab key="monthly" title="Monthly">
                                                    <div className="mt-4">
                                                        {!mahadashaTimeline || !antardashaTimeline || !pratyantardashaTimeline ? (
                                                            <div className="text-center py-4">
                                                                <p className="text-default-500 mb-4">
                                                                    Please calculate all Dasha timelines first
                                                                </p>
                                                                <Button
                                                                    color="primary"
                                                                    size="sm"
                                                                    onPress={() => setSelectedTab('mahadasha')}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                                                    <GridLegend
                                                                        sources={['natal', 'root', 'destiny', 'mahadasha', 'antardasha', 'pratyantardasha'] as DigitSource[]}
                                                                        compact
                                                                    />
                                                                </div>
                                                                <div className="mb-4">
                                                                    <label className="text-sm text-default-500 block mb-2">Select Year</label>
                                                                    <select
                                                                        className="w-full md:w-48 p-2 border border-default-300 rounded-lg bg-background"
                                                                        value={selectedMonthlyYear}
                                                                        onChange={(e) => setSelectedMonthlyYear(parseInt(e.target.value))}
                                                                    >
                                                                        {Array.from({ length: 20 }, (_, i) => {
                                                                            const year = new Date().getFullYear() - 5 + i;
                                                                            return (
                                                                                <option key={year} value={year}>{year}</option>
                                                                            );
                                                                        })}
                                                                    </select>
                                                                </div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                                                    {MONTH_NAMES.map((monthName, monthIndex) => (
                                                                        <div key={monthIndex} className="flex flex-col items-center">
                                                                            <LoShuGridComponent
                                                                                grid={calculateMonthlyGrid(
                                                                                    profile.date_of_birth,
                                                                                    basicInfo.root_number || 1,
                                                                                    basicInfo.destiny_number || 1,
                                                                                    selectedMonthlyYear,
                                                                                    monthIndex,
                                                                                    mahadashaTimeline,
                                                                                    antardashaTimeline,
                                                                                    pratyantardashaTimeline
                                                                                )}
                                                                                title={monthName}
                                                                                compact
                                                                            />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </Tab>
                                            </Tabs>
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
