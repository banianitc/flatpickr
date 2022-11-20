import { IncrementEvent } from "./index";
export declare function toggleClass(elem: HTMLElement, className: string, bool: boolean): void;
export declare function createElement<T extends HTMLElement>(tag: keyof HTMLElementTagNameMap, className: string, content?: string): T;
export declare function clearNode(node: Node): void;
export declare function findParent(node: Element, condition: (n: Element) => boolean): Element | undefined;
export declare function createNumberInput(inputClassName: string, opts?: Record<string, any>, events?: {
    onIncrement?: () => void;
    onDecrement?: () => void;
    onInput?: (e: KeyboardEvent | IncrementEvent | FocusEvent | Event) => void;
}): HTMLDivElement;
export declare function getEventTarget(event: Event): EventTarget | null;
export declare const createEvent: (name: string) => Event;
export declare const incrementNumInput: (e: KeyboardEvent | MouseEvent | undefined, delta: number, inputElem?: HTMLInputElement | undefined) => void;
