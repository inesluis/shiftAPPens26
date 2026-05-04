![NutriCost Banner](docs/mainBannerEN.png?raw=true)

# NutriCost

**NutriCost** is an intelligent mobile application that transforms nutritional awareness into cost-effective decisions, making healthy eating accessible to everyone.

---
## Key Features

- **Nutritional Tracking** - Monitor macros, calories, and costs in real-time
- **Recipe Management** - Create, save, and organize your favorite recipes
- **Budget Analysis** - Weekly budget insights and cost optimization
- **Smart Ingredient Search** - Find ingredients and products by supermarket
- **Price Comparison** - Compare prices for the same products/recipe across different supermarkets
- **Dietary Customization** - Customize diets based on preferences (vegetarian, gluten-free, high-protein)
- **Responsive UI** - Intuitive and responsive design for mobile
- **Real-time Updates** - Instant synchronization across features

---

## Demo

Watch NutriCost in action:

[![NutriCost Demo](https://img.shields.io/badge/▶_Watch_Demo-FF0000?style=for-the-badge)](demo.mp4)

---

## Project Structure

```
shiftAPPens26/
├── NutriCost/                         
│   ├── App.tsx
│   ├── index.ts
│   ├── package.json
│   ├── app.json
│   ├── babel.config.js
│   ├── jest.config.js
│   ├── tsconfig.json
│   ├── assets/
│   │   ├── icon.png
│   │   ├── splash-icon.png
│   │   ├── favicon.png
│   │   └── supermarkets/
│   └── src/
│       ├── types/
│       ├── theme/
│       ├── config.ts
│       ├── supabase.ts
│       ├── api/
│       ├── components/
│       ├── context/
│       ├── navigation/
│       ├── screens/
│       └── utils/
│
├── jakartApp/                         
│   ├── pom.xml
│   └── src/
│
├── NutriCost_improvements.md
├── README.md
├── TODO.md
└── ER_Model/                          
    ├── model.sql
    ├── users.sql
    ├── data/
    ├── scripts/
    └── endpoints/
```

---

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- Expo CLI installed globally
- Android SDK or iOS development environment

### Installation

1. **Install dependencies:**
   ```bash
   cd NutriCost
   npm install
   ```

2. **Start the app:**
   ```bash
   npm start
   ```

---

## Available Commands

| Command              | Description                          |
|----------------------|--------------------------------------|
| `npm start`          | Start Expo development server        |
| `npm run android/ios`    | Build & run on device or emulator |
| `npm install`        | Install all dependencies              |
| `npm test`           | Run test suite                        |

---

## Running the App

### For Android:
```bash
cd NutriCost
npm install
npm run android
```

> The app will automatically launch on your connected Android device or emulator.

### For iOS:
```bash
cd NutriCost
npm install
npm run ios
```

---

## App Architecture

- **State Management:** React Context API with custom reducer
- **Routing:** Tab-based navigation with stack navigation
- **Persistence:** AsyncStorage for local data management
- **Type Safety:** Full TypeScript coverage
- **Testing:** Jest + React Native Testing Library

---

## Technical Stack

### Frontend (Mobile)
- **Framework:** React Native with Expo
- **Language:** TypeScript
- **Navigation:** React Navigation v7
- **State Management:** React Context API + Custom Reducer
- **Local Storage:** AsyncStorage
- **UI Components:** Expo Vector Icons
- **Testing:** Jest + React Native Testing Library

### Backend
- **Framework:** Jakarta EE / Java
- **Build Tool:** Maven 
- **Database:** Supabase
- **ORM:** JPA/Hibernate 
- **Dependency Injection:** CDI 


---

## Key Screens

| Screen | Purpose |
|--------|---------|
| Home | Dashboard with daily nutritional overview |
| Recipes | Browse and manage recipes |
| Ingredient Search | Find ingredients by supermarket |
| Create Recipe | Add custom recipes with ingredients |
| Tracking | Monitor weekly budget and nutrition |
| Profile | User settings and preferences |

---

## Team

Built with passion by a team of dedicated students at **[Shift APPens](https://shiftappens.com/)**:

- **[Carolina Gonçalves](https://www.linkedin.com/in/carolina-gon%C3%A7alves-a057292b5/)**
- **[Diogo Vasco](https://www.linkedin.com/in/diogvasc/)**
- **[Inês Luís](https://www.linkedin.com/in/inesbluis/)**
- **[Luís Barata](https://github.com/Stewartinho)**

---

## Built With

![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Navigation](https://img.shields.io/badge/React_Navigation-000000?style=for-the-badge&logo=react&logoColor=white)
![Java](https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=java&logoColor=white)

---

## License

This project is licensed under the Eclipse Public License 2.0.