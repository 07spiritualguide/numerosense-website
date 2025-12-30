'use client';

import React from 'react';
import { DigitSource, SOURCE_COLORS, SOURCE_LABELS, SOURCE_BG_COLORS } from '@/lib/loshu-grid';

interface GridLegendProps {
    sources: DigitSource[];
    compact?: boolean;
}

export default function GridLegend({ sources, compact = false }: GridLegendProps) {
    return (
        <div className={`flex flex-wrap gap-2 ${compact ? 'gap-1' : 'gap-3'}`}>
            {sources.map((source) => (
                <div
                    key={source}
                    className={`flex items-center gap-1 ${compact ? 'text-xs' : 'text-sm'}`}
                >
                    <span
                        className={`
                            ${compact ? 'w-3 h-3' : 'w-4 h-4'} 
                            rounded 
                            ${SOURCE_BG_COLORS[source]}
                        `}
                    />
                    <span className={`${SOURCE_COLORS[source]}`}>
                        {SOURCE_LABELS[source]}
                    </span>
                </div>
            ))}
        </div>
    );
}
