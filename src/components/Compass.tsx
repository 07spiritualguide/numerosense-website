'use client';

import React, { useEffect, useState, useCallback } from 'react';

// Direction degrees mapping
const DIRECTION_DEGREES: { [key: string]: number } = {
    'north': 0, 'n': 0,
    'north-east': 45, 'northeast': 45, 'ne': 45,
    'east': 90, 'e': 90,
    'south-east': 135, 'southeast': 135, 'se': 135,
    'south': 180, 's': 180,
    'south-west': 225, 'southwest': 225, 'sw': 225,
    'west': 270, 'w': 270,
    'north-west': 315, 'northwest': 315, 'nw': 315,
};

// Parse lucky direction string
function parseLuckyDirection(directionString: string | null): { direction: string; degrees: number } | null {
    if (!directionString) return null;
    const cleaned = directionString.toLowerCase().trim();
    if (DIRECTION_DEGREES[cleaned] !== undefined) {
        return { direction: directionString, degrees: DIRECTION_DEGREES[cleaned] };
    }
    const keywords = Object.keys(DIRECTION_DEGREES).sort((a, b) => b.length - a.length);
    for (const keyword of keywords) {
        if (cleaned.includes(keyword)) {
            return { direction: keyword.toUpperCase(), degrees: DIRECTION_DEGREES[keyword] };
        }
    }
    return null;
}

// Get cardinal direction from degrees
function getCardinalDirection(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
}

interface CompassProps {
    luckyDirection: string | null;
    accentColor?: string;
    cardBg?: string;
    gridBg?: string;
    textPrimary?: string;
    textMuted?: string;
    gridBorder?: string;
}

const COMPASS_SIZE = 240;
const OUTER_RING = COMPASS_SIZE / 2;
const LABEL_RING = COMPASS_SIZE / 2 - 50;

