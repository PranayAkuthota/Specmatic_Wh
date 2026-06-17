import subprocess
import os
import sys

if __name__ == "__main__":
    # Determine directory paths
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, "backend")
    
    # Use python executable from backend venv if available
    venv_python = os.path.join(backend_dir, "venv", "bin", "python")
    if not os.path.exists(venv_python):
        venv_python = sys.executable

    # Run Django migrations and start the development server
    print("Running Django database migrations...")
    subprocess.run([venv_python, "manage.py", "migrate"], cwd=backend_dir)
    
    print("Starting Django development server on port 8000...")
    try:
        subprocess.run([venv_python, "manage.py", "runserver", "0.0.0.0:8000"], cwd=backend_dir)
    except KeyboardInterrupt:
        print("\nStopping Django development server.")
