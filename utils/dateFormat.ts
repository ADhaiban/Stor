/**
 * Centralized date formatting utilities for the application.
 * All date columns should use these functions for consistency.
 */

const LOCALE = 'ar-EG';

/** Full date + time: "١٩ فبراير ٢٠٢٦ ٠٣:٤٥ ص" */
export const formatLongDateTime = (value: string | null | undefined): string => {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleString(LOCALE, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return '-';
    }
};

/** Short date only: "١٩/٠٢/٢٠٢٦" */
export const formatShortDate = (value: string | null | undefined): string => {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString(LOCALE, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    } catch {
        return '-';
    }
};

/** Medium date: "١٩ فبراير ٢٠٢٦" */
export const formatMediumDate = (value: string | null | undefined): string => {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString(LOCALE, {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return '-';
    }
};

/** Time only: "٠٣:٤٥ ص" */
export const formatTime = (value: string | null | undefined): string => {
    if (!value) return '-';
    try {
        const d = new Date(value);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleTimeString(LOCALE, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return '-';
    }
};
