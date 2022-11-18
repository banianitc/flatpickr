import {
  clearNode,
  createElement,
  createNumberInput,
  getEventTarget,
} from "./utils/dom";
import { monthToStr } from "./utils/formatting";
import { Locale } from "./types/locale";
import { getDaysInMonth } from "./utils/dates";
import { DayElement } from "./types/instance";

type EventHandler = (e?: any) => void;

type Events<E> = E & {
  [k: string]: undefined | EventHandler;
};

type EventsProp<E> = {
  events?: Events<E>;
};

type CalendarConfig = {
  nextArrow: string;
  prevArrow: string;
  minDate?: Date;
  maxDate?: Date;
  locale: Locale;
  shorthandCurrentMonth: boolean;
  showMonths: number;
  monthSelectorType: "dropdown" | "static";
};

type MonthDropdownOptionProps = {
  monthNum: number;
  short: boolean;
  selected: boolean;
  l10n: Locale;
};
export const MonthDropdownOption = (
  props: MonthDropdownOptionProps
): HTMLOptionElement => {
  const { monthNum, short, l10n, selected } = props;
  const month = createElement<HTMLOptionElement>(
    "option",
    "flatpickr-monthDropdown-month"
  );

  month.value = monthNum.toString();
  month.textContent = monthToStr(monthNum, short, l10n);
  month.tabIndex = -1;

  month.selected = selected;

  return month;
};

type MonthDropdownProps = {
  year: number;
  selectedMonth: number;
  config: CalendarConfig;
  events?: Events<{
    change?: (month: number) => void;
  }>;
};
export const MonthsDropdown = (
  props: MonthDropdownProps
): HTMLSelectElement => {
  const { year, selectedMonth, config } = props;
  let minMonth = 0;
  let maxMonth = 11;

  if (config.minDate && year === config.minDate.getFullYear()) {
    minMonth = config.minDate.getMonth();
  }

  if (config.maxDate && year === config.maxDate.getFullYear()) {
    maxMonth = config.maxDate.getMonth();
  }

  const container = createElement<HTMLSelectElement>(
    "select",
    "flatpickr-monthDropdown-months"
  );
  container.tabIndex = -1;

  const changeHandler = props?.events?.change;
  if (changeHandler) {
    container.addEventListener("change", (e: Event) => {
      const target = getEventTarget(e) as HTMLSelectElement;
      changeHandler(parseInt(target.value));
    });
  }

  container.setAttribute("aria-label", config.locale.monthAriaLabel);
  for (let i = minMonth; i <= maxMonth; i++) {
    container.appendChild(
      MonthDropdownOption({
        monthNum: i,
        short: config.shorthandCurrentMonth,
        selected: selectedMonth === i,
        l10n: config.locale,
      })
    );
  }

  return container;
};

type MonthDisplayProps = {
  month: number;
  config: CalendarConfig;
};
export const MonthDisplay = (props: MonthDisplayProps): HTMLSpanElement => {
  const { month, config } = props;
  const short = config.shorthandCurrentMonth;
  const content = monthToStr(month, short, config.locale) + " ";
  return createElement<HTMLSpanElement>("span", "cur-month", content);
};

type YearInputProps = {
  config: CalendarConfig;
  value: string;
};
export const YearInput = (
  props: YearInputProps
): [HTMLDivElement, HTMLInputElement] => {
  let opts = {};

  if (props.config.minDate) {
    opts["min"] = props.config.minDate.getFullYear().toString();
  }
  if (props.config.maxDate) {
    opts["max"] = props.config.maxDate.getFullYear().toString();
    opts["disabled"] =
      !!props.config.minDate &&
      props.config.minDate.getFullYear() === props.config.maxDate.getFullYear();
  }

  const wrapper = createNumberInput("cur-year", {
    ...opts,
    tabindex: "-1",
    "aria-label": props.config.locale.yearAriaLabel,
    value: props.value,
  });

  const yearElement = wrapper.getElementsByTagName(
    "input"
  )[0] as HTMLInputElement;

  return [wrapper, yearElement];
};

