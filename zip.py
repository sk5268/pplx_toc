#!/usr/bin/env python3
"""
Script to create a zip file from all non-hidden files in a directory.
Usage: python zip_directory.py <directory_path>
"""

import os
import sys
import zipfile
from pathlib import Path


def is_hidden(filepath):
    """Check if a file or directory is hidden (starts with a dot)."""
    return filepath.name.startswith('.')


def zip_directory(directory_path, output_zip=None):
    """
    Create a zip file containing all non-hidden files from the specified directory.

    Args:
        directory_path (str): Path to the directory to zip
        output_zip (str, optional): Output zip file name. If None, uses directory name + .zip

    Returns:
        str: Path to the created zip file
    """
    directory = Path(directory_path)

    # Check if directory exists
    if not directory.exists():
        raise FileNotFoundError(f"Directory '{directory_path}' does not exist")

    if not directory.is_dir():
        raise NotADirectoryError(f"'{directory_path}' is not a directory")

    # Generate output zip filename if not provided
    if output_zip is None:
        output_zip = f"{directory.name}.zip"

    zip_path = Path(output_zip)

    # Create zip file
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        # Walk through directory recursively
        for root, dirs, files in os.walk(directory):
            root_path = Path(root)

            # Filter out hidden directories
            dirs[:] = [d for d in dirs if not d.startswith('.')]

            # Add non-hidden files to zip
            for file in files:
                if not file.startswith('.'):
                    file_path = root_path / file
                    # Calculate relative path from the original directory
                    relative_path = file_path.relative_to(directory)
                    zipf.write(file_path, relative_path)
                    print(f"Added: {relative_path}")

    return str(zip_path)


def main():
    """Main function to handle command line arguments and execute zipping."""
    if len(sys.argv) != 2:
        print("Usage: python zip_directory.py <directory_path>")
        print("Example: python zip_directory.py /path/to/my/directory")
        sys.exit(1)

    directory_path = sys.argv[1]

    try:
        zip_file = zip_directory(directory_path)
        print(f"\nSuccessfully created zip file: {zip_file}")

        # Display some statistics
        with zipfile.ZipFile(zip_file, 'r') as zipf:
            file_count = len(zipf.namelist())
            zip_size = Path(zip_file).stat().st_size
            print(f"Files archived: {file_count}")
            print(f"Zip file size: {zip_size:,} bytes")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
