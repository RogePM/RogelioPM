import { apiKey } from './apikey.js';

/**
 * Scrolls the window to the top smoothly.
 */
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Sets the language of the page content based on data attributes.
 * @param {string} lang - The language to set ('en' or 'fr').
 */
function setLanguage(lang) {
    // Set the lang attribute on the HTML element for accessibility
    document.documentElement.lang = lang;

    // Select all elements that have language data attributes
    const elements = document.querySelectorAll('[data-lang-en]');
    elements.forEach(el => {
        const text = el.getAttribute(`data-lang-${lang}`);
        const placeholder = el.getAttribute(`data-lang-${lang}-placeholder`);
        
        if (text) {
            // Check for and preserve highlight spans if they exist
            const highlightSpan = el.querySelector('.highlight');
            if (highlightSpan) {
                // If the element is a container for highlighted text, don't just overwrite innerText
                const originalText = el.getAttribute('data-lang-en');
                const highlightedWord = highlightSpan.textContent;
                const newText = text.replace(highlightedWord, `<span class="highlight">${highlightedWord}</span>`);
                el.innerHTML = newText;
            } else {
                 el.textContent = text;
            }
        }
        if (placeholder) {
            el.placeholder = placeholder;
        }
    });

    // Update active state for language buttons
    const enBtn = document.getElementById('lang-en-btn');
    const frBtn = document.getElementById('lang-fr-btn');
    const mobileEnBtn = document.getElementById('mobile-lang-en-btn');
    const mobileFrBtn = document.getElementById('mobile-lang-fr-btn');

    if (lang === 'fr') {
        enBtn.classList.remove('active');
        frBtn.classList.add('active');
        mobileEnBtn.classList.remove('active');
        mobileFrBtn.classList.add('active');
    } else {
        frBtn.classList.remove('active');
        enBtn.classList.add('active');
        mobileFrBtn.classList.remove('active');
        mobileEnBtn.classList.add('active');
    }
}

/**
 * Closes the mobile navigation overlay.
 */
function closeMobileNav() {
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const hamburgerIcon = document.getElementById('hamburger-icon');
    const closeIcon = document.getElementById('close-icon');
    const body = document.body;
    
    if (mobileNavOverlay && mobileNavOverlay.classList.contains('translate-x-0')) {
        mobileNavOverlay.classList.add('-translate-x-full');
        mobileNavOverlay.classList.remove('translate-x-0');
        hamburgerIcon.classList.remove('hidden');
        closeIcon.classList.add('hidden');
        body.classList.remove('no-scroll');
    }
}

/**
 * Main DOMContentLoaded event listener to set up the page interactivity.
 */
document.addEventListener('DOMContentLoaded', function () {
    const scrollTopButton = document.getElementById("scrollTopButton");
    const mobileNavToggle = document.getElementById('mobile-nav-toggle');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const body = document.body;

    // Language Buttons
    const enBtn = document.getElementById('lang-en-btn');
    const frBtn = document.getElementById('lang-fr-btn');
    const mobileEnBtn = document.getElementById('mobile-lang-en-btn');
    const mobileFrBtn = document.getElementById('mobile-lang-fr-btn');
    
    // Scroll-to-top button logic
    if (scrollTopButton) {
        window.onscroll = function () {
            if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
                scrollTopButton.classList.add("show");
            } else {
                scrollTopButton.classList.remove("show");
            }
        };
    }

    // Mobile nav toggle logic
    if (mobileNavToggle && mobileNavOverlay) {
        mobileNavToggle.addEventListener('click', function () {
            mobileNavOverlay.classList.toggle('-translate-x-full');
            mobileNavOverlay.classList.toggle('translate-x-0');
            document.getElementById('hamburger-icon').classList.toggle('hidden');
            document.getElementById('close-icon').classList.toggle('hidden');
            body.classList.toggle('no-scroll');
        });
    }

    // Language switcher logic
    if(enBtn) enBtn.addEventListener('click', () => setLanguage('en'));
    if(frBtn) frBtn.addEventListener('click', () => setLanguage('fr'));
    if(mobileEnBtn) mobileEnBtn.addEventListener('click', () => { setLanguage('en'); closeMobileNav(); });
    if(mobileFrBtn) mobileFrBtn.addEventListener('click', () => { setLanguage('fr'); closeMobileNav(); });

    // Set initial language based on browser preference, fallback to English
    const preferredLang = navigator.language.startsWith('fr') ? 'fr' : 'en';
    setLanguage(preferredLang);

    // Close mobile nav if window is resized above mobile breakpoint
    window.addEventListener('resize', function () {
        if (window.innerWidth >= 768 && mobileNavOverlay.classList.contains('translate-x-0')) {
            closeMobileNav();
        }
    });
});

