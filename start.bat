@echo off
chcp 65001 >nul
echo ============================================================
echo BOPET客诉系统 - 一键启动脚本
echo ============================================================
echo.

echo [1/2] 检查环境...
if not exist node_modules (
    echo [提示] 未检测到依赖，正在自动安装...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] 依赖安装失败，请先运行 init.bat 进行初始化
        pause
        exit /b 1
    )
    echo [OK] 依赖安装完成
) else (
    echo [OK] 依赖已存在
)

if not exist .env (
    echo [提示] .env 文件不存在，正在从 .env.example 创建...
    copy .env.example .env >nul
    echo [OK] .env 文件已创建
) else (
    echo [OK] .env 文件已存在
)

if not exist prisma\data\bopet.db (
    echo [提示] 数据库不存在，正在初始化...
    call npm run db:generate
    call npm run db:push
    call npm run db:seed
    if %errorlevel% neq 0 (
        echo [错误] 数据库初始化失败，请运行 init.bat 进行完整初始化
        pause
        exit /b 1
    )
    echo [OK] 数据库初始化完成
) else (
    echo [OK] 数据库已存在
)
echo.

echo [2/2] 启动开发服务器...
echo ============================================================
echo 服务器地址: http://localhost:3000
echo 按 Ctrl+C 可停止服务器
echo ============================================================
echo.

call npm run dev
