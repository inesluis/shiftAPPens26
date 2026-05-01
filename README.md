# shiftAPPens26

## MyMobileApp

A React Native mobile app built with **TypeScript** and **Java** native modules.

### Tech Stack

| Layer         | Technology                  |
|---------------|-----------------------------|
| UI / Logic    | React Native + TypeScript   |
| Navigation    | React Navigation v6         |
| State         | Zustand                     |
| HTTP          | Axios                       |
| Native (Android) | Java                     |
| CI            | GitHub Actions              |

### Project Structure

```
MyMobileApp/
├── src/
│   ├── components/       # Reusable UI components
│   ├── screens/          # Screen-level components
│   ├── navigation/       # React Navigation setup
│   ├── hooks/            # Custom React hooks
│   ├── services/         # API client & service layer
│   ├── store/            # Zustand global store
│   ├── utils/            # Pure utility functions
│   └── types/            # Shared TypeScript types
├── android/
│   └── app/src/main/java/com/mymobileapp/
│       ├── MainActivity.java
│       ├── MainApplication.java
│       ├── modules/      # Custom native modules
│       └── utils/        # Android utility classes
├── assets/               # Images, fonts
└── .github/workflows/    # CI pipelines
```

### Getting Started

```bash
yarn install
yarn android   # Run on Android
yarn ios       # Run on iOS
```

### Available Scripts

| Command          | Description                  |
|------------------|------------------------------|
| `yarn start`     | Start Metro bundler          |
| `yarn android`   | Build & run on Android       |
| `yarn ios`       | Build & run on iOS           |
| `yarn lint`      | Lint TypeScript files        |
| `yarn type-check`| TypeScript compiler check    |
| `yarn test`      | Run Jest test suite          |
