const CONSTANTS = {
  SELECTORS: {
    USER_MESSAGE:
      "h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2",
    SUBMIT_BUTTON: '[data-testid="submit-button"]',
    ASK_INPUT: "#ask-input",
  },
  IDS: {
    TOC_CONTAINER: "perplexity-toc-extension",
    TOC_TOGGLE_BTN: "toc-toggle-btn",
    SEARCH_INPUT: "toc-search-input",
    SEARCH_CLEAR: "toc-search-clear",
  },
  CLASSES: {
    TOC_HEADER: "toc-header",
    TOC_HEADER_CONTENT: "toc-header-content",
    TOC_DRAG_HANDLE: "toc-drag-handle",
    TOC_SEARCH_CONTAINER: "toc-search-container",
    COLLAPSED: "collapsed",
  },
  DELAYS: {
    PAGE_LOAD: 3000,
    CHAT_CHANGE: 1000,
    PROMPT_SUBMISSION: 200,
    ENTER_KEY: 80,
  },
  CONSTRAINTS: {
    PADDING: 10,
    MAX_QUERY_LENGTH: 70,
    TRUNCATE_SUFFIX: "...",
    COLLAPSE_BREAKPOINT: 1024,
  },
  STORAGE_KEY: "perplexity-toc-position",
};

/**
 * Manages TOC positioning and persistence
 */
class PositionManager {
  static savePosition(x, y) {
    localStorage.setItem(CONSTANTS.STORAGE_KEY, JSON.stringify({ x, y }));
  }

