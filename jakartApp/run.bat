@echo off
set JAVA_HOME=C:\Program Files\Java\jdk-25.0.2
set PATH=%JAVA_HOME%\bin;%PATH%

:: Database Variables
set DB_URL=jdbc:postgresql://aws-0-eu-west-1.pooler.supabase.com:5432/postgres
set DB_USER=postgres.gcdqszdosvvhxcxczgzt
set DB_PASSWORD=shift26maquinas

echo ------------------------------------------
echo Starting Jakarta App Restructuring Project
echo Using Java from: %JAVA_HOME%
echo.
echo ACCESS URLS:
echo Local:    http://localhost:8080/jakartApp/api
echo External: http://192.168.20.79:8080/jakartApp/api
echo ------------------------------------------

java -version

:: Run the application using the Maven Wrapper
call mvnw clean package exec:exec
