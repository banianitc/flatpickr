import { Locale } from "../types/locale";
import { ParsedOptions } from "../types/options";
export interface FormatterArgs {
    config?: ParsedOptions;
    l10n?: Locale;
    isMobile?: boolean;
}
export declare const createDateFormatter: ({ config, l10n, isMobile }: FormatterArgs, type?: "value" | "altValue") => (dateObj: Date, frmt: string, overrideLocale?: Locale | undefined) => string;
export declare const createDateParser: ({ config, l10n }: {
    config?: ParsedOptions | undefined;
    l10n?: Locale | undefined;
}) => (date: Date | string | number, givenFormat?: string | undefined, timeless?: boolean | undefined, customLocale?: Locale | undefined) => Date | undefined;
export declare function compareDates(date1: Date, date2: Date, timeless?: boolean): number;
export declare function compareTimes(date1: Date, date2: Date): number;
export declare const isBetween: (ts: number, ts1: number, ts2: number) => boolean;
export declare const calculateSecondsSinceMidnight: (hours: number, minutes: number, seconds: number) => number;
export declare const parseSeconds: (secondsSinceMidnight: number) => number[];
export declare const duration: {
    DAY: number;
};
export declare const ampm2military: (hour: number, isPM: boolean) => number;
export declare const military2ampm: (hour: number) => number;
export declare function getDefaultHours(config: ParsedOptions): {
    hours: number;
    minutes: number;
    seconds: number;
};
export declare const getDaysInMonth: (month: number, year: number, l10n: Locale) => number;
export declare const getCalendarMonthDates: (year: number, month: number, l10n: Locale) => {
    preceedingDays: number;
    followingDays: number;
    year: number;
    month: number;
};
export declare const getDefaultDate: (config: ParsedOptions, withHours?: boolean | undefined) => Date;
export declare const getWeek: (givenDate: Date) => number;
