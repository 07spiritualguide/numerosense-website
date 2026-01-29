'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardBody, Spinner, Tabs, Tab, Chip, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, ButtonGroup, Select, SelectItem } from '@heroui/react';
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
import { extractFirstLastName, calculateNameNumber, getNameBreakdown } from '@/lib/name-numerology';
import { getQuoteForCurrentTime } from '@/lib/quotes';
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
    first_name: string | null;
    last_name: string | null;
    name_number: number | null;
}

// Lucky color to hex mapping
const COLOR_HEX_MAP: { [key: string]: string } = {
    // Basic colors
    'red': '#EF4444',
    'green': '#22C55E',
    'blue': '#3B82F6',
    'yellow': '#EAB308',
    'orange': '#F97316',
    'purple': '#8B5CF6',
    'pink': '#EC4899',
    'white': '#F8FAFC',
    'black': '#1F2937',
    'brown': '#92400E',
    'grey': '#6B7280',
    'gray': '#6B7280',
    'cream': '#FEF3C7',

    // Variations
    'light green': '#86EFAC',
    'light pink': '#FBCFE8',
    'dark pink': '#DB2777',
    'dark brown': '#78350F',
    'golden yellow': '#FBBF24',
    'metallic blue': '#60A5FA',
    'khakee': '#BDB76B',
    'pastel shades': '#E9D5FF',
};

// Parse color string and extract individual colors (only valid colors)
function parseColors(colorString: string | null): string[] {
    if (!colorString) return [];
    const cleaned = colorString.replace(/\([^)]*\)/g, '');
    return cleaned
        .split(',')
        .map(c => c.trim())
        .filter(c => {
            const normalized = c.toLowerCase().trim();
            return c.length > 0 && COLOR_HEX_MAP[normalized] !== undefined;
        });
}

// Extract notes/non-color text from color string
function extractColorNotes(colorString: string | null): string | null {
    if (!colorString) return null;
    const notes: string[] = [];
    const parenthesesMatch = colorString.match(/\(([^)]+)\)/g);
    if (parenthesesMatch) {
        notes.push(...parenthesesMatch.map(m => m.slice(1, -1)));
    }
    const cleaned = colorString.replace(/\([^)]*\)/g, '');
    const items = cleaned.split(',').map(c => c.trim()).filter(c => c.length > 0);
    items.forEach(item => {
        const normalized = item.toLowerCase().trim();
        if (COLOR_HEX_MAP[normalized] === undefined) {
            notes.push(item);
        }
    });
    return notes.length > 0 ? notes.join(' • ') : null;
}

