(() => {
  "use strict";

  const MENU_ITEM_ATTR = "data-qa";
  const MENU_ITEM_VALUE = "copy_as_markdown";
  const MENU_ITEM_SELECTION_VALUE = "copy_selection_as_markdown";

  // ── DOM → Markdown conversion ──────────────────────────────

  function findMessageContainer(element) {
    return element.closest('[data-qa="message_container"]');
  }

  function messageToMarkdown(container) {
    const textBlock = container.querySelector('[data-qa="message-text"]');
    if (!textBlock) return null;

    const richTextBlock = textBlock.querySelector(".p-rich_text_block");
    if (!richTextBlock) return textBlock.textContent.trim();

    const raw = convertNode(richTextBlock);
    // Collapse 3+ consecutive newlines into 2 (one blank line)
    return raw.replace(/\n{3,}/g, "\n\n").trim();
  }

  function convertNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const el = node;

    if (el.getAttribute("data-stringify-ignore") === "true") {
      return "";
    }

    // Skip "(edited)" label
    if (el.classList.contains("c-message__edited_label")) {
      return "";
    }

    // Emoji
    if (el.matches('[data-stringify-type="emoji"]')) {
      return el.getAttribute("data-stringify-emoji") || el.getAttribute("alt") || el.textContent;
    }

    // Inline code
    if (el.matches('code.c-mrkdwn__code, [data-stringify-type="code"]')) {
      return "`" + el.textContent + "`";
    }

    // Code block
    if (el.matches(".c-mrkdwn__pre, pre")) {
      return "\n```\n" + el.textContent + "\n```\n";
    }

    // Blockquote
    if (el.matches(".c-mrkdwn__quote")) {
      const lines = convertChildren(el).split("\n");
      return "\n" + lines.map((l) => "> " + l).join("\n") + "\n";
    }

    // Links
    if (el.tagName === "A" && el.classList.contains("c-link")) {
      const url =
        el.getAttribute("data-stringify-link") ||
        el.getAttribute("href") ||
        "";
      const text = el.textContent.trim();

      if (
        el.classList.contains("c-mrkdwn__mention") ||
        el.classList.contains("c-mrkdwn__broadcast--mention") ||
        el.classList.contains("c-member_slug--link") ||
        el.classList.contains("c-mrkdwn__channel--link")
      ) {
        return text;
      }

      if (text === url) return url;
      return "[" + text + "](" + url + ")";
    }

    // Lists
    if (
      el.matches(
        '.p-rich_text_list__bullet, [data-stringify-type="unordered-list"]'
      )
    )
      return "\n" + convertListItems(el, "ul") + "\n";

    if (
      el.matches(
        '.p-rich_text_list__ordered, [data-stringify-type="ordered-list"]'
      )
    )
      return "\n" + convertListItems(el, "ol") + "\n";

    if (
      el.matches(
        '.p-rich_text_list__check, [data-stringify-type="check-list"]'
      )
    )
      return "\n" + convertListItems(el, "check") + "\n";

    // Line break
    if (el.tagName === "BR" || el.classList.contains("c-mrkdwn__br")) {
      return "\n";
    }

    // Rich text section
    if (el.classList.contains("p-rich_text_section")) {
      return convertChildren(el) + "\n";
    }

    // Bold
    if (
      el.style.fontWeight === "bold" ||
      el.style.fontWeight === "700" ||
      el.tagName === "B" ||
      el.tagName === "STRONG"
    ) {
      return "**" + convertChildren(el) + "**";
    }

    // Italic
    if (
      el.style.fontStyle === "italic" ||
      el.tagName === "I" ||
      el.tagName === "EM"
    ) {
      return "_" + convertChildren(el) + "_";
    }

    // Strikethrough
    if (
      el.style.textDecoration?.includes("line-through") ||
      el.tagName === "S" ||
      el.tagName === "DEL" ||
      el.tagName === "STRIKE"
    ) {
      return "~" + convertChildren(el) + "~";
    }

    return convertChildren(el);
  }

  function convertChildren(el) {
    let result = "";
    for (const child of el.childNodes) {
      result += convertNode(child);
    }
    return result;
  }

  function convertListItems(listEl, type) {
    const items = listEl.querySelectorAll(":scope > li");
    const lines = [];
    let counter = 1;

    items.forEach((li) => {
      const indent = parseInt(li.getAttribute("data-stringify-indent") || "0");
      const prefix = "    ".repeat(indent);
      const content = convertChildren(li).trim();

      if (type === "ul") {
        lines.push(prefix + "- " + content);
      } else if (type === "ol") {
        lines.push(prefix + counter + ". " + content);
        counter++;
      } else if (type === "check") {
        const checked = li.querySelector(
          '.p-rich_text_list__check_icon--checked, [data-checked="true"]'
        );
        const checkbox = checked ? "[x]" : "[ ]";
        lines.push(prefix + "- " + checkbox + " " + content);
      }
    });

    return lines.join("\n");
  }

  // ── Selection → Markdown conversion ────────────────────────

  function selectionToMarkdown() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    // Clone the selected fragment so we can walk it without side effects
    const fragment = range.cloneContents();

    // Wrap in a temporary container to use convertNode
    const temp = document.createElement("div");
    temp.appendChild(fragment);

    // If the selection is entirely within a rich text block, convert directly.
    // Otherwise, walk children.
    let raw = "";
    for (const child of temp.childNodes) {
      raw += convertNode(child);
    }

    const result = raw.replace(/\n{3,}/g, "\n\n").trim();
    return result || null;
  }

  // ── Clipboard ──────────────────────────────────────────────

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  // ── Toast ──────────────────────────────────────────────────

  function showToast(message) {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "#1264a3",
      color: "#fff",
      padding: "8px 16px",
      borderRadius: "8px",
      fontSize: "13px",
      zIndex: "999999",
      opacity: "1",
      transition: "opacity 0.3s",
    });
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 1500);
  }

  // ── Browser context menu handler ──────────────────────────

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "copy_selection_as_markdown") {
      const markdown = selectionToMarkdown();
      if (!markdown) {
        showToast("No text selected");
        return;
      }
      copyToClipboard(markdown);
      showToast("Copied selection as Markdown!");
    }
  });

  // ── Slack menu injection ───────────────────────────────────

  // Track which message the menu was opened for
  let targetMessageContainer = null;

  // Track hovered message
  document.addEventListener(
    "mouseover",
    (e) => {
      const container = findMessageContainer(e.target);
      if (container) {
        targetMessageContainer = container;
      }
    },
    { passive: true }
  );

  // Inject a <style> for our menu item hover (Slack's React won't apply
  // highlight classes to elements it doesn't manage)
  function injectStyles() {
    if (document.getElementById("slack-md-copy-styles")) return;
    const style = document.createElement("style");
    style.id = "slack-md-copy-styles";
    style.textContent = `
      [data-qa="${MENU_ITEM_VALUE}"],
      [data-qa="${MENU_ITEM_SELECTION_VALUE}"] {
        cursor: pointer !important;
        pointer-events: auto !important;
      }
      [data-qa="${MENU_ITEM_VALUE}"]:hover,
      [data-qa="${MENU_ITEM_VALUE}"]:focus,
      [data-qa="${MENU_ITEM_SELECTION_VALUE}"]:hover,
      [data-qa="${MENU_ITEM_SELECTION_VALUE}"]:focus {
        background-color: var(--sk_highlight, #1264a3) !important;
        color: #fff !important;
      }
      [data-qa="${MENU_ITEM_VALUE}"]:hover .c-menu_item__icon,
      [data-qa="${MENU_ITEM_VALUE}"]:focus .c-menu_item__icon,
      [data-qa="${MENU_ITEM_SELECTION_VALUE}"]:hover .c-menu_item__icon,
      [data-qa="${MENU_ITEM_SELECTION_VALUE}"]:focus .c-menu_item__icon {
        color: #fff !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Create our custom menu item matching Slack's exact structure
  function createMenuItem() {
    injectStyles();

    const wrapper = document.createElement("div");
    wrapper.className = "c-menu_item__li";
    wrapper.setAttribute(MENU_ITEM_ATTR, MENU_ITEM_VALUE + "-wrapper");

    const button = document.createElement("button");
    button.className =
      "c-button-unstyled c-menu_item__button c-menu_item--compact";
    button.setAttribute(MENU_ITEM_ATTR, MENU_ITEM_VALUE);
    button.setAttribute("role", "menuitem");
    button.setAttribute("tabindex", "-1");
    button.type = "button";

    const icon = document.createElement("div");
    icon.className = "c-menu_item__icon";
    icon.setAttribute("data-qa", "menu_item_icon");
    icon.setAttribute("role", "presentation");
    // Markdown icon (M↓ style)
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true" class="">
      <path fill="currentColor" fill-rule="evenodd" d="M3.5 4A1.5 1.5 0 002 5.5v9A1.5 1.5 0 003.5 16h13a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0016.5 4h-13zM5 12.5v-5h1.5l1.5 2 1.5-2H11v5H9.5V9.75L8 11.75l-1.5-2V12.5H5zm8.5 0l-2-2.5h1.5v-3h1v3H15.5l-2 2.5z" clip-rule="evenodd"/>
    </svg>`;

    const label = document.createElement("div");
    label.className = "c-menu_item__label";
    label.textContent = "Copy message as Markdown";

    button.appendChild(icon);
    button.appendChild(label);
    wrapper.appendChild(button);

    // When hovering our item, remove Slack's highlight from other items
    wrapper.addEventListener("mouseenter", () => {
      const menu = wrapper.closest(".c-menu__items");
      if (menu) {
        menu
          .querySelectorAll(".c-menu_item__button--highlighted")
          .forEach((el) =>
            el.classList.remove("c-menu_item__button--highlighted")
          );
      }
    });

    // Handle click — use mousedown to beat Slack's event handling
    const handleAction = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!targetMessageContainer) {
        showToast("Message not found");
        return;
      }

      const markdown = messageToMarkdown(targetMessageContainer);
      if (!markdown) {
        showToast("No text content found");
        return;
      }

      await copyToClipboard(markdown);
      showToast("Copied as Markdown!");

      // Close the menu by clicking the ReactModal overlay
      const overlay = document.querySelector(
        ".ReactModal__Overlay.ReactModal__Overlay--after-open"
      );
      if (overlay) {
        overlay.click();
      }
    };

    button.addEventListener("mousedown", handleAction, true);
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    return wrapper;
  }

  // Create menu item for copying selection as Markdown
  function createSelectionMenuItem() {
    injectStyles();

    const wrapper = document.createElement("div");
    wrapper.className = "c-menu_item__li";
    wrapper.setAttribute(MENU_ITEM_ATTR, MENU_ITEM_SELECTION_VALUE + "-wrapper");

    const button = document.createElement("button");
    button.className =
      "c-button-unstyled c-menu_item__button c-menu_item--compact";
    button.setAttribute(MENU_ITEM_ATTR, MENU_ITEM_SELECTION_VALUE);
    button.setAttribute("role", "menuitem");
    button.setAttribute("tabindex", "-1");
    button.type = "button";

    const icon = document.createElement("div");
    icon.className = "c-menu_item__icon";
    icon.setAttribute("data-qa", "menu_item_icon");
    icon.setAttribute("role", "presentation");
    // Selection + Markdown icon
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true" class="">
      <path fill="currentColor" fill-rule="evenodd" d="M3.5 4A1.5 1.5 0 002 5.5v9A1.5 1.5 0 003.5 16h13a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0016.5 4h-13zM5 12.5v-5h1.5l1.5 2 1.5-2H11v5H9.5V9.75L8 11.75l-1.5-2V12.5H5zm8.5 0l-2-2.5h1.5v-3h1v3H15.5l-2 2.5z" clip-rule="evenodd"/>
    </svg>`;

    const label = document.createElement("div");
    label.className = "c-menu_item__label";
    label.textContent = "Copy selected message as Markdown";

    button.appendChild(icon);
    button.appendChild(label);
    wrapper.appendChild(button);

    wrapper.addEventListener("mouseenter", () => {
      const menu = wrapper.closest(".c-menu__items");
      if (menu) {
        menu
          .querySelectorAll(".c-menu_item__button--highlighted")
          .forEach((el) =>
            el.classList.remove("c-menu_item__button--highlighted")
          );
      }
    });

    const handleAction = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const markdown = selectionToMarkdown();
      if (!markdown) {
        showToast("No text selected");
        return;
      }

      await copyToClipboard(markdown);
      showToast("Copied selection as Markdown!");

      const overlay = document.querySelector(
        ".ReactModal__Overlay.ReactModal__Overlay--after-open"
      );
      if (overlay) {
        overlay.click();
      }
    };

    button.addEventListener("mousedown", handleAction, true);
    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, true);

    return wrapper;
  }

  // Watch for Slack's message action menu appearing in the DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;

        // Slack renders the menu inside a ReactModal popover
        // Look for .p-message_actions_menu or [data-qa="menu"]
        const menus = [];

        if (
          node.matches?.(
            '.p-message_actions_menu, [data-qa="menu"]'
          )
        ) {
          menus.push(node);
        }

        const found = node.querySelectorAll?.(
          '.p-message_actions_menu, [data-qa="menu"]'
        );
        if (found) {
          menus.push(...found);
        }

        for (const menu of menus) {
          // Verify it's a message actions menu by checking for known items
          const copyTextBtn = menu.querySelector(
            '[data-qa="copy_text"], [data-qa="copy_link"]'
          );
          if (!copyTextBtn) continue;

          // Don't inject twice
          if (menu.querySelector(`[${MENU_ITEM_ATTR}="${MENU_ITEM_VALUE}"]`))
            continue;

          // Find the "Copy message" (copy_text) item to insert after
          const copyTextItem = menu.querySelector(
            '[data-qa="copy_text-wrapper"], [data-qa="copy_text"]'
          );
          const insertTarget =
            copyTextItem?.closest(".c-menu_item__li") || copyTextItem;

          const menuItem = createMenuItem();
          const selectionMenuItem = createSelectionMenuItem();

          if (insertTarget && insertTarget.nextSibling) {
            insertTarget.parentNode.insertBefore(
              menuItem,
              insertTarget.nextSibling
            );
            // Insert selection item right after the full-message item
            menuItem.parentNode.insertBefore(
              selectionMenuItem,
              menuItem.nextSibling
            );
          } else if (insertTarget) {
            insertTarget.parentNode.appendChild(menuItem);
            insertTarget.parentNode.appendChild(selectionMenuItem);
          } else {
            // Fallback: insert into .c-menu__items
            const itemsContainer =
              menu.querySelector(".c-menu__items") || menu;
            itemsContainer.appendChild(menuItem);
            itemsContainer.appendChild(selectionMenuItem);
          }

          // Show/hide selection item based on whether text is selected
          const hasSelection = !window.getSelection()?.isCollapsed;
          selectionMenuItem.style.display = hasSelection ? "" : "none";
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // ── Send confirmation ──────────────────────────────────────

  let sendPreviewEnabled = true;
  chrome.storage.sync.get({ sendPreviewEnabled: true }, (data) => {
    sendPreviewEnabled = data.sendPreviewEnabled;
  });
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.sendPreviewEnabled) {
      sendPreviewEnabled = changes.sendPreviewEnabled.newValue;
    }
  });

  // Rich elements in the editor (mentions, emoji, links) and already-parsed
  // inline tokens are swapped for private-use placeholders, so the markup
  // parser treats them as opaque characters and cannot break their HTML.
  const ATOM_OPEN = "";
  const ATOM_CLOSE = "";

  function createAtomStore() {
    const atoms = [];
    const atomRe = /(\d+)/g;
    return {
      add(html) {
        atoms.push(html);
        return ATOM_OPEN + (atoms.length - 1) + ATOM_CLOSE;
      },
      restore(s) {
        // Atoms can nest (e.g. a mention inside link text)
        while (s.includes(ATOM_OPEN)) {
          s = s.replace(atomRe, (_, n) => atoms[n]);
        }
        return s;
      },
    };
  }

  const escapeHtml = (s) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const SAFE_URL_RE = /^(?:https?:|mailto:)/i;

  function renderLink(url, innerHtml) {
    const href = escapeHtml(url);
    return (
      `<a target="_blank" class="c-link" data-stringify-link="${href}" href="${href}"` +
      ` rel="noopener noreferrer">${innerHtml}</a>`
    );
  }

  // The editor marks resolved users, user groups, broadcasts and channels
  // alike as <ts-mention>, carrying the same c-member_slug classes Slack
  // uses for the sent message.
  function renderMention(el) {
    const label = el.getAttribute("data-label") || el.textContent;
    const classes = [...el.classList]
      .filter((c) => c === "c-link" || c.startsWith("c-member_slug"))
      .join(" ");
    return `<span class="c-link ${classes}">${escapeHtml(label)}</span>`;
  }

  function renderEmoji(img) {
    const name = img.getAttribute("data-stringify-text") || img.getAttribute("data-id") || "";
    const bgUrl = (img.style.backgroundImage.match(/url\(["']?([^"')]+)["']?\)/) || [])[1];
    if (!bgUrl) return escapeHtml(name);
    const label = escapeHtml(name.replace(/^:|:$/g, ""));
    return (
      `<span class="c-emoji c-emoji__medium c-emoji--inline" data-qa="emoji">` +
      `<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"` +
      ` aria-label="${label} emoji" alt="${escapeHtml(name)}" data-stringify-type="emoji"` +
      ` style="background-image: url(&quot;${escapeHtml(bgUrl)}&quot;);" class="emoji">` +
      `</span>`
    );
  }

  // Convert the editor DOM into Slack markup text, one line per block.
  function editorToMarkup(editor, atoms) {
    const lines = [];
    for (const child of editor.childNodes) {
      // Quill renders an empty line as <p><br></p>
      lines.push(inlineToMarkup(child, atoms).replace(/\n$/, ""));
    }
    return lines.join("\n");
  }

  function inlineToMarkup(node, atoms) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent;
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    if (node.tagName === "TS-MENTION") return atoms.add(renderMention(node));
    if (node.tagName === "IMG" && node.classList.contains("emoji")) {
      return atoms.add(renderEmoji(node));
    }
    if (node.tagName === "BR") return "\n";
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (SAFE_URL_RE.test(href)) {
        return atoms.add(renderLink(href, escapeHtml(node.textContent)));
      }
    }
    let text = "";
    for (const child of node.childNodes) text += inlineToMarkup(child, atoms);
    return text;
  }

  // Code spans and links are tokenized in a single pass so that formatting
  // characters inside them (e.g. `_` or `#` in a URL) are left untouched.
  const INLINE_TOKEN_RE = new RegExp(
    [
      /`([^`\n]+)`/.source,
      /\[([^\]\n]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)/.source,
      /<((?:https?:\/\/|mailto:)[^|>\s]+)(?:\|([^>\n]+))?>/.source,
      /(?<![\w\/])(https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]])/.source,
    ].join("|"),
    "g"
  );

  // Slack only treats a marker as formatting at word boundaries,
  // so snake_case or 2*3*4 stays as typed.
  const emphasisRe = (m) =>
    new RegExp(`(^|[^\\w${m}])${m}(?=\\S)([^${m}\\n]*?\\S)${m}(?![\\w${m}])`, "g");
  const BOLD_RE = emphasisRe("\\*");
  const ITALIC_RE = emphasisRe("_");
  const STRIKE_RE = emphasisRe("~");

  function renderInline(raw, atoms) {
    const tokenized = raw.replace(
      INLINE_TOKEN_RE,
      (m, code, linkText, linkUrl, angleUrl, angleText, bareUrl) => {
        if (code !== undefined) {
          return atoms.add(
            `<code data-stringify-type="code" class="c-mrkdwn__code">${escapeHtml(code)}</code>`
          );
        }
        if (linkUrl !== undefined) {
          return atoms.add(renderLink(linkUrl, renderInline(linkText, atoms)));
        }
        if (angleUrl !== undefined) {
          return atoms.add(renderLink(angleUrl, escapeHtml(angleText ?? angleUrl)));
        }
        return atoms.add(renderLink(bareUrl, escapeHtml(bareUrl)));
      }
    );
    return escapeHtml(tokenized)
      .replace(BOLD_RE, '$1<b data-stringify-type="bold">$2</b>')
      .replace(ITALIC_RE, '$1<i data-stringify-type="italic">$2</i>')
      .replace(STRIKE_RE, '$1<s data-stringify-type="strike">$2</s>');
  }

  // Render Slack markup text to HTML matching Slack's rendered message structure.
  function renderSlackMarkdown(text, atoms) {
    const lines = text.split("\n");
    const parts = []; // collected into one p-rich_text_block
    let i = 0;

    const FENCE = "```";

    while (i < lines.length) {
      const line = lines[i];

      // Code block (```...```), which may open and close on the same line
      if (line.trimStart().startsWith(FENCE)) {
        const rest = lines.slice(i).join("\n");
        const start = rest.indexOf(FENCE);
        const end = rest.indexOf(FENCE, start + FENCE.length);
        if (end !== -1) {
          const code = rest
            .slice(start + FENCE.length, end)
            .replace(/^\n/, "")
            .replace(/\n$/, "");
          parts.push(
            '<pre class="c-mrkdwn__pre" data-stringify-type="pre">' +
              '<div class="p-rich_text_block--no-overflow">' +
              escapeHtml(code) +
              "</div></pre>"
          );
          const after = rest.slice(end + FENCE.length).replace(/^\n/, "");
          lines.splice(i, lines.length - i, ...(after ? after.split("\n") : []));
          continue;
        }
      }

      // Blockquote: >>> quotes the rest of the message, > a single line
      if (line.startsWith(">")) {
        const quoteLines = [];
        if (line.startsWith(">>>")) {
          quoteLines.push(line.slice(3).replace(/^ /, ""), ...lines.slice(i + 1));
          i = lines.length;
        } else {
          while (i < lines.length && lines[i].startsWith(">")) {
            quoteLines.push(lines[i].replace(/^> ?/, ""));
            i++;
          }
        }
        parts.push(
          '<blockquote type="cite" class="c-mrkdwn__quote" data-stringify-type="quote">' +
            quoteLines
              .map((l) => renderInline(l, atoms))
              .join('<br aria-hidden="true">') +
            "</blockquote>"
        );
        continue;
      }

      // Lists (- item, • item, * item, 1. item)
      if (/^(\s*)([-•*]|\d+\.) /.test(line)) {
        parts.push(parseList(lines));
        continue;
      }

      // Empty line → paragraph break
      if (line.trim() === "") {
        parts.push(
          '<div class="p-rich_text_section">' +
            '<span aria-label="&nbsp;" class="c-mrkdwn__br" data-stringify-type="paragraph-break"></span>' +
            "</div>"
        );
        i++;
        continue;
      }

      // Normal text section
      parts.push(
        '<div class="p-rich_text_section">' +
          renderInline(line, atoms) +
          '<br aria-hidden="true"></div>'
      );
      i++;
    }

    return atoms.restore(
      '<div class="c-message_kit__blocks c-message_kit__blocks--rich_text">' +
        '<div class="c-message__message_blocks c-message__message_blocks--rich_text">' +
        '<div class="p-block_kit_renderer">' +
        '<div class="p-block_kit_renderer__block_wrapper p-block_kit_renderer__block_wrapper--first">' +
        '<div class="p-rich_text_block" dir="auto">' +
        parts.join("") +
        "</div></div></div></div></div>"
    );

    // Parse a list block (unordered or ordered) with nesting support.
    // Mixed ol/ul nesting is handled by collecting any list line deeper than
    // the current indent and recording each item's own type.
    function parseList(allLines) {
      const ulTest = /^(\s*)[-•*] /;
      const olTest = /^(\s*)\d+\. /;

      function lineType(line) {
        if (ulTest.test(line)) return "unordered";
        if (olTest.test(line)) return "ordered";
        return null;
      }

      function lineIndent(line) {
        return Math.floor(line.match(/^(\s*)/)[1].length / 2);
      }

      function lineContent(line, t) {
        return t === "unordered"
          ? line.match(/^(\s*)[-•*] (.*)$/)[2]
          : line.match(/^(\s*)\d+\. (.*)$/)[2];
      }

      // Collect all contiguous list lines (any type, any indent)
      const baseIndent = lineIndent(allLines[i]);
      const items = [];
      while (i < allLines.length) {
        const lt = lineType(allLines[i]);
        if (!lt) break;
        // Stop if we return to a shallower indent than the block started at
        if (lineIndent(allLines[i]) < baseIndent) break;
        // A different list type at the top level starts a separate list
        if (lineIndent(allLines[i]) === baseIndent && items.length > 0 &&
            lt !== items[0].type) break;
        items.push({
          indent: lineIndent(allLines[i]),
          type: lt,
          content: lineContent(allLines[i], lt),
        });
        i++;
      }

      return buildNestedList(items, 0);
    }

    function buildNestedList(items, startIdx) {
      // Determine the tag/attrs from the first item at this level
      const firstItem = items[startIdx];
      const tag = firstItem.type === "unordered" ? "ul" : "ol";
      const typeAttr =
        firstItem.type === "unordered" ? "unordered-list" : "ordered-list";
      const cssClass =
        firstItem.type === "unordered"
          ? "p-rich_text_list__bullet"
          : "p-rich_text_list__ordered";
      const baseIndent = firstItem.indent;

      let html =
        `<${tag} data-stringify-type="${typeAttr}" data-list-tree="true"` +
        ` class="p-rich_text_list ${cssClass} p-rich_text_list--nested"` +
        ` data-indent="${baseIndent}" data-border="0">`;

      let j = startIdx;
      while (j < items.length) {
        const item = items[j];
        if (item.indent < baseIndent) break;
        if (item.indent > baseIndent) {
          // Belongs to a child group — skip (handled recursively below)
          j++;
          continue;
        }

        html +=
          `<li data-stringify-indent="${item.indent}" data-stringify-border="0">` +
          renderInline(item.content, atoms);

        // Collect child items (deeper indent)
        const childStart = j + 1;
        if (childStart < items.length && items[childStart].indent > item.indent) {
          // Find extent of this child group
          let k = childStart;
          while (k < items.length && items[k].indent > item.indent) k++;
          html += buildNestedList(items, childStart);
          j = k;
        } else {
          j++;
        }

        html += "</li>";
      }

      html += `</${tag}>`;
      return html;
    }
  }

  const DRAFT_FILE_SELECTOR = ".p-multi_file_upload__file_container";
  const DRAFT_UNFURL_SELECTOR = ".p-draft_unfurls__unfurl";

  function findAttachments(composer) {
    const container = composer.closest(".c-wysiwyg_container");
    if (!container) return { files: [], unfurls: [] };
    return {
      files: [...container.querySelectorAll(DRAFT_FILE_SELECTOR)],
      unfurls: [...container.querySelectorAll(DRAFT_UNFURL_SELECTOR)],
    };
  }

  function renderAttachments(composer) {
    const { files, unfurls } = findAttachments(composer);
    if (files.length === 0 && unfurls.length === 0) return null;

    const root = document.createElement("div");
    root.className = "slack-utils--preview-attachments";

    for (const file of files) {
      const name = file.querySelector('[role="group"]')?.getAttribute("aria-label") || "";
      const thumb = file.querySelector(".p-file_thumbnail__container--image img");
      if (thumb) {
        const img = document.createElement("img");
        img.className = "slack-utils--preview-image";
        img.src = thumb.currentSrc || thumb.src;
        img.alt = name;
        img.title = name;
        root.appendChild(img);
      } else {
        const chip = document.createElement("div");
        chip.className = "slack-utils--preview-file";
        chip.textContent = "\u{1F4CE} " + (name || "file");
        const type = file
          .querySelector('[data-qa="file-entity-metadata-description"]')
          ?.textContent.trim();
        if (type) {
          const typeEl = document.createElement("span");
          typeEl.className = "slack-utils--preview-file-type";
          typeEl.textContent = type;
          chip.appendChild(typeEl);
        }
        root.appendChild(chip);
      }
    }

    // Unfurl cards reuse Slack's own markup and styles
    for (const unfurl of unfurls) {
      root.appendChild(unfurl.cloneNode(true));
    }

    return root;
  }

  function injectSendConfirmStyles() {
    if (document.getElementById("slack-utils-send-confirm-styles")) return;
    const style = document.createElement("style");
    style.id = "slack-utils-send-confirm-styles";
    style.textContent = `
      .slack-utils--send-confirm {
        outline: 2px solid #e8912d !important;
        outline-offset: -2px;
      }
      .slack-utils--preview-panel {
        background: #fdf6ec;
        border: 1px solid #e8912d;
        border-radius: 8px;
        padding: 8px 16px;
        margin-bottom: 4px;
        max-height: 300px;
        overflow-y: auto;
        word-break: break-word;
      }
      .slack-utils--preview-panel * {
        cursor: default !important;
        user-select: text !important;
      }
      .slack-utils--preview-panel .p-rich_text_list {
        padding: 0 0 0 1.5em !important;
        margin: 0 !important;
        text-align: left !important;
      }
      .slack-utils--preview-panel .p-rich_text_list li {
        padding: 0 !important;
        margin: 0 !important;
        text-align: left !important;
      }
      .slack-utils--preview-panel img.emoji {
        width: 22px;
        height: 22px;
        vertical-align: middle;
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
      }
      .slack-utils--preview-attachments {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: 8px;
        margin-top: 8px;
      }
      .slack-utils--preview-attachments > * {
        flex: none;
      }
      .slack-utils--preview-image {
        width: auto !important;
        height: auto !important;
        max-width: 240px;
        max-height: 160px;
        border-radius: 8px;
        border: 1px solid rgba(29, 28, 29, 0.13);
        object-fit: contain;
      }
      .slack-utils--preview-file {
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid rgba(29, 28, 29, 0.13);
        background: #fff;
        font-size: 13px;
        max-width: 260px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .slack-utils--preview-file-type {
        color: rgba(29, 28, 29, 0.7);
        margin-left: 8px;
      }
      .slack-utils--preview-label {
        font-size: 12px;
        color: #e8912d;
        font-weight: 700;
        padding: 2px 0 4px;
        text-align: right;
      }
    `;
    document.head.appendChild(style);
  }

  const sendConfirmState = new WeakMap();

  function findComposer(el) {
    return el.closest('[data-qa="message_input"]');
  }

  function findEditor(composer) {
    return composer.querySelector('.ql-editor[data-qa="texty_input"]');
  }

  function isEditMode(composer) {
    return !!composer.closest('[data-qa="message_editor"]');
  }

  function hasDraftContent(composer, editor) {
    return (
      editor.textContent.trim() !== "" ||
      !!editor.querySelector("ts-mention, img.emoji") ||
      findAttachments(composer).files.length > 0
    );
  }

  // Attachments live outside the editor and change without input events,
  // so they are part of the snapshot too.
  function draftSnapshot(composer, editor) {
    const fileNames = findAttachments(composer).files.map(
      (f) => f.querySelector('[role="group"]')?.getAttribute("aria-label") || ""
    );
    return editor.innerHTML + "\0" + fileNames.join("\0");
  }

  function armComposer(composer) {
    injectSendConfirmStyles();

    const editor = findEditor(composer);
    if (!editor) return;

    const atoms = createAtomStore();
    const panel = document.createElement("div");
    panel.className = "slack-utils--preview-panel";
    panel.innerHTML = renderSlackMarkdown(editorToMarkup(editor, atoms), atoms);
    const attachments = renderAttachments(composer);
    if (attachments) panel.appendChild(attachments);

    // Create label
    const label = document.createElement("div");
    label.className = "slack-utils--preview-label";
    label.textContent = "Press Enter again to send";

    // Create wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "slack-utils--preview-wrapper";
    wrapper.appendChild(panel);
    wrapper.appendChild(label);

    // Insert before the composer container
    const inputContainer = composer.closest(
      ".p-message_input__input_container_unstyled, .c-wysiwyg_container"
    ) || composer;
    inputContainer.parentNode.insertBefore(wrapper, inputContainer);

    // Add visual indicator to composer
    composer.classList.add("slack-utils--send-confirm");

    sendConfirmState.set(composer, {
      armed: true,
      contentSnapshot: draftSnapshot(composer, editor),
      previewElement: wrapper,
    });
  }

  function disarmComposer(composer) {
    const state = sendConfirmState.get(composer);
    if (!state) return;

    // Remove preview panel
    if (state.previewElement && state.previewElement.parentNode) {
      state.previewElement.remove();
    }

    // Remove visual indicator
    composer.classList.remove("slack-utils--send-confirm");

    sendConfirmState.delete(composer);
  }

  // Detect if an autocomplete popup (mentions, channels, emoji, slash
  // commands) is open. All Slack autocomplete popups share the attribute
  // data-qa="texty_autocomplete_menu" and are rendered inside a
  // ReactModal popover.
  function isAutocompleteOpen() {
    return !!document.querySelector('[data-qa="texty_autocomplete_menu"]');
  }

  function handleSendConfirmKeyDown(e) {
    // Handle Escape to disarm
    if (e.key === "Escape") {
      const editor = e.target.closest('.ql-editor[data-qa="texty_input"]');
      if (!editor) return;
      const composer = findComposer(editor);
      if (!composer) return;
      const state = sendConfirmState.get(composer);
      if (state && state.armed) {
        disarmComposer(composer);
      }
      return;
    }

    // Handle Enter (with or without Ctrl, but not Shift)
    if (!sendPreviewEnabled) return;
    if (e.key === "Enter" && !e.shiftKey) {
      const editor = e.target.closest('.ql-editor[data-qa="texty_input"]');
      if (!editor) return;
      const composer = findComposer(editor);
      if (!composer) return;

      // Skip when an autocomplete popup is open (emoji, mention, channel)
      if (isAutocompleteOpen()) return;

      // Skip edit mode
      if (isEditMode(composer)) return;

      // Skip empty messages
      if (!hasDraftContent(composer, editor)) return;

      const state = sendConfirmState.get(composer);

      if (!state || !state.armed) {
        // First press: arm and block
        e.preventDefault();
        e.stopImmediatePropagation();
        armComposer(composer);
      } else {
        // Second press: check if content changed
        if (draftSnapshot(composer, editor) !== state.contentSnapshot) {
          // Content changed: disarm and block
          e.preventDefault();
          e.stopImmediatePropagation();
          disarmComposer(composer);
        } else {
          // Content same: disarm and let through (send)
          disarmComposer(composer);
        }
      }
    }
  }

  function handleSendButtonClick(e) {
    if (!sendPreviewEnabled) return;
    const sendButton = e.target.closest(
      'button[data-qa="texty_send_button"]'
    );
    if (!sendButton) return;

    const composer = findComposer(sendButton);
    if (!composer) return;

    // Skip edit mode
    if (isEditMode(composer)) return;

    const editor = findEditor(composer);
    if (!editor) return;

    // Skip empty messages
    if (!hasDraftContent(composer, editor)) return;

    const state = sendConfirmState.get(composer);

    if (!state || !state.armed) {
      // First click: arm and block
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      armComposer(composer);
    } else {
      if (draftSnapshot(composer, editor) !== state.contentSnapshot) {
        // Content changed: disarm and block
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        disarmComposer(composer);
      } else {
        // Content same: disarm and let through (send)
        disarmComposer(composer);
      }
    }
  }

  function handleSendConfirmInput(e) {
    const editor = e.target.closest('.ql-editor[data-qa="texty_input"]');
    if (!editor) return;
    const composer = findComposer(editor);
    if (!composer) return;
    const state = sendConfirmState.get(composer);
    if (state && state.armed) {
      disarmComposer(composer);
    }
  }

  function handleSendConfirmFocusOut(e) {
    const editor = e.target.closest('.ql-editor[data-qa="texty_input"]');
    if (!editor) return;
    const composer = findComposer(editor);
    if (!composer) return;
    const state = sendConfirmState.get(composer);
    if (state && state.armed) {
      // Delay to allow click on send button to be processed first
      setTimeout(() => {
        const currentState = sendConfirmState.get(composer);
        if (currentState && currentState.armed) {
          disarmComposer(composer);
        }
      }, 200);
    }
  }

  // Register event listeners in capture phase
  document.addEventListener("keydown", handleSendConfirmKeyDown, true);
  document.addEventListener("click", handleSendButtonClick, true);
  document.addEventListener("input", handleSendConfirmInput, true);
  document.addEventListener("focusout", handleSendConfirmFocusOut, true);
})();
