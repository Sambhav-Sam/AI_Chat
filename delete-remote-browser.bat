@echo off
echo Deleting remote-browser directory...
cd /d %~dp0
rd /s /q remote-browser
if exist remote-browser (
    echo Failed to delete some files. Please ensure all related processes are closed and try again.
) else (
    echo Successfully deleted remote-browser directory.
)
pause 