// Get hex color for a color name
function getColorHex(colorName: string): string {
    const normalized = colorName.toLowerCase().trim();
    return COLOR_HEX_MAP[normalized] || '#9CA3AF';
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
    const [selectedGridTab, setSelectedGridTab] = useState('basic-grids');
    const [selectedMonthlyYear, setSelectedMonthlyYear] = useState<number>(new Date().getFullYear());
    const [selectedPersonalYearStart, setSelectedPersonalYearStart] = useState<number>(new Date().getFullYear());
    const [isTrialExpired, setIsTrialExpired] = useState(false);

    // Destiny number to theme color mapping
    const DESTINY_THEME: Record<number, { bg: string; card: string; accent: string; primary: string; tabList: string; gridBorder: string; gridBg: string }> = {
        1: { bg: '#FEF5C3', card: '#FFFEF5', accent: '#D4A017', primary: '#FFE44E', tabList: '#FFF4B8', gridBorder: '#FFF4B8', gridBg: '#FFFADB' },
        2: { bg: '#E2FF90', card: '#F5FFF0', accent: '#4CAF50', primary: '#BCFF00', tabList: '#DFFF84', gridBorder: '#E6FFA1', gridBg: '#F1FFCA' },
        3: { bg: '#FEE5F3', card: '#FFF5FB', accent: '#E91E63', primary: '#FF77C3', tabList: '#FFE0F2', gridBorder: '#FFE0F2', gridBg: '#FFECF7' },
        4: { bg: '#D5E4FF', card: '#F0F5FF', accent: '#2196F3', primary: '#5995FF', tabList: '#CFE0FF', gridBorder: '#CFE0FF', gridBg: '#E6EFFF' },
        5: { bg: '#C9FFC4', card: '#F0FFF0', accent: '#8BC34A', primary: '#6FFF62', tabList: '#BDFFB7', gridBorder: '#BDFFB7', gridBg: '#E1FFDE' },
        6: { bg: '#D5FCFF', card: '#F0FFFF', accent: '#00BCD4', primary: '#51F3FF', tabList: '#CEFBFF', gridBorder: '#BDFAFF', gridBg: '#DFFDFF' },
        7: { bg: '#FFFBD4', card: '#FFFFF5', accent: '#FFC107', primary: '#FFF163', tabList: '#FFFAC8', gridBorder: '#FFF9BD', gridBg: '#FFFCE3' },
        8: { bg: '#E6D1A2', card: '#FFF8F0', accent: '#795548', primary: '#FBB821', tabList: '#E2CC9D', gridBorder: '#FFEFCC', gridBg: '#FFF6E3' },
        9: { bg: '#FFC2C3', card: '#FFF5F5', accent: '#F44336', primary: '#FF4E51', tabList: '#FFBDBE', gridBorder: '#FFE2E2', gridBg: '#FFF5F5' },
    };


    useEffect(() => {
        checkAuth();
    }, []);

    // Check trial expiry - fetch fresh data from database
    useEffect(() => {
        const checkExpiry = async () => {
            if (!session?.id) return;

            // Fetch latest trial_ends_at from database
            const { data } = await supabase
                .from('students')
                .select('trial_ends_at')
                .eq('id', session.id)
                .single();

            if (data?.trial_ends_at && new Date(data.trial_ends_at) < new Date()) {
                setIsTrialExpired(true);
                document.body.style.overflow = 'hidden';
            } else {
                setIsTrialExpired(false);
                document.body.style.overflow = '';
            }
        };

        checkExpiry();
        const interval = setInterval(checkExpiry, 5000); // Check every 5 seconds

        return () => {
            clearInterval(interval);
            document.body.style.overflow = '';
        };
    }, [session]);

    // Set theme colors based on destiny number
    useEffect(() => {
        if (basicInfo?.destiny_number) {
            // Cache destiny number for next page load
            localStorage.setItem('destiny_number', String(basicInfo.destiny_number));

            const theme = DESTINY_THEME[basicInfo.destiny_number];
            if (theme) {
                // Use CSS variable for background (set by inline script or here)
                document.documentElement.style.setProperty('--destiny-bg', theme.bg);
                document.documentElement.style.setProperty('--destiny-card', theme.card);
                document.documentElement.style.setProperty('--destiny-accent', theme.accent);
                document.documentElement.style.setProperty('--destiny-primary', theme.primary);
                document.documentElement.style.setProperty('--destiny-tablist', theme.tabList);
                document.documentElement.style.setProperty('--destiny-grid-border', theme.gridBorder);
                document.documentElement.style.setProperty('--destiny-grid-bg', theme.gridBg);
            }
        }
        return () => {
            document.documentElement.style.removeProperty('--destiny-bg');
            document.documentElement.style.removeProperty('--destiny-card');
            document.documentElement.style.removeProperty('--destiny-accent');
            document.documentElement.style.removeProperty('--destiny-primary');
            document.documentElement.style.removeProperty('--destiny-tablist');
            document.documentElement.style.removeProperty('--destiny-grid-border');
            document.documentElement.style.removeProperty('--destiny-grid-bg');
        };
    }, [basicInfo?.destiny_number]);

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

            // Check if name numerology is missing for existing users
            if (!info.first_name || !info.name_number) {
                // Calculate name numerology from full_name
                const { firstName, lastName } = extractFirstLastName(student.full_name);
                const nameNumber = calculateNameNumber(firstName, lastName);

                // Update basic_info with name numerology
                await supabase
                    .from('basic_info')
                    .update({
                        first_name: firstName,
                        last_name: lastName,
                        name_number: nameNumber,
                    })
                    .eq('student_id', studentSession.id);

                // Update local state
                setBasicInfo({
                    ...info,
                    first_name: firstName,
                    last_name: lastName,
                    name_number: nameNumber,
                });
            }
        }

        // Fetch mahadasha data
        const { data: mahadasha } = await supabase
            .from('mahadasha')
            .select('timeline')
            .eq('student_id', studentSession.id)
            .maybeSingle();

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
            {/* Trial Expired Overlay - Cannot be removed via DevTools */}
            {isTrialExpired && (
                <div
                    className="fixed inset-0 z-[99999] flex items-center justify-center"
                    style={{
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        pointerEvents: 'all'
                    }}
                >
                    <Card className="max-w-md mx-4 shadow-2xl">
                        <CardBody className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 mx-auto bg-warning-100 rounded-full flex items-center justify-center">
                                <span className="text-3xl">⏰</span>
                            </div>
                            <h2 className="text-xl font-bold">Free Trial Ended</h2>
                            <p className="text-default-500">
                                Your free trial period has expired. Please complete the payment to continue accessing your numerology insights.
                            </p>
                            <Button
                                color="success"
                                size="lg"
                                className="w-full"
                                onPress={() => window.open(`https://wa.me/919820656730?text=Hi, I want to extend my Numerosense access for the number: ${session?.phone}`, '_blank')}
                            >
                                💬 Contact Admin on WhatsApp
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            )}
            <StudentNavbar />
            <div className="p-3 md:p-4">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-4 md:mb-6 mt-2 md:mt-4">
                        <h1 className="text-xl md:text-2xl font-bold truncate">Welcome, {profile?.full_name}</h1>
                        <p className="text-default-500 text-sm md:text-base italic">"{getQuoteForCurrentTime()}"</p>
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
                            <Card className="mt-3 md:mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
                                <CardBody className="p-4 md:p-6">
                                    <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">Basic Information</h2>

                                    {/* Numerology Numbers */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                                        <Card className="bg-warning-50">
                                            <CardBody className="text-center p-4">
                                                <p className="text-sm text-default-500 mb-1">Name Number</p>
                                                <p className="text-3xl font-bold text-warning">
                                                    {basicInfo?.name_number ?? '-'}
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
                                        <div className="col-span-2">
                                            <p className="text-sm text-default-500 mb-3">Lucky Colors</p>
                                            <div className="flex flex-wrap gap-4">
                                                {parseColors(basicInfo?.lucky_color ?? null).map((color, idx) => (
                                                    <div key={idx} className="flex flex-col items-center">
                                                        <span className="text-sm mb-1 capitalize">{color}</span>
                                                        <div
                                                            className="w-12 h-12 rounded-lg shadow-md"
                                                            style={{
                                                                backgroundColor: getColorHex(color),
                                                                border: `2px solid ${getColorHex(color)}80`
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            {extractColorNotes(basicInfo?.lucky_color ?? null) && (
                                                <p className="text-xs text-default-400 italic mt-2">
                                                    {extractColorNotes(basicInfo?.lucky_color ?? null)}
                                                </p>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-sm text-default-500 mb-3">Lucky Direction</p>
                                            <p className="text-lg font-medium">
                                                {basicInfo?.lucky_direction ?? <span className="text-default-400">Coming soon</span>}
                                            </p>
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

                                    {/* Name Breakdown Tables */}
                                    {basicInfo?.first_name && (
                                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                                            <div>
                                                <p className="text-sm text-default-500 mb-2">Name Numerology</p>
                                                <Table aria-label="First name" removeWrapper>
                                                    <TableHeader>
                                                        <TableColumn>First Name</TableColumn>
                                                        <TableColumn className="text-right">Number</TableColumn>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {getNameBreakdown(basicInfo.first_name).map((item, idx) => (
                                                            <TableRow key={idx}>
                                                                <TableCell>{item.letter}</TableCell>
                                                                <TableCell className="text-right">{item.value}</TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>

                                            {basicInfo.first_name !== basicInfo.last_name && basicInfo.last_name && (
                                                <div>
                                                    <p className="text-sm text-default-500 mb-2 opacity-0">.</p>
                                                    <Table aria-label="Last name" removeWrapper>
                                                        <TableHeader>
                                                            <TableColumn>Last Name</TableColumn>
                                                            <TableColumn className="text-right">Number</TableColumn>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {getNameBreakdown(basicInfo.last_name).map((item, idx) => (
                                                                <TableRow key={idx}>
                                                                    <TableCell>{item.letter}</TableCell>
                                                                    <TableCell className="text-right">{item.value}</TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardBody>
                            </Card>
                        </Tab>
                        <Tab key="mahadasha" title="Mahadasha">
                            <Card className="mt-3 md:mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                            <Card className="mt-3 md:mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                            <Card className="mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                <Select
                                                    label="Select Year"
                                                    className="max-w-xs"
                                                    selectedKeys={[selectedPratyantarYear.toString()]}
                                                    onSelectionChange={(keys) => setSelectedPratyantarYear(Number(Array.from(keys)[0]))}
                                                >
                                                    {pratyantardashaTimeline.map((y) => (
                                                        <SelectItem key={y.year.toString()} textValue={y.year.toString()}>
                                                            {y.year.toString()}
                                                        </SelectItem>
                                                    ))}
                                                </Select>
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
                                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                            <Card className="mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                            <Card className="mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                                                                style={{ backgroundColor: 'var(--destiny-primary)' }}
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
                            <Card className="mt-3 md:mt-4" style={{ backgroundColor: 'var(--destiny-card, white)' }}>
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
                                                    tab: "min-w-fit px-2 text-xs md:text-sm whitespace-nowrap",
                                                    base: "w-full"
                                                }}
                                            >
                                                {/* BASIC TAB - Natal, Basic & Destiny Grids */}
                                                <Tab key="basic-grids" title="Basic">
                                                    <div className="mt-4">
                                                        {/* Unified Legend */}
                                                        <GridLegend sources={['natal', 'destiny', 'mahadasha', 'antardasha', 'pratyantardasha'] as DigitSource[]} compact />

                                                        {/* Three grids in a row */}
                                                        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="flex flex-col items-center">
                                                                <LoShuGridComponent
                                                                    grid={calculateNatalGrid(profile.date_of_birth)}
                                                                    title="Natal Grid"
                                                                />
                                                                <p className="text-center text-xs text-default-500 mt-2">
                                                                    Birth date digits
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <LoShuGridComponent
                                                                    grid={calculateBasicGrid(
                                                                        profile.date_of_birth,
                                                                        basicInfo.root_number || 1
                                                                    )}
                                                                    title="Basic Grid"
                                                                />
                                                                <p className="text-center text-xs text-default-500 mt-2">
                                                                    Natal + Root Number
                                                                </p>
                                                            </div>
                                                            <div className="flex flex-col items-center">
                                                                <LoShuGridComponent
                                                                    grid={calculateDestinyGrid(
                                                                        profile.date_of_birth,
                                                                        basicInfo.root_number || 1,
                                                                        basicInfo.destiny_number || 1
                                                                    )}
                                                                    title="Destiny Grid"
                                                                />
                                                                <p className="text-center text-xs text-default-500 mt-2">
                                                                    Basic + Destiny Number
                                                                </p>
                                                            </div>
                                                        </div>
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
                                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <GridLegend sources={['natal', 'destiny', 'mahadasha', 'antardasha', 'pratyantardasha'] as DigitSource[]} compact />
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
                                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <GridLegend
                                                                    sources={['natal', 'destiny', 'mahadasha', 'antardasha', 'pratyantardasha'] as DigitSource[]}
                                                                    compact
                                                                />

                                                                <div className="flex flex-col md:flex-row justify-between items-center mt-4 mb-4 gap-4">
                                                                    {/* <p className="text-sm text-default-500">
                                                                        Showing 16 years from {selectedPersonalYearStart}
                                                                    </p> */}
                                                                    <Select
                                                                        label="Select Year Range"
                                                                        className="max-w-xs"
                                                                        selectedKeys={[selectedPersonalYearStart.toString()]}
                                                                        onSelectionChange={(keys) => setSelectedPersonalYearStart(Number(Array.from(keys)[0]))}
                                                                    >
                                                                        {Array.from({ length: 10 }, (_, i) => {
                                                                            const startYear = new Date().getFullYear() - 16 + (i * 16);
                                                                            const endYear = startYear + 15;
                                                                            return (
                                                                                <SelectItem key={startYear.toString()} textValue={`${startYear} - ${endYear}`}>
                                                                                    {startYear} - {endYear}
                                                                                </SelectItem>
                                                                            );
                                                                        })}
                                                                    </Select>
                                                                </div>

                                                                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    {Array.from({ length: 16 }, (_, i) => {
                                                                        const year = selectedPersonalYearStart + i;
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
                                                                    style={{ backgroundColor: 'var(--destiny-primary)' }}
                                                                >
                                                                    Go to Mahadasha
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex flex-wrap items-center gap-4 mb-4">
                                                                    <GridLegend
                                                                        sources={['natal', 'destiny', 'mahadasha', 'antardasha', 'pratyantardasha'] as DigitSource[]}
                                                                        compact
                                                                    />
                                                                </div>
                                                                <div className="mb-4">
                                                                    <Select
                                                                        label="Select Year"
                                                                        className="max-w-xs"
                                                                        selectedKeys={[selectedMonthlyYear.toString()]}
                                                                        onSelectionChange={(keys) => setSelectedMonthlyYear(Number(Array.from(keys)[0]))}
                                                                    >
                                                                        {Array.from({ length: 20 }, (_, i) => {
                                                                            const year = new Date().getFullYear() - 5 + i;
                                                                            return (
                                                                                <SelectItem key={year.toString()} textValue={year.toString()}>
                                                                                    {year.toString()}
                                                                                </SelectItem>
                                                                            );
                                                                        })}
                                                                    </Select>
                                                                </div>
                                                                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        </div >
    );
}
