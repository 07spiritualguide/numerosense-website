/**
 * Antardasha (Yearly) calculation utilities
 * Calculates yearly planetary periods based on birth date
 */

export interface AntardashaEntry {
    fromDate: string;
    toDate: string;
    antardasha: number;
}

/**
 * Day of week to number mapping
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
 * Get day before a date
 */
function dayBefore(date: Date): Date {
    const result = new Date(date);
    result.setDate(result.getDate() - 1);
    return result;
}

/**
 * Reduce a number to a single digit by adding its digits
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
 * Calculate Antardasha for a specific year
 * Formula: (Birth Day digits) + (Birth Month) + (Last 2 digits of Year) + (Day-of-week number)
 */
function calculateAntardashaNumber(
    birthDay: number,
    birthMonth: number,
    targetYear: number
): number {
    const reducedDay = reduceToSingleDigit(birthDay);
    const month = birthMonth;
    const yearDigits = targetYear % 100;

    const date = new Date(targetYear, birthMonth - 1, birthDay);
    const dayOfWeek = date.getDay();
    const dayNumber = DAY_TO_NUMBER[dayOfWeek];

    const total = reducedDay + month + yearDigits + dayNumber;
    return reduceToSingleDigit(total);
}

/**
 * Calculate Antardasha timeline with date ranges
 * Each Antardasha runs from birthday to day before next birthday
 * @param birthDay - Day of birth (1-31)
 * @param birthMonth - Month of birth (1-12)
 * @param birthYear - Year of birth
 * @param yearsToCalculate - How many years into future (default 100)
 * @returns Array of Antardasha entries with date ranges
 */
export function calculateAntardasha(
    birthDay: number,
    birthMonth: number,
    birthYear: number,
    yearsToCalculate: number = 100
): AntardashaEntry[] {
    const timeline: AntardashaEntry[] = [];
    const endYear = birthYear + yearsToCalculate;

    for (let year = birthYear; year <= endYear; year++) {
        // From date = birthday in this year
        const fromDate = new Date(year, birthMonth - 1, birthDay);

        // To date = day before birthday in next year
        const nextBirthday = new Date(year + 1, birthMonth - 1, birthDay);
        const toDate = dayBefore(nextBirthday);

        // Calculate the antardasha number for this year
        const antardasha = calculateAntardashaNumber(birthDay, birthMonth, year);

        timeline.push({
            fromDate: formatDate(fromDate),
            toDate: formatDate(toDate),
            antardasha,
        });
    }

    return timeline;
}

/**
 * Check if a date falls within an Antardasha period
 */
export function isCurrentAntardasha(entry: AntardashaEntry): boolean {
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