  static getSavedPosition() {
    const saved = localStorage.getItem(CONSTANTS.STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  static applyPosition(element, x, y) {
    const styles = {
      position: "fixed",
      left: `${x}px`,
      top: `${y}px`,
      right: "auto",
      bottom: "auto",
      margin: "0",
      transform: "none",
    };

    Object.entries(styles).forEach(([prop, value]) => {
      element.style.setProperty(prop, value, "important");
    });
  }

  static constrainToViewport(x, y, elementWidth, elementHeight) {
    const padding = CONSTANTS.CONSTRAINTS.PADDING;
    const minX = padding;
    const minY = padding;
    const maxX = window.innerWidth - elementWidth - padding;
    const maxY = window.innerHeight - elementHeight - padding;

    return {
      x: Math.max(minX, Math.min(x, maxX)),
      y: Math.max(minY, Math.min(y, maxY)),
    };
  }
}

/**
 * Handles drag functionality for the TOC
 */
class DragManager {
  constructor(element, positionManager) {
    this.element = element;
    this.positionManager = positionManager;
    this.isDragging = false;
    this.startMouseX = 0;
    this.startMouseY = 0;
    this.startElementX = 0;
    this.startElementY = 0;

    this.init();
  }

  init() {
    const header = this.element.querySelector(
      `.${CONSTANTS.CLASSES.TOC_HEADER}`,
    );
    if (!header) return;

    header.style.cursor = "move";
    header.style.userSelect = "none";
    header.addEventListener("mousedown", this.startDrag.bind(this));
  }

  startDrag(e) {
    if (e.target.closest(`#${CONSTANTS.IDS.TOC_TOGGLE_BTN}`)) return;

    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    this.startMouseX = e.clientX;
    this.startMouseY = e.clientY;

    const rect = this.element.getBoundingClientRect();
    this.startElementX = rect.left;
    this.startElementY = rect.top;

    this.positionManager.applyPosition(
      this.element,
      this.startElementX,
      this.startElementY,
    );
    this.applyDragStyles();

    document.addEventListener("mousemove", this.drag.bind(this));
    document.addEventListener("mouseup", this.stopDrag.bind(this));
    document.body.style.userSelect = "none";
  }

  drag(e) {
    if (!this.isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const deltaX = e.clientX - this.startMouseX;
    const deltaY = e.clientY - this.startMouseY;

    let newX = this.startElementX + deltaX;
    let newY = this.startElementY + deltaY;

    const constrained = this.positionManager.constrainToViewport(
      newX,
      newY,
      this.element.offsetWidth,
      this.element.offsetHeight,
    );

    this.positionManager.applyPosition(
      this.element,
      constrained.x,
      constrained.y,
    );
  }

  stopDrag() {
    if (!this.isDragging) return;

    this.isDragging = false;

    const rect = this.element.getBoundingClientRect();
    this.positionManager.savePosition(rect.left, rect.top);

    this.removeDragStyles();
    document.removeEventListener("mousemove", this.drag);
    document.removeEventListener("mouseup", this.stopDrag);
    document.body.style.userSelect = "";
  }

  applyDragStyles() {
    this.element.style.opacity = "0.8";
    this.element.style.transition = "none";
    this.element.style.zIndex = "10001";
  }

  removeDragStyles() {
    this.element.style.opacity = "";
    this.element.style.transition = "";
    this.element.style.zIndex = "10000";
  }
}

function extractAllQueries() {
  // Use only valid selectors (escape / with \\)
  const queryElements = document.querySelectorAll(
    "h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2",
  );
  let queries = Array.from(queryElements)
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  // Alternative robust selector
  if (queries.length === 0) {
    queries = Array.from(
      document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain'),
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean);
  }

  return queries;
}

function createTOC(shouldScrollToBottom = false) {
  const existingTOC = document.getElementById(CONSTANTS.IDS.TOC_CONTAINER);
  if (existingTOC) {
    existingTOC.remove();
  }

  let questions = extractAllQueries();

  // Don't create the TOC if there's only one or zero questions
  if (questions.length <= 1) {
    console.log("Not enough queries to build a TOC.");
    return;
  }

  const tocContainer = document.createElement("div");
  tocContainer.id = CONSTANTS.IDS.TOC_CONTAINER;

  const tocHeader = document.createElement("div");
  tocHeader.className = CONSTANTS.CLASSES.TOC_HEADER;
  tocHeader.innerHTML = `
        <div class="${CONSTANTS.CLASSES.TOC_HEADER_CONTENT}">
          <div class="${CONSTANTS.CLASSES.TOC_DRAG_HANDLE}" title="Drag to move"></div>
          <h2>Table of Contents</h2>
        </div>
        <button id="${CONSTANTS.IDS.TOC_TOGGLE_BTN}" title="Toggle Table of Contents"></button>
    `;

  const searchContainer = document.createElement("div");
  searchContainer.className = CONSTANTS.CLASSES.TOC_SEARCH_CONTAINER;
  searchContainer.innerHTML = `
        <input type="text" id="${CONSTANTS.IDS.SEARCH_INPUT}" placeholder="Search queries..." />
        <div id="${CONSTANTS.IDS.SEARCH_CLEAR}" title="Clear search">×</div>
    `;

  const tocList = document.createElement("ul");

  tocContainer.appendChild(tocHeader);
  tocContainer.appendChild(searchContainer);
  tocContainer.appendChild(tocList);

  // --- Add Toggle Button Functionality ---
  const toggleBtn = tocContainer.querySelector(
    `#${CONSTANTS.IDS.TOC_TOGGLE_BTN}`,
  );
  toggleBtn.addEventListener("click", () => {
    tocContainer.classList.toggle(CONSTANTS.CLASSES.COLLAPSED);
  });

  // --- Add Search Functionality ---
  const searchInput = tocContainer.querySelector(
    `#${CONSTANTS.IDS.SEARCH_INPUT}`,
  );
  const searchClear = tocContainer.querySelector(
    `#${CONSTANTS.IDS.SEARCH_CLEAR}`,
  );
  const allListItems = [];

  // Store reference to all list items for filtering
  const updateSearchResults = () => {
    const searchTerm = searchInput.value.toLowerCase().trim();

    allListItems.forEach((item) => {
      const text = item.querySelector("a").textContent.toLowerCase();
      const shouldShow = searchTerm === "" || text.includes(searchTerm);
      item.style.display = shouldShow ? "block" : "none";
    });
  };

  searchInput.addEventListener("input", updateSearchResults);

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    updateSearchResults();
    searchInput.focus();
  });

  // Show/hide clear button based on input content
  searchInput.addEventListener("input", () => {
    searchClear.style.display = searchInput.value ? "flex" : "none";
  });

  // --- Default to collapsed on smaller screens ---
  if (window.innerWidth <= CONSTANTS.CONSTRAINTS.COLLAPSE_BREAKPOINT) {
    tocContainer.classList.add(CONSTANTS.CLASSES.COLLAPSED);
  }

  questions.forEach((questionText, index) => {
    const shortText =
      questionText.length > CONSTANTS.CONSTRAINTS.MAX_QUERY_LENGTH
        ? questionText.substring(
            0,
            CONSTANTS.CONSTRAINTS.MAX_QUERY_LENGTH - 3,
          ) + CONSTANTS.CONSTRAINTS.TRUNCATE_SUFFIX
        : questionText;
    const questionId = `toc-question-${index}`;

    let el =
      document.querySelectorAll(
        "h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2",
      )[index] ||
      document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain')[
        index
      ];

    if (el) {
      el.id = questionId;
    }

    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = `#${questionId}`;
    link.textContent = `${index + 1}. ${shortText}`;
    link.title = questionText;

    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetElement = document.getElementById(questionId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    listItem.appendChild(link);
    tocList.appendChild(listItem);

    // Store reference for search functionality
    allListItems.push(listItem);
  });

  // --- Setup drag functionality ---
  const dragManager = new DragManager(tocContainer, PositionManager);

  // --- Apply saved position if available ---
  const savedPosition = PositionManager.getSavedPosition();
  if (savedPosition) {
    PositionManager.applyPosition(
      tocContainer,
      savedPosition.x,
      savedPosition.y,
    );
  }

  // --- Auto-scroll the TOC list if needed ---
  if (shouldScrollToBottom) {
    // Use requestAnimationFrame to ensure scrolling happens after the DOM has painted
    requestAnimationFrame(() => {
      tocList.scrollTop = tocList.scrollHeight;
    });
  }

  // Find the right-side main content div
  const rightDiv = document.querySelector(
    ".erp-sidecar\\:min-h-\\[var\\(--sidecar-content-height\\)\\].erp-tab\\:min-h-screen.min-h-\\[var\\(--page-content-height-without-header\\)\\]",
  );
  if (rightDiv) {
    rightDiv.style.position = "relative";
    tocContainer.style.position = "absolute";
    tocContainer.style.top = "30px";
    tocContainer.style.right = "20px";
    tocContainer.style.margin = "0";
    tocContainer.style.zIndex = "10000";
    rightDiv.appendChild(tocContainer);
  } else {
    document.body.appendChild(tocContainer);
  }
}

// Optional: Chrome extension message listener for extracting queries
if (
  typeof chrome !== "undefined" &&
  chrome.runtime &&
  chrome.runtime.onMessage
) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getQueries") {
      const queries = extractAllQueries();
      sendResponse({ queries });
    }
  });
}

