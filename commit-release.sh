#!/bin/bash

# Directories to process
PACKAGES_DIR="./packages"
APPS_DIR="./apps"

process_directory() {
    local dir_path="$1"
    local dir_name="$2"

    for package_dir in "$dir_path"/*/; do
        local package_name
        local package_file

        package_name="$(basename "$package_dir")"
        package_file="${package_dir}package.json"

        # Check if package has changes
        if git status --porcelain "$package_dir" | grep -q .; then
            echo "Found changes in $package_name ($dir_name)"

            # Extract version from package.json
            if [ -f "$package_file" ]; then
                local version
                version="$(jq -r '.version' "$package_file")"

                if [ -n "$version" ]; then
                    echo "Version found: $version"

                    git add "$package_dir"
                    git commit --no-verify -m "build($package_name): release \`v$version\`"
                else
                    echo "ERROR: Could not extract version from $package_name"
                fi
            else
                echo "ERROR: package.json not found in $package_name"
            fi
        else
            echo "No changes in $package_name ($dir_name)"
        fi
    done
}

main() {
    echo "Processing packages directory..."
    process_directory "$PACKAGES_DIR" "packages"

    echo "Processing apps directory..."
    process_directory "$APPS_DIR" "apps"
}

main

echo "Process completed!"
