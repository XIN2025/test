<p align="center"><img src="https://avatars.githubusercontent.com/u/143503794?s=200&v=4" alt="OpenGig" /></p>

# React Native App Template

A production-ready React Native template using Expo Managed Workflow, featuring a modern tech stack with TypeScript, NativeWind, and essential navigation and state management solutions.

## Features

- 🚀 Expo Managed Workflow
- 💎 TypeScript for type safety
- 🎨 NativeWind (TailwindCSS) for styling
- 📱 React Navigation v7 with Bottom Tabs
- 🔄 Zustand for state management
- 💫 Reanimated for smooth animations
- 📊 FlashList for high-performance lists
- 🔒 Async Storage for local data persistence
- 🌐 Axios for API communication
- 📱 Bottom Sheet for modal interactions

## Quick Start

1. **Start Development Server**
   ```bash
   npm run start
   ```

2. **Clear Cache and Start**
   ```bash
   npm run start -- --reset-cache
   ```

3. **Generate Native Projects (Android & iOS Directories)**
   ```bash
   npx expo prebuild
   ```

4. **Regenerate Native Projects (Clean Android & iOS Directories)**
   ```bash
   npx expo prebuild --clean
   ```

5. **Auto Update Dependencies**
   ```bash
   npm install expo@latest && npx expo install --fix
   ```

6. **Run Android Emulator/Device**
```bash
  npx expo run:android
```

7. **Run Android Emulator/Device in Release Mode**
```bash
  npx expo run:android --variant release
```

## Tech Stack

We are using a modern, production-ready tech stack featuring the most popular and well-maintained libraries in the React Native ecosystem.

| Library                          | Category             | Version | Description                                    |
| -------------------------------- | -------------------- | ------- | ---------------------------------------------- |
| React Native                     | Mobile Framework     | v0.76.9   | The best cross-platform mobile framework       |
| React                           | UI Framework         | v18.3.1   | The most popular UI framework in the world     |
| TypeScript                      | Language             | v5.3.3    | Static typechecking                            |
| React Navigation                | Navigation           | v7.1.6    | Performant and consistent navigation framework |
| Zustand                         | State Management     | v5.0.3    | Observable state tree                          |
| Expo                            | SDK                  | v52.0.43  | Allows (optional) Expo modules                 |
| Expo Status Bar                 | Status Bar Library   | v2.0.1    | Status bar support                             |
| RN Reanimated                   | Animations           | v3.16.2   | Beautiful and performant animations            |
| Async-Storage                   | Persistence          | v1.23.1   | State persistence                              |
| Axios                          | REST client          | v1.8.4    | Communicate with back-end                      |
| NativeWind                     | Styling              | v4.1.23   | Tailwind CSS for React Native                  |
| TailwindCSS                    | CSS Framework        | v3.4.17   | Utility-first CSS framework                    |
| Bottom Sheet                   | UI Component         | v5.1.2    | Modal bottom sheet component                   |
| FlashList                      | FlatList replacement | v1.7.3    | A performant drop-in replacement for FlatList  |

## Project Structure

```
src/
├── components/     # Reusable UI components
├── navigation/     # Navigation configuration
├── screens/        # Screen components
├── stores/        # Zustand stores
├── utils/         # Utility functions
└── types/         # TypeScript type definitions
```

## Development

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- iOS/Android development environment setup

### Environment Setup
1. Install dependencies:
   ```bash
   npm install && npx expo install
   ```
2. Start the development server:
   ```bash
   npm run start
   ```

### Available Scripts
- `npm run ios` - Run on iOS simulator
- `npm run android` - Run on Android emulator
- `npm run web` - Run on web browser
