; Enable persistence so the script keeps running
#Persistent

; Get the directory where the script is located
scriptDir := A_ScriptDir

; Set the path to your Next.js application (if needed)
nextJsPath := scriptDir  ; If this is the same as scriptDir, you can use it directly

; Set the relative path to your custom icon file
iconPath := scriptDir . "\Ruahmidbar.ico"  ; Ensure this file exists in the same directory as the script

; Create a system tray icon with the specified icon
Menu, Tray, Icon, %iconPath%  ; Use the iconPath variable to set the tray icon

; Create a context menu for the tray icon
Menu, Tray, Add, Exit, ExitApp
Menu, Tray, Default, Exit

; Start the build process in a hidden command prompt and wait for it to complete
RunWait, %ComSpec% /c cd /d "%nextJsPath%" && npm install && npm run build, , Hide

; Check if the .next directory exists to confirm a successful build
if (FileExist(nextJsPath . "\.next")) {
    ; Start the server in a hidden command prompt and capture the PID
    Run, %ComSpec% /c cd /d "%nextJsPath%" && npm run start, , Hide, processId

    ; Open the default web browser to localhost:3666
    Sleep, 2000 ; Wait a moment to ensure the server starts
    Run, http://localhost:3666
} else {
    MsgBox, Build failed or .next directory not found.
}

; Keep the script running
return

; Exit the application when the user clicks the exit option in the tray menu
ExitApp:
    ; Close the running Node.js process using the PID captured earlier
    if (processId) {
        Process, Close, %processId%
		Run, taskkill /IM node.exe /F, , Hide
    } else {
        ; If processId is not set, just ensure all node processes are closed
        Process, Close, node.exe ; Ensure that all node processes are closed
		Run, taskkill /IM node.exe /F, , Hide
    }
    ExitApp ; Terminate the script