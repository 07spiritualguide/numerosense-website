/**
 * Numerology data based on Destiny Number (1-9)
 * Contains Lord, Zodiac, Traits, Lucky elements, Professions
 */

export interface NumerologyData {
    lord: string;
    zodiac_sign: string;
    positive_traits: string[];
    negative_traits: string[];
    lucky_dates: string[];
    favorable_days: string[];
    lucky_color: string;
    lucky_direction: string;
    favorable_alphabets: string[];
    favourable_profession: string[];
}

export const NUMEROLOGY_DATA: { [key: number]: NumerologyData } = {
    1: {
        lord: "Sun",
        zodiac_sign: "Leo",
        positive_traits: [
            "Very courageous",
            "Make friends easily",
            "Very determined",
            "Physically strong",
            "Good decision maker",
            "Straight forward"
        ],
        negative_traits: [
            "Should save money",
            "Should not be stubborn",
            "Should not trust people easily",
            "Should get health check up regularly",
            "Should not indulge in extra marital affairs"
        ],
        lucky_dates: ["1", "10", "19", "28"],
        favorable_days: ["Sunday", "Monday"],
        lucky_color: "Yellow, Golden Yellow, Orange",
        lucky_direction: "East",
        favorable_alphabets: ["A", "I", "S"],
        favourable_profession: [
            "Government Job",
            "Surgeons",
            "Science related Field",
            "Gold Jewellery Trading",
            "Administration Job"
        ]
    },
    2: {
        lord: "Moon",
        zodiac_sign: "Cancer",
        positive_traits: [
            "Soft spoken",
            "Romantic by nature",
            "Mental ability stronger than physical strength",
            "Lack of confidence",
            "Need support all the time",
            "Married life stressed"
        ],
        negative_traits: [
            "Should not be hasty",
            "Never leave any work uncompleted",
            "Should control their temper",
            "Should not get very emotional",
            "Have stomach related problems like gastric issues or constipation",
            "Be careful in making friends"
        ],
        lucky_dates: ["2", "11", "20", "29"],
        favorable_days: ["Sunday", "Monday"],
        lucky_color: "Light green, White, Cream (Avoid: Black, Purple)",
        lucky_direction: "North West",
        favorable_alphabets: ["B", "K", "T"],
        favourable_profession: [
            "Media",
            "Travel Industry",
            "Architecture",
            "Hotel and Hospitality",
            "Dairy",
            "Work related water (ocean)"
        ]
    },
    3: {
        lord: "Jupiter",
        zodiac_sign: "Sagittarius, Pisces",
        positive_traits: [
            "Likes Discipline",
            "Likes luxuries and spends for it",
            "They are independent people",
            "Sometimes behave like a dictator",
            "Straight forward, Ambitious",
            "Bit selfish",
            "Get depressed easily"
        ],
        negative_traits: [
            "Should not spend much",
            "Beware of people who cajole lot",
            "Have to save something for future",
            "Are prone to stomach related disorder or skin problems",
            "Should eat fruits daily",
            "Avoid spicy food"
        ],
        lucky_dates: ["3", "12", "21", "30"],
        favorable_days: ["Tuesday", "Thursday", "Friday"],
        lucky_color: "Yellow, Light Pink, Purple",
        lucky_direction: "North East",
        favorable_alphabets: ["C", "I", "U"],
        favourable_profession: [
            "Education",
            "Occult Business",
            "Banking Sector",
            "Artist",
            "Religious work"
        ]
    },
    4: {
        lord: "Rahu",
        zodiac_sign: "Capricorn",
        positive_traits: [
            "Life is full of surprises",
            "Have to struggle a lot",
            "Do not share their secrets",
            "Fail to save money",
            "Like to work towards social reforms",
            "Low decision power"
        ],
        negative_traits: [
            "Do not spend much, Save for later",
            "Control your temper",
            "Take care of blood pressure",
            "Stop criticizing people",
            "Do not trust anyone while traveling",
            "Take care of skin related problem and cold"
        ],
        lucky_dates: ["4", "13", "22", "31"],
        favorable_days: ["Saturday", "Sunday"],
        lucky_color: "Metallic Blue, Khakee, Brown, Grey",
        lucky_direction: "South West",
        favorable_alphabets: ["D", "M", "V"],
        favourable_profession: [
            "Journalism",
            "Transport",
            "Accounts",
            "Politics",
            "Sales"
        ]
    },
    5: {
        lord: "Mercury",
        zodiac_sign: "Gemini, Virgo",
        positive_traits: [
            "Very active, Very brilliant",
            "Can learn by invention and discoveries",
            "Have more than 1 income source",
            "May be interested in share market",
            "Have wish talking ability"
        ],
        negative_traits: [
            "Do not be friends who are pessimist",
            "May have BP or nerves problem",
            "Should have balanced diet",
            "Avoid excess use of salt",
            "Should take care of vitamins and other necessary nutrients"
        ],
        lucky_dates: ["5", "14", "23"],
        favorable_days: ["Wednesday", "Friday"],
        lucky_color: "Green, White (Avoid Dark Shades)",
        lucky_direction: "North",
        favorable_alphabets: ["E", "N", "W"],
        favourable_profession: [
            "Doctor",
            "Big Business man",
            "Astrologer",
            "CA",
            "Teacher"
        ]
    },
    6: {
        lord: "Venus",
        zodiac_sign: "Libra, Taurus",
        positive_traits: [
            "They are always friendly with 3, 6, 9",
            "They keep their assets very judiciously with their credit",
            "Loves to look beautiful",
            "They can sacrifice anything for the one they love",
            "Do not appreciate any person when they get angry"
        ],
        negative_traits: [
            "Should not be stubborn",
            "Should not get addicted",
            "Should not have spicy food",
            "Should try to understand others"
        ],
        lucky_dates: ["6", "15", "24"],
        favorable_days: ["Wednesday", "Friday"],
        lucky_color: "White, Pastel shades, Pink, Blue",
        lucky_direction: "South East",
        favorable_alphabets: ["F", "X", "O"],
        favourable_profession: [
            "Art related field",
            "Fashion",
            "Music",
            "Business",
            "Designing (Fashion)",
            "Bollywood"
        ]
    },
    7: {
        lord: "Ketu",
        zodiac_sign: "Pisces",
        positive_traits: [
            "Independent nature",
            "Magnetic personality",
            "Can be good poet or writer",
            "Can excel in import export",
            "Women want to explore everything possible",
            "Can become more intuitive towards spirituality"
        ],
        negative_traits: [
            "Avoid smoking and drinking",
            "Should not be too emotional",
            "Should do some physical work",
            "Should do meditation",
            "Stomach related problems",
            "Should be taken care"
        ],
        lucky_dates: ["7", "16", "25"],
        favorable_days: ["Sunday", "Monday"],
        lucky_color: "White, Light green, Shaded clothes",
        lucky_direction: "North East",
        favorable_alphabets: ["G", "P", "Y"],
        favourable_profession: [
            "Astrology",
            "Politics",
            "Drawing",
            "Detective",
            "Religious professions"
        ]
    },
    8: {
        lord: "Saturn",
        zodiac_sign: "Aquarius, Capricorn",
        positive_traits: [
            "People are often misunderstood",
            "Either these people are too successful or bad failures",
            "They do not leave the task incomplete",
            "They have extreme nature",
            "Superstitious",
            "Not bother about any arguments",
            "Because of Saturn, always worried about future",
            "Can do anything to earn money but never misuse money"
        ],
        negative_traits: [
            "Listen to others advice",
            "Avoid any kind of addiction",
            "Do not go for extra marital affairs",
            "Do not indulge in bad means to earn money",
            "Do not hide anything from your partner"
        ],
        lucky_dates: ["8", "17", "26"],
        favorable_days: ["Saturday"],
        lucky_color: "Dark Brown, Black, Blue (Avoid light colors)",
        lucky_direction: "West",
        favorable_alphabets: ["H", "Q", "Z"],
        favourable_profession: [
            "Engineer",
            "Sportsperson",
            "Iron or Coal related work",
            "Government Job",
            "Contractor"
        ]
    },
    9: {
        lord: "Mars",
        zodiac_sign: "Aries, Scorpio",
        positive_traits: [
            "Get angry, Very impulsive",
            "They shine out in crowd",
            "Love to show off",
            "Marital life full of arguments",
            "Do not tolerate any one's interference",
            "They like discipline"
        ],
        negative_traits: [
            "Should keep low profile when time is not favorable",
            "Control on temper",
            "Beware of accidents",
            "Take care of family",
            "Beware of people around you"
        ],
        lucky_dates: ["9", "18", "27"],
        favorable_days: ["Tuesday", "Thursday", "Friday"],
        lucky_color: "Red, Dark Pink",
        lucky_direction: "South",
        favorable_alphabets: ["I", "R"],
        favourable_profession: [
            "Military",
            "Manufacturing",
            "Property Dealing",
            "Police",
            "Engineer",
            "Business",
            "Medicine"
        ]
    }
};

/**
 * Get numerology data for a destiny number
 */
export function getNumerologyDataForDestiny(destinyNumber: number): NumerologyData | null {
    return NUMEROLOGY_DATA[destinyNumber] || null;
}
