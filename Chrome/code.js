function extractAllQueries() {
  // Use only valid selectors (escape / with \\)
  const queryElements = document.querySelectorAll(
    "h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2"
  );
  let queries = Array.from(queryElements)
    .map((el) => el.textContent.trim())
    .filter(Boolean);

  // Alternative robust selector
  if (queries.length === 0) {
    queries = Array.from(
      document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain')
    )
      .map((el) => el.textContent.trim())
      .filter(Boolean);
  }

  return queries;
}

function createTOC(shouldScrollToBottom = false) {
    const existingTOC = document.getElementById('perplexity-toc-extension');
    if (existingTOC) {
        existingTOC.remove();
    }

    let questions = extractAllQueries();

    // Don't create the TOC if there's only one or zero questions
    if (questions.length <= 1) {
        console.log("Not enough queries to build a TOC.");
        return;
    }

    const tocContainer = document.createElement('div');
    tocContainer.id = 'perplexity-toc-extension';
    
    const tocHeader = document.createElement('div');
    tocHeader.className = 'toc-header';
    tocHeader.innerHTML = `
        <h2>Table of Contents</h2>
        <button id="toc-toggle-btn" title="Toggle Table of Contents"></button>
    `;

    const tocList = document.createElement('ul');
    
    tocContainer.appendChild(tocHeader);
    tocContainer.appendChild(tocList);

    // --- Add Toggle Button Functionality ---
    const toggleBtn = tocContainer.querySelector('#toc-toggle-btn');
    toggleBtn.addEventListener('click', () => {
        tocContainer.classList.toggle('collapsed');
    });

    // --- Default to collapsed on smaller screens ---
    if (window.innerWidth <= 1024) {
        tocContainer.classList.add('collapsed');
    }

  questions.forEach((questionText, index) => {
    const shortText =
      questionText.length > 70
        ? questionText.substring(0, 67) + "..."
        : questionText;
    const questionId = `toc-question-${index}`;

        let el = document.querySelectorAll(
          'h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2'
        )[index] ||
        document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain')[index];

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
  });

    // --- Auto-scroll the TOC list if needed ---
    if (shouldScrollToBottom) {
        // Use requestAnimationFrame to ensure scrolling happens after the DOM has painted
        requestAnimationFrame(() => {
            tocList.scrollTop = tocList.scrollHeight;
        });
    }

    // Find the right-side main content div
    const rightDiv = document.querySelector('.erp-sidecar\\:min-h-\\[var\\(--sidecar-content-height\\)\\].erp-tab\\:min-h-screen.min-h-\\[var\\(--page-content-height-without-header\\)\\]');
    if (rightDiv) {
        rightDiv.style.position = 'relative'; 
        tocContainer.style.position = 'absolute';
        tocContainer.style.top = '30px';
        tocContainer.style.right = '20px';
        tocContainer.style.margin = '0';
        tocContainer.style.zIndex = '10000';
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
    const isInteraction = event && (event.type === 'click' || event.type === 'keydown');
    const delay = isInteraction ? 200 : 3000;

    setTimeout(() => {
        console.log(`Regenerating TOC after ${delay}ms delay...`);
        // Pass 'true' to scroll to bottom only if it was a user interaction
        createTOC(isInteraction);
    }, delay);
}

// Initial page load. No event object is passed, so it uses the 3000ms delay, and it won't scroll.
window.addEventListener('load', refreshTOC);

// For SPA navigations or back/forward button usage.
window.addEventListener('pageshow', refreshTOC);

// Listen for mouse clicks anywhere on the page.
document.addEventListener('click', function(e) {
    // Use .closest() to check if the click was on or inside the submit button.
    if (e.target.closest('[data-testid="submit-button"]')) {
        console.log('Submit button clicked.');
        refreshTOC(e);
    }
  },
  true
);

// Listen for Enter key presses in the text area.
document.addEventListener('keydown', function(e) {
    // Check if the active element is the textarea and the key is Enter
    if (e.key === 'Enter' && document.activeElement.id === 'ask-input') {
        console.log('Enter key pressed in input.');
        refreshTOC(e);
    }
}, true);