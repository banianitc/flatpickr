import { Locale } from "../types/locale";
import {
  tokenRegex,
  RevFormatFn,
  token,
  revFormat,
  formats,
} from "./formatting";
import { defaults, ParsedOptions } from "../types/options";
import { english } from "../l10n/default";
import { int } from "./index";

export interface FormatterArgs {
  config?: ParsedOptions;
  l10n?: Locale;
  isMobile?: boolean;
}

export const createDateFormatter = (
  { config = defaults, l10n = english, isMobile = false }: FormatterArgs,
  type: "value" | "altValue" = "value"
) => (dateObj: Date, frmt: string, overrideLocale?: Locale): string => {
  const locale = overrideLocale || l10n;

  if (!isMobile) {
    if (config.formatDate !== undefined && type == "value") {
      return config.formatDate(dateObj, frmt, locale);
    }

    if (config.formatAltDate !== undefined && type == "altValue") {
      return config.formatAltDate(dateObj, frmt, locale);
    }
  }

  return frmt
    .split("")
    .map((c, i, arr) =>
      formats[c as token] && arr[i - 1] !== "\\"
        ? formats[c as token](dateObj, locale, config)
        : c !== "\\"
        ? c
        : ""
    )
    .join("");
};

export const createDateParser = ({ config = defaults, l10n = english }) => (
  date: Date | string | number,
  givenFormat?: string,
  timeless?: boolean,
  customLocale?: Locale
): Date | undefined => {
  if (date !== 0 && !date) return undefined;

  const locale = customLocale || l10n;

  let parsedDate: Date | undefined;
  const dateOrig = date;

  if (date instanceof Date) parsedDate = new Date(date.getTime());
  else if (
    typeof date !== "string" &&
    date.toFixed !== undefined // timestamp
  )
    // create a copy

    parsedDate = new Date(date);
  else if (typeof date === "string") {
    // date string
    const format = givenFormat || (config || defaults).dateFormat;
    const datestr = String(date).trim();

    if (datestr === "today") {
      parsedDate = new Date();
      timeless = true;
    } else if (config && config.parseDate) {
      parsedDate = config.parseDate(date, format);
    } else if (
      /Z$/.test(datestr) ||
      /GMT$/.test(datestr) // datestrings w/ timezone
    ) {
      parsedDate = new Date(date);
    } else {
      let matched,
        ops: { fn: RevFormatFn; val: string }[] = [];

      for (let i = 0, matchIndex = 0, regexStr = ""; i < format.length; i++) {
        const token = format[i] as token;
        const isBackSlash = (token as string) === "\\";
        const escaped = format[i - 1] === "\\" || isBackSlash;

        if (tokenRegex[token] && !escaped) {
          regexStr += tokenRegex[token];
          const match = new RegExp(regexStr).exec(date);
          if (match && (matched = true)) {
            ops[token !== "Y" ? "push" : "unshift"]({
              fn: revFormat[token],
              val: match[++matchIndex],
            });
          }
        } else if (!isBackSlash) regexStr += "."; // don't really care
      }

      parsedDate =
        !config || !config.noCalendar
          ? new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0)
          : (new Date(new Date().setHours(0, 0, 0, 0)) as Date);

      ops.forEach(
        ({ fn, val }) =>
          (parsedDate = fn(parsedDate as Date, val, locale) || parsedDate)
      );

      parsedDate = matched ? parsedDate : undefined;
    }
  }

  /* istanbul ignore next */
  if (!(parsedDate instanceof Date && !isNaN(parsedDate.getTime()))) {
    config.errorHandler(new Error(`Invalid date provided: ${dateOrig}`));
    return undefined;
  }

  if (timeless === true) parsedDate.setHours(0, 0, 0, 0);

  return parsedDate;
};

/**
 * Compute the difference in dates, measured in ms
 */
export function compareDates(date1: Date, date2: Date, timeless = true) {
  if (timeless !== false) {
    return (
      new Date(date1.getTime()).setHours(0, 0, 0, 0) -
      new Date(date2.getTime()).setHours(0, 0, 0, 0)
    );
  }

  return date1.getTime() - date2.getTime();
}

