@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title REVO Processos - Demonstracao local
if not exist "runtime\node.exe" (
  echo Este arquivo precisa do pacote Windows completo, com a pasta runtime.
  echo Baixe o ZIP de demonstracao local e extraia tudo antes de iniciar.
  pause
  exit /b 1
)
"runtime\node.exe" "scripts\offline-demo.mjs"
if errorlevel 1 (
  echo.
  echo Nao foi possivel iniciar o teste. Copie a mensagem acima para receber ajuda.
  pause
)
endlocal
