import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "a", "blockquote", "br", "code", "div", "em", "h1", "h2", "h3", "hr", "img",
  "li", "ol", "p", "pre", "s", "span", "strong", "u", "ul",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
];

const allowedStyles = {
  span: {
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
  },
  p: {
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
  },
  h1: {
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
  },
  h2: {
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
  },
  h3: {
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
  },
  table: {
    width: [/^(?:[1-9]\d?|100)%$/, /^(?:[1-9]\d{0,2}|1000)px$/],
  },
  tr: {
    height: [/^(?:2\d|[3-9]\d|[1-4]\d{2}|500)px$/],
  },
  td: {
    "background-color": [/^#[0-9a-f]{6}$/i],
    "border-color": [/^#[0-9a-f]{6}$/i],
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
    "vertical-align": [/^(?:top|middle|bottom)$/],
    width: [/^(?:[1-9]\d?|100)%$/, /^(?:[1-9]\d{0,2}|1000)px$/],
  },
  th: {
    "background-color": [/^#[0-9a-f]{6}$/i],
    "border-color": [/^#[0-9a-f]{6}$/i],
    color: [/^#[0-9a-f]{3,8}$/i],
    "font-size": [/^(?:[6-9]|[1-6]\d|7[0-2])(?:px|pt)$/],
    "text-align": [/^(?:left|center|right|justify)$/],
    "vertical-align": [/^(?:top|middle|bottom)$/],
    width: [/^(?:[1-9]\d?|100)%$/, /^(?:[1-9]\d{0,2}|1000)px$/],
  },
  img: {
    transform: [/^translate\(-?\d{1,3}px,\s*-?\d{1,3}px\)$/],
  },
};

function preserveCellAttributes(tagName: "td" | "th", attributes: Record<string, string>) {
  const safeAttributes = { ...attributes };
  for (const attribute of ["data-cell-background", "data-cell-border"]) {
    if (
      safeAttributes[attribute] &&
      !/^#[0-9a-f]{6}$/i.test(safeAttributes[attribute])
    ) {
      delete safeAttributes[attribute];
    }
  }
  const firstWidth = safeAttributes.colwidth?.split(",")[0];
  if (!firstWidth || !/^\d{2,4}$/.test(firstWidth)) {
    return { tagName, attribs: safeAttributes };
  }
  const width = Number(firstWidth);
  if (width < 25 || width > 1000) {
    return { tagName, attribs: safeAttributes };
  }
  const existingStyle = safeAttributes.style ?? "";
  const style = /(?:^|;)\s*width\s*:/i.test(existingStyle)
    ? existingStyle
    : `${existingStyle}${existingStyle ? ";" : ""}width:${width}px`;
  return { tagName, attribs: { ...safeAttributes, style } };
}

export function sanitizeDocumentTemplateHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "name", "target"],
      div: ["data-document-page-margins"],
      img: [
        "src",
        "alt",
        "width",
        "height",
        "class",
        "data-alignment",
        "data-offset-x",
        "data-offset-y",
        "style",
      ],
      span: ["style", "class", "data-document-variable"],
      p: ["style", "class"],
      h1: ["style", "class"],
      h2: ["style", "class"],
      h3: ["style", "class"],
      table: ["style", "class"],
      tr: ["style", "class", "data-row-height"],
      td: [
        "style",
        "class",
        "colspan",
        "rowspan",
        "colwidth",
        "data-cell-background",
        "data-cell-border",
      ],
      th: [
        "style",
        "class",
        "colspan",
        "rowspan",
        "colwidth",
        "data-cell-background",
        "data-cell-border",
      ],
      "*": ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["data"] },
    allowedStyles,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
      div: (_tagName, attributes) => {
        const pageMargins = attributes["data-document-page-margins"] ?? "";
        const safeAttributes: Record<string, string> = {};
        if (
          /^\d{1,2},\d{1,2},\d{1,2},\d{1,2}$/.test(pageMargins) &&
          pageMargins.split(",").every((margin) => Number(margin) >= 5 && Number(margin) <= 50)
        ) {
          safeAttributes["data-document-page-margins"] = pageMargins;
        }
        return {
          tagName: "div",
          attribs: safeAttributes,
        };
      },
      td: (_tagName, attributes) => preserveCellAttributes("td", attributes),
      th: (_tagName, attributes) => preserveCellAttributes("th", attributes),
      img: (_tagName, attributes) => {
        const src = attributes.src ?? "";
        const safeImage =
          /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(
            src,
          );
        const safeUploadedImage =
          /^\/api\/documents\/template-images\/[A-Za-z0-9._-]{1,180}$/.test(
            src,
          );
        return {
          tagName: "img",
          attribs: safeImage || safeUploadedImage
            ? {
                src,
                alt: attributes.alt ?? "",
                ...(attributes.width && /^\d{1,4}$/.test(attributes.width)
                  ? { width: attributes.width }
                  : {}),
                ...(attributes.height && /^\d{1,4}$/.test(attributes.height)
                  ? { height: attributes.height }
                  : {}),
                ...(attributes.class ? { class: attributes.class } : {}),
                ...(attributes["data-alignment"] &&
                ["left", "center", "right"].includes(attributes["data-alignment"])
                  ? { "data-alignment": attributes["data-alignment"] }
                  : {}),
                ...(attributes["data-offset-x"] &&
                /^-?\d{1,3}$/.test(attributes["data-offset-x"])
                  ? { "data-offset-x": attributes["data-offset-x"] }
                  : {}),
                ...(attributes["data-offset-y"] &&
                /^-?\d{1,3}$/.test(attributes["data-offset-y"])
                  ? { "data-offset-y": attributes["data-offset-y"] }
                  : {}),
                ...(attributes.style &&
                /^transform:\s*translate\(-?\d{1,3}px,\s*-?\d{1,3}px\)$/i.test(
                  attributes.style,
                )
                  ? { style: attributes.style }
                  : {}),
              }
            : { alt: attributes.alt ?? "" },
        };
      },
    },
  });
}
