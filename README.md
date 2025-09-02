# 📦 Modern Web App Shell

A minimal yet modern web app template featuring a fixed header with tabs, a styled footer, and a responsive content area with auto Dark Mode.

# ✨ Features

Fixed Header with a hamburger menu icon and interactive tabs.

Fixed Footer for actions or additional info.

Responsive Content Area with modern card-like styling and internal scroll.

Automatic Dark Mode support using prefers-color-scheme.

Modern Design with glassmorphism, rounded corners, and subtle shadows.

Simple Project Structure: Static HTML, styled CSS, and modular JavaScript (loader.js).

# 📂 Project Structure
project-root/
│
├── index.html        # Main entry point
├── css/
│   └── style.css     # Modern CSS styles
├── js/
│   └── loader.js     # JS logic for loading tabs/pages
└── pages/
    └── ...           # Dynamically loaded pages

# 🚀 Getting Started

Place the files in your project folder.

Ensure index.html references css/style.css and js/loader.js.

Open index.html in your browser.

(Recommended) Run a local dev server (live-server, http-server, etc.) to support ES module imports.

# 🖌️ Styling (CSS)

The design leverages:

CSS Variables (:root) for colors, border-radius, shadows, etc.

Glassmorphism Effects on Header and Footer.

Modern Tabs styled as rounded pills with an underline indicator for the active tab.

Full Responsiveness with mobile-friendly adjustments.

Accessibility support with prefers-reduced-motion (disables animations if user prefers).

⚙️ Future Enhancements

Add state management between tabs.

Integrate a frontend framework (React / Vue / Svelte).

Implement a manual theme switcher (Light/Dark toggle).

Extend with additional components (Side Menu, Cards, Forms).

# 📝 Example Usage
<div id="tabs">
  <div class="tab active">Home</div>
  <div class="tab">About</div>
  <div class="tab">Contact</div>
</div>

<div id="content">
  <h1>Welcome!</h1>
  <p>This is your modern web app shell.</p>
</div>
