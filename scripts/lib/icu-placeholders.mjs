/**
 * Minimal ICU MessageFormat structure helpers.
 *
 * The locale generator translates whole strings through a lookup map. Those
 * maps were built by mechanical phrase replacement which also rewrote text
 * inside ICU syntax ("{value}" -> "{vaمقروءe}", "plural" -> "p已读ral",
 * "{total}" -> "{الإجمالي}"). next-intl then throws at render time.
 *
 * These helpers parse a message into text and argument nodes so the generator
 * can copy the *structure* (argument names, format types, plural/select
 * selectors) from the English source while keeping only the translated text.
 */

/**
 * @typedef {{ type: "text", value: string }} TextNode
 * @typedef {{ selector: string, message: Node[] }} IcuOption
 * @typedef {{ type: "arg", name: string, format: string | null, options: IcuOption[] | null, style: string | null }} ArgNode
 * @typedef {TextNode | ArgNode} Node
 */

const OPTION_FORMATS = new Set(["plural", "select", "selectordinal"]);

/**
 * Parse an ICU message into nodes. Tolerant of malformed argument names and
 * format keywords (they are just captured as-is) so a corrupted translation
 * can still be compared against its English source.
 * @param {string} input
 * @returns {Node[]}
 */
export function parseIcu(input) {
  let pos = 0;

  function parseMessage(stopAtBrace) {
    /** @type {Node[]} */
    const nodes = [];
    let text = "";
    while (pos < input.length) {
      const ch = input[pos];
      if (ch === "}" && stopAtBrace) break;
      if (ch === "{") {
        if (text) nodes.push({ type: "text", value: text });
        text = "";
        nodes.push(parseArgument());
        continue;
      }
      text += ch;
      pos++;
    }
    if (text) nodes.push({ type: "text", value: text });
    return nodes;
  }

  function parseArgument() {
    pos++; // consume "{"
    let name = "";
    while (pos < input.length && input[pos] !== "," && input[pos] !== "}") {
      name += input[pos++];
    }
    name = name.trim();
    if (input[pos] === "}") {
      pos++;
      return { type: "arg", name, format: null, options: null, style: null };
    }
    pos++; // consume ","
    let format = "";
    while (pos < input.length && input[pos] !== "," && input[pos] !== "}") {
      format += input[pos++];
    }
    format = format.trim();
    if (input[pos] === "}") {
      pos++;
      return { type: "arg", name, format, options: null, style: null };
    }
    pos++; // consume ","

    // Everything up to the matching "}" is either plural/select options or a
    // plain style string (e.g. "::percent"). Decide by looking for a "{".
    const rest = readBalancedUntilClosingBrace();
    if (OPTION_FORMATS.has(format) || rest.includes("{")) {
      return { type: "arg", name, format, options: parseOptions(rest), style: null };
    }
    return { type: "arg", name, format, options: null, style: rest.trim() };
  }

  function readBalancedUntilClosingBrace() {
    let depth = 0;
    let out = "";
    while (pos < input.length) {
      const ch = input[pos];
      if (ch === "{") depth++;
      if (ch === "}") {
        if (depth === 0) {
          pos++; // consume the argument's closing brace
          return out;
        }
        depth--;
      }
      out += ch;
      pos++;
    }
    return out;
  }

  /** @param {string} src */
  function parseOptions(src) {
    /** @type {IcuOption[]} */
    const options = [];
    let i = 0;
    while (i < src.length) {
      while (i < src.length && /\s/.test(src[i])) i++;
      if (i >= src.length) break;
      let selector = "";
      while (i < src.length && src[i] !== "{" && !/\s/.test(src[i])) selector += src[i++];
      while (i < src.length && /\s/.test(src[i])) i++;
      if (src[i] !== "{") break;
      let depth = 0;
      let j = i;
      for (; j < src.length; j++) {
        if (src[j] === "{") depth++;
        else if (src[j] === "}" && --depth === 0) break;
      }
      const body = src.slice(i + 1, j);
      options.push({ selector, message: parseIcu(body) });
      i = j + 1;
    }
    return options;
  }

  return parseMessage(false);
}

/**
 * @param {Node[]} nodes
 * @returns {string}
 */
export function serializeIcu(nodes) {
  return nodes
    .map((node) => {
      if (node.type === "text") return node.value;
      if (!node.format) return `{${node.name}}`;
      if (node.options) {
        const opts = node.options
          .map((o) => `${o.selector} {${serializeIcu(o.message)}}`)
          .join(" ");
        return `{${node.name}, ${node.format}, ${opts}}`;
      }
      if (node.style) return `{${node.name}, ${node.format}, ${node.style}}`;
      return `{${node.name}, ${node.format}}`;
    })
    .join("");
}

