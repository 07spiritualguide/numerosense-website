/**
 * Lo Shu Grid Calculation Utilities
 * 
 * Standard Grid Layout (Fixed):
 * 3 | 1 | 9
 * ---------
 * 6 | 7 | 5
 * ---------
 * 2 | 8 | 4
 */

import { MahadashaEntry, isCurrentMahadasha } from './mahadasha';
import { AntardashaEntry, isCurrentAntardasha } from './antardasha';
import { YearPratyantardasha, PratyantardashaEntry, isCurrentPratyantardasha } from './pratyantardasha';

// Grid position mapping: value -> cell index (0-8)
export const GRID_POSITIONS: { [key: number]: number } = {
    3: 0, 1: 1, 9: 2,
    6: 3, 7: 4, 5: 5,
    2: 6, 8: 7, 4: 8
};

// Cell index to grid value (reverse mapping)
export const CELL_VALUES: { [key: number]: number } = {
    0: 3, 1: 1, 2: 9,
    3: 6, 4: 7, 5: 5,
    6: 2, 7: 8, 8: 4
};

// Source types for color coding
export type DigitSource = 'natal' | 'root' | 'destiny' | 'mahadasha' | 'antardasha' | 'pratyantardasha';

// Digit with source tracking
export interface ColoredDigit {
    value: number;
    source: DigitSource;
}

// Grid cell containing multiple colored digits
export interface GridCell {
    position: number;
    digits: ColoredDigit[];
}

// Complete grid structure (9 cells)
export type LoShuGrid = GridCell[];

// Color mapping for sources
export const SOURCE_COLORS: { [key in DigitSource]: string } = {
    natal: 'text-gray-300',
    root: 'text-yellow-400',
    destiny: 'text-green-400',
    mahadasha: 'text-blue-400',
    antardasha: 'text-purple-400',
    pratyantardasha: 'text-pink-400'
};

export const SOURCE_BG_COLORS: { [key in DigitSource]: string } = {
    natal: 'bg-gray-600',
    root: 'bg-yellow-600',
    destiny: 'bg-green-600',
    mahadasha: 'bg-blue-600',
    antardasha: 'bg-purple-600',
    pratyantardasha: 'bg-pink-600'
};

export const SOURCE_LABELS: { [key in DigitSource]: string } = {
    natal: 'Natal',
    root: 'Root',
    destiny: 'Destiny',
    mahadasha: 'Mahadasha',
    antardasha: 'Antardasha',
    pratyantardasha: 'Pratyantardasha'
};

/**
 * Extract natal digits from birth date (remove zeros)
 */
export function extractNatalDigits(dateOfBirth: string): ColoredDigit[] {
    // Parse date string (YYYY-MM-DD format)
    const date = new Date(dateOfBirth);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();

    // Combine all parts as string
    const dateStr = `${day}${month}${year}`;

    // Extract digits, remove zeros
    const digits: ColoredDigit[] = [];
    for (const char of dateStr) {
        const num = parseInt(char);
        if (num !== 0) {
            digits.push({ value: num, source: 'natal' });
        }
    }

    return digits;
}

/**
 * Check if a value exists in the natal digits
 */
export function hasNatalDigit(natalDigits: ColoredDigit[], value: number): boolean {
    return natalDigits.some(d => d.value === value);
}

/**
 * Create empty grid (9 cells)
 */
export function createEmptyGrid(): LoShuGrid {
    return Array.from({ length: 9 }, (_, i) => ({
        position: i,
        digits: []
    }));
}

/**
 * Add digits to grid based on their values
 */
export function addDigitsToGrid(grid: LoShuGrid, digits: ColoredDigit[]): LoShuGrid {
    const newGrid = grid.map(cell => ({ ...cell, digits: [...cell.digits] }));

    for (const digit of digits) {
        const cellIndex = GRID_POSITIONS[digit.value];
        if (cellIndex !== undefined) {
            newGrid[cellIndex].digits.push(digit);
        }
    }

    return newGrid;
}

/**
 * Calculate Natal Grid
 */
export function calculateNatalGrid(dateOfBirth: string): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();
    return addDigitsToGrid(grid, natalDigits);
}

/**
 * Calculate Basic Grid (Natal + Root if not present)
 */
export function calculateBasicGrid(
    dateOfBirth: string,
    rootNumber: number
): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();

    // Add natal digits
    let allDigits = [...natalDigits];

    // Add root number only if not in natal digits
    if (!hasNatalDigit(natalDigits, rootNumber)) {
        allDigits.push({ value: rootNumber, source: 'root' });
    }

    return addDigitsToGrid(grid, allDigits);
}

/**
 * Calculate Destiny Grid (Basic + Destiny Number)
 */
export function calculateDestinyGrid(
    dateOfBirth: string,
    rootNumber: number,
    destinyNumber: number
): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();

    let allDigits = [...natalDigits];

    // Add root number only if not in natal digits
    if (!hasNatalDigit(natalDigits, rootNumber)) {
        allDigits.push({ value: rootNumber, source: 'root' });
    }

    // Always add destiny number
    allDigits.push({ value: destinyNumber, source: 'destiny' });

    return addDigitsToGrid(grid, allDigits);
}

/**
 * Calculate Mahadasha Grid (Destiny + Current Mahadasha)
 */
