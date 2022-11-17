import { createElement, createNumberInput, getEventTarget } from "./utils/dom";
import { monthToStr } from "./utils/formatting";
import { Locale } from "./types/locale";

type Events = {
  [k: string]: (e?: any) => void;
};

type EventsProp = {
  events?: Events;
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

type MonthDropdownProps = EventsProp & {
  year: number;
  selectedMonth: number;
  minDate?: Date;
  maxDate?: Date;
  l10n: Locale;
  short: boolean;
};
export const MonthsDropdown = (
  props: MonthDropdownProps
): HTMLSelectElement => {
  const { year, l10n, selectedMonth, short } = props;
  let minMonth = 0;
  let maxMonth = 11;

  if (props.minDate && year === props.minDate.getFullYear()) {
    minMonth = props.minDate.getMonth();
  }

  if (props.maxDate && year === props.maxDate.getFullYear()) {
    maxMonth = props.maxDate.getMonth();
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
      changeHandler(target.value);
    });
  }

  container.setAttribute("aria-label", l10n.monthAriaLabel);
  for (let i = minMonth; i <= maxMonth; i++) {
    container.appendChild(
      MonthDropdownOption({
        monthNum: i,
        short,
        selected: selectedMonth === i,
        l10n,
      })
    );
  }

  return container;
};

type MonthDisplayProps = {
  month: number;
  short: boolean;
  l10n: Locale;
};
export const MonthDisplay = (props: MonthDisplayProps): HTMLSpanElement => {
  const { month, short, l10n } = props;
  const content = monthToStr(month, short, l10n) + " ";
  return createElement<HTMLSpanElement>("span", "cur-month", content);
};

type YearInputProps = EventsProp & {
  minDate?: Date;
  maxDate?: Date;
  l10n: Locale;
  value: string;
};
export const YearInput = (
  props: YearInputProps
): [HTMLDivElement, HTMLInputElement] => {
  const { l10n } = props;
  let opts = {};

  if (props.minDate) {
    opts["min"] = props.minDate.getFullYear().toString();
  }
  if (props.maxDate) {
    opts["max"] = props.maxDate.getFullYear().toString();
    opts["disabled"] =
      !!props.minDate &&
      props.minDate.getFullYear() === props.maxDate.getFullYear();
  }

  const wrapper = createNumberInput("cur-year", {
    ...opts,
    tabindex: "-1",
    "aria-label": l10n.yearAriaLabel,
    value: props.value,
  });

  const yearElement = wrapper.getElementsByTagName(
    "input"
  )[0] as HTMLInputElement;

  return [wrapper, yearElement];
};
