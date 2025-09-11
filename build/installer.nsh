!macro preInit
  !echo "[Hexcall NSIS] preInit"
  ; Branding text customization disabled for compatibility with NSIS template
!macroend

!macro customWelcomePage
  !echo "[Hexcall NSIS] customWelcomePage"
  !define MUI_WELCOMEPAGE_TITLE  "Welcome to Hexcall Setup"
  !define MUI_WELCOMEPAGE_TEXT   "This wizard will guide you through the installation of Hexcall, a lightweight voice overlay for League of Legends. Click Next to continue."
!macroend

!macro customPage
!macroend

!macro customInstall
  !echo "[Hexcall NSIS] customInstall"
!macroend

!macro customFinishPage
  !echo "[Hexcall NSIS] customFinishPage"
  !define MUI_FINISHPAGE_TITLE   "Hexcall has been installed"
  !define MUI_FINISHPAGE_TEXT    "You can launch Hexcall from the desktop or Start Menu."
!macroend

!macro customUnInit
  !echo "[Hexcall NSIS] customUnInit"
!macroend