function refreshTOC(event) {
  const isInteraction =
    event && (event.type === "click" || event.type === "keydown");
  const delay = isInteraction
    ? CONSTANTS.DELAYS.PROMPT_SUBMISSION
    : CONSTANTS.DELAYS.PAGE_LOAD;

  setTimeout(() => {
    console.log(`Regenerating TOC after ${delay}ms delay...`);
    // Pass 'true' to scroll to bottom only if it was a user interaction
    createTOC(isInteraction);
  }, delay);
}

// Initial page load. No event object is passed, so it uses the 3000ms delay, and it won't scroll.
window.addEventListener("load", refreshTOC);

// For SPA navigations or back/forward button usage.
window.addEventListener("pageshow", refreshTOC);

// Listen for mouse clicks anywhere on the page.
document.addEventListener(
  "click",
  function (e) {
    // Use .closest() to check if the click was on or inside the submit button.
    if (e.target.closest(CONSTANTS.SELECTORS.SUBMIT_BUTTON)) {
      console.log("Submit button clicked.");
      refreshTOC(e);
    }
  },
  true,
);

// Listen for Enter key presses in the text area.
document.addEventListener(
  "keydown",
  function (e) {
    // Check if the active element is the textarea and the key is Enter
    if (
      e.key === "Enter" &&
      document.activeElement.matches(CONSTANTS.SELECTORS.ASK_INPUT)
    ) {
      console.log("Enter key pressed in input.");
      refreshTOC(e);
    }
  },
  true,
);

// Add window resize handler to keep TOC within viewport bounds
window.addEventListener("resize", function () {
  const tocContainer = document.getElementById(CONSTANTS.IDS.TOC_CONTAINER);
  if (!tocContainer) return;

  const rect = tocContainer.getBoundingClientRect();
  const constrained = PositionManager.constrainToViewport(
    rect.left,
    rect.top,
    tocContainer.offsetWidth,
    tocContainer.offsetHeight,
  );

  if (constrained.x !== rect.left || constrained.y !== rect.top) {
    PositionManager.applyPosition(tocContainer, constrained.x, constrained.y);
    PositionManager.savePosition(constrained.x, constrained.y);
  }
});
