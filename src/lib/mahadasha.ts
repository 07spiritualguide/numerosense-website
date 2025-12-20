/**
 * Mahadasha calculation utilities
 * Calculates planetary periods based on Root Number and birth year
 */

export interface MahadashaEntry {
    year: number;
    number: number;
}

/**
 * Calculate Mahadasha timeline from birth year
 * @param birthYear - The year of birth
 * @param rootNumber - The root number (1-9)
 * @param yearsToCalculate - How many years into future (default 100)
 * @returns Array of {year, number} entries
 */
export function calculateMahadasha(
    birthYear: number,
    rootNumber: number,
    yearsToCalculate: number = 100
): MahadashaEntry[] {
    const timeline: MahadashaEntry[] = [];

    let currentYear = birthYear;
    let currentNumber = rootNumber;
    const endYear = birthYear + yearsToCalculate;

    while (currentYear <= endYear) {
        timeline.push({
            year: currentYear,
            number: currentNumber,
        });

        // Move to next year: current year + duration (which equals current number)
        currentYear += currentNumber;

        // Move to next number in sequence (1→2→3→...→9→1→2→...)
        currentNumber = currentNumber === 9 ? 1 : currentNumber + 1;
    }

    return timeline;
}

/**
 * Find which Mahadasha is active for a given year
 * @param timeline - The Mahadasha timeline
 * @param targetYear - The year to check
 * @returns The Mahadasha entry for that year, or null
 */
export function getMahadashaForYear(
    timeline: MahadashaEntry[],
    targetYear: number
): MahadashaEntry | null {
    // Find the Mahadasha that contains the target year
    for (let i = timeline.length - 1; i >= 0; i--) {
        if (timeline[i].year <= targetYear) {
            return timeline[i];
        }
    }
    return null;
}

/**
 * Expand timeline to show every year with its Mahadasha
 * @param timeline - The Mahadasha timeline with start years
 * @param endYear - The last year to include
 * @returns Array with one entry per year
 */
export function expandTimeline(
    timeline: MahadashaEntry[],
    endYear: number
): MahadashaEntry[] {
    const expanded: MahadashaEntry[] = [];

    for (let i = 0; i < timeline.length; i++) {
        const startYear = timeline[i].year;
        const nextStartYear = timeline[i + 1]?.year ?? endYear + 1;

        for (let year = startYear; year < nextStartYear && year <= endYear; year++) {
            expanded.push({
                year,
                number: timeline[i].number,
            });
        }
    }

    return expanded;
}
