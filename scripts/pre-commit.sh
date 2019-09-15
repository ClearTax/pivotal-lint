#/usr/bin/env bash

# get all changed files
changed_files="$(git diff-index -r --name-only HEAD)"

# check for a specific file in changed files
check_run() {
	echo "$changed_files" | grep --quiet "$1" && eval "$2"
}

check_run src "echo 'src files has changed. Run npm run build and commit the changes'"