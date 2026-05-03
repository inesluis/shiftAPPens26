# Jakarta App - ShiftAPPens 26

A modern Jakarta EE application with AI integration and automated cost analysis.

## 🚀 Quick Start

Follow these steps to get the application running on your machine.

### 1. Prerequisites
- **Java JDK 17+** (JDK 25 recommended)
- **Maven** (included via `./mvnw`)

### 2. Configuration
The application uses environment variables for sensitive configuration. 
1. Copy `.env.example` to a new file named `.env`.
2. Open `.env` and fill in the following:
   - `DB_URL`: Your PostgreSQL connection string.
   - `DB_USER`: Your database username.
   - `DB_PASSWORD`: Your database password.
   - `OPENAI_API_KEY`: Your OpenAI API key for recipe generation.

### 3. Running the App
On Windows, simply run the provided batch script:
```cmd
run.bat
```
The script will:
- Detect your local IP address.
- Compile and package the application.
- Start the Glassfish Embedded server.
- Provide you with the Local and External URLs for testing.

## 📡 API Endpoints
Once running, you can access the API documentation at the root context or refer to [ENDPOINTS.md](./ENDPOINTS.md).

## 🛠 Tech Stack
- **Jakarta EE 10** (JAX-RS, CDI, JPA)
- **EclipseLink** (Persistence Provider)
- **LangChain4j** (AI/LLM Integration)
- **PostgreSQL** (Supabase)
- **Glassfish 8** (Embedded Container)
