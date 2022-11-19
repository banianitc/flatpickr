import { createElement, createNumberInput, getEventTarget } from "./utils/dom";
import { monthToStr } from "./utils/formatting";
import { Locale } from "./types/locale";
import { getDaysInMonth, military2ampm } from "./utils/dates";
import { DayElement } from "./types/instance";
import { IncrementEvent, int } from "./utils";

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
  mode: "single" | "multiple" | "range" | "time";
  animate: boolean;
  static: boolean;
  inline: boolean;
  enableTime: boolean;
  time_24hr: boolean;
  hourIncrement: number;
  minuteIncrement: number;
  enableSeconds: boolean;
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
  year: number;
  events?: Events<{
    onYearChange?: (newYear: number) => void;
  }>;
};
export const YearInput = (props: YearInputProps): HTMLDivElement => {
  const { events, year } = props;

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

  const onInput = (e: KeyboardEvent & IncrementEvent) => {
    console.log("event:", e);
    const eventTarget = getEventTarget(e) as HTMLInputElement;
    const newYear = parseInt(eventTarget.value) + (e.delta || 0);

    if (
      newYear / 1000 > 1 ||
      (e.key === "Enter" && !/[^\d]/.test(newYear.toString()))
    ) {
      events?.onYearChange && events.onYearChange(newYear);
    }
  };

  const wrapper = createNumberInput(
    "cur-year",
    {
      ...opts,
      tabindex: "-1",
      "aria-label": props.config.locale.yearAriaLabel,
      value: year.toString(),
    },
    {
      onIncrement: () => events?.onYearChange && events.onYearChange(year + 1),
      onDecrement: () => events?.onYearChange && events.onYearChange(year - 1),
      onInput,
    }
  );

  return wrapper;
};

