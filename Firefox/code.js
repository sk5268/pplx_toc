// content.js - SAME AS THE CHROME VERSION
console.log("Perplexity TOC Extension Loaded (Firefox)"); // Optional: change log for clarity

function extractAllQueries() {
  // Use only valid selectors (escape / with \\)
  const queryElements = document.querySelectorAll(
    'h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2'
  );
  let queries = Array.from(queryElements)
    .map(el => el.textContent.trim())
    .filter(Boolean);

  // Alternative robust selector
  if (queries.length === 0) {
    queries = Array.from(
      document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain')
    ).map(el => el.textContent.trim())
     .filter(Boolean);
  }

  return queries;
}

function createTOC() {
    const existingTOC = document.getElementById('perplexity-toc-extension');
    if (existingTOC) {
        existingTOC.remove();
    }

    let questions = extractAllQueries();

    // Fallback: if nothing found, use <title>
    let fallbackQuestions = questions;
    if (fallbackQuestions.length === 0) {
        const title = document.querySelector('title');
        if (title && title.textContent) {
            fallbackQuestions = [title.textContent.trim()];
        }
    }

    console.log("Perplexity TOC - User queries found:", fallbackQuestions);

    if (fallbackQuestions.length === 0) {
        console.log("No Perplexity user queries found to build TOC.");
        return;
    }

    const tocContainer = document.createElement('div');
    tocContainer.id = 'perplexity-toc-extension';
    const tocList = document.createElement('ul');
    tocContainer.innerHTML = '<h2>Table of Contents</h2>';
    tocContainer.appendChild(tocList);

    fallbackQuestions.forEach((questionText, index) => {
        const shortText = questionText.length > 70 ? questionText.substring(0, 67) + '...' : questionText;
        const questionId = `toc-question-${index}`;

        // Try to set an id for scrolling if possible
        // Find the element again for id assignment
        let el = null;
        // Try all selectors in order
        el = document.querySelectorAll(
          'h1.group\\/query, div.group\\/query, .flex.flex-col.gap-1.pb-2'
        )[index] ||
        document.querySelectorAll('[class*="pb-2"] .font-sans.text-textMain')[index];

        if (el) {
            el.id = questionId;
        }

        const listItem = document.createElement('li');
        const link = document.createElement('a');
        link.href = `#${questionId}`;
        link.textContent = `${index + 1}. ${shortText}`;
        link.title = questionText;

        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetElement = document.getElementById(questionId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });

        listItem.appendChild(link);
        tocList.appendChild(listItem);
    });

    if (tocList.children.length > 0) {
        document.body.appendChild(tocContainer);
    } else {
        console.log("TOC list is empty, not appending.");
    }
}

// Optional: Chrome extension message listener for extracting queries
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getQueries") {
      const queries = extractAllQueries();
      sendResponse({ queries });
    }
  });
}

// Observe for new queries and update TOC automatically
function observeQueriesAndUpdateTOC() {
    const main = document.querySelector('main');
    if (!main) {
        createTOC();
        return;
    }
    const observer = new MutationObserver(() => {
        createTOC();
    });
    observer.observe(main, { childList: true, subtree: true });
    // Initial TOC
    createTOC();
}

// Listen for mouse clicks on any button
document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON') {
        createTOC();
    }
}, true);

// Listen for Enter key presses anywhere
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        setTimeout(() => {
            createTOC();
        }, 80); // Delay to allow DOM update
    }
}, true);

// Start observing when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observeQueriesAndUpdateTOC);
} else {
    observeQueriesAndUpdateTOC();
}