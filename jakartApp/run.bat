@echo off
set DB_URL=jdbc:postgresql://db.gcdqszdosvvhxcxczgzt.supabase.co:5432/postgres
set DB_USER=postgres
set DB_PASSWORD=shift26maquinas
set JAVA_HOME=C:\Program Files\Java\jdk-25.0.2

echo Building project...
call mvnw.cmd package -DskipTests

echo Verifying target folder...
dir target

echo Starting server...
java -jar target/glassfish-embedded.jar "deploy --contextroot=/jakartApp target/jakartApp-1.0-SNAPSHOT.war"
pause