export function calculateMahadashaGrid(
    dateOfBirth: string,
    rootNumber: number,
    destinyNumber: number,
    mahadashaTimeline: MahadashaEntry[]
): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();

    let allDigits = [...natalDigits];

    // Add root if not present
    if (!hasNatalDigit(natalDigits, rootNumber)) {
        allDigits.push({ value: rootNumber, source: 'root' });
    }

    // Add destiny
    allDigits.push({ value: destinyNumber, source: 'destiny' });

    // Find current mahadasha
    const currentMahadasha = mahadashaTimeline.find(m => isCurrentMahadasha(m));
    if (currentMahadasha) {
        allDigits.push({ value: currentMahadasha.number, source: 'mahadasha' });
    }

    return addDigitsToGrid(grid, allDigits);
}

/**
 * Get Mahadasha number for a specific date
 */
export function getMahadashaForDate(
    date: Date,
    mahadashaTimeline: MahadashaEntry[]
): number | null {
    for (const entry of mahadashaTimeline) {
        if (!entry.fromDate || !entry.toDate) continue;

        const from = parseGridDate(entry.fromDate);
        const to = parseGridDate(entry.toDate);

        if (date >= from && date <= to) {
            return entry.number;
        }
    }
    return null;
}

/**
 * Get Antardasha number for a specific date
 */
export function getAntardashaForDate(
    date: Date,
    antardashaTimeline: AntardashaEntry[]
): number | null {
    for (const entry of antardashaTimeline) {
        if (!entry.fromDate || !entry.toDate) continue;

        const from = parseGridDate(entry.fromDate);
        const to = parseGridDate(entry.toDate);

        if (date >= from && date <= to) {
            return entry.antardasha;
        }
    }
    return null;
}

/**
 * Get Pratyantardasha number for a specific date
 */
export function getPratyantardashaForDate(
    date: Date,
    pratyantardashaTimeline: YearPratyantardasha[]
): number | null {
    for (const yearData of pratyantardashaTimeline) {
        for (const period of yearData.periods) {
            if (!period.fromDate || !period.toDate) continue;

            const from = parseGridDate(period.fromDate);
            const to = parseGridDate(period.toDate);

            if (date >= from && date <= to) {
                return period.pratyantardasha;
            }
        }
    }
    return null;
}

/**
 * Parse date string "DD MMM YYYY" or similar format
 */
function parseGridDate(dateStr: string): Date {
    const months: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    const parts = dateStr.split(' ');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = months[parts[1]] ?? 0;
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }

    return new Date(dateStr);
}

/**
 * Calculate Personal Year Grid for a specific year
 */
export function calculatePersonalYearGrid(
    dateOfBirth: string,
    rootNumber: number,
    destinyNumber: number,
    year: number,
    mahadashaTimeline: MahadashaEntry[],
    antardashaTimeline: AntardashaEntry[]
): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();

    let allDigits = [...natalDigits];

    // Add root if not present
    if (!hasNatalDigit(natalDigits, rootNumber)) {
        allDigits.push({ value: rootNumber, source: 'root' });
    }

    // Add destiny
    allDigits.push({ value: destinyNumber, source: 'destiny' });

    // Get mahadasha and antardasha for mid-year (July 1)
    const midYear = new Date(year, 6, 1);

    const mahadasha = getMahadashaForDate(midYear, mahadashaTimeline);
    if (mahadasha) {
        allDigits.push({ value: mahadasha, source: 'mahadasha' });
    }

    const antardasha = getAntardashaForDate(midYear, antardashaTimeline);
    if (antardasha) {
        allDigits.push({ value: antardasha, source: 'antardasha' });
    }

    return addDigitsToGrid(grid, allDigits);
}

/**
 * Calculate Monthly Grid for a specific month
 */
export function calculateMonthlyGrid(
    dateOfBirth: string,
    rootNumber: number,
    destinyNumber: number,
    year: number,
    month: number, // 0-11
    mahadashaTimeline: MahadashaEntry[],
    antardashaTimeline: AntardashaEntry[],
    pratyantardashaTimeline: YearPratyantardasha[]
): LoShuGrid {
    const natalDigits = extractNatalDigits(dateOfBirth);
    const grid = createEmptyGrid();

    let allDigits = [...natalDigits];

    // Add root if not present
    if (!hasNatalDigit(natalDigits, rootNumber)) {
        allDigits.push({ value: rootNumber, source: 'root' });
    }

    // Add destiny
    allDigits.push({ value: destinyNumber, source: 'destiny' });

    // Get dasha numbers for mid-month (15th)
    const midMonth = new Date(year, month, 15);

    const mahadasha = getMahadashaForDate(midMonth, mahadashaTimeline);
    if (mahadasha) {
        allDigits.push({ value: mahadasha, source: 'mahadasha' });
    }

    const antardasha = getAntardashaForDate(midMonth, antardashaTimeline);
    if (antardasha) {
        allDigits.push({ value: antardasha, source: 'antardasha' });
    }

    const pratyantardasha = getPratyantardashaForDate(midMonth, pratyantardashaTimeline);
    if (pratyantardasha) {
        allDigits.push({ value: pratyantardasha, source: 'pratyantardasha' });
    }

    return addDigitsToGrid(grid, allDigits);
}

/**
 * Month names for display
 */
export const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
