@echo off
chcp 65001 >nul
echo ============================================================
echo BOPET客诉系统 - 一键初始化脚本
echo ============================================================
echo.

echo [1/5] 检查 Node.js 环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js (推荐 v18+)
    pause
    exit /b 1
)
echo [OK] Node.js 已安装: 
node -v
echo.

echo [2/5] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成
echo.

echo [3/5] 检查 .env 配置文件...
if not exist .env (
    echo [提示] .env 文件不存在，正在从 .env.example 创建...
    copy .env.example .env >nul
    echo [OK] .env 文件已创建
) else (
    echo [OK] .env 文件已存在
)
echo.

echo [4/5] 初始化数据库...
call npm run db:generate
if %errorlevel% neq 0 (
    echo [错误] Prisma Client 生成失败
    pause
    exit /b 1
)

call npm run db:push
if %errorlevel% neq 0 (
    echo [错误] 数据库结构同步失败
    pause
    exit /b 1
)

call npm run db:seed
if %errorlevel% neq 0 (
    echo [错误] 初始数据导入失败
    pause
    exit /b 1
)
echo [OK] 数据库初始化完成
echo.

echo [5/5] 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo [错误] 项目构建失败
    pause
    exit /b 1
)
echo [OK] 项目构建完成
echo.

echo ============================================================
echo 初始化完成！
echo ============================================================
echo.
echo 使用以下命令启动项目:
echo   npm run dev          - 开发模式启动
echo   npm run start        - 生产模式启动
echo   npm run dev:fresh    - 重置数据库并重新启动
echo.
pause
