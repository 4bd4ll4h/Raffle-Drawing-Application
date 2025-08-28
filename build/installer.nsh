; Custom NSIS installer script for Raffle Drawing Application

; Add custom pages and functionality
!include "MUI2.nsh"

; Custom install directory validation
Function .onVerifyInstDir
  ; Ensure installation directory is writable
  ClearErrors
  CreateDirectory "$INSTDIR\test"
  IfErrors 0 +3
    MessageBox MB_OK "Installation directory is not writable. Please choose a different location."
    Abort
  RMDir "$INSTDIR\test"
FunctionEnd

; Pre-install checks
Function .onInstSuccess
  ; Create application data directory
  CreateDirectory "$APPDATA\RaffleDrawingApp"
  CreateDirectory "$APPDATA\RaffleDrawingApp\raffles"
  CreateDirectory "$APPDATA\RaffleDrawingApp\recordings"
  
  ; Set proper permissions
  AccessControl::GrantOnFile "$APPDATA\RaffleDrawingApp" "(S-1-5-32-545)" "FullAccess"
FunctionEnd

; Custom uninstaller
Function un.onInit
  MessageBox MB_YESNO "Do you want to keep your raffle data and recordings?" IDYES KeepData
    ; Remove application data if user chooses to
    RMDir /r "$APPDATA\RaffleDrawingApp"
  KeepData:
FunctionEnd