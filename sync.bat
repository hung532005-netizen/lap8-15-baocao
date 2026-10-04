@echo off
chcp 65001 >nul
echo Dang kiem tra va day thay doi len GitHub...
git add .
git commit -m "update: dong bo thay doi moi nhat len GitHub"
git push origin main
echo ===================================================
echo [THANH CONG] Da cap nhat toan bo code len GitHub!
echo https://github.com/hung532005-netizen/lap8-15-baocao
echo ===================================================
pause
