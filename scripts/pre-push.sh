#!/bin/sh

# run build
npm run build

git diff --exit-code --stat -- lib ':!node_modules' \
|| (echo "##[error] found changed files after build. please 'npm run build'" \
            "and check in all changes" \
    && exit 1)