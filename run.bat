@echo off
start python backend.py
timeout /t 3
start http://localhost:8000/web-app
