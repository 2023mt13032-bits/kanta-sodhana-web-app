#!/usr/bin/env python3
"""Start uvicorn with venv excluded from reload watch."""
import sys
import os

# Change to backend dir
os.chdir(os.path.join(os.path.dirname(__file__), "..", "backend"))

# Add venv site-packages to path so uvicorn is importable
sys.path.insert(0, "venv/lib/python3.9/site-packages")

from uvicorn.main import main as uvicorn_main

os.environ["UVICORN_RELOAD_EXCLUDE"] = "venv"
os.environ["UVICORN_RELOAD_DIRS"] = "."

sys.argv = [
    "uvicorn",
    "main:app",
    "--reload",
    "--port", "8000",
]

uvicorn_main()
