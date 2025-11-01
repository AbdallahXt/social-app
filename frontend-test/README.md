# Google Sign-In Test Frontend

React + TypeScript + Tailwind CSS application for testing Google OAuth authentication.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Make sure your backend is running on `http://localhost:4000`

4. Open the URL shown in the terminal (usually `http://localhost:5173`)

## Configuration

- **Backend URL**: Default is `http://localhost:4000` (can be changed in the UI)
- **Google Client ID**: Configured in `src/App.tsx`

## Features

- Google Sign-In button
- Real-time status updates
- User information display
- Token display (truncated, full tokens in console)
- localStorage token storage
- Responsive design with Tailwind CSS

