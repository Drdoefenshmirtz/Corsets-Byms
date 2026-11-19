@echo off
rem =====================================================
rem  CORSETS BY MS: MARK THE LEFTOVER FILES
rem  Double-click this once. It only RENAMES files (nothing is deleted):
rem    DELETE_  = the site no longer uses it, safe to delete
rem    MOVE_    = a brand file the site doesn't use: move it to a brand folder outside this one
rem  When you are done, delete this file too.
rem =====================================================
cd /d "%~dp0"
echo Marking the leftover files...

rem the 3D library (no longer used)
if exist "js" ren "js" "DELETE_js"

rem the crimson scarf
for %%f in ("story\scarf.webp" "story\scarf-small.webp" "story\CREDITS.txt") do if exist %%f ren %%f "DELETE_%%~nxf"

rem the first stock videos (replaced by the stand-ins)
for %%f in ("story\story-*.*") do ren "%%f" "DELETE_%%~nxf"

rem old carousel pictures
for %%f in ("images\image-1.jpg" "images\image-4.jpg" "images\image-4.mp4" "images\image-4.webm") do if exist %%f ren %%f "DELETE_%%~nxf"

rem the font only used to draw the tab icon
if exist "fonts\playfair.woff2" ren "fonts\playfair.woff2" "DELETE_playfair.woff2"

rem brand files: keep them, but move them out of the website folder
for %%f in ("corsets-by-ms-badge.png" "corsets-by-ms-badge.svg" "corsets-by-ms-logo-dark.png" "corsets-by-ms-logo-dark.svg") do if exist %%f ren %%f "MOVE_%%~nxf"
for %%f in ("images\corsets-by-ms-badge.png" "images\corsets-by-ms-badge.svg" "images\corsets-by-ms-logo-dark.png" "images\corsets-by-ms-logo-dark.svg") do if exist %%f ren %%f "MOVE_%%~nxf"
if exist "Claude outputs" ren "Claude outputs" "MOVE_Claude outputs"

rem the leftovers in Downloads from downloading the stock videos
pushd "%USERPROFILE%\Downloads"
for %%f in ("b34076e0-267b-4e26-98de-0816a6dc03e1.tmp" "2f87f3f4-946f-4350-8da6-b095302ea36e.tmp" "f4acfcf3-105e-408e-8481-c83f4e5db69f.tmp" "6f5c1027-c70a-4a17-a3a0-0b0ff31e3432.tmp" "92790cb3-2972-4a97-b928-7b9cc7e2b7f0.tmp" "115e1ac9-034a-4e72-8581-f7c7edce4d6a.tmp" "1b53947f-73aa-4ac0-82f2-a82674632996.tmp" "43b63470-b57b-4081-ba49-f327f5ae49e5.tmp" "994e1551-28c9-4b96-9ac6-41350175e772.tmp" "0d1fa436-53cc-41f7-be2e-53528d531f8a.tmp" "story-measure-waist.mp4") do if exist %%f ren %%f "DELETE_%%~nxf"
popd

echo.
echo Done. Look for DELETE_ (safe to delete) and MOVE_ (move to a brand folder).
echo Then delete this file (mark-files-to-delete.bat) as well.
pause
