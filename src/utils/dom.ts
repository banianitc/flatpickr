import { IncrementEvent } from "./index";

export function toggleClass(
  elem: HTMLElement,
  className: string,
  bool: boolean
) {
  if (bool === true) return elem.classList.add(className);
  elem.classList.remove(className);
}

export function createElement<T extends HTMLElement>(
  tag: keyof HTMLElementTagNameMap,
  className: string,
  content?: string
): T {
  const e = window.document.createElement(tag) as T;
  className = className || "";
  content = content || "";

  e.className = className;

  if (content !== undefined) e.textContent = content;

  return e;
}

export function clearNode(node: Node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function findParent(
  node: Element,
  condition: (n: Element) => boolean
): Element | undefined {
  if (condition(node)) return node;
  else if (node.parentNode)
    return findParent(node.parentNode as Element, condition);

  return undefined; // nothing found
}

export function createNumberInput(
  inputClassName: string,
  opts?: Record<string, any>,
  events?: {
    onIncrement?: () => void;
    onDecrement?: () => void;
    onInput?: (e: KeyboardEvent | IncrementEvent | FocusEvent) => void;
  }
) {
  const wrapper = createElement<HTMLDivElement>("div", "numInputWrapper"),
    numInput = createElement<HTMLInputElement>(
      "input",
      "numInput " + inputClassName
    ),
    arrowUp = createElement<HTMLSpanElement>("span", "arrowUp"),
    arrowDown = createElement<HTMLSpanElement>("span", "arrowDown");

  if (navigator.userAgent.indexOf("MSIE 9.0") === -1) {
    numInput.type = "number";
  } else {
    numInput.type = "text";
    numInput.pattern = "\\d*";
  }

  if (opts !== undefined)
    for (const key in opts) numInput.setAttribute(key, opts[key]);

  if (events?.onIncrement) {
    arrowUp.addEventListener("click", events.onIncrement);
  }
  if (events?.onDecrement) {
    arrowDown.addEventListener("click", events.onDecrement);
  }
  if (events?.onInput) {
    numInput.addEventListener("change", events.onInput);
    numInput.addEventListener("blur", events.onInput);
    numInput.addEventListener("keyup", events.onInput);
    numInput.addEventListener("increment", events.onInput);
  }

  wrapper.appendChild(numInput);
  wrapper.appendChild(arrowUp);
  wrapper.appendChild(arrowDown);

  return wrapper;
}

export function getEventTarget(event: Event): EventTarget | null {
  try {
    if (typeof event.composedPath === "function") {
      const path = event.composedPath();
      return path[0];
    }
    return event.target;
  } catch (error) {
    return event.target;
  }
}

export const createEvent = (name: string): Event => {
  const e = document.createEvent("Event");
  e.initEvent(name, true, true);
  return e;
};

/**
 * Increments/decrements the value of input associ-
 * ated with the up/down arrow by dispatching an
 * "increment" event on the input.
 *
 * @param {Event} e the click event
 * @param {Number} delta the diff (usually 1 or -1)
 * @param {Element} inputElem the input element
 */
export const incrementNumInput = (
  e: KeyboardEvent | MouseEvent | undefined,
  delta: number,
  inputElem?: HTMLInputElement
) => {
  const target = e && (getEventTarget(e) as Element);
  const input =
    inputElem || (target && target.parentNode && target.parentNode.firstChild);
  const event = createEvent("increment") as IncrementEvent;
  event.delta = delta;
  input && input.dispatchEvent(event);
};