/**
 * Calls the Gemini API with a given prompt and schema.
 * @param {string} prompt - The prompt to send to the API.
 * @param {object} schema - The JSON schema for the expected response.
 * @returns {Promise<object>} - The parsed JSON response from the API.
 */
async function callGemini(prompt, schema) {
    let chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
    const payload = {
      contents: chatHistory,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      },
    };
    // IMPORTANT: The API key is an empty string. The execution environment will provide it.
    // The API key is now loaded from a separate file not tracked by git.
    // Create a file named 'apikey.js' with: export const apiKey = "YOUR_API_KEY";
    // Make sure to add 'apikey.js' to your .gitignore!
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        return JSON.parse(result.candidates[0].content.parts[0].text);
    } else {
        throw new Error("Invalid response structure from API.");
    }
}

/**
 * Fetches and displays an expanded project description from the Gemini API.
 * @param {HTMLElement} buttonElement - The button that was clicked.
 * @param {string} elementId - The base ID for the project elements.
 */
async function expandProjectDescription(buttonElement, elementId) {
    const originalDescriptionElement = buttonElement.parentElement.querySelector('[data-original-description]');
    const originalDescription = originalDescriptionElement ? originalDescriptionElement.dataset.originalDescription : '';
    const loadingSpinner = document.getElementById(`${elementId}-loading`);
    const expandedContentDiv = document.getElementById(`${elementId}-expanded-content`);
    const buttonSpan = buttonElement.querySelector('span');

    if (!expandedContentDiv.classList.contains('hidden')) {
        expandedContentDiv.classList.add('hidden');
        buttonSpan.setAttribute('data-lang-en', '✨ Expand Description');
        buttonSpan.setAttribute('data-lang-fr', '✨ Voir Plus');
        setLanguage(document.documentElement.lang);
        return;
    }

    if (!originalDescription) {
        expandedContentDiv.innerHTML = '<p class="text-red-500">Error: Original description not found.</p>';
        expandedContentDiv.classList.remove('hidden');
        return;
    }

    loadingSpinner.style.display = 'block';
    buttonSpan.setAttribute('data-lang-en', 'Generating...');
    buttonSpan.setAttribute('data-lang-fr', 'Génération...');
    setLanguage(document.documentElement.lang);

    const prompt = `Based on this project summary: "${originalDescription}", generate a detailed breakdown for a portfolio. The output must be a JSON object with keys: "challenge", "solution", and "impactAndAchievements". Keep each value to a concise, professional paragraph.`;
    const schema = {
        type: "OBJECT",
        properties: {
            "challenge": { "type": "STRING" },
            "solution": { "type": "STRING" },
            "impactAndAchievements": { "type": "STRING" }
        },
        required: ["challenge", "solution", "impactAndAchievements"]
    };
    
    try {
        const data = await callGemini(prompt, schema);
        let htmlContent = '';
        if (data.challenge) htmlContent += `<p class="mb-2"><strong>Challenge:</strong> ${data.challenge}</p>`;
        if (data.solution) htmlContent += `<p class="mb-2"><strong>Solution:</strong> ${data.solution}</p>`;
        if (data.impactAndAchievements) htmlContent += `<p><strong>Impact & Achievements:</strong> ${data.impactAndAchievements}</p>`;
        expandedContentDiv.innerHTML = htmlContent;
        expandedContentDiv.classList.remove('hidden');
        buttonSpan.setAttribute('data-lang-en', 'Hide Description');
        buttonSpan.setAttribute('data-lang-fr', 'Masquer la Description');
    } catch (error) {
        console.error("Error expanding description:", error);
        expandedContentDiv.innerHTML = `<p class="text-red-500">Failed to expand description. Please try again later.</p>`;
        buttonSpan.setAttribute('data-lang-en', '✨ Expand Description');
        buttonSpan.setAttribute('data-lang-fr', '✨ Voir Plus');
    } finally {
        loadingSpinner.style.display = 'none';
        setLanguage(document.documentElement.lang);
    }
}
