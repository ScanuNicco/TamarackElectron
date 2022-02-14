#!/bin/bash
cd "$1"
for artist in *; do 
    for album in "$artist"/*; do
    	if [ -d "$album" ]; then 
		echo "$album"
		for song in "$album"/*; do
			if [ -f "$song" ]; then
				renamed=$(echo "$song" | sed "s/#//g")
        			mv "$1/$song" "$1/$renamed"
			fi
		done
	fi
    done
done
