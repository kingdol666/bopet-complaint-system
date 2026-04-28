@echo off
chcp 65001 >nul
echo ============================================================
echo BOPET客诉系统 - 一键初始化脚本
echo ============================================================
echo.

echo [1/6] 检查 Node.js 环境...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js，请先安装 Node.js (推荐 v18+)
    pause
    exit /b 1
)
echo [OK] Node.js 已安装: 
node -v
echo.

echo [2/6] 安装依赖...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)
echo [OK] 依赖安装完成
echo.

echo [3/6] 检查配置文件...
if not exist .env (
    echo [提示] .env 文件不存在，正在从 .env.example 创建...
    copy .env.example .env >nul
    echo [OK] .env 文件已创建
) else (
    echo [OK] .env 文件已存在
)

if not exist .env.production (
    echo [提示] .env.production 文件不存在，正在从 .env.example 创建...
    copy .env.example .env.production >nul
    echo [OK] .env.production 文件已创建
) else (
    echo [OK] .env.production 文件已存在
)
echo.

echo [4/6] 初始化开发数据库...
call npm run db:generate
if %errorlevel% neq 0 (
    echo [错误] Prisma Client 生成失败
    pause
    exit /b 1
)

call npm run db:push
if %errorlevel% neq 0 (
    echo [错误] 开发数据库结构同步失败
    pause
    exit /b 1
)

call npm run db:seed
if %errorlevel% neq 0 (
    echo [错误] 开发数据库初始数据导入失败
    pause
    exit /b 1
)
echo [OK] 开发数据库初始化完成
echo.

echo [5/6] 初始化生产数据库...
if not exist data mkdir data

REM 使用绝对路径初始化生产数据库
set DATABASE_URL=file:%CD%\data\bopet.db

call npx prisma db push --force-reset
if %errorlevel% neq 0 (
    echo [错误] 生产数据库结构同步失败
    pause
    exit /b 1
)

call npx tsx prisma\seed.ts
if %errorlevel% neq 0 (
    echo [错误] 生产数据库初始数据导入失败
    pause
    exit /b 1
)

REM 清除临时环境变量
set DATABASE_URL=
echo [OK] 生产数据库初始化完成
echo.

echo [6/7] 构建生产版本...
echo 使用生产数据库路径重新构建...
set DATABASE_URL=file:%CD%\data\bopet.db
call npx prisma generate
if %errorlevel% neq 0 (
    echo [错误] Prisma Client 生成失败
    pause
    exit /b 1
)

call npm run build
if %errorlevel% neq 0 (
    echo [错误] 项目构建失败
    pause
    exit /b 1
)
echo [OK] 生产版本构建完成
echo.

echo [7/7] 恢复开发环境配置...
REM 恢复开发环境 Prisma Client
set DATABASE_URL=file:%CD%\prisma\data\bopet.db
call npx prisma generate
if %errorlevel% neq 0 (
    echo [警告] 开发环境 Prisma Client 恢复失败，但不影响使用
)
set DATABASE_URL=
echo [OK] 开发环境配置已恢复
echo.

echo ============================================================
echo 初始化完成！
echo ============================================================
echo.
echo 数据库文件位置:
echo   开发数据库: prisma\data\bopet.db
echo   生产数据库: data\bopet.db
echo.
echo 使用以下命令启动项目:
echo   start.bat          - 生产模式启动（推荐）
echo   dev.bat            - 开发模式启动（支持热更新）
echo   npm run dev        - 开发模式
echo   npm run start      - 生产模式
echo.
pause
