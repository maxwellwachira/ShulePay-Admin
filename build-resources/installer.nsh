; Installs the ZKTeco fingerprint reader's USB driver (bundled in resources/zkfinger/driver)
; via pnputil. Requires elevation, which "perMachine": true in the nsis config already
; forces for the whole installer. Reinstalling over an already-installed driver is a
; no-op for pnputil, so this is safe to run on every install/update.
;
; The driver package is left in place on uninstall — pruning a staged driver cleanly
; needs resolving its oemNN.inf name first, and a stray driver in the store is harmless.
!macro customInstall
  DetailPrint "Installing the ZKTeco fingerprint reader driver..."
  nsExec::ExecToLog '"$WINDIR\System32\pnputil.exe" /add-driver "$INSTDIR\resources\zkfinger\driver\zkusbdevices.inf" /install'
  Pop $0
!macroend
