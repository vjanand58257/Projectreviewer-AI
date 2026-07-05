import zipfile
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
zip_path = BASE_DIR / "codebase.zip"
print(f"Creating test zip archive at: {zip_path}")

with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add smoke_test.py from parent directory
    source_file = BASE_DIR.parent / "smoke_test.py"
    if source_file.exists():
        zipf.write(source_file, arcname="smoke_test.py")
        print("SUCCESS: codebase.zip created successfully inside test_fixtures.")
    else:
        print("Error: smoke_test.py not found in parent directory.")