type MonthNavigationEvents = Events<{
  onMonthChange?: (delta: number) => void;
}>;
type MonthNavigationProps = {
  year: number;
  month: number;
  config: CalendarConfig;
  showPicker: boolean;
  hidePrevMonthNav?: boolean;
  hideNextMonthNav?: boolean;
  disablePrevMonthNav?: boolean;
  disableNextMonthNav?: boolean;
  events?: MonthNavigationEvents;
};
export const MonthNavigation = (
  props: MonthNavigationProps
): HTMLDivElement => {
  const {
    month,
    year,
    hideNextMonthNav,
    hidePrevMonthNav,
    disablePrevMonthNav,
    disableNextMonthNav,
    showPicker,
    config,
  } = props;
  const onChange = props.events?.onMonthChange;
  const monthNav = createElement<HTMLDivElement>("div", "flatpickr-months");

  if (!hidePrevMonthNav) {
    const prevMonthNav = createElement<HTMLSpanElement>(
      "span",
      `flatpickr-prev-month ${disablePrevMonthNav ? "flatpickr-disabled" : ""}`
    );
    prevMonthNav.innerHTML = config.prevArrow;
    monthNav.appendChild(prevMonthNav);

    if (!disablePrevMonthNav && onChange) {
      prevMonthNav.addEventListener("click", () => onChange(-1));
    }
  }

  let monthElement = createElement<HTMLDivElement>("div", "flatpickr-month");
  if (showPicker) {
    monthElement.appendChild(
      MonthsDropdown({
        year: year,
        selectedMonth: month,
        config,
        events: {
          change: (selectedMonth: number) => {
            onChange && onChange(selectedMonth - month);
          },
        },
      })
    );
  } else {
    monthElement.appendChild(
      MonthDisplay({
        month,
        config,
      })
    );
  }

  const currentMonth = createElement<HTMLDivElement>(
    "div",
    "flatpickr-current-month"
  );
  currentMonth.appendChild(monthElement);

  const [yearWrapper, yearElement] = YearInput({
    config,
    value: year.toString(),
  });

  monthElement.appendChild(yearWrapper);

  monthNav.appendChild(currentMonth);

  if (!hideNextMonthNav) {
    const nextMonthNav = createElement<HTMLSpanElement>(
      "span",
      `flatpickr-next-month ${disableNextMonthNav ? "flatpickr-disabled" : ""}`
    );
    nextMonthNav.innerHTML = config.nextArrow;

    monthNav.appendChild(nextMonthNav);

    if (!disableNextMonthNav && onChange) {
      nextMonthNav.addEventListener("click", () => onChange(1));
    }
  }

  return monthNav;
};

type RangePosition = "start" | "end" | "middle" | undefined;

type DayProps = EventsProp & {
  date: Date;
  className: string;
  enabled: boolean;
  selected: boolean;
  current?: boolean;
  hidden?: boolean;
  range?: RangePosition;
};
export const Day = (props: DayProps): DayElement => {
  const { date, className, enabled, selected, current, hidden, range } = props;

  const dayElement = createElement<DayElement>(
    "span",
    className,
    date.getDate().toString()
  );

  dayElement.dateObj = date;
  // dayElement.setAttribute(
  //   "aria-label",
  // TODO
  //   self.formatDate(date, self.config.ariaDateFormat)
  // );

  if (hidden) {
    dayElement.classList.add("hidden");
  }

  if (current) {
    dayElement.classList.add("today");
    dayElement.setAttribute("aria-current", "date");
  }

  if (selected) {
    dayElement.classList.add("selected");
  }

  if (!enabled) {
    dayElement.classList.add("flatpickr-disabled");
  }

  switch (range) {
    case "start":
      dayElement.classList.add("startRange");
      break;

    case "end":
      dayElement.classList.add("endRange");
      break;

    case "middle":
      dayElement.classList.add("inRange");
      break;
  }

  return dayElement;
};

type MonthDaysProps = EventsProp & {
  year: number;
  month: number;
  preceedingDays: number;
  followingDays: number;
  l10n: Locale;
  hidePreceeding?: boolean;
  hideFollowing?: boolean;
  isSelected: (date: Date) => boolean;
  rangePosition: (date: Date) => RangePosition;
  isEnabled: (date: Date, timeless: boolean) => boolean;
};
export const MonthDays = (props: MonthDaysProps): HTMLDivElement => {
  const {
    year,
    month,
    preceedingDays,
    followingDays,
    hidePreceeding,
    hideFollowing,
    l10n,
    isSelected,
    rangePosition,
    isEnabled,
  } = props;
  const days = window.document.createDocumentFragment();

  const daysInMonth = getDaysInMonth(month, year, l10n);
  const totalDays = preceedingDays + daysInMonth + followingDays;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(year, month, -preceedingDays + 1 + i);
    const selected = isSelected(date);
    const range = rangePosition(date);

    let classNames = "";
    if (i < preceedingDays) {
      classNames = `prevMonthDay ${hidePreceeding && "hidden"}`;
    } else if (i >= preceedingDays + daysInMonth) {
      classNames = `nextMonthDay ${hideFollowing && "hidden"}`;
    }

    const day = Day({
      date,
      className: `flatpickr-day ${classNames}`,
      enabled: isEnabled(date, true),
      selected,
      range,
    });

    if (props?.events?.onDayCreate) {
      props.events.onDayCreate(day);
    }

    days.appendChild(day);
  }

  const dayContainer = createElement<HTMLDivElement>("div", "dayContainer");
  dayContainer.appendChild(days);

  return dayContainer;
};

