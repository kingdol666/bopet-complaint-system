@echo off
chcp 65001 >nul
echo ============================================================
echo BOPET客诉系统 - 一键启动脚本（生产模式）
echo ============================================================
echo.

echo [1/2] 检查环境...
if not exist node_modules (
    echo [错误] 未检测到依赖，请先运行 init.bat 进行初始化
    pause
    exit /b 1
) else (
    echo [OK] 依赖已存在
)

if not exist .env (
    echo [错误] .env 文件不存在，请先运行 init.bat 进行初始化
    pause
    exit /b 1
) else (
    echo [OK] .env 文件已存在
)

if not exist .output\server\index.mjs (
    echo [提示] 未检测到生产构建，正在构建...
    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 构建失败，请运行 init.bat 进行完整初始化
        pause
        exit /b 1
    )
    echo [OK] 构建完成
) else (
    echo [OK] 生产构建已存在
)
echo.

echo [2/2] 启动生产服务器...
echo ============================================================
echo 服务器地址: http://localhost:3000
echo 模式: 生产模式 (Production)
echo 按 Ctrl+C 可停止服务器
echo ============================================================
echo.

call npm run start
