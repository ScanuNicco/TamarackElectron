#!/bin/bash
cd "$1"
for artist in *; do 
    for album in "$artist"/*; do
    	if [ -d "$album" ]; then 
		echo "Searching in $album"
		for song in "$album"/*; do
			if [ -f "$song" ]; then
				if grep -q "#" <<<"$song"; then
					echo "Renaming $song"
					renamed=$(echo "$song" | sed "s/#//g") #Remove hashtags
        				mv "$1/$song" "$1/$renamed"
				fi
			fi
		done
	fi
    done
done
