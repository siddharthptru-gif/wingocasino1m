@echo off
echo Installing Node.js dependencies for Wingo Casino...

REM Change to the project directory
cd /d "c:\Users\Administrator\Documents\qoder\wingo-casino"

REM Install all required dependencies
npm install express mongoose bcryptjs jsonwebtoken cors dotenv socket.io

if %errorlevel% neq 0 (
    echo.
    echo Error: npm install failed!
    echo Please make sure Node.js is installed on your system.
    echo You can download it from: https://nodejs.org/
    pause
    exit /b %errorlevel%
)

echo.
echo Dependencies installed successfully!
echo.
echo Starting the Wingo Casino server...
echo.
echo Note: The server will be available at http://localhost:3000
echo.
echo Press Ctrl+C to stop the server.
echo.
npm start