export default function Compass({
    luckyDirection,
    accentColor = '#D4A017',
    cardBg = '#FFFEF5',
    gridBg = '#FFFADB',
    textPrimary = '#1a1a1a',
    textMuted = '#5a5a5a',
    gridBorder = '#FFF4B8',
}: CompassProps) {
    const [heading, setHeading] = useState<number | null>(null);
    const [isSupported, setIsSupported] = useState(true);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [isRequesting, setIsRequesting] = useState(false);

    const luckyDir = parseLuckyDirection(luckyDirection);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        const compassHeading = (event as any).webkitCompassHeading;
        if (compassHeading !== undefined && compassHeading !== null) {
            setHeading(compassHeading);
        } else if (event.alpha !== null) {
            setHeading(360 - event.alpha);
        }
    }, []);

    const requestPermission = async () => {
        setIsRequesting(true);
        try {
            if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                const permission = await (DeviceOrientationEvent as any).requestPermission();
                if (permission === 'granted') {
                    window.addEventListener('deviceorientation', handleOrientation, true);
                    setPermissionDenied(false);
                } else {
                    setPermissionDenied(true);
                }
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
        } catch (error) {
            console.error('Error requesting orientation permission:', error);
            setPermissionDenied(true);
        }
        setIsRequesting(false);
    };

    useEffect(() => {
        if (!window.DeviceOrientationEvent) {
            setIsSupported(false);
            return;
        }

        if (typeof (DeviceOrientationEvent as any).requestPermission !== 'function') {
            window.addEventListener('deviceorientation', handleOrientation, true);
            return () => {
                window.removeEventListener('deviceorientation', handleOrientation, true);
            };
        }

        return () => {
            window.removeEventListener('deviceorientation', handleOrientation, true);
        };
    }, [handleOrientation]);

    const luckyAngle = luckyDir ? luckyDir.degrees : null;
    const angleToLucky = heading !== null && luckyAngle !== null
        ? ((luckyAngle - heading + 360) % 360)
        : null;
    const isPointingLucky = angleToLucky !== null && (angleToLucky <= 20 || angleToLucky >= 340);

    // Generate tick marks
    const ticks = [];
    for (let i = 0; i < 360; i += 5) {
        const isMajor = i % 30 === 0;
        const isCardinal = i % 90 === 0;
        ticks.push({ angle: i, isMajor, isCardinal });
    }

    // Cardinal labels
    const cardinals = [
        { label: 'N', deg: 0, isNorth: true },
        { label: 'E', deg: 90, isNorth: false },
        { label: 'S', deg: 180, isNorth: false },
        { label: 'W', deg: 270, isNorth: false },
    ];

    // Intercardinal labels
    const intercardinals = [
        { label: 'NE', deg: 45 },
        { label: 'SE', deg: 135 },
        { label: 'SW', deg: 225 },
        { label: 'NW', deg: 315 },
    ];

    if (!isSupported) {
        return (
            <div
                className="text-center py-8 rounded-2xl"
                style={{ backgroundColor: cardBg, color: textMuted }}
            >
                <p>Compass not supported on this device</p>
            </div>
        );
    }

    if (heading === null && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        return (
            <div
                className="text-center py-8 rounded-2xl"
                style={{ backgroundColor: cardBg }}
            >
                <p style={{ color: textMuted }} className="mb-4">Enable compass to see your lucky direction</p>
                <button
                    onClick={requestPermission}
                    disabled={isRequesting}
                    className="px-6 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: accentColor }}
                >
                    {isRequesting ? 'Requesting...' : 'Enable Compass'}
                </button>
                {permissionDenied && (
                    <p className="text-red-500 mt-4 text-sm">
                        Permission denied. Please enable motion sensors in your browser settings.
                    </p>
                )}
            </div>
        );
    }

    const displayHeading = heading !== null ? Math.round(heading) : '--';
    const rotation = heading !== null ? -heading : 0;

    return (
        <div className="flex flex-col items-center">
            {/* Heading Display */}
            <div className="flex items-baseline gap-2 mb-4">
                <span
                    className="text-4xl font-light"
                    style={{ color: textPrimary }}
                >
                    {displayHeading}°
                </span>
                <span
                    className="text-2xl font-bold"
                    style={{ color: accentColor }}
                >
                    {heading !== null ? getCardinalDirection(heading) : '--'}
                </span>
            </div>

            {/* Compass Body - matching app style */}
            <div
                className="rounded-full p-2"
                style={{
                    width: COMPASS_SIZE + 16,
                    height: COMPASS_SIZE + 16,
                    backgroundColor: cardBg,
                    boxShadow: `0 8px 32px rgba(0,0,0,0.15), 0 0 20px ${accentColor}20`,
                }}
            >
                {/* Outer ring */}
                <div
                    className="w-full h-full rounded-full flex items-center justify-center"
                    style={{
                        border: `3px solid ${accentColor}`,
                        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.1)`,
                    }}
                >
                    {/* Rotating dial */}
                    <div
                        className="relative rounded-full transition-transform duration-150"
                        style={{
                            width: COMPASS_SIZE,
                            height: COMPASS_SIZE,
                            transform: `rotate(${rotation}deg)`,
                            backgroundColor: gridBg,
                        }}
                    >
                        {/* Tick marks */}
                        {ticks.map(({ angle, isMajor, isCardinal }) => {
                            const tickLength = isCardinal ? 15 : (isMajor ? 10 : 5);
                            const tickWidth = isCardinal ? 2 : 1;
                            return (
                                <div
                                    key={angle}
                                    className="absolute left-1/2"
                                    style={{
                                        width: tickWidth,
                                        height: tickLength,
                                        backgroundColor: isCardinal ? accentColor : `${textMuted}60`,
                                        top: 3,
                                        transform: `translateX(-50%) rotate(${angle}deg)`,
                                        transformOrigin: `50% ${OUTER_RING - 3}px`,
                                    }}
                                />
                            );
                        })}

                        {/* Cardinal labels */}
                        {cardinals.map(({ label, deg, isNorth }) => {
                            const rad = (deg - 90) * (Math.PI / 180);
                            const x = Math.cos(rad) * LABEL_RING;
                            const y = Math.sin(rad) * LABEL_RING;
                            const isLucky = luckyDir && deg === luckyDir.degrees;

                            return (
                                <div
                                    key={label}
                                    className="absolute flex items-center justify-center"
                                    style={{
                                        left: `calc(50% + ${x}px - 15px)`,
                                        top: `calc(50% + ${y}px - 15px)`,
                                        width: 30,
                                        height: 30,
                                    }}
                                >
                                    {isLucky ? (
                                        <span
                                            className="px-2 py-1 rounded text-white text-sm font-bold"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {label}
                                        </span>
                                    ) : (
                                        <span
                                            className="text-xl font-bold"
                                            style={{ color: isNorth ? accentColor : textPrimary }}
                                        >
                                            {label}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Intercardinal labels */}
                        {intercardinals.map(({ label, deg }) => {
                            const rad = (deg - 90) * (Math.PI / 180);
                            const radius = LABEL_RING - 5;
                            const x = Math.cos(rad) * radius;
                            const y = Math.sin(rad) * radius;
                            const isLucky = luckyDir && deg === luckyDir.degrees;

                            return (
                                <div
                                    key={label}
                                    className="absolute flex items-center justify-center"
                                    style={{
                                        left: `calc(50% + ${x}px - 15px)`,
                                        top: `calc(50% + ${y}px - 12px)`,
                                        width: 30,
                                        height: 24,
                                    }}
                                >
                                    {isLucky ? (
                                        <span
                                            className="px-2 py-1 rounded text-white text-xs font-bold"
                                            style={{ backgroundColor: accentColor }}
                                        >
                                            {label}
                                        </span>
                                    ) : (
                                        <span
                                            className="text-sm font-semibold"
                                            style={{ color: textMuted }}
                                        >
                                            {label}
                                        </span>
                                    )}
                                </div>
                            );
                        })}

                        {/* Center decoration - matching app */}
                        <div
                            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: gridBorder }}
                        >
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: accentColor }}
                            />
                        </div>
                    </div>

                    {/* Fixed needle - matching app exactly */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bottom-46">
                        {/* Top needle (accent color) */}
                        <div
                            className="absolute rounded-t"
                            style={{
                                width: 6,
                                height: 55,
                                backgroundColor: accentColor,
                                top: `calc(50% - 60px)`,
                            }}
                        />
                        {/* Bottom needle (muted) */}
                        <div
                            className="absolute rounded-b"
                            style={{
                                width: 6,
                                height: 55,
                                backgroundColor: textMuted,
                                bottom: `calc(50% - 60px)`,
                            }}
                        />
                        {/* Needle cap - matching app */}
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{
                                backgroundColor: cardBg,
                                border: `3px solid ${accentColor}`,
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Lucky Direction Info - matching app style */}
            {luckyDir && (
                <div
                    className="mt-5 px-6 py-4 rounded-xl border text-center w-full max-w-xs"
                    style={{
                        backgroundColor: isPointingLucky ? `${accentColor}15` : gridBg,
                        borderColor: isPointingLucky ? accentColor : gridBorder,
                    }}
                >
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: accentColor }}
                        />
                        <span className="text-sm" style={{ color: textMuted }}>
                            Your Lucky Direction:
                        </span>
                    </div>
                    <p
                        className="text-xl font-bold"
                        style={{ color: isPointingLucky ? accentColor : textPrimary }}
                    >
                        {luckyDir.direction.toUpperCase()}
                        {isPointingLucky && ' ✓ Aligned!'}
                    </p>
                    {!isPointingLucky && angleToLucky !== null && (
                        <p className="text-sm mt-1" style={{ color: textMuted }}>
                            Turn {angleToLucky > 180 ? 'left' : 'right'} {Math.round(angleToLucky > 180 ? 360 - angleToLucky : angleToLucky)}° to align
                        </p>
                    )}
                </div>
            )}

            {/* Desktop message */}
            {heading === null && typeof (DeviceOrientationEvent as any).requestPermission !== 'function' && (
                <p className="text-sm mt-4 text-center" style={{ color: textMuted }}>
                    Open on a mobile device to use the compass
                </p>
            )}
        </div>
    );
}
