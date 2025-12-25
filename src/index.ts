import { Instance, FlatpickrFn, DayElement } from "./types/instance";
import {
  Options,
  ParsedOptions,
  DateLimit,
  DateRangeLimit,
  DateOption,
  defaults as defaultOptions,
  Hook,
  HookKey,
  HOOKS,
} from "./types/options";

import { CustomLocale, key as LocaleKey, Locale } from "./types/locale";
import English from "./l10n/default";

import { arrayify, debounce } from "./utils";
import {
  clearNode,
  createElement,
  toggleClass,
  getEventTarget,
  createEvent,
} from "./utils/dom";
import {
  compareDates,
  createDateParser,
  createDateFormatter,
  duration,
  isBetween,
  getDefaultHours,
  getCalendarMonthDates,
  getDefaultDate,
} from "./utils/dates";

import { tokenRegex } from "./utils/formatting";

import "./utils/polyfills";
import { Calendar, CalendarContainer, TimePicker } from "./calendar";

const DEBOUNCED_CHANGE_MS = 300;

function FlatpickrInstance(
  element: HTMLElement,
  instanceConfig?: Options
): Instance {
  const self = {
    config: {
      ...defaultOptions,
      ...flatpickr.defaultConfig,
    } as ParsedOptions,
    l10n: English,
  } as Instance;
  self.parseDate = createDateParser({ config: self.config, l10n: self.l10n });

  self._handlers = [];
  self.pluginElements = [];
  self.loadedPlugins = [];
  self._bind = bind;
  self._setHoursFromDate = setHoursFromDate;
  self._positionCalendar = positionCalendar;

  self.changeMonth = changeMonth;
  self.changeYear = changeYear;
  self.clear = clear;
  self.close = close;
  self.onMouseOver = onMouseOver;

  self._createElement = createElement;
  self.destroy = destroy;
  self.isEnabled = isEnabled;
  self.jumpToDate = jumpToDate;
  self.updateValue = updateValue;
  self.open = open;
  self.redraw = redraw;
  self.set = set;
  self.setDate = setDate;
  self.toggle = toggle;

  function init() {
    self.element = self.input = element as HTMLInputElement;
    self.isOpen = false;

    parseConfig();
    setupLocale();
    setupInputs();
    setupDates();

    if (!self.isMobile) build();

    bindEvents();

    if (self.selectedDates.length || self.config.noCalendar) {
      if (self.config.enableTime) {
        setHoursFromDate(
          self.config.noCalendar ? self.latestSelectedDateObj : undefined
        );
      }
      updateValue(false);
    }

    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    /* TODO: investigate this further

      Currently, there is weird positioning behavior in safari causing pages
      to scroll up. https://github.com/chmln/flatpickr/issues/563

      However, most browsers are not Safari and positioning is expensive when used
      in scale. https://github.com/chmln/flatpickr/issues/1096
    */
    if (!self.isMobile && isSafari) {
      positionCalendar();
    }

    triggerEvent("onReady");
  }

  function getClosestActiveElement() {
    return (
      ((self.calendarContainer?.getRootNode() as unknown) as DocumentOrShadowRoot)
        .activeElement || document.activeElement
    );
  }

  function bindToInstance<F extends Function>(fn: F): F {
    return fn.bind(self);
  }

  const onTimeUpdate = (deltaSeconds: number) => {
    if (self.selectedDates.length === 0) {
      const defaultDate = getDefaultDate(self.config, true);

      self.selectedDates = [defaultDate];
      self.latestSelectedDateObj = defaultDate;
    }

    let newTime = new Date(
      self.latestSelectedDateObj!.getTime() + deltaSeconds * 1000
    );
    if (
      self.config.minDate &&
      compareDates(newTime, self.config.minDate, false) <= 0
    ) {
      newTime = self.config.minDate;
    } else if (
      self.config.maxDate &&
      compareDates(newTime, self.config.maxDate, false) >= 0
    ) {
      newTime = self.config.maxDate;
    }

    if (!isEnabled(newTime.getTime(), true)) {
      return;
    }

    self.latestSelectedDateObj?.setTime(newTime.getTime());

    self.currentYear = self.latestSelectedDateObj?.getFullYear()!;
    self.currentMonth = self.latestSelectedDateObj?.getMonth()!;

    redraw();
    updateValue();
    triggerChange();
  };

  /**
   * Syncs time input values with a date
   */
  function setHoursFromDate(dateObj?: Date) {
    const date = dateObj || self.latestSelectedDateObj;

    if (date && date instanceof Date) {
      setHours(date.getHours(), date.getMinutes(), date.getSeconds());
    }
  }

  /**
   * Sets the hours, minutes, and optionally seconds
   * of the latest selected date object and the
   * @param {Number} hours the hour. whether its military
   *                 or am-pm gets inferred from config
   * @param {Number} minutes the minutes
   * @param {Number} seconds the seconds (optional)
   */
  function setHours(hours: number, minutes: number, seconds?: number) {
    if (self.latestSelectedDateObj !== undefined) {
      self.latestSelectedDateObj.setHours(hours % 24, minutes, seconds || 0, 0);
    }

    redraw();
  }

  /**
   * Essentially addEventListener + tracking
   * @param {Element} element the element to addEventListener to
   * @param {String} event the event name
   * @param {Function} handler the event handler
   */
  function bind<E extends Element | Window | Document>(
    element: E | E[],
    event: string | string[],
    handler: (e?: any) => void,
    options?: { capture?: boolean; once?: boolean; passive?: boolean }
  ): void {
    if (event instanceof Array)
      return event.forEach((ev) => bind(element, ev, handler, options));

    if (element instanceof Array)
      return element.forEach((el) => bind(el, event, handler, options));

    element.addEventListener(event, handler, options);
    self._handlers.push({
      remove: () => element.removeEventListener(event, handler, options),
    });
  }

  function triggerChange() {
    triggerEvent("onChange");
  }

  /**
   * Adds all the necessary event listeners
   */
  function bindEvents(): void {
    if (self.config.wrap) {
      ["open", "close", "toggle", "clear"].forEach((evt) => {
        Array.prototype.forEach.call(
          self.element.querySelectorAll(`[data-${evt}]`),
          (el: HTMLElement) =>
            bind(
              el,
              "click",
              self[evt as "open" | "close" | "toggle" | "clear"]
            )
        );
      });
    }

    if (self.isMobile) {
      setupMobile();
      return;
    }

    const debouncedResize = debounce(onResize, 50);
    self._debouncedChange = debounce(triggerChange, DEBOUNCED_CHANGE_MS);

    if (self.daysContainer && !/iPhone|iPad|iPod/i.test(navigator.userAgent))
      bind(self.daysContainer, "mouseover", (e: MouseEvent) => {
        if (self.config.mode === "range")
          onMouseOver(getEventTarget(e) as DayElement);
      });

    bind(self._input, "keydown", onKeyDown);
    if (self.calendarContainer !== undefined) {
      bind(self.calendarContainer, "keydown", onKeyDown);
    }

    if (!self.config.inline && !self.config.static)
      bind(window, "resize", debouncedResize);

    if (window.ontouchstart !== undefined)
      bind(window.document, "touchstart", documentClick);
    else bind(window.document, "mousedown", documentClick);
    bind(window.document, "focus", documentClick, { capture: true });

    if (self.config.clickOpens === true) {
      bind(self._input, "focus", self.open);
      bind(self._input, "click", self.open);
    }

    if (
      self.timeContainer !== undefined &&
      self.minuteElement !== undefined &&
      self.hourElement !== undefined
    ) {
      const selText = (e: FocusEvent) =>
        (getEventTarget(e) as HTMLInputElement).select();
      // bind(self.timeContainer, ["increment"], updateTime);

      bind([self.hourElement, self.minuteElement], ["focus", "click"], selText);

      if (self.secondElement !== undefined)
        bind(
          self.secondElement,
          "focus",
          () => self.secondElement && self.secondElement.select()
        );
    }

    if (self.config.allowInput) {
      bind(self._input, "blur", onBlur);
    }
  }

  /**
   * Set the calendar view to a particular date.
   * @param {Date} jumpDate the date to set the view to
   * @param {boolean} triggerChange if change events should be triggered
   */
  function jumpToDate(jumpDate?: DateOption, triggerChange?: boolean) {
    const jumpTo =
      jumpDate !== undefined
        ? self.parseDate(jumpDate)
        : self.latestSelectedDateObj ||
          (self.config.minDate && self.config.minDate > self.now
            ? self.config.minDate
            : self.config.maxDate && self.config.maxDate < self.now
            ? self.config.maxDate
            : self.now);

    const oldYear = self.currentYear;
    const oldMonth = self.currentMonth;

    try {
      if (jumpTo !== undefined) {
        self.currentYear = jumpTo.getFullYear();
        self.currentMonth = jumpTo.getMonth();
      }
    } catch (e) {
      /* istanbul ignore next */
      e.message = "Invalid date supplied: " + jumpTo;
      self.config.errorHandler(e);
    }

    if (triggerChange && self.currentYear !== oldYear) {
      triggerEvent("onYearChange");
    }

    if (
      triggerChange &&
      (self.currentYear !== oldYear || self.currentMonth !== oldMonth)
    ) {
      triggerEvent("onMonthChange");
    }

    self.redraw();
  }

  const getLastSelectedHours = (): {
    hours: number;
    minutes: number;
    seconds: number;
  } => {
    if (self.selectedDates.length === 0 || !self.latestSelectedDateObj) {
      return getDefaultHours(self.config);
    }

    return {
      hours: self.latestSelectedDateObj.getHours(),
      minutes: self.latestSelectedDateObj.getMinutes(),
      seconds: self.latestSelectedDateObj.getSeconds(),
    };
  };

  const draw = () => {
    clearNode(self.calendarContainer);

    if (!self.config.noCalendar) {
      const calendar = Calendar({
        year: self.currentYear,
        month: self.currentMonth,
        config: {
          ...self.config,
          locale: self.l10n,
        },
        getCalendarMonthDates,
        isSelected: (d: Date): boolean => !!isDateSelected(d),
        rangePosition,
        isEnabled,
        events: {
          onDayCreate: (day) => triggerEvent("onDayCreate", day),
          onMonthChange: self.changeMonth,
          onYearChange: self.changeYear,
          onDateSelect,
        },
      });
      self.calendarContainer.appendChild(calendar);
    }

    if (self.config.enableTime) {
      const value = getLastSelectedHours();

      const timeInput = TimePicker({
        config: {
          ...self.config,
          locale: self.l10n,
        },
        value,
        events: {
          onTimeUpdate,
        },
      });

      self.calendarContainer.appendChild(timeInput);
    }
  };

  function build() {
    self.calendarContainer = CalendarContainer({
      config: { ...self.config, locale: self.l10n },
    });

    const customAppend =
      self.config.appendTo !== undefined &&
      self.config.appendTo.nodeType !== undefined;

    if (self.config.inline || self.config.static) {
      if (self.config.inline) {
        if (!customAppend && self.element.parentNode)
          self.element.parentNode.insertBefore(
            self.calendarContainer,
            self._input.nextSibling
          );
        else if (self.config.appendTo !== undefined)
          self.config.appendTo.appendChild(self.calendarContainer);
      }

      if (self.config.static) {
        const wrapper = createElement("div", "flatpickr-wrapper");
        if (self.element.parentNode)
          self.element.parentNode.insertBefore(wrapper, self.element);
        wrapper.appendChild(self.element);

        if (self.altInput) wrapper.appendChild(self.altInput);

        wrapper.appendChild(self.calendarContainer);
      }
    }

    if (!self.config.static && !self.config.inline)
      (self.config.appendTo !== undefined
        ? self.config.appendTo
        : window.document.body
      ).appendChild(self.calendarContainer);

    draw();
  }

  function focusOnDayElem(targetNode: DayElement) {
    targetNode.focus();
    if (self.config.mode === "range") onMouseOver(targetNode);
  }

  function getFirstAvailableDay(delta: number) {
    const startMonth = delta > 0 ? 0 : self.config.showMonths - 1;
    const endMonth = delta > 0 ? self.config.showMonths : -1;

    for (let m = startMonth; m != endMonth; m += delta) {
      const month = (self.daysContainer as HTMLDivElement).children[m];
      const startIndex = delta > 0 ? 0 : month.children.length - 1;
      const endIndex = delta > 0 ? month.children.length : -1;

      for (let i = startIndex; i != endIndex; i += delta) {
        const c = month.children[i] as DayElement;
        if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj))
          return c;
      }
    }
    return undefined;
  }

  function getNextAvailableDay(current: DayElement, delta: number) {
    const givenMonth =
      current.className.indexOf("Month") === -1
        ? current.dateObj.getMonth()
        : self.currentMonth;
    const endMonth = delta > 0 ? self.config.showMonths : -1;
    const loopDelta = delta > 0 ? 1 : -1;

    for (
      let m = givenMonth - self.currentMonth;
      m != endMonth;
      m += loopDelta
    ) {
      const month = (self.daysContainer as HTMLDivElement).children[m];
      const startIndex =
        givenMonth - self.currentMonth === m
          ? current.$i + delta
          : delta < 0
          ? month.children.length - 1
          : 0;
      const numMonthDays = month.children.length;

      for (
        let i = startIndex;
        i >= 0 && i < numMonthDays && i != (delta > 0 ? numMonthDays : -1);
        i += loopDelta
      ) {
        const c = month.children[i] as DayElement;
        if (
          c.className.indexOf("hidden") === -1 &&
          isEnabled(c.dateObj) &&
          Math.abs(current.$i - i) >= Math.abs(delta)
        )
          return focusOnDayElem(c);
      }
    }

    self.changeMonth(loopDelta);
    focusOnDay(getFirstAvailableDay(loopDelta), 0);
    return undefined;
  }

  function focusOnDay(current: DayElement | undefined, offset: number) {
    const activeElement = getClosestActiveElement();

    const dayFocused = isInView(activeElement || document.body);
    const startElem =
      current !== undefined
        ? current
        : dayFocused
        ? (activeElement as DayElement)
        : self.selectedDateElem !== undefined && isInView(self.selectedDateElem)
        ? self.selectedDateElem
        : self.todayDateElem !== undefined && isInView(self.todayDateElem)
        ? self.todayDateElem
        : getFirstAvailableDay(offset > 0 ? 1 : -1);

    if (startElem === undefined) {
      self._input.focus();
    } else if (!dayFocused) {
      focusOnDayElem(startElem);
    } else {
      getNextAvailableDay(startElem, offset);
    }
  }

  // function buildDays() {
  //   if (self.daysContainer === undefined) {
  //     return;
  //   }

  //   self.days = self.daysContainer.firstChild as HTMLDivElement;
  //   if (self.config.mode === "range" && self.selectedDates.length === 1) {
  //     onMouseOver();
  //   }
  // }

  function clear(triggerChangeEvent = true, toInitial = true) {
    self.input.value = "";

    if (self.altInput !== undefined) self.altInput.value = "";

    if (self.mobileInput !== undefined) self.mobileInput.value = "";

    self.selectedDates = [];
    self.latestSelectedDateObj = undefined;
    if (toInitial === true) {
      self.currentYear = self._initialDate.getFullYear();
      self.currentMonth = self._initialDate.getMonth();
    }

    if (self.config.enableTime === true) {
      const { hours, minutes, seconds } = getDefaultHours(self.config);
      setHours(hours, minutes, seconds);
    }

    self.redraw();

    if (triggerChangeEvent)
      // triggerChangeEvent is true (default) or an Event
      triggerEvent("onChange");
  }

  function close() {
    self.isOpen = false;

    if (!self.isMobile) {
      if (self.calendarContainer !== undefined) {
        self.calendarContainer.classList.remove("open");
      }
      if (self._input !== undefined) {
        self._input.classList.remove("active");
      }
    }

    triggerEvent("onClose");
  }

  function destroy() {
    if (self.config !== undefined) triggerEvent("onDestroy");

    for (let i = self._handlers.length; i--; ) {
      self._handlers[i].remove();
    }

    self._handlers = [];

    if (self.mobileInput) {
      if (self.mobileInput.parentNode)
        self.mobileInput.parentNode.removeChild(self.mobileInput);
      self.mobileInput = undefined;
    } else if (self.calendarContainer && self.calendarContainer.parentNode) {
      if (self.config.static && self.calendarContainer.parentNode) {
        const wrapper = self.calendarContainer.parentNode;
        wrapper.lastChild && wrapper.removeChild(wrapper.lastChild);

        if (wrapper.parentNode) {
          while (wrapper.firstChild)
            wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
          wrapper.parentNode.removeChild(wrapper);
        }
      } else
        self.calendarContainer.parentNode.removeChild(self.calendarContainer);
    }

    if (self.altInput) {
      self.input.type = "text";
      if (self.altInput.parentNode)
        self.altInput.parentNode.removeChild(self.altInput);
      delete self.altInput;
    }

    if (self.input) {
      self.input.type = (self.input as any)._type;
      self.input.classList.remove("flatpickr-input");
      self.input.removeAttribute("readonly");
    }

    ([
      "_showTimeInput",
      "latestSelectedDateObj",
      "_hideNextMonthArrow",
      "_hidePrevMonthArrow",
      "__hideNextMonthArrow",
      "__hidePrevMonthArrow",
      "isMobile",
      "isOpen",
      "selectedDateElem",
      "minDateHasTime",
      "maxDateHasTime",
      "days",
      "daysContainer",
      "_input",
      "_positionElement",
      "innerContainer",
      "rContainer",
      "monthNav",
      "todayDateElem",
      "calendarContainer",
      "weekdayContainer",
      "prevMonthNav",
      "nextMonthNav",
      "monthsDropdownContainer",
      "currentMonthElement",
      "currentYearElement",
      "navigationCurrentMonth",
      "selectedDateElem",
      "config",
    ] as (keyof Instance)[]).forEach((k) => {
      try {
        delete self[k as keyof Instance];
      } catch (_) {}
    });
  }

  function isCalendarElem(elem: HTMLElement) {
    return self.calendarContainer.contains(elem);
  }

  function documentClick(e: MouseEvent) {
    if (self.isOpen && !self.config.inline) {
      const eventTarget = getEventTarget(e);
      const isCalendarElement = isCalendarElem(eventTarget as HTMLElement);
      const isInput =
        eventTarget === self.input ||
        eventTarget === self.altInput ||
        self.element.contains(eventTarget as HTMLElement) ||
        // web components
        // e.path is not present in all browsers. circumventing typechecks
        ((e as any).path &&
          (e as any).path.indexOf &&
          (~(e as any).path.indexOf(self.input) ||
            ~(e as any).path.indexOf(self.altInput)));

      const lostFocus =
        !isInput &&
        !isCalendarElement &&
        !isCalendarElem(e.relatedTarget as HTMLElement);

      const isIgnored = !self.config.ignoredFocusElements.some((elem) =>
        elem.contains(eventTarget as Node)
      );

      if (lostFocus && isIgnored) {
        if (self.config.allowInput) {
          self.setDate(
            self._input.value,
            false,
            self.config.altInput
              ? self.config.altFormat
              : self.config.dateFormat
          );
        }

        self.close();

        if (
          self.config &&
          self.config.mode === "range" &&
          self.selectedDates.length === 1
        )
          self.clear(false);
      }
    }
  }

  function changeMonth(value: number, isOffset = true) {
    const delta = isOffset ? value : value - self.currentMonth;

    if (
      (delta < 0 && self._hidePrevMonthArrow === true) ||
      (delta > 0 && self._hideNextMonthArrow === true)
    )
      return;

    self.currentMonth += delta;

    if (self.currentMonth < 0 || self.currentMonth > 11) {
      self.currentYear += self.currentMonth > 11 ? 1 : -1;
      self.currentMonth = (self.currentMonth + 12) % 12;

      triggerEvent("onYearChange");
    }

    // buildDays();

    triggerEvent("onMonthChange");

    self.redraw();
  }

  function changeYear(newYear: number) {
    if (
      !newYear ||
      (self.config.minDate && newYear < self.config.minDate.getFullYear()) ||
      (self.config.maxDate && newYear > self.config.maxDate.getFullYear())
    )
      return;

    const newYearNum = newYear,
      isNewYear = self.currentYear !== newYearNum;

    self.currentYear = newYearNum || self.currentYear;

    if (
      self.config.maxDate &&
      self.currentYear === self.config.maxDate.getFullYear()
    ) {
      self.currentMonth = Math.min(
        self.config.maxDate.getMonth(),
        self.currentMonth
      );
    } else if (
      self.config.minDate &&
      self.currentYear === self.config.minDate.getFullYear()
    ) {
      self.currentMonth = Math.max(
        self.config.minDate.getMonth(),
        self.currentMonth
      );
    }

    if (isNewYear) {
      self.redraw();
      triggerEvent("onYearChange");
    }
  }

  function isEnabled(date: DateOption, timeless = true): boolean {
    const dateToCheck = self.parseDate(date, undefined, timeless); // timeless

    if (
      (self.config.minDate &&
        dateToCheck &&
        compareDates(
          dateToCheck,
          self.config.minDate,
          timeless !== undefined ? timeless : !self.minDateHasTime
        ) < 0) ||
      (self.config.maxDate &&
        dateToCheck &&
        compareDates(
          dateToCheck,
          self.config.maxDate,
          timeless !== undefined ? timeless : !self.maxDateHasTime
        ) > 0)
    )
      return false;
    if (!self.config.enable && self.config.disable.length === 0) return true;

    if (dateToCheck === undefined) return false;

    const bool = !!self.config.enable,
      array = self.config.enable ?? self.config.disable;

    for (let i = 0, d; i < array.length; i++) {
      d = array[i];

      if (
        typeof d === "function" &&
        d(dateToCheck) // disabled by function
      )
        return bool;
      else if (
        d instanceof Date &&
        dateToCheck !== undefined &&
        d.getTime() === dateToCheck.getTime()
      )
        // disabled by date
        return bool;
      else if (typeof d === "string") {
        // disabled by date string
        const parsed = self.parseDate(d, undefined, true);
        return parsed && parsed.getTime() === dateToCheck.getTime()
          ? bool
          : !bool;
      } else if (
        // disabled by range
        typeof d === "object" &&
        dateToCheck !== undefined &&
        (d as DateRangeLimit).from &&
        (d as DateRangeLimit).to &&
        dateToCheck.getTime() >= (d as DateRangeLimit<Date>).from.getTime() &&
        dateToCheck.getTime() <= (d as DateRangeLimit<Date>).to.getTime()
      )
        return bool;
    }

    return !bool;
  }

  const isInView = (elem: Element): boolean => {
    if (self.calendarContainer !== undefined)
      return (
        elem.className.indexOf("hidden") === -1 &&
        elem.className.indexOf("flatpickr-disabled") === -1 &&
        self.calendarContainer.contains(elem)
      );
    return false;
  };

  function onBlur(e: FocusEvent) {
    const isInput = e.target === self._input;
    const valueChanged = self._input.value.trimEnd() !== getDateStr({});

    if (
      isInput &&
      valueChanged &&
      !(e.relatedTarget && isCalendarElem(e.relatedTarget as HTMLElement))
    ) {
      self.setDate(
        self._input.value,
        true,
        e.target === self.altInput
          ? self.config.altFormat
          : self.config.dateFormat
      );
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    // e.key                      e.keyCode
    // "Backspace"                        8
    // "Tab"                              9
    // "Enter"                           13
    // "Escape"     (IE "Esc")           27
    // "ArrowLeft"  (IE "Left")          37
    // "ArrowUp"    (IE "Up")            38
    // "ArrowRight" (IE "Right")         39
    // "ArrowDown"  (IE "Down")          40
    // "Delete"     (IE "Del")           46

    const eventTarget = getEventTarget(e);
    const isInput = self.config.wrap
      ? element.contains(eventTarget as HTMLElement)
      : eventTarget === self._input;
    const allowInput = self.config.allowInput;
    const allowKeydown = self.isOpen && (!allowInput || !isInput);
    const allowInlineKeydown = self.config.inline && isInput && !allowInput;

    if (e.keyCode === 13 && isInput) {
      if (allowInput) {
        self.setDate(
          self._input.value,
          true,
          eventTarget === self.altInput
            ? self.config.altFormat
            : self.config.dateFormat
        );
        self.close();
        return (eventTarget as HTMLElement).blur();
      } else {
        self.open();
      }
    } else if (
      isCalendarElem(eventTarget as HTMLElement) ||
      allowKeydown ||
      allowInlineKeydown
    ) {
      const isTimeObj =
        !!self.timeContainer &&
        self.timeContainer.contains(eventTarget as HTMLElement);

      switch (e.keyCode) {
        case 13:
          if (isTimeObj) {
            e.preventDefault();
            // updateTime();
            focusAndClose();
          } // else selectDate(e);

          break;

        case 27: // escape
          e.preventDefault();
          focusAndClose();
          break;

        case 8:
        case 46:
          if (isInput && !self.config.allowInput) {
            e.preventDefault();
            self.clear();
          }
          break;

        case 37:
        case 39:
          if (!isTimeObj && !isInput) {
            e.preventDefault();

            const activeElement = getClosestActiveElement();
            if (
              self.daysContainer !== undefined &&
              (allowInput === false ||
                (activeElement && isInView(activeElement)))
            ) {
              const delta = e.keyCode === 39 ? 1 : -1;

              if (!e.ctrlKey) focusOnDay(undefined, delta);
              else {
                e.stopPropagation();
                changeMonth(delta);
                focusOnDay(getFirstAvailableDay(1), 0);
              }
            }
          } else if (self.hourElement) self.hourElement.focus();

          break;

        case 38:
        case 40:
          e.preventDefault();
          const delta = e.keyCode === 40 ? 1 : -1;
          if (
            (self.daysContainer &&
              (eventTarget as DayElement).$i !== undefined) ||
            eventTarget === self.input ||
            eventTarget === self.altInput
          ) {
            if (e.ctrlKey) {
              e.stopPropagation();
              changeYear(self.currentYear - delta);
              focusOnDay(getFirstAvailableDay(1), 0);
            } else if (!isTimeObj) focusOnDay(undefined, delta * 7);
          } else if (eventTarget === self.currentYearElement) {
            changeYear(self.currentYear - delta);
          } else if (self.config.enableTime) {
            if (!isTimeObj && self.hourElement) self.hourElement.focus();
            // updateTime(e);
            self._debouncedChange();
          }

          break;

        case 9:
          if (isTimeObj) {
            const elems = ([
              self.hourElement,
              self.minuteElement,
              self.secondElement,
              self.amPM,
            ] as Node[])
              .concat(self.pluginElements)
              .filter((x) => x) as HTMLInputElement[];

            const i = elems.indexOf(eventTarget as HTMLInputElement);

            if (i !== -1) {
              const target = elems[i + (e.shiftKey ? -1 : 1)];
              e.preventDefault();
              (target || self._input).focus();
            }
          } else if (
            !self.config.noCalendar &&
            self.daysContainer &&
            self.daysContainer.contains(eventTarget as Node) &&
            e.shiftKey
          ) {
            e.preventDefault();
            self._input.focus();
          }

          break;

        default:
          break;
      }
    }

    if (self.amPM !== undefined && eventTarget === self.amPM) {
      switch (e.key) {
        case self.l10n.amPM[0].charAt(0):
        case self.l10n.amPM[0].charAt(0).toLowerCase():
          self.amPM.textContent = self.l10n.amPM[0];
          // setHoursFromInputs();
          updateValue();

          break;

        case self.l10n.amPM[1].charAt(0):
        case self.l10n.amPM[1].charAt(0).toLowerCase():
          self.amPM.textContent = self.l10n.amPM[1];
          // setHoursFromInputs();
          updateValue();

          break;
      }
    }

    if (isInput || isCalendarElem(eventTarget as HTMLElement)) {
      triggerEvent("onKeyDown", e);
    }
  }

  function onMouseOver(elem?: DayElement, cellClass = "flatpickr-day") {
    if (
      self.selectedDates.length !== 1 ||
      (elem &&
        (!elem.classList.contains(cellClass) ||
          elem.classList.contains("flatpickr-disabled")))
    )
      return;

    const hoverDate = elem
        ? elem.dateObj.getTime()
        : (self.days.firstElementChild as DayElement).dateObj.getTime(),
      initialDate = (self.parseDate(
        self.selectedDates[0],
        undefined,
        true
      ) as Date).getTime(),
      rangeStartDate = Math.min(hoverDate, self.selectedDates[0].getTime()),
      rangeEndDate = Math.max(hoverDate, self.selectedDates[0].getTime());

    let containsDisabled = false;

    let minRange = 0,
      maxRange = 0;

    for (let t = rangeStartDate; t < rangeEndDate; t += duration.DAY) {
      if (!isEnabled(new Date(t), true)) {
        containsDisabled =
          containsDisabled || (t > rangeStartDate && t < rangeEndDate);

        if (t < initialDate && (!minRange || t > minRange)) minRange = t;
        else if (t > initialDate && (!maxRange || t < maxRange)) maxRange = t;
      }
    }

    const hoverableCells = Array.from(
      self.rContainer!.querySelectorAll(
        `*:nth-child(-n+${self.config.showMonths}) > .${cellClass}`
      )
    ) as DayElement[];

    hoverableCells.forEach((dayElem) => {
      const date = dayElem.dateObj;

      const timestamp = date.getTime();

      const outOfRange =
        (minRange > 0 && timestamp < minRange) ||
        (maxRange > 0 && timestamp > maxRange);

      if (outOfRange) {
        dayElem.classList.add("notAllowed");
        ["inRange", "startRange", "endRange"].forEach((c) => {
          dayElem.classList.remove(c);
        });
        return;
      } else if (containsDisabled && !outOfRange) return;

      ["startRange", "inRange", "endRange", "notAllowed"].forEach((c) => {
        dayElem.classList.remove(c);
      });

      if (elem !== undefined) {
        elem.classList.add(
          hoverDate <= self.selectedDates[0].getTime()
            ? "startRange"
            : "endRange"
        );

        if (initialDate < hoverDate && timestamp === initialDate)
          dayElem.classList.add("startRange");
        else if (initialDate > hoverDate && timestamp === initialDate)
          dayElem.classList.add("endRange");
        if (
          timestamp >= minRange &&
          (maxRange === 0 || timestamp <= maxRange) &&
          isBetween(timestamp, initialDate, hoverDate)
        )
          dayElem.classList.add("inRange");
      }
    });
  }

  function onResize() {
    if (self.isOpen && !self.config.static && !self.config.inline)
      positionCalendar();
  }

  function open(
    e?: FocusEvent | MouseEvent,
    positionElement = self._positionElement
  ) {
    if (self.isMobile === true) {
      if (e) {
        e.preventDefault();
        const eventTarget = getEventTarget(e);
        if (eventTarget) {
          (eventTarget as HTMLInputElement).blur();
        }
      }

      if (self.mobileInput !== undefined) {
        self.mobileInput.focus();
        self.mobileInput.click();
      }

      triggerEvent("onOpen");
      return;
    } else if (self._input.disabled || self.config.inline) {
      return;
    }

    const wasOpen = self.isOpen;

    self.isOpen = true;

    if (!wasOpen) {
      self.calendarContainer.classList.add("open");
      self._input.classList.add("active");
      triggerEvent("onOpen");
      positionCalendar(positionElement);
    }

    if (self.config.enableTime === true && self.config.noCalendar === true) {
      if (
        self.config.allowInput === false &&
        (e === undefined ||
          !(self.timeContainer as HTMLDivElement).contains(
            e.relatedTarget as Node
          ))
      ) {
        setTimeout(() => (self.hourElement as HTMLInputElement).select(), 50);
      }
    }
  }

  function minMaxDateSetter(type: "min" | "max") {
    return (date: DateOption) => {
      const dateObj = (self.config[
        `_${type}Date` as "_minDate" | "_maxDate"
      ] = self.parseDate(date, self.config.dateFormat));

      const inverseDateObj =
        self.config[
          `_${type === "min" ? "max" : "min"}Date` as "_minDate" | "_maxDate"
        ];

      if (dateObj !== undefined) {
        self[type === "min" ? "minDateHasTime" : "maxDateHasTime"] =
          (dateObj as Date).getHours() > 0 ||
          (dateObj as Date).getMinutes() > 0 ||
          (dateObj as Date).getSeconds() > 0;
      }

      if (self.selectedDates) {
        self.selectedDates = self.selectedDates.filter((d) => isEnabled(d));
        if (!self.selectedDates.length && type === "min")
          setHoursFromDate(dateObj);
        updateValue();
      }

      if (self.daysContainer) {
        redraw();

        if (dateObj !== undefined)
          self.currentYearElement[type] = dateObj.getFullYear().toString();
        else self.currentYearElement.removeAttribute(type);

        self.currentYearElement.disabled =
          !!inverseDateObj &&
          dateObj !== undefined &&
          inverseDateObj.getFullYear() === dateObj.getFullYear();
      }
    };
  }

  function parseConfig() {
    const boolOpts: (keyof Options)[] = [
      "wrap",
      "weekNumbers",
      "allowInput",
      "allowInvalidPreload",
      "clickOpens",
      "time_24hr",
      "enableTime",
      "noCalendar",
      "altInput",
      "shorthandCurrentMonth",
      "inline",
      "static",
      "enableSeconds",
      "disableMobile",
    ];

    const userConfig = {
      ...JSON.parse(JSON.stringify(element.dataset || {})),
      ...instanceConfig,
    } as Options;

    const formats = {} as Record<"dateFormat" | "altFormat", string>;

    self.config.parseDate = userConfig.parseDate;
    self.config.formatDate = userConfig.formatDate;

    Object.defineProperty(self.config, "enable", {
      get: () => self.config._enable,
      set: (dates) => {
        self.config._enable = parseDateRules(dates);
      },
    });

    Object.defineProperty(self.config, "disable", {
      get: () => self.config._disable,
      set: (dates) => {
        self.config._disable = parseDateRules(dates);
      },
    });

    const timeMode = userConfig.mode === "time";

    if (!userConfig.dateFormat && (userConfig.enableTime || timeMode)) {
      const defaultDateFormat =
        flatpickr.defaultConfig.dateFormat || defaultOptions.dateFormat;
      formats.dateFormat =
        userConfig.noCalendar || timeMode
          ? "H:i" + (userConfig.enableSeconds ? ":S" : "")
          : defaultDateFormat + " H:i" + (userConfig.enableSeconds ? ":S" : "");
    }

    if (
      userConfig.altInput &&
      (userConfig.enableTime || timeMode) &&
      !userConfig.altFormat
    ) {
      const defaultAltFormat =
        flatpickr.defaultConfig.altFormat || defaultOptions.altFormat;
      formats.altFormat =
        userConfig.noCalendar || timeMode
          ? "h:i" + (userConfig.enableSeconds ? ":S K" : " K")
          : defaultAltFormat + ` h:i${userConfig.enableSeconds ? ":S" : ""} K`;
    }

    Object.defineProperty(self.config, "minDate", {
      get: () => self.config._minDate,
      set: minMaxDateSetter("min"),
    });

    Object.defineProperty(self.config, "maxDate", {
      get: () => self.config._maxDate,
      set: minMaxDateSetter("max"),
    });

    const minMaxTimeSetter = (type: string) => (val: any) => {
      self.config[type === "min" ? "_minTime" : "_maxTime"] = self.parseDate(
        val,
        "H:i:S"
      );
    };

    Object.defineProperty(self.config, "minTime", {
      get: () => self.config._minTime,
      set: minMaxTimeSetter("min"),
    });

    Object.defineProperty(self.config, "maxTime", {
      get: () => self.config._maxTime,
      set: minMaxTimeSetter("max"),
    });

    if (userConfig.mode === "time") {
      self.config.noCalendar = true;
      self.config.enableTime = true;
    }

    Object.assign(self.config, formats, userConfig);

    for (let i = 0; i < boolOpts.length; i++)
      // https://github.com/microsoft/TypeScript/issues/31663
      (self.config as any)[boolOpts[i]] =
        self.config[boolOpts[i]] === true ||
        self.config[boolOpts[i]] === "true";

    HOOKS.filter((hook) => self.config[hook] !== undefined).forEach((hook) => {
      self.config[hook] = arrayify(self.config[hook] || []).map(bindToInstance);
    });

    self.isMobile =
      !self.config.disableMobile &&
      !self.config.inline &&
      self.config.mode === "single" &&
      !self.config.disable.length &&
      !self.config.enable &&
      !self.config.weekNumbers &&
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    for (let i = 0; i < self.config.plugins.length; i++) {
      const pluginConf = self.config.plugins[i](self) || ({} as Options);
      for (const key in pluginConf) {
        if (HOOKS.indexOf(key as HookKey) > -1) {
          (self.config as any)[key] = arrayify(
            pluginConf[key as HookKey] as Hook
          )
            .map(bindToInstance)
            .concat(self.config[key as HookKey]);
        } else if (typeof userConfig[key as keyof Options] === "undefined")
          (self.config as any)[key] = pluginConf[key as keyof Options] as any;
      }
    }

    if (!userConfig.altInputClass) {
      self.config.altInputClass =
        getInputElem().className + " " + self.config.altInputClass;
    }

    triggerEvent("onParseConfig");
  }

  function getInputElem() {
    return self.config.wrap
      ? (element.querySelector("[data-input]") as HTMLInputElement)
      : (element as HTMLInputElement);
  }

  function setupLocale() {
    if (
      typeof self.config.locale !== "object" &&
      typeof flatpickr.l10ns[self.config.locale as LocaleKey] === "undefined"
    )
      self.config.errorHandler(
        new Error(`flatpickr: invalid locale ${self.config.locale}`)
      );

    self.l10n = {
      ...(flatpickr.l10ns.default as Locale),
      ...(typeof self.config.locale === "object"
        ? self.config.locale
        : self.config.locale !== "default"
        ? flatpickr.l10ns[self.config.locale as LocaleKey]
        : undefined),
    };

    tokenRegex.D = `(${self.l10n.weekdays.shorthand.join("|")})`;
    tokenRegex.l = `(${self.l10n.weekdays.longhand.join("|")})`;
    tokenRegex.M = `(${self.l10n.months.shorthand.join("|")})`;
    tokenRegex.F = `(${self.l10n.months.longhand.join("|")})`;
    tokenRegex.K = `(${self.l10n.amPM[0]}|${
      self.l10n.amPM[1]
    }|${self.l10n.amPM[0].toLowerCase()}|${self.l10n.amPM[1].toLowerCase()})`;

    const userConfig = {
      ...instanceConfig,
      ...JSON.parse(JSON.stringify(element.dataset || {})),
    } as Options;

    if (
      userConfig.time_24hr === undefined &&
      flatpickr.defaultConfig.time_24hr === undefined
    ) {
      self.config.time_24hr = self.l10n.time_24hr;
    }

    self.formatDate = createDateFormatter(self);
    self.formatAltDate = createDateFormatter(self, "altValue");
    self.parseDate = createDateParser({ config: self.config, l10n: self.l10n });
  }

  function positionCalendar(customPositionElement?: HTMLElement) {
    if (typeof self.config.position === "function") {
      return void self.config.position(self, customPositionElement);
    }
    if (self.calendarContainer === undefined) return;

    triggerEvent("onPreCalendarPosition");
    const positionElement = customPositionElement || self._positionElement;

    const calendarHeight = Array.prototype.reduce.call(
        self.calendarContainer.children,
        ((acc: number, child: HTMLElement) => acc + child.offsetHeight) as any,
        0
      ) as number,
      calendarWidth = self.calendarContainer.offsetWidth,
      configPos = self.config.position.split(" "),
      configPosVertical = configPos[0],
      configPosHorizontal = configPos.length > 1 ? configPos[1] : null,
      inputBounds = positionElement.getBoundingClientRect(),
      distanceFromBottom = window.innerHeight - inputBounds.bottom,
      showOnTop =
        configPosVertical === "above" ||
        (configPosVertical !== "below" &&
          distanceFromBottom < calendarHeight &&
          inputBounds.top > calendarHeight);

    const top =
      window.pageYOffset +
      inputBounds.top +
      (!showOnTop ? positionElement.offsetHeight + 2 : -calendarHeight - 2);

    toggleClass(self.calendarContainer, "arrowTop", !showOnTop);
    toggleClass(self.calendarContainer, "arrowBottom", showOnTop);

    if (self.config.inline) return;

    let left = window.pageXOffset + inputBounds.left;
    let isCenter = false;
    let isRight = false;

    if (configPosHorizontal === "center") {
      left -= (calendarWidth - inputBounds.width) / 2;
      isCenter = true;
    } else if (configPosHorizontal === "right") {
      left -= calendarWidth - inputBounds.width;
      isRight = true;
    }

    toggleClass(self.calendarContainer, "arrowLeft", !isCenter && !isRight);
    toggleClass(self.calendarContainer, "arrowCenter", isCenter);
    toggleClass(self.calendarContainer, "arrowRight", isRight);

    const right =
      window.document.body.offsetWidth -
      (window.pageXOffset + inputBounds.right);
    const rightMost = left + calendarWidth > window.document.body.offsetWidth;
    const centerMost = right + calendarWidth > window.document.body.offsetWidth;

    toggleClass(self.calendarContainer, "rightMost", rightMost);

    if (self.config.static) return;

    self.calendarContainer.style.top = `${top}px`;

    if (!rightMost) {
      self.calendarContainer.style.left = `${left}px`;
      self.calendarContainer.style.right = "auto";
    } else if (!centerMost) {
      self.calendarContainer.style.left = "auto";
      self.calendarContainer.style.right = `${right}px`;
    } else {
      const doc = getDocumentStyleSheet() as CSSStyleSheet;
      // some testing environments don't have css support
      if (doc === undefined) return;
      const bodyWidth = window.document.body.offsetWidth;
      const centerLeft = Math.max(0, bodyWidth / 2 - calendarWidth / 2);
      const centerBefore = ".flatpickr-calendar.centerMost:before";
      const centerAfter = ".flatpickr-calendar.centerMost:after";
      const centerIndex = doc.cssRules.length;
      const centerStyle = `{left:${inputBounds.left}px;right:auto;}`;
      toggleClass(self.calendarContainer, "rightMost", false);
      toggleClass(self.calendarContainer, "centerMost", true);
      doc.insertRule(
        `${centerBefore},${centerAfter}${centerStyle}`,
        centerIndex
      );
      self.calendarContainer.style.left = `${centerLeft}px`;
      self.calendarContainer.style.right = "auto";
    }
  }

  function getDocumentStyleSheet() {
    let editableSheet = null;
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i] as CSSStyleSheet;
      if (!sheet.cssRules) continue;
      try {
        sheet.cssRules;
      } catch (err) {
        continue;
      }
      editableSheet = sheet;
      break;
    }
    return editableSheet != null ? editableSheet : createStyleSheet();
  }

  function createStyleSheet() {
    const style = document.createElement("style");
    document.head.appendChild(style);
    return style.sheet as CSSStyleSheet;
  }

  function redraw() {
    if (self.config.noCalendar || self.isMobile) return;

    // updateNavigationCurrentMonth();
    draw();
  }

  function focusAndClose() {
    self._input.focus();

    if (
      window.navigator.userAgent.indexOf("MSIE") !== -1 ||
      navigator.msMaxTouchPoints !== undefined
    ) {
      // hack - bugs in the way IE handles focus keeps the calendar open
      setTimeout(self.close, 0);
    } else {
      self.close();
    }
  }

  const afterSelectShouldClose = () => {
    if (!self.config.closeOnSelect) {
      return false;
    }
    if (self.config.mode === "single" && !self.config.enableTime) {
      return false;
    }
    return (
      self.config.mode === "range" &&
      self.selectedDates.length === 2 &&
      !self.config.enableTime
    );
  };

  const dateSelects: { [k: string]: (d: Date) => void } = {
    single: (date: Date) => {
      self.selectedDates = [date];
    },
    multiple: (date: Date) => {
      const selectedIndex = isDateSelected(date);

      if (selectedIndex) self.selectedDates.splice(parseInt(selectedIndex), 1);
      else self.selectedDates.push(date);
    },
    range: (date: Date) => {
      if (self.selectedDates.length === 2) {
        self.clear(false, false);
      }
      self.selectedDates.push(date);

      // unless selecting same date twice, sort ascendingly
      if (compareDates(date, self.selectedDates[0], true) !== 0) {
        self.selectedDates.sort((a, b) => a.getTime() - b.getTime());
      }
    },
  };

  const onDateSelect = (d: Date) => {
    if (!isEnabled(d.getTime(), !self.config.enableTime)) {
      return;
    }

    self.latestSelectedDateObj = new Date(d.getTime());
    const selectedDate = self.latestSelectedDateObj;

    const isNewYear = selectedDate.getFullYear() !== self.currentYear;
    const isNewMonth = selectedDate.getMonth() !== self.currentMonth;

    const selector = dateSelects[self.config.mode];
    if (selector) {
      selector(selectedDate);
    }

    if (isNewYear) {
      triggerEvent("onYearChange");
    }

    if (isNewMonth) {
      triggerEvent("onMonthChange");
    }

    if (afterSelectShouldClose()) {
      focusAndClose();
    } else {
      redraw();
    }
    updateValue();
    triggerChange();
  };

  const CALLBACKS: { [k in keyof Options]: Function[] } = {
    locale: [setupLocale],
    minDate: [jumpToDate],
    maxDate: [jumpToDate],
    positionElement: [updatePositionElement],
    clickOpens: [
      () => {
        if (self.config.clickOpens === true) {
          bind(self._input, "focus", self.open);
          bind(self._input, "click", self.open);
        } else {
          self._input.removeEventListener("focus", self.open);
          self._input.removeEventListener("click", self.open);
        }
      },
    ],
  };

  function set<K extends keyof Options>(
    option: K | { [k in K]?: Options[k] },
    value?: any
  ) {
    if (option !== null && typeof option === "object") {
      Object.assign(self.config, option);
      for (const key in option) {
        if (CALLBACKS[key] !== undefined)
          (CALLBACKS[key] as Function[]).forEach((x) => x());
      }
    } else {
      self.config[option] = value;

      if (CALLBACKS[option] !== undefined)
        (CALLBACKS[option] as Function[]).forEach((x) => x());
      else if (HOOKS.indexOf(option as HookKey) > -1)
        (self.config as any)[option] = arrayify(value);
    }

    self.redraw();
    updateValue(true);
  }

  function setSelectedDate(
    inputDate: DateOption | DateOption[],
    format?: string
  ) {
    let dates: (Date | undefined)[] = [];
    if (inputDate instanceof Array)
      dates = inputDate.map((d) => self.parseDate(d, format));
    else if (inputDate instanceof Date || typeof inputDate === "number")
      dates = [self.parseDate(inputDate, format)];
    else if (typeof inputDate === "string") {
      switch (self.config.mode) {
        case "single":
        case "time":
          dates = [self.parseDate(inputDate, format)];
          break;

        case "multiple":
          dates = inputDate
            .split(self.config.conjunction)
            .map((date) => self.parseDate(date, format));
          break;

        case "range":
          dates = inputDate
            .split(self.l10n.rangeSeparator)
            .map((date) => self.parseDate(date, format));

          break;

        default:
          break;
      }
    } else
      self.config.errorHandler(
        new Error(`Invalid date supplied: ${JSON.stringify(inputDate)}`)
      );

    self.selectedDates = (self.config.allowInvalidPreload
      ? dates
      : dates.filter(
          (d) => d instanceof Date && isEnabled(d, false)
        )) as Date[];

    if (self.config.mode === "range")
      self.selectedDates.sort((a, b) => a.getTime() - b.getTime());
  }

  function setDate(
    date: DateOption | DateOption[],
    triggerChange = false,
    format = self.config.dateFormat
  ) {
    if ((date !== 0 && !date) || (date instanceof Array && date.length === 0))
      return self.clear(triggerChange);

    setSelectedDate(date, format);

    self.latestSelectedDateObj =
      self.selectedDates[self.selectedDates.length - 1];

    self.redraw();
    jumpToDate(undefined, triggerChange);

    setHoursFromDate();
    if (self.selectedDates.length === 0) {
      self.clear(false);
    }
    updateValue(triggerChange);

    if (triggerChange) triggerEvent("onChange");
  }

  function parseDateRules(arr: DateLimit[]): DateLimit<Date>[] {
    return arr
      .slice()
      .map((rule) => {
        if (
          typeof rule === "string" ||
          typeof rule === "number" ||
          rule instanceof Date
        ) {
          return self.parseDate(
            rule as Date | string | number,
            undefined,
            true
          ) as Date;
        } else if (
          rule &&
          typeof rule === "object" &&
          (rule as DateRangeLimit).from &&
          (rule as DateRangeLimit).to
        )
          return {
            from: self.parseDate(
              (rule as DateRangeLimit).from,
              undefined
            ) as Date,
            to: self.parseDate((rule as DateRangeLimit).to, undefined) as Date,
          };

        return rule;
      })
      .filter((x) => x) as DateLimit<Date>[]; // remove falsy values
  }

  function setupDates() {
    self.selectedDates = [];
    self.now = self.parseDate(self.config.now) || new Date();

    // Workaround IE11 setting placeholder as the input's value
    const preloadedDate =
      self.config.defaultDate ||
      ((self.input.nodeName === "INPUT" ||
        self.input.nodeName === "TEXTAREA") &&
      self.input.placeholder &&
      self.input.value === self.input.placeholder
        ? null
        : self.input.value);

    if (preloadedDate) setSelectedDate(preloadedDate, self.config.dateFormat);

    self._initialDate =
      self.selectedDates.length > 0
        ? self.selectedDates[0]
        : self.config.minDate &&
          self.config.minDate.getTime() > self.now.getTime()
        ? self.config.minDate
        : self.config.maxDate &&
          self.config.maxDate.getTime() < self.now.getTime()
        ? self.config.maxDate
        : self.now;

    self.currentYear = self._initialDate.getFullYear();
    self.currentMonth = self._initialDate.getMonth();

    if (self.selectedDates.length > 0)
      self.latestSelectedDateObj = self.selectedDates[0];

    if (self.config.minTime !== undefined)
      self.config.minTime = self.parseDate(self.config.minTime, "H:i");

    if (self.config.maxTime !== undefined)
      self.config.maxTime = self.parseDate(self.config.maxTime, "H:i");

    self.minDateHasTime =
      !!self.config.minDate &&
      (self.config.minDate.getHours() > 0 ||
        self.config.minDate.getMinutes() > 0 ||
        self.config.minDate.getSeconds() > 0);

    self.maxDateHasTime =
      !!self.config.maxDate &&
      (self.config.maxDate.getHours() > 0 ||
        self.config.maxDate.getMinutes() > 0 ||
        self.config.maxDate.getSeconds() > 0);
  }

  function setupInputs() {
    self.input = getInputElem();

    /* istanbul ignore next */
    if (!self.input) {
      self.config.errorHandler(new Error("Invalid input element specified"));
      return;
    }

    // hack: store previous type to restore it after destroy()
    (self.input as any)._type = (self.input as any).type;
    (self.input as any).type = "text";

    self.input.classList.add("flatpickr-input");
    self._input = self.input;

    if (self.config.altInput) {
      // replicate self.element
      self.altInput = createElement<HTMLInputElement>(
        self.input.nodeName as "input",
        self.config.altInputClass
      );
      self._input = self.altInput;
      self.altInput.placeholder = self.input.placeholder;
      self.altInput.disabled = self.input.disabled;
      self.altInput.required = self.input.required;
      self.altInput.tabIndex = self.input.tabIndex;
      self.altInput.type = "text";
      self.input.setAttribute("type", "hidden");

      if (!self.config.static && self.input.parentNode)
        self.input.parentNode.insertBefore(
          self.altInput,
          self.input.nextSibling
        );
    }

    if (!self.config.allowInput)
      self._input.setAttribute("readonly", "readonly");

    updatePositionElement();
  }

  function updatePositionElement() {
    self._positionElement = self.config.positionElement || self._input;
  }

  function setupMobile() {
    const inputType = self.config.enableTime
      ? self.config.noCalendar
        ? "time"
        : "datetime-local"
      : "date";

    self.mobileInput = createElement<HTMLInputElement>(
      "input",
      self.input.className + " flatpickr-mobile"
    );
    self.mobileInput.tabIndex = 1;
    self.mobileInput.type = inputType;
    self.mobileInput.disabled = self.input.disabled;
    self.mobileInput.required = self.input.required;
    self.mobileInput.placeholder = self.input.placeholder;

    self.mobileFormatStr =
      inputType === "datetime-local"
        ? "Y-m-d\\TH:i:S"
        : inputType === "date"
        ? "Y-m-d"
        : "H:i:S";

    if (self.selectedDates.length > 0) {
      self.mobileInput.defaultValue = self.mobileInput.value = self.formatDate(
        self.selectedDates[0],
        self.mobileFormatStr
      );
    }

    if (self.config.minDate)
      self.mobileInput.min = self.formatDate(self.config.minDate, "Y-m-d");

    if (self.config.maxDate)
      self.mobileInput.max = self.formatDate(self.config.maxDate, "Y-m-d");

    if (self.input.getAttribute("step"))
      self.mobileInput.step = String(self.input.getAttribute("step"));

    self.input.type = "hidden";
    if (self.altInput !== undefined) self.altInput.type = "hidden";

    try {
      if (self.input.parentNode)
        self.input.parentNode.insertBefore(
          self.mobileInput,
          self.input.nextSibling
        );
    } catch {}

    bind(self.mobileInput, "change", (e: KeyboardEvent) => {
      self.setDate(
        (getEventTarget(e) as HTMLInputElement).value,
        false,
        self.mobileFormatStr
      );
      triggerEvent("onChange");
      triggerEvent("onClose");
    });
  }

  function toggle(e?: FocusEvent | MouseEvent) {
    if (self.isOpen === true) return self.close();
    self.open(e);
  }

  function triggerEvent(event: HookKey, data?: any) {
    // If the instance has been destroyed already, all hooks have been removed
    if (self.config === undefined) return;

    const hooks = self.config[event];

    if (hooks !== undefined && hooks.length > 0) {
      for (let i = 0; hooks[i] && i < hooks.length; i++)
        hooks[i](self.selectedDates, self.input.value, self, data);
    }

    if (event === "onChange") {
      self.input.dispatchEvent(createEvent("change"));

      // many front-end frameworks bind to the input event
      self.input.dispatchEvent(createEvent("input"));
    }
  }

  function isDateSelected(date: Date) {
    for (let i = 0; i < self.selectedDates.length; i++) {
      const selectedDate = self.selectedDates[i];
      if (
        selectedDate instanceof Date &&
        compareDates(selectedDate, date) === 0
      )
        return "" + i;
    }

    return false;
  }

  function isDateInRange(date: Date) {
    if (self.config.mode !== "range" || self.selectedDates.length < 2)
      return false;
    return (
      compareDates(date, self.selectedDates[0]) >= 0 &&
      compareDates(date, self.selectedDates[1]) <= 0
    );
  }

  function rangePosition(date: Date): "start" | "end" | "middle" | undefined {
    if (!isDateInRange(date)) {
      return;
    }
    if (compareDates(date, self.selectedDates[0]) === 0) {
      return "start";
    }
    if (compareDates(date, self.selectedDates[1]) === 0) {
      return "end";
    }
    return "middle";
  }

  function getDateStr(opts: {
    specificFormat?: string;
    type?: "value" | "altValue";
  }) {
    const { specificFormat } = opts;
    const type = opts.type || "value";

    const format =
      specificFormat ||
      (self.config.altInput ? self.config.altFormat : self.config.dateFormat);

    let formatter: (d: Date, f: string) => string;
    switch (type) {
      case "value":
        formatter = self.formatDate;
        break;
      case "altValue":
        formatter = self.formatAltDate;
        break;
    }

    return self.selectedDates
      .map((dObj) => formatter(dObj, format))
      .filter(
        (d, i, arr) =>
          self.config.mode !== "range" ||
          self.config.enableTime ||
          arr.indexOf(d) === i
      )
      .join(
        self.config.mode !== "range"
          ? self.config.conjunction
          : self.l10n.rangeSeparator
      );
  }

  /**
   * Updates the values of inputs associated with the calendar
   */
  function updateValue(triggerChange = true) {
    if (self.mobileInput !== undefined && self.mobileFormatStr) {
      self.mobileInput.value =
        self.latestSelectedDateObj !== undefined
          ? self.formatDate(self.latestSelectedDateObj, self.mobileFormatStr)
          : "";
    }

    self.input.value = getDateStr({
      specificFormat: self.config.dateFormat,
      type: "value",
    });

    if (self.altInput !== undefined) {
      self.altInput.value = getDateStr({
        specificFormat: self.config.altFormat,
        type: "altValue",
      });
    }

    if (triggerChange !== false) triggerEvent("onValueUpdate");
  }

  init();
  return self;
}

