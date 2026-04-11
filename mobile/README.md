# VENTEX Mobile App

React Native mobile application for the Royalton Investment System, built with Expo.

## Tech Stack

- **React Native** with **Expo** (managed workflow)
- **Expo Router** for file-based navigation
- **React Native** built-in StyleSheet (dark theme matching web app)
- **AsyncStorage** for local state persistence
- **Claude 4.6 Sonnet** AI integration via streaming API

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your phone (iOS/Android)

### Installation

```bash
cd mobile
npm install
```

### Running the App

```bash
npx expo start
```

Then scan the QR code with:
- **iOS**: Camera app or Expo Go
- **Android**: Expo Go app

### Environment Variables

Create a `.env` file in the `/mobile` directory:

```
API_BASE_URL=https://your-deployed-web-app-url.com
```

The AI Agent uses the same backend streaming endpoint (`/api/ai/stream`) as the web app.

## Screens

| Tab | Route | Description |
|-----|-------|-------------|
| Dashboard | `/` | Portfolio overview with stats, sectors, activity, and tasks |
| Ventures | `/ventures` | Searchable/filterable list of all 20 ventures |
| Venture Detail | `/ventures/[id]` | Full venture details, team, tasks, files, activity |
| AI Agent | `/agent` | Chat with Claude 4.6 Sonnet, streaming responses |
| Tasks | `/tasks` | Full task management with filters and bottom sheet detail |

## Design

- Background: `#0a0a0a`
- Cards: `#111111` with `#222222` border
- Primary: `#3b82f6` (blue)
- Success: `#22c55e` (green)
- Warning: `#f59e0b` (amber)
- Danger: `#ef4444` (red)
- Text: `#ffffff` / `#888888`

## Bundle ID

- iOS: `com.aurovia.ventex`
- Android: `com.aurovia.ventex`
