# Frontend - React + Vite

## Setup

```bash
cd frontend
npm install
npm run dev
```

Server runs on `http://localhost:3000`

## Project Structure

```
src/
├── modules/
│   ├── auth/
│   │   └── pages/
│   │       └── Login.jsx
│   ├── dashboard/
│   │   ├── pages/
│   │   │   └── Dashboard.jsx
│   │   ├── components/
│   │   │   └── Sidebar.jsx
│   │   └── styles/
│   │       └── Sidebar.css
│   ├── hr/
│   ├── accounts/
│   ├── tasks/
│   └── crm/
├── context/
│   └── AuthContext.jsx
├── services/
│   └── api.js
├── styles/
│   ├── Login.css
│   └── Dashboard.css
├── App.jsx
├── main.jsx
└── index.css
```

## Features

- **Login Page**: Authenticate with backend (demo: admin/secret)
- **Dashboard**: Main application interface with sidebar navigation
- **Sidebar Navigation**: Quick access to HR, Accounts, Tasks, CRM modules
- **API Integration**: Axios client with token management and auto-refresh
- **Auth Context**: Centralized authentication state management

## Environment

Backend must be running on `http://localhost:8000` for API requests to work.

Frontend proxies `/api` requests to backend via Vite config.

## Build

```bash
npm run build
```

Output: `dist/`
