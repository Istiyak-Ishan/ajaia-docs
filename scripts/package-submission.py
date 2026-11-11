import os
import shutil
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SUBMISSION_DIR = os.path.join(ROOT, "submission-drive-folder")
SCREENSHOTS_DIR = os.path.join(ROOT, "screenshots")
SUBMISSION_SCREENSHOTS = os.path.join(SUBMISSION_DIR, "screenshots")

EXCLUDE_DIRS = {
    "node_modules", ".next", ".git", "temp-walkthrough",
    "submission-drive-folder", "video-temp", ".system_generated"
}
EXCLUDE_FILES = {
    ".env", ".env.local", "dev.db", "dev.db-journal"
}

def package():
    os.makedirs(SUBMISSION_DIR, exist_ok=True)
    os.makedirs(SUBMISSION_SCREENSHOTS, exist_ok=True)

    # 1. Create clean source zip
    zip_path = os.path.join(SUBMISSION_DIR, "ajaia-docs-source.zip")
    print(f"Creating source archive: {zip_path}...")
    file_count = 0
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(ROOT):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".zip") or file.endswith(".mp4"):
                    continue
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, ROOT)
                zipf.write(full_path, rel_path)
                file_count += 1
    print(f"Archived {file_count} files into {zip_path}.")

    # 2. Copy documentation files
    docs = [
        "README.md",
        "ARCHITECTURE.md",
        "AI_WORKFLOW.md",
        "SUBMISSION.md",
        "walkthrough_video_url.txt",
    ]
    for doc in docs:
        src = os.path.join(ROOT, doc)
        dst = os.path.join(SUBMISSION_DIR, doc)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"Copied {doc} to submission-drive-folder/")

    # 3. Copy screenshots
    if os.path.exists(SCREENSHOTS_DIR):
        for img in os.listdir(SCREENSHOTS_DIR):
            if img.endswith(".png"):
                shutil.copy2(os.path.join(SCREENSHOTS_DIR, img), os.path.join(SUBMISSION_SCREENSHOTS, img))
                print(f"Copied screenshot {img} to submission-drive-folder/screenshots/")

    print("Submission folder assembled successfully!")

if __name__ == "__main__":
    package()

