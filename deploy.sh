#!/usr/bin/env bash

# 构建项目
npm run build

# 切换到 dist 目录
cd dist

# 初始化 git
git init
git add -A
git commit -m 'deploy'

# 推送到 gh-pages 分支
git push -f https://github.com/your-username/your-repo-name.git main:gh-pages

# 返回原目录
cd -