type MonthNavigationEvents = Events<{
  onMonthChange?: (delta: number) => void;
  onYearChange?: (newYear: number) => void;
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

  const prevMonthNav = createElement<HTMLSpanElement>(
    "span",
    `flatpickr-prev-month ${disablePrevMonthNav ? "flatpickr-disabled" : ""} ${
      hidePrevMonthNav ? "hidden" : ""
    }`
  );
  prevMonthNav.innerHTML = config.prevArrow;
  monthNav.appendChild(prevMonthNav);

  if (!disablePrevMonthNav && onChange) {
    prevMonthNav.addEventListener("click", () => onChange(-1));
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

  const yearWrapper = YearInput({
    config,
    year,
    events: {
      onYearChange: props.events?.onYearChange,
    },
  });

  monthElement.appendChild(yearWrapper);

  monthNav.appendChild(currentMonth);

  const nextMonthNav = createElement<HTMLSpanElement>(
    "span",
    `flatpickr-next-month ${disableNextMonthNav ? "flatpickr-disabled" : ""} ${
      hideNextMonthNav ? "hidden" : ""
    }`
  );
  nextMonthNav.innerHTML = config.nextArrow;

  monthNav.appendChild(nextMonthNav);

  if (!disableNextMonthNav && onChange) {
    nextMonthNav.addEventListener("click", () => onChange(1));
  }

  return monthNav;
};

type RangePosition = "start" | "end" | "middle" | undefined;

type DayProps = {
  date: Date;
  className: string;
  enabled: boolean;
  selected: boolean;
  current?: boolean;
  hidden?: boolean;
  range?: RangePosition;
  events?: Events<{
    click?: (d: Date) => void;
  }>;
};
export const Day = (props: DayProps): DayElement => {
  const {
    date,
    className,
    enabled,
    selected,
    current,
    hidden,
    range,
    events,
  } = props;
  const onClick = events?.click;

  const dayElement = createElement<DayElement>(
    "span",
    className,
    date.getDate().toString()
  );

  if (onClick) {
    dayElement.addEventListener("click", () => onClick(date));
  }

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

type MonthDaysProps = {
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
  events?: Events<{
    onDateSelect?: (d: Date) => void;
  }>;
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
      events: {
        click: props.events?.onDateSelect,
      },
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
  hidePrevMonthNav?: boolean;
  hideNextMonthNav?: boolean;
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
  onYearChange?: (newYear: number) => void;
  onDateSelect?: (d: Date) => void;
}>;
export const CalendarMonth = (props: CalendarMonthProps): HTMLDivElement => {
  const {
    year,
    month,
    hidePrevMonthNav,
    hideNextMonthNav,
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

  const monthNavigation = MonthNavigation({
    year,
    month,
    hidePrevMonthNav,
    hideNextMonthNav,
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
      onYearChange: events?.onYearChange,
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
      onDateSelect: events?.onDateSelect,
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
  onYearChange?: (newYear: number) => void;
  onDateSelect?: (d: Date) => void;
}>;
export const Calendar = (props: CalendarProps): DocumentFragment => {
  const {
    year,
    month,
    config,
    isSelected,
    getCalendarMonthDates,
    rangePosition,
    isEnabled,
  } = props;

  const fragment = document.createDocumentFragment();

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
      hidePrevMonthNav: i != 0,
      hideNextMonthNav: i != config.showMonths - 1,
      events: props.events,
    });

    fragment.appendChild(singleMonth);
  }

  //   fragment.appendChild(buildTime());

  return fragment;
};
type CalendarContainerProps = {
  config: CalendarConfig;
};
export const CalendarContainer = (
  props: CalendarContainerProps
): HTMLDivElement => {
  const { config } = props;
  const classNames: string[] = [];
  if (config.mode === "range") {
    classNames.push("rangeMode");
  }

  if (config.showMonths > 1) {
    classNames.push("multiMonth");
  }

  if (config.animate) {
    classNames.push("animate");
  }

  if (config.inline) {
    classNames.push("inline");
  } else if (config.static) {
    classNames.push("static");
  }

  if (config.enableTime) {
    classNames.push("hasTime");
  }

  const container = createElement<HTMLDivElement>(
    "div",
    `flatpickr-calendar ${classNames.join(" ")}`
  );

  return container;
};

type TimePickerProps = {
  config: CalendarConfig;
  value?: {
    hours?: number;
    minutes?: number;
    seconds?: number;
  };
  events?: Events<{
    onTimeUpdate?: (deltaSeconds: number) => void;
  }>;
};
export const TimePicker = (props: TimePickerProps): HTMLDivElement => {
  const { config, events } = props;
  const value = {
    hours: props.value?.hours || 0,
    minutes: props.value?.minutes || 0,
    seconds: props.value?.seconds || 0,
  };
  const onUpdate = events?.onTimeUpdate || (() => {});
  const halfDay = 12 * 60 * 60;
  const multipliers = {
    hours: 60 * 60,
    minutes: 60,
    seconds: 1,
  };

  const isPM = value.hours > 11;
  if (!config.time_24hr) {
    value.hours = military2ampm(value.hours);
  }

  const container = createElement<HTMLDivElement>(
    "div",
    `flatpickr-time ${config.time_24hr ? "time24hr" : ""}`
  );
  container.tabIndex = -1;

  const separator = createElement("span", "flatpickr-time-separator", ":");

  const onInput = (type: "hours" | "minutes" | "seconds") => {
    const multiplier = multipliers[type];
    return (e: KeyboardEvent | IncrementEvent | FocusEvent) => {
      const eventTarget = getEventTarget(e) as HTMLInputElement;
      const newValue = parseInt(eventTarget.value) + (e.delta || 0);

      if (
        e.type === "blur" ||
        (e.key === "Enter" && !/[^\d]/.test(newValue.toString()))
      ) {
        events?.onTimeUpdate &&
          events.onTimeUpdate((newValue - value[type]) * multiplier);
      }
    };
  };
  const onIncrement = (type: "hours" | "minutes" | "seconds") => {
    return () => {
      events?.onTimeUpdate && events.onTimeUpdate(multipliers[type]);
    };
  };
  const onDecrement = (type: "hours" | "minutes" | "seconds") => {
    return () => {
      events?.onTimeUpdate && events.onTimeUpdate(-multipliers[type]);
    };
  };

  const hourInput = createNumberInput(
    "flatpickr-hour",
    {
      "aria-label": config.locale.hourAriaLabel,
      value: value.hours,
      min: config.time_24hr ? 0 : 1,
      max: config.time_24hr ? 23 : 12,
      step: config.hourIncrement,
      maxlength: 2,
    },
    {
      onInput: onInput("hours"),
      onIncrement: onIncrement("hours"),
      onDecrement: onDecrement("hours"),
    }
  );

  const minuteInput = createNumberInput(
    "flatpickr-minute",
    {
      "aria-label": config.locale.minuteAriaLabel,
      value: value.minutes,
      min: 0,
      max: 59,
      step: config.minuteIncrement,
      maxlength: 2,
    },
    {
      onInput: onInput("minutes"),
      onIncrement: onIncrement("minutes"),
      onDecrement: onDecrement("minutes"),
    }
  );

  container.appendChild(hourInput);
  container.appendChild(separator);
  container.appendChild(minuteInput);

  let secondInput: HTMLDivElement;
  if (config.enableSeconds) {
    container.classList.add("hasSeconds");

    secondInput = createNumberInput(
      "flatpickr-second",
      {
        "aria-label": config.locale.minuteAriaLabel,
        value: value.seconds,
        min: 0,
        max: 59,
        step: config.minuteIncrement,
        maxlength: 2,
      },
      {
        onInput: onInput("seconds"),
        onIncrement: onIncrement("seconds"),
        onDecrement: onDecrement("seconds"),
      }
    );

    container.appendChild(
      createElement("span", "flatpickr-time-separator", ":")
    );
    container.appendChild(secondInput);
  }

  if (!config.time_24hr) {
    const ampmInput = createElement<HTMLButtonElement>(
      "button",
      "flatpickr-am-pm",
      config.locale.amPM[int(isPM)]
    );
    ampmInput.title = config.locale.toggleTitle;
    ampmInput.tabIndex = -1;

    ampmInput.addEventListener("click", () =>
      onUpdate(isPM ? -halfDay : halfDay)
    );

    container.appendChild(ampmInput);
  }

  return container;
};