type WeekdaysProps = {
  config: CalendarConfig;
};
const Weekdays = (props: WeekdaysProps): HTMLDivElement => {
  const { config } = props;

  const weekdayContainer = createElement<HTMLDivElement>(
    "div",
    "flatpickr-weekdays"
  );

  const container = createElement<HTMLDivElement>(
    "div",
    "flatpickr-weekdaycontainer"
  );

  weekdayContainer.appendChild(container);

  const firstDayOfWeek = config.locale.firstDayOfWeek;
  let weekdays = [...config.locale.weekdays.shorthand];

  if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
    weekdays = [
      ...weekdays.splice(firstDayOfWeek, weekdays.length),
      ...weekdays.splice(0, firstDayOfWeek),
    ];
  }

  container.innerHTML = weekdays
    .map((wd) => `<span class="flatpickr-weekday">${wd}</span>`)
    .join("");

  return weekdayContainer;
};

type CalendarMonthProps = {
  year: number;
  month: number;
  config: CalendarConfig;
  isSelected: (date: Date) => boolean;
  rangePosition: (date: Date) => RangePosition;
  isEnabled: (date: Date, timeless: boolean) => boolean;
  getCalendarMonthDates: (
    year: number,
    month: number,
    l10n: Locale
  ) => {
    preceedingDays: number;
    followingDays: number;
    year: number;
    month: number;
  };
} & EventsProp<{
  onDayCreate?: EventHandler;
  onMonthChange?: (delta: number) => void;
}>;
export const CalendarMonth = (props: CalendarMonthProps): HTMLDivElement => {
  const {
    year,
    month,
    config,
    isSelected,
    rangePosition,
    isEnabled,
    getCalendarMonthDates,
    events,
  } = props;

  const monthContainer = createElement<HTMLDivElement>(
    "div",
    "flatpickr-calendar-month"
  );

  console.log(
    "min date check:",
    config,
    config.minDate &&
      year === config.minDate.getFullYear() &&
      config.minDate.getMonth() === month
  );

  const monthNavigation = MonthNavigation({
    year,
    month,
    config,
    disablePrevMonthNav:
      config.minDate &&
      year === config.minDate.getFullYear() &&
      config.minDate.getMonth() === month,
    disableNextMonthNav:
      config.maxDate &&
      year === config.maxDate.getFullYear() &&
      config.maxDate.getMonth() === month,
    showPicker:
      config.showMonths == 1 && config.monthSelectorType == "dropdown",
    events: {
      onMonthChange: events?.onMonthChange,
    },
  });

  monthContainer.appendChild(monthNavigation);

  const weekdays = Weekdays({ config });

  monthContainer.appendChild(weekdays);

  const monthDays = MonthDays({
    ...getCalendarMonthDates(year, month, config.locale),
    isSelected,
    rangePosition,
    isEnabled,
    l10n: config.locale,
    events: {
      onDayCreate: props.events?.onDayCreate,
    },
  });

  monthContainer.appendChild(monthDays);

  return monthContainer;
};

type CalendarProps = {
  year: number;
  month: number;
  config: CalendarConfig;
  isSelected: (date: Date) => boolean;
  rangePosition: (date: Date) => RangePosition;
  isEnabled: (date: Date, timeless: boolean) => boolean;
  getCalendarMonthDates: (
    year: number,
    month: number,
    l10n: Locale
  ) => {
    preceedingDays: number;
    followingDays: number;
    year: number;
    month: number;
  };
} & EventsProp<{
  onDayCreate?: EventHandler;
  onMonthChange?: (delta: number) => void;
}>;
export const Calendar = (props: CalendarProps): HTMLDivElement => {
  const {
    year,
    month,
    config,
    isSelected,
    getCalendarMonthDates,
    rangePosition,
    isEnabled,
  } = props;
  const container = createElement<HTMLDivElement>("div", "flatpickr-calendar");

  for (let i = 0; i < config.showMonths; i++) {
    const m = (month + i) % 12;
    const y = year + Math.floor((month + i) / 12);

    const singleMonth = CalendarMonth({
      year: y,
      month: m,
      config,
      getCalendarMonthDates,
      isSelected,
      rangePosition,
      isEnabled,
      events: props.events,
    });

    container.appendChild(singleMonth);
  }

  return container;
};
