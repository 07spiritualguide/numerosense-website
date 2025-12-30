'use client';

import React from 'react';
import {
    LoShuGrid,
    GridCell,
    ColoredDigit,
    SOURCE_COLORS,
    CELL_VALUES
} from '@/lib/loshu-grid';

interface LoShuGridComponentProps {
    grid: LoShuGrid;
    title?: string;
    compact?: boolean;
}

export default function LoShuGridComponent({ grid, title, compact = false }: LoShuGridComponentProps) {
    const cellSize = compact ? 'w-12 h-12 md:w-14 md:h-14' : 'w-16 h-16 md:w-20 md:h-20';
    const fontSize = compact ? 'text-xs md:text-sm' : 'text-sm md:text-base';

    const renderCellContent = (cell: GridCell) => {
        if (cell.digits.length === 0) {
            return <span className="text-default-300 opacity-30">{CELL_VALUES[cell.position]}</span>;
        }

        // Group digits and render with colors
        return (
            <div className="flex flex-wrap justify-center items-center gap-0">
                {cell.digits.map((digit, idx) => (
                    <span
                        key={idx}
                        className={`${SOURCE_COLORS[digit.source]} font-bold`}
                    >
                        {digit.value}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="inline-block">
            {title && (
                <h3 className={`text-center font-semibold mb-2 ${compact ? 'text-sm' : 'text-base'}`}>
                    {title}
                </h3>
            )}
            <div className="grid grid-cols-3 gap-0.5 bg-default-200 p-0.5 rounded-lg">
                {grid.map((cell, idx) => (
                    <div
                        key={idx}
                        className={`
                            ${cellSize} 
                            ${fontSize}
                            bg-default-100 
                            flex items-center justify-center
                            font-mono
                            ${idx === 0 ? 'rounded-tl-md' : ''}
                            ${idx === 2 ? 'rounded-tr-md' : ''}
                            ${idx === 6 ? 'rounded-bl-md' : ''}
                            ${idx === 8 ? 'rounded-br-md' : ''}
                        `}
                    >
                        {renderCellContent(cell)}
                    </div>
                ))}
            </div>
        </div>
    );
}