/**
 * Compute the difference in times, measured in ms
 */
export function compareTimes(date1: Date, date2: Date) {
  return (
    3600 * (date1.getHours() - date2.getHours()) +
    60 * (date1.getMinutes() - date2.getMinutes()) +
    date1.getSeconds() -
    date2.getSeconds()
  );
}

export const isBetween = (ts: number, ts1: number, ts2: number) => {
  return ts > Math.min(ts1, ts2) && ts < Math.max(ts1, ts2);
};

export const calculateSecondsSinceMidnight = (
  hours: number,
  minutes: number,
  seconds: number
) => {
  return hours * 3600 + minutes * 60 + seconds;
};

export const parseSeconds = (secondsSinceMidnight: number) => {
  const hours = Math.floor(secondsSinceMidnight / 3600),
    minutes = (secondsSinceMidnight - hours * 3600) / 60;
  return [hours, minutes, secondsSinceMidnight - hours * 3600 - minutes * 60];
};

export const duration = {
  DAY: 86400000,
};

export const ampm2military = (hour: number, isPM: boolean): number => {
  return (hour % 12) + 12 * int(isPM);
};

export const military2ampm = (hour: number): number => {
  switch (hour % 24) {
    case 0:
    case 12:
      return 12;

    default:
      return hour % 12;
  }
};

export function getDefaultHours(config: ParsedOptions) {
  let hours = config.defaultHour;
  let minutes = config.defaultMinute;
  let seconds = config.defaultSeconds;

  if (config.minDate !== undefined) {
    const minHour = config.minDate.getHours();
    const minMinutes = config.minDate.getMinutes();
    const minSeconds = config.minDate.getSeconds();

    if (hours < minHour) {
      hours = minHour;
    }

    if (hours === minHour && minutes < minMinutes) {
      minutes = minMinutes;
    }

    if (hours === minHour && minutes === minMinutes && seconds < minSeconds)
      seconds = config.minDate.getSeconds();
  }

  if (config.maxDate !== undefined) {
    const maxHr = config.maxDate.getHours();
    const maxMinutes = config.maxDate.getMinutes();
    hours = Math.min(hours, maxHr);

    if (hours === maxHr) minutes = Math.min(maxMinutes, minutes);
    if (hours === maxHr && minutes === maxMinutes)
      seconds = config.maxDate.getSeconds();
  }

  return { hours, minutes, seconds };
}

export const getDaysInMonth = (month: number, year: number, l10n: Locale) => {
  if (month === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0))
    return 29;

  return l10n.daysInMonth[month];
};

export const getCalendarMonthDates = (
  year: number,
  month: number,
  l10n: Locale
): {
  preceedingDays: number;
  followingDays: number;
  year: number;
  month: number;
} => {
  const firstOfMonth =
    (new Date(year, month, 1).getDay() - l10n.firstDayOfWeek + 7) % 7;

  const daysInMonth = getDaysInMonth(month, year, l10n);
  const daysInLastWeek =
    (firstOfMonth + daysInMonth - 1 + l10n.firstDayOfWeek) % 7;
  const followingDays = (7 - daysInLastWeek) % 7;

  return { preceedingDays: firstOfMonth, followingDays, year, month };
};

/**
 * Returns either `minDate` or current date and time, whichever is later
 */
export const getDefaultDate = (
  config: ParsedOptions,
  withHours?: boolean
): Date => {
  let d: Date;
  if (!config.minDate || compareDates(new Date(), config.minDate) >= 0) {
    d = new Date();
  } else {
    d = new Date(config.minDate.getTime());
  }

  if (withHours) {
    const defaults = getDefaultHours(config);
    d.setHours(
      defaults.hours,
      defaults.minutes,
      defaults.seconds,
      d.getMilliseconds()
    );
  }

  return d;
};

export const getWeek = (givenDate: Date): number => {
  const date = new Date(givenDate.getTime());
  date.setHours(0, 0, 0, 0);

  // Thursday in current week decides the year.
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));

  // January 4 is always in week 1.
  const week1 = new Date(date.getFullYear(), 0, 4);

  // Adjust to Thursday in week 1 and count number of weeks from date to week1.
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};
