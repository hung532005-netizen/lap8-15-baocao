@echo off
chcp 65001 >nul
echo ===================================================
echo [DONG BO] Dang quet evidence va cap nhat tien trinh do an...
python scripts/sync_progress.py
echo ===================================================
echo Dang kiem tra va day thay doi len GitHub...
git pull --rebase origin main
git add .
git commit -m "docs: tu dong cap nhat tien trinh lo trinh do an (Lab 8 - 15)"
git push origin main
echo ===================================================
echo [THANH CONG] Da cap nhat toan bo code va tien trinh len GitHub!
echo https://github.com/hung532005-netizen/lap8-15-baocao
echo ===================================================
pause
