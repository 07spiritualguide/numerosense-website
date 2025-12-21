/**
 * Mahadasha calculation utilities
 * Calculates planetary periods based on Root Number and birth date
 */

export interface MahadashaEntry {
    fromDate: string;
    toDate: string;
    number: number;
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
 * Get date X years after a given date
 */
function addYears(date: Date, years: number): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
}

/**
 * Get day before a date
 */
function dayBefore(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - 1);
    return result;
}

/**
 * Calculate Mahadasha timeline with date ranges
 * @param birthDay - Day of birth (1-31)
 * @param birthMonth - Month of birth (1-12)
 * @param birthYear - Year of birth
 * @param rootNumber - The root number (1-9)
 * @param yearsToCalculate - How many years into future (default 100)
 * @returns Array of {fromDate, toDate, number} entries
 */
export function calculateMahadasha(
    birthDay: number,
    birthMonth: number,
    birthYear: number,
    rootNumber: number,
    yearsToCalculate: number = 100
): MahadashaEntry[] {
    const timeline: MahadashaEntry[] = [];

    // Start from birthday
    let currentDate = new Date(birthYear, birthMonth - 1, birthDay);
    let currentNumber = rootNumber;
    const endYear = birthYear + yearsToCalculate;

    while (currentDate.getFullYear() <= endYear) {
        // From date is current date
        const fromDate = new Date(currentDate);

        // Duration = current number in years
        const duration = currentNumber;

        // To date is (fromDate + duration years - 1 day)
        const nextDate = addYears(fromDate, duration);
        const toDate = dayBefore(nextDate);

        timeline.push({
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            number: currentNumber,
        });

        // Move to next period
        currentDate = nextDate;

        // Move to next number in sequence (1→2→3→...→9→1→2→...)
        currentNumber = currentNumber === 9 ? 1 : currentNumber + 1;
    }

    return timeline;
}

/**
 * Check if a date falls within a Mahadasha period
 */
export function isCurrentMahadasha(entry: MahadashaEntry): boolean {
    if (!entry.fromDate || !entry.toDate) return false;

    const today = new Date();
    const parseDate = (str: string): Date => {
        const months: { [key: string]: number } = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const parts = str.split(' ');
        return new Date(parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
    };

    const from = parseDate(entry.fromDate);
    const to = parseDate(entry.toDate);

    return today >= from && today <= to;
}

// Legacy function for backward compatibility - no longer used
export function expandTimeline(
    timeline: MahadashaEntry[],
    endYear: number
): MahadashaEntry[] {
    return timeline;
}
