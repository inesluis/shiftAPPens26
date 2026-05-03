# Jakarta App API Endpoints

This document lists all the available API endpoints in the `jakartApp` application.

Base URL: `http://localhost:8080/jakartApp/api`

---

## 🔐 Authentication (`/auth`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Mock login endpoint. Expects `email` and `password`. Returns a mock JWT token. |
| `POST` | `/auth/register` | Mock registration endpoint. Expects `email`, `password`, and `name`. |

---

## 🥦 Ingredients (`/ingredients`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/ingredients` | Returns a list of all available ingredients. |
| `GET` | `/ingredients/search` | Search for ingredients. Query Param: `term` (string). |
| `GET` | `/ingredients/compare` | Compares prices of products for ingredients matching the search term across supermarkets. Query Param: `term` (string). |

---

## 🛒 Products (`/products`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/products` | Returns a list of all products in the database. |
| `GET` | `/products/search` | Search for products by name. Query Param: `term` (string). |

---

## 📖 Recipes (`/recipes`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/recipes` | List all curated recipes. Optional Query Param: `userId` (UUID) to also include user-specific recipes. |
| `POST` | `/recipes` | Create a new user recipe. Expects `UserRecipe` JSON body. |
| `PUT` | `/recipes/{id}` | Update an existing user recipe by ID. |
| `DELETE` | `/recipes/{id}` | Delete a user recipe by ID. |
| `GET` | `/recipes/{id}` | Get recipe details. Optional Query Param: `isCustom` (boolean, default: false) to look for user recipes. |
| `GET` | `/recipes/search` | Search curated recipes by name. Query Param: `term` (string). |
| `GET` | `/recipes/{id}/costs` | Get cost aggregation (total, matched, missing) for a recipe across supermarkets. |
| `GET` | `/recipes/{id}/costs/detailed` | Get detailed cost information including specific products for a curated recipe. |
| `POST` | `/recipes/AiGenerated` | Generate a recipe using AI based on a prompt. |
| `GET` | `/recipes/TestAI` | Simple test endpoint for AI communication. Query Param: `prompt` (string). |

---

## 🍲 Recipe Ingredients (`/recipe-ingredients`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/recipe-ingredients/recipe/{recipeId}` | Returns the list of ingredients associated with a curated recipe. |

---

## 🏪 Supermarkets (`/supermarkets`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/supermarkets` | Returns a list of all supermarkets. |

---

## 👤 User Recipes (`/user-recipes`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/user-recipes/{id}/costs` | Returns personalized cost aggregation for a user recipe by calculating costs from the specific products added by the user. |