/* istanbul ignore next */
function _flatpickr(
  nodeList: ArrayLike<Node>,
  config?: Options
): Instance | Instance[] {
  // static list
  const nodes = Array.prototype.slice
    .call(nodeList)
    .filter((x) => x instanceof HTMLElement) as HTMLElement[];

  const instances: Instance[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    try {
      if (node.getAttribute("data-fp-omit") !== null) continue;

      if (node._flatpickr !== undefined) {
        node._flatpickr.destroy();
        node._flatpickr = undefined;
      }

      node._flatpickr = FlatpickrInstance(node, config || {});
      instances.push(node._flatpickr);
    } catch (e) {
      console.error(e);
    }
  }

  return instances.length === 1 ? instances[0] : instances;
}

/* istanbul ignore next */
if (
  typeof HTMLElement !== "undefined" &&
  typeof HTMLCollection !== "undefined" &&
  typeof NodeList !== "undefined"
) {
  // browser env
  HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function (
    config?: Options
  ) {
    return _flatpickr(this, config);
  };

  HTMLElement.prototype.flatpickr = function (config?: Options) {
    return _flatpickr([this], config) as Instance;
  };
}

/* istanbul ignore next */
var flatpickr = function (
  selector: ArrayLike<Node> | Node | string,
  config?: Options
) {
  if (typeof selector === "string") {
    return _flatpickr(window.document.querySelectorAll(selector), config);
  } else if (selector instanceof Node) {
    return _flatpickr([selector], config);
  } else {
    return _flatpickr(selector, config);
  }
} as FlatpickrFn;

/* istanbul ignore next */
flatpickr.defaultConfig = {};

flatpickr.l10ns = {
  en: { ...English },
  default: { ...English },
};

flatpickr.localize = (l10n: CustomLocale) => {
  flatpickr.l10ns.default = {
    ...flatpickr.l10ns.default,
    ...l10n,
  };
};
flatpickr.setDefaults = (config: Options) => {
  flatpickr.defaultConfig = {
    ...flatpickr.defaultConfig,
    ...(config as ParsedOptions),
  };
};

flatpickr.parseDate = createDateParser({});
flatpickr.formatDate = createDateFormatter({});
flatpickr.compareDates = compareDates;

/* istanbul ignore next */
if (typeof jQuery !== "undefined" && typeof jQuery.fn !== "undefined") {
  (jQuery.fn as any).flatpickr = function (config: Options) {
    return _flatpickr(this, config);
  };
}

Date.prototype.fp_incr = function (days: number | string) {
  return new Date(
    this.getFullYear(),
    this.getMonth(),
    this.getDate() + (typeof days === "string" ? parseInt(days, 10) : days)
  );
};

if (typeof window !== "undefined") {
  window.flatpickr = flatpickr;
}

export default flatpickr;
