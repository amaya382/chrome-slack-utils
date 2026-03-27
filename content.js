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

  // Render Slack-flavored Markdown text to HTML matching Slack's actual
  // rendered message structure (see reference/redered.html).
  function renderSlackMarkdown(text) {
    const esc = (s) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const lines = text.split("\n");
    const parts = []; // collected into one p-rich_text_block
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block (```)
      if (line.trimStart().startsWith("\u0060\u0060\u0060")) {
        const codeLines = [];
        i++;
        while (
          i < lines.length &&
          !lines[i].trimStart().startsWith("\u0060\u0060\u0060")
        ) {
          codeLines.push(esc(lines[i]));
          i++;
        }
        i++; // skip closing ```
        parts.push(
          '<pre class="c-mrkdwn__pre" data-stringify-type="pre">' +
            '<div class="p-rich_text_block--no-overflow">' +
            codeLines.join("\n") +
            "</div></pre>"
        );
        continue;
      }

      // Blockquote (> ...)
      if (line.startsWith("> ") || line === ">") {
        const quoteLines = [];
        while (
          i < lines.length &&
          (lines[i].startsWith("> ") || lines[i] === ">")
        ) {
          quoteLines.push(lines[i].replace(/^> ?/, ""));
          i++;
        }
        parts.push(
          '<blockquote type="cite" class="c-mrkdwn__quote" data-stringify-type="quote">' +
            quoteLines
              .map((l) => inlineFormat(esc(l)))
              .join('<br aria-hidden="true">') +
            "</blockquote>"
        );
        continue;
      }

      // Unordered list (- item or • item)
      if (/^(\s*)[-•*] /.test(line)) {
        parts.push(parseList(lines, "unordered"));
        continue;
      }

      // Ordered list (1. item)
      if (/^(\s*)\d+\. /.test(line)) {
        parts.push(parseList(lines, "ordered"));
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
          inlineFormat(esc(line)) +
          '<br aria-hidden="true"></div>'
      );
      i++;
    }

    return (
      '<div class="c-message_kit__blocks c-message_kit__blocks--rich_text">' +
      '<div class="c-message__message_blocks c-message__message_blocks--rich_text">' +
      '<div class="p-block_kit_renderer">' +
      '<div class="p-block_kit_renderer__block_wrapper p-block_kit_renderer__block_wrapper--first">' +
      '<div class="p-rich_text_block" dir="auto">' +
      parts.join("") +
      "</div></div></div></div></div>"
    );

    // Parse a list block (unordered or ordered) with nesting support
    function parseList(allLines, type) {
      const tag = type === "unordered" ? "ul" : "ol";
      const pattern =
        type === "unordered" ? /^(\s*)[-•*] (.*)$/ : /^(\s*)\d+\. (.*)$/;
      const testPattern =
        type === "unordered" ? /^(\s*)[-•*] / : /^(\s*)\d+\. /;
      const typeAttr =
        type === "unordered" ? "unordered-list" : "ordered-list";
      const cssClass =
        type === "unordered"
          ? "p-rich_text_list__bullet"
          : "p-rich_text_list__ordered";

      // Collect all items with their indent levels
      const items = [];
      while (i < allLines.length && testPattern.test(allLines[i])) {
        const match = allLines[i].match(pattern);
        const indent = Math.floor(match[1].length / 2);
        items.push({ indent, content: match[2] });
        i++;
      }

      return buildNestedList(items, 0, tag, typeAttr, cssClass);
    }

    function buildNestedList(items, baseIndent, tag, typeAttr, cssClass) {
      let html =
        "<" +
        tag +
        ' data-stringify-type="' +
        typeAttr +
        '" data-list-tree="true"' +
        ' class="p-rich_text_list ' +
        cssClass +
        ' p-rich_text_list--nested"' +
        ' data-indent="' +
        baseIndent +
        '" data-border="0">';

      let j = 0;
      while (j < items.length) {
        const item = items[j];
        if (item.indent < baseIndent) break;

        html +=
          '<li data-stringify-indent="' +
          item.indent +
          '" data-stringify-border="0">' +
          inlineFormat(esc(item.content));

        // Check for child items at deeper indent
        const childItems = [];
        j++;
        while (j < items.length && items[j].indent > item.indent) {
          childItems.push(items[j]);
          j++;
        }
        if (childItems.length > 0) {
          html += buildNestedList(
            childItems,
            item.indent + 1,
            tag,
            typeAttr,
            cssClass
          );
        }
        html += "</li>";
      }

      html += "</" + tag + ">";
      return html;
    }

    function inlineFormat(s) {
      // Inline code: `code`
      s = s.replace(
        /`([^`]+)`/g,
        '<code data-stringify-type="code" class="c-mrkdwn__code">$1</code>'
      );
      // Bold: *text*
      s = s.replace(/\*([^*]+)\*/g, "<b>$1</b>");
      // Italic: _text_
      s = s.replace(
        /(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9])/g,
        "<i>$1</i>"
      );
      // Strikethrough: ~text~
      s = s.replace(/~([^~]+)~/g, "<s>$1</s>");
      // Links: [text](url)
      s = s.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a target="_blank" class="c-link" data-stringify-link="$2" href="$2" rel="noopener noreferrer">$1</a>'
      );
      // Bare URLs
      s = s.replace(
        /(?<![="'\w])(https?:\/\/[^\s<]+)/g,
        '<a target="_blank" class="c-link" data-stringify-link="$1" href="$1" rel="noopener noreferrer">$1</a>'
      );
      return s;
    }
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

  // Extract text from the editor DOM, preserving line breaks.
  // Slack's Quill editor uses <p> elements for each line.
  function extractEditorText(editor) {
    const lines = [];
    for (const child of editor.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        lines.push(child.textContent);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // Each <p> or block-level element is a line
        lines.push(child.textContent);
      }
    }
    return lines.join("\n");
  }

  function armComposer(composer) {
    injectSendConfirmStyles();

    const editor = findEditor(composer);
    if (!editor) return;

    // Extract text preserving line breaks, then render as Slack-styled HTML
    const text = extractEditorText(editor);
    const panel = document.createElement("div");
    panel.className = "slack-utils--preview-panel";
    panel.innerHTML = renderSlackMarkdown(text);

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
      contentSnapshot: text,
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
      if (editor.textContent.trim() === "") return;

      const state = sendConfirmState.get(composer);

      if (!state || !state.armed) {
        // First press: arm and block
        e.preventDefault();
        e.stopImmediatePropagation();
        armComposer(composer);
      } else {
        // Second press: check if content changed
        if (extractEditorText(editor) !== state.contentSnapshot) {
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
    if (editor.textContent.trim() === "") return;

    const state = sendConfirmState.get(composer);

    if (!state || !state.armed) {
      // First click: arm and block
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      armComposer(composer);
    } else {
      if (editor.textContent !== state.contentSnapshot) {
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
