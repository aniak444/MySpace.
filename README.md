# 🌌 My Space - Personal Productivity & Wellbeing Dashboard

**My Space** is a Full-Stack Single Page Application (SPA) designed to help you manage your time, habits, goals, and daily wellbeing. It bridges the gap between getting things done and taking care of yourself.

## 🚀 What's inside? (Features)

* **✅ Smart To-Do List:** Manage tasks with priorities and deadlines. I implemented an **Optimistic UI** approach here – when you check off or delete a task, it visually disappears instantly to make the app feel lightning-fast, while the database updates quietly in the background.
* **🔥 Advanced Habit Tracker:** It doesn't just check boxes. The custom backend logic calculates your daily streaks automatically by tracking the exact dates of your activity.
* **⏱️ Drift-Resistant Focus Timer:** A custom Pomodoro timer. Instead of a basic `-1 second` interval (which tends to lag and lose time in browsers), it calculates the exact target end-time using `Date.now()` and `useRef` for pinpoint accuracy.
* **📖 Digital Journal & Mood Tracker:** A simple, interactive diary to write down your thoughts and track how you're feeling each day.
* **🌎 Interactive World Map:** A dynamic SVG map to pin and color-code countries you've visited or are planning to visit.
* **📸 Vision Board (Drag & Drop):** Upload your daily inspiration. Images are processed directly in the browser (using `FileReader`) and saved to the database as **Base64 Data URLs**, bypassing the need for an external file server.
* **🛡️ Admin Panel:** A dedicated dashboard for user management and site statistics, secured with Role-Based Access Control (RBAC) – strictly accessible only to users with the `ADMIN` role.

## 🧠 Under the Hood (Architecture & Security)

* **🔑 Stateless Authentication:** Secure login using **JWT (JSON Web Tokens)** stored safely in `localStorage`. 
* **⚡ Event-Driven Architecture:** I built a custom API wrapper (`apiFetch`) that handles expired tokens globally. If your session dies, it dispatches a global event (`window.dispatchEvent`) that instantly logs you out, no matter which component you're currently using.
* **🛡️ API Security:** The backend is protected by **Rate Limiting** to prevent Brute-Force and DDoS attacks. Passwords are never stored in plain text—they are securely hashed using `bcrypt`.
* **🌐 DRY API Calls:** The custom `apiFetch` wrapper automatically attaches authorization tokens to headers for every request, keeping the codebase clean and DRY (Don't Repeat Yourself).

## 💻 Tech Stack

**Frontend:**
* React.js (Hooks, Conditional Rendering)
* Vite (Bundler)
* CSS3 / Flexbox / Grid
* Libraries: `react-toastify`, `react-svg-worldmap`

**Backend:**
* Node.js & Express.js
* JSON Web Token (JWT) & Bcrypt
* Express Rate Limit

**Database:**
* PostgreSQL
* Prisma ORM
