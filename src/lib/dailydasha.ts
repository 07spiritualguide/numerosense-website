/**
 * Daily Dasha and Hourly Dasha calculation utilities
 */

import { YearPratyantardasha, PratyantardashaEntry } from './pratyantardasha';

/**
 * Day of week to number mapping (Vaar Number)
 */
const DAY_TO_NUMBER: { [key: number]: number } = {
    0: 1, // Sunday = 1
    1: 2, // Monday = 2
    2: 9, // Tuesday = 9
    3: 5, // Wednesday = 5
    4: 3, // Thursday = 3
    5: 6, // Friday = 6
    6: 8, // Saturday = 8
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Reduce a number to a single digit
 */
function reduceToSingleDigit(num: number): number {
    while (num > 9) {
        num = num
            .toString()
            .split('')
            .reduce((sum, digit) => sum + parseInt(digit), 0);
    }
    return num;
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
 * Find the Pratyantardasha number for a given date
 */
export function findPratyantardashaForDate(
    date: Date,
    pratyantardashaTimeline: YearPratyantardasha[]
): PratyantardashaEntry | null {
    for (const yearData of pratyantardashaTimeline) {
        for (const period of yearData.periods) {
            const fromDate = parseDate(period.fromDate);
            const toDate = parseDate(period.toDate);

            if (date >= fromDate && date <= toDate) {
                return period;
            }
        }
    }
    return null;
}

/**
 * Calculate Daily Dasha for a given date
 * Formula: reduce(Pratyantardasha + Day Number)
 */
export function calculateDailyDasha(
    date: Date,
    pratyantardashaTimeline: YearPratyantardasha[]
): { dailyDasha: number; pratyantardasha: number | null; dayName: string; dayNumber: number } | null {
    const pratyantardashaEntry = findPratyantardashaForDate(date, pratyantardashaTimeline);

    if (!pratyantardashaEntry) {
        return null;
    }

    const dayOfWeek = date.getDay();
    const dayNumber = DAY_TO_NUMBER[dayOfWeek];
    const dayName = DAY_NAMES[dayOfWeek];

    const sum = pratyantardashaEntry.pratyantardasha + dayNumber;
    const dailyDasha = reduceToSingleDigit(sum);

    return {
        dailyDasha,
        pratyantardasha: pratyantardashaEntry.pratyantardasha,
        dayName,
        dayNumber,
    };
}

/**
 * Calculate Hourly Dasha for a given hour
 * Formula: reduce(Daily Dasha + Hour in 12-hour format)
 */
export function calculateHourlyDasha(dailyDasha: number, hour24: number): number {
    // Convert 24-hour to 12-hour format
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    const sum = dailyDasha + hour12;
    return reduceToSingleDigit(sum);
}

/**
 * Get all 24 hours with their Hourly Dasha
 */
export function calculateAllHourlyDasha(dailyDasha: number): { hour: string; hourlyDasha: number }[] {
    const hours: { hour: string; hourlyDasha: number }[] = [];

    for (let h = 0; h < 24; h++) {
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        const hourString = `${hour12}:00 ${ampm}`;

        const hourlyDasha = calculateHourlyDasha(dailyDasha, h);

        hours.push({
            hour: hourString,
            hourlyDasha,
        });
    }

    return hours;
}

/**
 * Format date as DD MMM YYYY
 */
export function formatDateForDisplay(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

/**
 * Check if a specific hour is the current hour
 */
export function isCurrentHour(hourIndex: number): boolean {
    const now = new Date();
    return now.getHours() === hourIndex;
}
