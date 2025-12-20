find . -depth -type d \( -name "* *" -o -name "*,*" \) | while IFS= read -r dir; do
    newdir=$(echo "$dir" | sed 's/[ ,]/_/g')
    if [ "$dir" != "$newdir" ]; then
        echo "Renaming: $dir → $newdir"
        mv "$dir" "$newdir"
    fi
done
