export function el(tag, attributes = {}, ...children) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
        if (value === undefined || value === null)
            continue;
        if (typeof value === 'boolean' && (name === 'draggable' || name === 'spellcheck' || name === 'contenteditable' || name.startsWith('aria-'))) {
            node.setAttribute(name, String(value));
            continue;
        }
        if (value === false)
            continue;
        if (name === 'class')
            node.className = String(value);
        else if (name.startsWith('on') && typeof value === 'function')
            node.addEventListener(name.slice(2).toLowerCase(), value);
        else if (name === 'value' && ('value' in node))
            node.value = String(value);
        else if (name === 'checked' && node instanceof HTMLInputElement)
            node.checked = Boolean(value);
        else
            node.setAttribute(name, value === true ? '' : String(value));
    }
    for (const child of children.flat())
        if (child !== null && child !== undefined && child !== false)
            node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    return node;
}
export function svg(tag, attrs = {}, ...children) {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs))
        node.setAttribute(key, String(value));
    children.forEach(child => node.append(child instanceof Node ? child : document.createTextNode(child)));
    return node;
}
export function replace(node, ...children) { node.replaceChildren(); for (const child of children.flat())
    if (child !== null && child !== undefined && child !== false)
        node.append(child instanceof Node ? child : document.createTextNode(String(child))); }
