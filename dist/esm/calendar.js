var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
import { createElement, createNumberInput, getEventTarget } from "./utils/dom";
import { monthToStr } from "./utils/formatting";
import { getDaysInMonth, getWeek, military2ampm } from "./utils/dates";
import { int } from "./utils";
export var MonthDropdownOption = function (props) {
    var monthNum = props.monthNum, short = props.short, l10n = props.l10n, selected = props.selected;
    var month = createElement("option", "flatpickr-monthDropdown-month");
    month.value = monthNum.toString();
    month.textContent = monthToStr(monthNum, short, l10n);
    month.tabIndex = -1;
    month.selected = selected;
    return month;
};
export var MonthsDropdown = function (props) {
    var _a;
    var year = props.year, selectedMonth = props.selectedMonth, config = props.config;
    var minMonth = 0;
    var maxMonth = 11;
    if (config.minDate && year === config.minDate.getFullYear()) {
        minMonth = config.minDate.getMonth();
    }
    if (config.maxDate && year === config.maxDate.getFullYear()) {
        maxMonth = config.maxDate.getMonth();
    }
    var container = createElement("select", "flatpickr-monthDropdown-months");
    container.tabIndex = -1;
    var changeHandler = (_a = props === null || props === void 0 ? void 0 : props.events) === null || _a === void 0 ? void 0 : _a.change;
    if (changeHandler) {
        container.addEventListener("change", function (e) {
            var target = getEventTarget(e);
            changeHandler(parseInt(target.value));
        });
    }
    container.setAttribute("aria-label", config.locale.monthAriaLabel);
    for (var i = minMonth; i <= maxMonth; i++) {
        container.appendChild(MonthDropdownOption({
            monthNum: i,
            short: config.shorthandCurrentMonth,
            selected: selectedMonth === i,
            l10n: config.locale,
        }));
    }
    return container;
};
export var MonthDisplay = function (props) {
    var month = props.month, config = props.config;
    var short = config.shorthandCurrentMonth;
    var content = monthToStr(month, short, config.locale) + " ";
    return createElement("span", "cur-month", content);
};
export var YearInput = function (props) {
    var events = props.events, year = props.year;
    var opts = {};
    if (props.config.minDate) {
        opts["min"] = props.config.minDate.getFullYear().toString();
    }
    if (props.config.maxDate) {
        opts["max"] = props.config.maxDate.getFullYear().toString();
        opts["disabled"] =
            !!props.config.minDate &&
                props.config.minDate.getFullYear() === props.config.maxDate.getFullYear();
    }
    var onInput = function (e) {
        var eventTarget = getEventTarget(e);
        var newYear = parseInt(eventTarget.value) + (e.delta || 0);
        if (newYear / 1000 > 1 ||
            (e.key === "Enter" && !/[^\d]/.test(newYear.toString()))) {
            (events === null || events === void 0 ? void 0 : events.onYearChange) && events.onYearChange(newYear);
        }
    };
    var wrapper = createNumberInput("cur-year", __assign(__assign({}, opts), { tabindex: "-1", "aria-label": props.config.locale.yearAriaLabel, value: year.toString() }), {
        onIncrement: function () { return (events === null || events === void 0 ? void 0 : events.onYearChange) && events.onYearChange(year + 1); },
        onDecrement: function () { return (events === null || events === void 0 ? void 0 : events.onYearChange) && events.onYearChange(year - 1); },
        onInput: onInput,
    });
    return wrapper;
};
export var MonthNavigation = function (props) {
    var _a, _b;
    var month = props.month, year = props.year, hideNextMonthNav = props.hideNextMonthNav, hidePrevMonthNav = props.hidePrevMonthNav, disablePrevMonthNav = props.disablePrevMonthNav, disableNextMonthNav = props.disableNextMonthNav, showPicker = props.showPicker, config = props.config;
    var onChange = (_a = props.events) === null || _a === void 0 ? void 0 : _a.onMonthChange;
    var monthNav = createElement("div", "flatpickr-months");
    var prevMonthNav = createElement("span", "flatpickr-prev-month " + (disablePrevMonthNav ? "flatpickr-disabled" : "") + " " + (hidePrevMonthNav ? "hidden" : ""));
    prevMonthNav.innerHTML = config.prevArrow;
    monthNav.appendChild(prevMonthNav);
    if (!disablePrevMonthNav && onChange) {
        prevMonthNav.addEventListener("click", function () { return onChange(-1); });
    }
    var monthElement = createElement("div", "flatpickr-month");
    if (showPicker) {
        monthElement.appendChild(MonthsDropdown({
            year: year,
            selectedMonth: month,
            config: config,
            events: {
                change: function (selectedMonth) {
                    onChange && onChange(selectedMonth - month);
                },
            },
        }));
    }
    else {
        monthElement.appendChild(MonthDisplay({
            month: month,
            config: config,
        }));
    }
    var currentMonth = createElement("div", "flatpickr-current-month");
    currentMonth.appendChild(monthElement);
    var yearWrapper = YearInput({
        config: config,
        year: year,
        events: {
            onYearChange: (_b = props.events) === null || _b === void 0 ? void 0 : _b.onYearChange,
        },
    });
    monthElement.appendChild(yearWrapper);
    monthNav.appendChild(currentMonth);
    var nextMonthNav = createElement("span", "flatpickr-next-month " + (disableNextMonthNav ? "flatpickr-disabled" : "") + " " + (hideNextMonthNav ? "hidden" : ""));
    nextMonthNav.innerHTML = config.nextArrow;
    monthNav.appendChild(nextMonthNav);
    if (!disableNextMonthNav && onChange) {
        nextMonthNav.addEventListener("click", function () { return onChange(1); });
    }
    return monthNav;
};
export var Day = function (props) {
    var date = props.date, className = props.className, enabled = props.enabled, selected = props.selected, current = props.current, hidden = props.hidden, range = props.range, events = props.events;
    var onClick = events === null || events === void 0 ? void 0 : events.click;
    var dayElement = createElement("span", className, date.getDate().toString());
    if (onClick) {
        dayElement.addEventListener("click", function () { return onClick(date); });
    }
    dayElement.dateObj = date;
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
export var MonthDays = function (props) {
    var _a, _b;
    var year = props.year, month = props.month, preceedingDays = props.preceedingDays, followingDays = props.followingDays, hidePreceeding = props.hidePreceeding, hideFollowing = props.hideFollowing, l10n = props.l10n, isSelected = props.isSelected, rangePosition = props.rangePosition, isEnabled = props.isEnabled;
    var days = window.document.createDocumentFragment();
    var daysInMonth = getDaysInMonth(month, year, l10n);
    var totalDays = preceedingDays + daysInMonth + followingDays;
    for (var i = 0; i < totalDays; i++) {
        var date = new Date(year, month, -preceedingDays + 1 + i);
        var selected = isSelected(date);
        var range = rangePosition(date);
        var classNames = "";
        if (i < preceedingDays) {
            classNames = "prevMonthDay " + (hidePreceeding && "hidden");
        }
        else if (i >= preceedingDays + daysInMonth) {
            classNames = "nextMonthDay " + (hideFollowing && "hidden");
        }
        var day = Day({
            date: date,
            className: "flatpickr-day " + classNames,
            enabled: isEnabled(date, true),
            selected: selected,
            range: range,
            events: {
                click: (_a = props.events) === null || _a === void 0 ? void 0 : _a.onDateSelect,
            },
        });
        if ((_b = props === null || props === void 0 ? void 0 : props.events) === null || _b === void 0 ? void 0 : _b.onDayCreate) {
            props.events.onDayCreate(day);
        }
        days.appendChild(day);
    }
    var dayContainer = createElement("div", "dayContainer");
    dayContainer.appendChild(days);
    return dayContainer;
};
var Weekdays = function (props) {
    var config = props.config;
    var weekdayContainer = createElement("div", "flatpickr-weekdays");
    var container = createElement("div", "flatpickr-weekdaycontainer");
    weekdayContainer.appendChild(container);
    var firstDayOfWeek = config.locale.firstDayOfWeek;
    var weekdays = __spreadArrays(config.locale.weekdays.shorthand);
    if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
        weekdays = __spreadArrays(weekdays.splice(firstDayOfWeek, weekdays.length), weekdays.splice(0, firstDayOfWeek));
    }
    container.innerHTML = weekdays
        .map(function (wd) { return "<span class=\"flatpickr-weekday\">" + wd + "</span>"; })
        .join("");
    return weekdayContainer;
};
export var WeekNumbers = function (props) {
    var config = props.config, firstDate = props.firstDate, numberOfWeeks = props.numberOfWeeks;
    var weekWrapper = createElement("div", "flatpickr-weekwrapper");
    weekWrapper.innerHTML = "<span class=\"flatpickr-weekday\">" + config.locale.weekAbbreviation + "</span>";
    var weekNumbers = [];
    for (var i = 0; i < numberOfWeeks; i++) {
        weekNumbers.push("<span class=\"flatpickr-day\">" + getWeek(new Date(firstDate.getTime() + 7 * 24 * 60 * 60 * i * 1000)) + "</span>");
    }
    weekWrapper.innerHTML += "<div class=\"flatpickr-weeks\">\n    " + weekNumbers.join("") + "\n  </div>";
    return weekWrapper;
};
var MonthInnerContainer = function (props) {
    var _a;
    var year = props.year, month = props.month, isSelected = props.isSelected, rangePosition = props.rangePosition, isEnabled = props.isEnabled, events = props.events, config = props.config, getCalendarMonthDates = props.getCalendarMonthDates;
    var innerContainer = createElement("div", "flatpickr-innerContainer");
    var monthDaysContainer = createElement("div", "flatpickr-rContainer");
    var weekdays = Weekdays({ config: config });
    monthDaysContainer.appendChild(weekdays);
    var dates = getCalendarMonthDates(year, month, config.locale);
    var monthDays = MonthDays(__assign(__assign({}, dates), { isSelected: isSelected,
        rangePosition: rangePosition,
        isEnabled: isEnabled, l10n: config.locale, config: config, events: {
            onDayCreate: (_a = props.events) === null || _a === void 0 ? void 0 : _a.onDayCreate,
            onDateSelect: events === null || events === void 0 ? void 0 : events.onDateSelect,
        } }));
    monthDaysContainer.appendChild(monthDays);
    if (config.weekNumbers) {
        var preceedingDays = dates.preceedingDays, followingDays = dates.followingDays, year_1 = dates.year, month_1 = dates.month;
        var totalDays = preceedingDays +
            followingDays +
            getDaysInMonth(month_1, year_1, config.locale);
        var firstDate = new Date(year_1, month_1, -preceedingDays + 1);
        var numberOfWeeks = totalDays / 7;
        var weekNumbers = WeekNumbers({
            config: config,
            firstDate: firstDate,
            numberOfWeeks: numberOfWeeks,
        });
        innerContainer.appendChild(weekNumbers);
    }
    innerContainer.appendChild(monthDaysContainer);
    return innerContainer;
};
export var CalendarMonth = function (props) {
    var year = props.year, month = props.month, hidePrevMonthNav = props.hidePrevMonthNav, hideNextMonthNav = props.hideNextMonthNav, config = props.config, isSelected = props.isSelected, rangePosition = props.rangePosition, isEnabled = props.isEnabled, getCalendarMonthDates = props.getCalendarMonthDates, events = props.events;
    var monthContainer = createElement("div", "flatpickr-calendar-month");
    var monthNavigation = MonthNavigation({
        year: year,
        month: month,
        hidePrevMonthNav: hidePrevMonthNav,
        hideNextMonthNav: hideNextMonthNav,
        config: config,
        disablePrevMonthNav: config.minDate &&
            year === config.minDate.getFullYear() &&
            config.minDate.getMonth() === month,
        disableNextMonthNav: config.maxDate &&
            year === config.maxDate.getFullYear() &&
            config.maxDate.getMonth() === month,
        showPicker: config.showMonths == 1 && config.monthSelectorType == "dropdown",
        events: {
            onMonthChange: events === null || events === void 0 ? void 0 : events.onMonthChange,
            onYearChange: events === null || events === void 0 ? void 0 : events.onYearChange,
        },
    });
    monthContainer.appendChild(monthNavigation);
    monthContainer.appendChild(MonthInnerContainer({
        year: year,
        month: month,
        config: config,
        isSelected: isSelected,
        rangePosition: rangePosition,
        isEnabled: isEnabled,
        getCalendarMonthDates: getCalendarMonthDates,
        events: {
            onDateSelect: events === null || events === void 0 ? void 0 : events.onDateSelect,
            onDayCreate: events === null || events === void 0 ? void 0 : events.onDayCreate,
        },
    }));
    return monthContainer;
};
export var Calendar = function (props) {
    var year = props.year, month = props.month, config = props.config, isSelected = props.isSelected, getCalendarMonthDates = props.getCalendarMonthDates, rangePosition = props.rangePosition, isEnabled = props.isEnabled;
    var monthsContainer = createElement("div", "flatpickr-calendar-months");
    for (var i = 0; i < config.showMonths; i++) {
        var m = (month + i) % 12;
        var y = year + Math.floor((month + i) / 12);
        var singleMonth = CalendarMonth({
            year: y,
            month: m,
            config: config,
            getCalendarMonthDates: getCalendarMonthDates,
            isSelected: isSelected,
            rangePosition: rangePosition,
            isEnabled: isEnabled,
            hidePrevMonthNav: i != 0,
            hideNextMonthNav: i != config.showMonths - 1,
            events: props.events,
        });
        monthsContainer.appendChild(singleMonth);
    }
    return monthsContainer;
};
export var CalendarContainer = function (props) {
    var config = props.config;
    var classNames = [];
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
    }
    else if (config.static) {
        classNames.push("static");
    }
    if (config.enableTime) {
        classNames.push("hasTime");
    }
    if (config.weekNumbers) {
        classNames.push("hasWeeks");
    }
    var container = createElement("div", "flatpickr-calendar " + classNames.join(" "));
    return container;
};
export var TimePicker = function (props) {
    var _a, _b, _c;
    var config = props.config, events = props.events;
    var value = {
        hours: ((_a = props.value) === null || _a === void 0 ? void 0 : _a.hours) || 0,
        minutes: ((_b = props.value) === null || _b === void 0 ? void 0 : _b.minutes) || 0,
        seconds: ((_c = props.value) === null || _c === void 0 ? void 0 : _c.seconds) || 0,
    };
    var onUpdate = (events === null || events === void 0 ? void 0 : events.onTimeUpdate) || (function () { });
    var halfDay = 12 * 60 * 60;
    var multipliers = {
        hours: 60 * 60,
        minutes: 60,
        seconds: 1,
    };
    var isPM = value.hours > 11;
    if (!config.time_24hr) {
        value.hours = military2ampm(value.hours);
    }
    var containerWrapper = createElement("div", "flatpickr-time-wrapper");
    containerWrapper.tabIndex = -1;
    var container = createElement("div", "flatpickr-time " + (config.time_24hr ? "time24hr" : ""));
    container.tabIndex = -1;
    var separator = createElement("span", "flatpickr-time-separator", ":");
    var onInput = function (type) {
        var multiplier = multipliers[type];
        return function (e) {
            var eventTarget = getEventTarget(e);
            var newValue = parseInt(eventTarget.value) + (e.delta || 0);
            if (e.type === "blur" ||
                (e.key === "Enter" && !/[^\d]/.test(newValue.toString()))) {
                (events === null || events === void 0 ? void 0 : events.onTimeUpdate) &&
                    events.onTimeUpdate((newValue - value[type]) * multiplier);
            }
        };
    };
    var onIncrement = function (type) {
        return function () {
            (events === null || events === void 0 ? void 0 : events.onTimeUpdate) && events.onTimeUpdate(multipliers[type]);
        };
    };
    var onDecrement = function (type) {
        return function () {
            (events === null || events === void 0 ? void 0 : events.onTimeUpdate) && events.onTimeUpdate(-multipliers[type]);
        };
    };
    var hourInput = createNumberInput("flatpickr-hour", {
        "aria-label": config.locale.hourAriaLabel,
        value: value.hours,
        min: config.time_24hr ? 0 : 1,
        max: config.time_24hr ? 23 : 12,
        step: config.hourIncrement,
        maxlength: 2,
    }, {
        onInput: onInput("hours"),
        onIncrement: onIncrement("hours"),
        onDecrement: onDecrement("hours"),
    });
    var minuteInput = createNumberInput("flatpickr-minute", {
        "aria-label": config.locale.minuteAriaLabel,
        value: value.minutes,
        min: 0,
        max: 59,
        step: config.minuteIncrement,
        maxlength: 2,
    }, {
        onInput: onInput("minutes"),
        onIncrement: onIncrement("minutes"),
        onDecrement: onDecrement("minutes"),
    });
    container.appendChild(hourInput);
    container.appendChild(separator);
    container.appendChild(minuteInput);
    var secondInput;
    if (config.enableSeconds) {
        container.classList.add("hasSeconds");
        secondInput = createNumberInput("flatpickr-second", {
            "aria-label": config.locale.minuteAriaLabel,
            value: value.seconds,
            min: 0,
            max: 59,
            step: config.minuteIncrement,
            maxlength: 2,
        }, {
            onInput: onInput("seconds"),
            onIncrement: onIncrement("seconds"),
            onDecrement: onDecrement("seconds"),
        });
        container.appendChild(createElement("span", "flatpickr-time-separator", ":"));
        container.appendChild(secondInput);
    }
    if (!config.time_24hr) {
        var ampmInput = createElement("button", "flatpickr-am-pm", config.locale.amPM[int(isPM)]);
        ampmInput.title = config.locale.toggleTitle;
        ampmInput.tabIndex = -1;
        ampmInput.addEventListener("click", function () {
            return onUpdate(isPM ? -halfDay : halfDay);
        });
        container.appendChild(ampmInput);
    }
    containerWrapper.appendChild(container);
    return containerWrapper;
};
