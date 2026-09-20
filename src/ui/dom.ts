/** Tiny helpers so screen modules read as markup rather than DOM plumbing. */

export interface ElementOptions {
  readonly className?: string;
  readonly text?: string;
  readonly html?: never;
  readonly attrs?: Readonly<Record<string, string>>;
  readonly children?: readonly (Node | string | null | undefined)[];
  readonly onClick?: (event: MouseEvent) => void;
}

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attrs !== undefined) {
    for (const [name, value] of Object.entries(options.attrs)) node.setAttribute(name, value);
  }
  if (options.children !== undefined) {
    for (const child of options.children) {
      if (child === null || child === undefined) continue;
      node.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
  }
  if (options.onClick !== undefined) {
    const handler = options.onClick;
    node.addEventListener('click', (event) => {
      handler(event as MouseEvent);
    });
  }
  return node;
}

/** Button with a sensible default type so it never submits a form by accident. */
export function button(
  label: string,
  options: ElementOptions & { readonly variant?: string; readonly type?: 'button' | 'submit' } = {},
): HTMLButtonElement {
  const classes = ['btn', options.variant ?? 'btn-secondary', options.className]
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ');
  const node = el('button', { ...options, className: classes, text: label });
  node.type = options.type ?? 'button';
  return node;
}

export function clear(node: Element): void {
  while (node.firstChild !== null) node.removeChild(node.firstChild);
}

/**
 * Remembers which control had focus so a re-render does not drop the caret
 * mid-sentence. Elements opt in with a `data-focus-id` attribute.
 */
export interface FocusSnapshot {
  readonly key: string;
  readonly selectionStart: number | null;
  readonly selectionEnd: number | null;
}

export function captureFocus(root: ParentNode): FocusSnapshot | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !root.contains(active)) return null;
  const key = active.dataset['focusId'];
  if (key === undefined) return null;
  if (active instanceof HTMLInputElement) {
    return { key, selectionStart: active.selectionStart, selectionEnd: active.selectionEnd };
  }
  return { key, selectionStart: null, selectionEnd: null };
}

export function restoreFocus(root: ParentNode, snapshot: FocusSnapshot | null): void {
  if (snapshot === null) return;
  const target = root.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(snapshot.key)}"]`);
  if (target === null) return;
  target.focus();
  if (target instanceof HTMLInputElement && snapshot.selectionStart !== null) {
    try {
      target.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
    } catch {
      // Input types such as `email` reject selection ranges; not important here.
    }
  }
}
