#!/bin/bash

YELLOW='\033[0;33m'
NC='\033[0m'

if [ $# -eq 0 ]; then
    echo "Please specify a directory path in quotes. Use --overwrite to replace the original files."
    exit 1
fi

echo "Looking in $1/*"
echo "$2"
cd "$1"
for file in *; do 
    if [ -f "$file" ]; then 
        echo "$file"
        ffmpeg -i "$file" -vn -c:a aac -b:a 128k "FIXED - $file" 
        if [ "$2" == "--overwrite" ]; then
                echo "${YELLOW}WARN:${NC} Overwriting original file"
                rm "$file"
                mv "FIXED - $file" "$file"
        fi
    fi 
done

