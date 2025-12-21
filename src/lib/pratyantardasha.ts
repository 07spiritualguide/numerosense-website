/**
 * Pratyantardasha (sub-period) calculation utilities
 * Calculates sub-periods within each Antardasha year
 */

export interface PratyantardashaEntry {
    fromDate: string;
    toDate: string;
    pratyantardasha: number;
}

export interface YearPratyantardasha {
    year: number;
    fromDate: string;
    toDate: string;
    periods: PratyantardashaEntry[];
}

/**
 * Format date as DD MMM YYYY
 */
function formatDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

/**
 * Parse date from DD MMM YYYY format
 */
function parseDate(str: string): Date {
    const months: { [key: string]: number } = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = str.split(' ');
    return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Get next number in sequence (1→2→...→9→1)
 */
function nextNumber(num: number): number {
    return num === 9 ? 1 : num + 1;
}

/**
 * Calculate Pratyantardasha periods for a single year
 * @param birthDay - Day of birth (1-31)
 * @param startDate - Starting date (birthday in that year)
 * @param endDate - Ending date (day before next birthday)
 * @param startingNumber - Antardasha number from previous year
 * @returns Array of Pratyantardasha periods
 */
function calculatePeriodsForYear(
    birthDay: number,
    startDate: Date,
    endDate: Date,
    startingNumber: number
): PratyantardashaEntry[] {
    const periods: PratyantardashaEntry[] = [];

    let currentDate = new Date(startDate);
    let currentNumber = startingNumber;
    let carryDays = birthDay; // First period uses birth day
    let isFirst = true;

    while (currentDate < endDate) {
        // Calculate days for this period
        const multiplied = 8 * currentNumber;
        const totalDays = multiplied + carryDays;

        // Split into 30-day months
        const fullMonths = Math.floor(totalDays / 30);
        carryDays = totalDays % 30;

        // Calculate end date for this period
        const periodDays = fullMonths * 30;
        let periodEndDate = addDays(currentDate, periodDays - 1);

        // Don't go past the year end date
        if (periodEndDate > endDate) {
            periodEndDate = endDate;
        }

        periods.push({
            fromDate: formatDate(currentDate),
            toDate: formatDate(periodEndDate),
            pratyantardasha: currentNumber,
        });

        // Move to next period
        currentDate = addDays(periodEndDate, 1);
        currentNumber = nextNumber(currentNumber);
        isFirst = false;

        // Safety check to prevent infinite loop
        if (periods.length > 50) break;
    }

    return periods;
}

/**
 * Calculate full Pratyantardasha timeline from Antardasha data
 * @param birthDay - Day of birth (1-31)
 * @param antardashaTimeline - Array of Antardasha entries with fromDate, toDate, antardasha
 * @returns Array of yearly Pratyantardasha data
 */
export function calculatePratyantardasha(
    birthDay: number,
    antardashaTimeline: { fromDate: string; toDate: string; antardasha: number }[]
): YearPratyantardasha[] {
    const timeline: YearPratyantardasha[] = [];

    for (let i = 0; i < antardashaTimeline.length; i++) {
        const entry = antardashaTimeline[i];

        // Get previous year's antardasha (for first year, use current year's)
        const prevAntardasha = i === 0
            ? entry.antardasha
            : antardashaTimeline[i - 1].antardasha;

        const startDate = parseDate(entry.fromDate);
        const endDate = parseDate(entry.toDate);
        const year = startDate.getFullYear();

        const periods = calculatePeriodsForYear(
            birthDay,
            startDate,
            endDate,
            prevAntardasha
        );

        timeline.push({
            year,
            fromDate: entry.fromDate,
            toDate: entry.toDate,
            periods,
        });
    }

    return timeline;
}

/**
 * Check if a Pratyantardasha period is currently active
 */
export function isCurrentPratyantardasha(entry: PratyantardashaEntry): boolean {
    if (!entry.fromDate || !entry.toDate) return false;

    const today = new Date();
    const from = parseDate(entry.fromDate);
    const to = parseDate(entry.toDate);

    return today >= from && today <= to;
}

/**
 * Find the current year's Pratyantardasha data
 */
export function getCurrentYearPratyantardasha(timeline: YearPratyantardasha[]): YearPratyantardasha | null {
    const currentYear = new Date().getFullYear();
    return timeline.find(entry => entry.year === currentYear) || null;
}
