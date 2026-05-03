@echo off
setlocal enabledelayedexpansion

:: Detect Local IP Address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%a
    set IP=!IP: =!
)

echo ------------------------------------------
echo Starting Jakarta App Restructuring Project
if "%JAVA_HOME%"=="" (
    echo WARNING: JAVA_HOME is not set. Using system default 'java'.
) else (
    echo Using Java from: %JAVA_HOME%
)
echo.
echo ACCESS URLS:
echo Local:    http://localhost:8080/jakartApp/api
if not "%IP%"=="" (
    echo External: http://%IP%:8080/jakartApp/api
)
echo ------------------------------------------

:: Display java version for debugging
java -version

:: Run the application using the Maven Wrapper
call mvnw clean package exec:exec