/**
 * Flat list of argument "heads" ({name, format, selectors}) in document order,
 * including arguments nested inside plural/select options.
 * @param {Node[]} nodes
 * @returns {{ name: string, format: string | null, selectors: string[] | null }[]}
 */
export function collectIcuArguments(nodes) {
  const out = [];
  for (const node of nodes) {
    if (node.type !== "arg") continue;
    out.push({
      name: node.name,
      format: node.format,
      selectors: node.options ? node.options.map((o) => o.selector) : null,
    });
    if (node.options) {
      for (const option of node.options) out.push(...collectIcuArguments(option.message));
    }
  }
  return out;
}

/**
 * Structural shape used to decide whether two messages can be zipped.
 * @param {Node[]} nodes
 * @returns {string}
 */
function shape(nodes) {
  return nodes
    .filter((n) => n.type === "arg")
    .map((n) => (n.options ? `A[${n.options.map((o) => shape(o.message)).join("|")}]` : "A"))
    .join(",");
}

/**
 * Copy argument names, format types, styles and selectors from `source` onto
 * `translated`, keeping the translated text. Returns null when the two
 * messages do not have the same argument structure (e.g. the translation lost
 * a placeholder) so the caller can fall back safely.
 * @param {Node[]} source
 * @param {Node[]} translated
 * @returns {Node[] | null}
 */
export function restoreIcuStructure(source, translated) {
  if (shape(source) !== shape(translated)) return null;
  const srcArgs = source.filter((n) => n.type === "arg");
  let idx = 0;
  return translated.map((node) => {
    if (node.type === "text") return node;
    const src = /** @type {ArgNode} */ (srcArgs[idx++]);
    /** @type {ArgNode} */
    const fixed = {
      type: "arg",
      name: src.name,
      format: src.format,
      style: src.style,
      options: null,
    };
    if (src.options && node.options) {
      fixed.options = src.options.map((srcOpt, i) => {
        const trOpt = /** @type {IcuOption} */ (node.options?.[i]);
        return {
          selector: srcOpt.selector,
          message: restoreIcuStructure(srcOpt.message, trOpt.message) ?? srcOpt.message,
        };
      });
    }
    return fixed;
  });
}

/**
 * Repair the ICU structure of a translated string against its English source.
 * Falls back to the English string when the structures are incompatible.
 * @param {string} source English message
 * @param {string} translated Mechanically translated message
 * @returns {{ value: string, fellBack: boolean }}
 */
export function protectIcuPlaceholders(source, translated) {
  if (!source.includes("{")) return { value: translated, fellBack: false };
  const restored = restoreIcuStructure(parseIcu(source), parseIcu(translated));
  if (!restored) return { value: source, fellBack: true };
  return { value: serializeIcu(restored), fellBack: false };
}

const ARG_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KNOWN_FORMATS = new Set([
  "plural",
  "select",
  "selectordinal",
  "number",
  "date",
  "time",
  "list",
]);

/**
 * Compare a translated message's ICU arguments to the English source. Returns
 * a list of human-readable problems (empty when the message is sound).
 * @param {string} source
 * @param {string} translated
 * @returns {string[]}
 */
export function findIcuProblems(source, translated) {
  const problems = [];
  const src = collectIcuArguments(parseIcu(source));
  const tr = collectIcuArguments(parseIcu(translated));
  if (src.length !== tr.length) {
    problems.push(`expected ${src.length} placeholder(s), found ${tr.length}`);
    return problems;
  }
  src.forEach((s, i) => {
    const t = tr[i];
    if (!ARG_NAME_RE.test(t.name)) problems.push(`invalid argument name "{${t.name}}"`);
    else if (t.name !== s.name) problems.push(`argument "{${s.name}}" became "{${t.name}}"`);
    if ((s.format ?? null) !== (t.format ?? null)) {
      problems.push(`format "${s.format}" became "${t.format}" for {${s.name}}`);
    } else if (t.format && !KNOWN_FORMATS.has(t.format)) {
      problems.push(`unknown format "${t.format}" for {${s.name}}`);
    }
    if (s.selectors && (!t.selectors || s.selectors.join("|") !== t.selectors.join("|"))) {
      problems.push(`selectors for {${s.name}} changed to ${JSON.stringify(t.selectors)}`);
    }
  });
  return problems;
}
