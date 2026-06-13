; =============================================================================
;  Prompt Library Pro  —  Inno Setup Installer Script
;
;  Author      : MX Phillips
;  Contact     : eugphill@gmail.com
;  Purchase    : https://payhip.com/MXPhillips
;  Compiler    : Inno Setup 6.3+  (https://jrsoftware.org/isinfo.php)
;
;  RELEASE     : Pre-Release 1  (v0.9.0)
;  DATE        : 2026-06-09
;
;  PRE-COMPILE CHECKLIST
;  ─────────────────────
;  [ ] Run Build.bat first  →  produces dist\PromptLibrary.exe
;  [ ] Confirm icon.ico exists in the project root
;  [ ] Confirm AppVersion + AppVersionDisplay below match the release
;  [ ] Open in Inno Setup IDE and press Ctrl+F9  (or: ISCC.exe PromptLibrary.iss)
;
;  OUTPUT
;  ──────
;  installer\PromptLibraryPro_Setup_PreRelease_1.exe
;
; =============================================================================


; -----------------------------------------------------------------------------
;  GLOBAL DEFINES
;  Edit these two blocks per release. Nothing else needs to change.
; -----------------------------------------------------------------------------

; ── Semantic version (used for upgrade detection + Windows version info) ─────
#define AppVersion        "0.9.0"
#define AppVersionDisplay "Pre-Release 1"

; ── Identity ──────────────────────────────────────────────────────────────────
#define AppName        "Prompt Library Pro"
#define AppShortName   "PromptLibraryPro"
#define AppPublisher   "MX Phillips"
#define AppURL         "https://payhip.com/MXPhillips"
#define AppSupportURL  "mailto:eugphill@gmail.com"
#define AppExeName     "PromptLibrary.exe"
#define AppDataFolder  "PromptLibrary"
#define AppMutex       "PromptLibraryPro_RunningInstance_v1"
#define AppDescription "Your local-first AI prompt library — 189 prompt blocks, 43 frameworks, " + \
                       "drag-and-drop canvas, roles, variables, chains, and more. " + \
                       "No cloud. No accounts. No subscription."


; =============================================================================
;  [Setup]
; =============================================================================
[Setup]

; ── Identity ──────────────────────────────────────────────────────────────────
; WARNING: Do not change AppId after first public release.
; Changing it breaks upgrade detection and leaves orphaned Add/Remove entries.
AppId={{A300D0C3-3DE0-4E9F-A79F-D1A624E8B881}

AppName={#AppName}
AppVersion={#AppVersion}
AppVerName={#AppName} {#AppVersionDisplay}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
AppSupportURL={#AppSupportURL}
AppUpdatesURL={#AppURL}
AppCopyright=Copyright (C) 2026 Eugene Phillips, trading as {#AppPublisher}. All rights reserved.
AppComments={#AppDescription}

; ── Instance control ──────────────────────────────────────────────────────────
; Prevents two copies of the installer running simultaneously.
AppMutex={#AppMutex}

; ── Windows version gate ──────────────────────────────────────────────────────
; Requires Windows 10 1809+ (build 17763) — minimum for WebView2 / PyWebView.
MinVersion=10.0.17763

; ── Privileges ────────────────────────────────────────────────────────────────
; Per-user install by default — no UAC prompt, no admin rights required.
; A dialog lets the user opt into a machine-wide install if they choose.
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; ── Install location ──────────────────────────────────────────────────────────
DefaultDirName={localappdata}\Programs\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes

; ── Upgrade behaviour ─────────────────────────────────────────────────────────
; Silently terminates any running instance before overwriting files.
CloseApplications=yes
CloseApplicationsFilter=*{#AppExeName}
RestartApplications=no

; ── File associations ─────────────────────────────────────────────────────────
; Notifies Windows Shell that this installer registers the .plp file type.
ChangesAssociations=yes

; ── Output ────────────────────────────────────────────────────────────────────
OutputDir=installer
OutputBaseFilename=PromptLibraryPro_Setup_PreRelease_1
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName} {#AppVersionDisplay}

; ── Compression ───────────────────────────────────────────────────────────────
; LZMA2 ultra — smallest possible installer file.
Compression=lzma2/ultra64
SolidCompression=yes
LZMAUseSeparateProcess=yes
LZMANumBlockThreads=4

; ── Wizard appearance ─────────────────────────────────────────────────────────
WizardStyle=modern
WizardResizable=no
DisableWelcomePage=no
DisableDirPage=no
DisableReadyPage=no
ShowLanguageDialog=no

; To add branded wizard images, create these two BMPs and uncomment:
;   WizardImageFile     — 164 × 314 px  (left-side panel)
;   WizardSmallImageFile — 55 × 55 px   (top-right corner)
; WizardImageFile=installer\wizard-side.bmp
; WizardSmallImageFile=installer\wizard-top.bmp

; ── Windows Explorer version metadata ─────────────────────────────────────────
; Visible under File Properties → Details.
VersionInfoVersion={#AppVersion}.0
VersionInfoCompany={#AppPublisher}
VersionInfoDescription={#AppName} {#AppVersionDisplay} Installer
VersionInfoProductName={#AppName}
VersionInfoProductVersion={#AppVersion}
VersionInfoCopyright=Copyright (C) 2026 Eugene Phillips, trading as {#AppPublisher}
VersionInfoTextVersion={#AppVersion} ({#AppVersionDisplay})


; =============================================================================
;  [Languages]
; =============================================================================
[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"


; =============================================================================
;  [Messages]  —  override Inno Setup's default wizard text
; =============================================================================
[Messages]

; ── Welcome page ──────────────────────────────────────────────────────────────
WelcomeLabel1=Welcome to {#AppName}
WelcomeLabel2=Setup will install {#AppName} {#AppVersionDisplay} on your computer.%n%n{#AppDescription}%n%nThis is an early pre-release build. Features are complete but feedback is welcome at eugphill@gmail.com%n%nClick Next to continue, or Cancel to exit.

; ── Finish page ───────────────────────────────────────────────────────────────
FinishedHeadingLabel=Installation Complete
FinishedLabel={#AppName} {#AppVersionDisplay} has been installed successfully.%n%nYour prompts are stored locally in Documents\{#AppDataFolder} and are never sent to the cloud.%n%nThank you for trying the pre-release — feedback is always welcome.


; =============================================================================
;  [CustomMessages]  —  strings referenced in [Tasks], [Code], and dialogs
; =============================================================================
[CustomMessages]
english.LaunchAfterInstall=Launch {#AppName} now
english.CreateDesktopIcon=Create a &Desktop shortcut
english.CreateDataShortcut=Create a shortcut to my &prompt data folder (Documents\{#AppDataFolder})
english.DeleteDataOnUninstall=Also permanently delete my saved prompts and database (Documents\{#AppDataFolder})
english.UninstallConfirm=Are you sure you want to uninstall {#AppName}?%n%nYour saved prompts in Documents\{#AppDataFolder} will NOT be deleted unless you check the option on the next screen.
english.UninstallDataWarning=This will permanently delete all your saved prompts and cannot be undone.%n%nAre you absolutely certain you want to continue?


; =============================================================================
;  [Tasks]  —  optional steps the user can toggle during install
; =============================================================================
[Tasks]
Name: "desktopicon";     Description: "{cm:CreateDesktopIcon}";    GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "datafoldershort"; Description: "{cm:CreateDataShortcut}";   GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked


; =============================================================================
;  [Dirs]  —  folders created during install
; =============================================================================
[Dirs]
; Pre-create the data folder so it appears in Documents immediately after install.
; uninsneveruninstall = this folder is preserved on uninstall (user data lives here).
Name: "{userdocs}\{#AppDataFolder}"; Flags: uninsneveruninstall


; =============================================================================
;  [Files]  —  content copied to the install directory
; =============================================================================
[Files]

; Main executable  —  produced by Build.bat / PyInstaller
Source: "dist\{#AppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; Application icon  —  used by shortcuts and the Add/Remove Programs entry
Source: "icon.ico"; DestDir: "{app}"; Flags: ignoreversion

; Optional extras  —  uncomment when files are ready
; Source: "LICENSE.txt";      DestDir: "{app}"; Flags: ignoreversion isreadme
; Source: "CHANGELOG.txt";    DestDir: "{app}"; Flags: ignoreversion
; Source: "RELEASE_NOTES.txt"; DestDir: "{app}"; Flags: ignoreversion


; =============================================================================
;  [Icons]  —  shortcuts created during install
; =============================================================================
[Icons]

; Start Menu
Name: "{group}\{#AppName}";           Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"; Comment: "{#AppDescription}"
Name: "{group}\Uninstall {#AppName}"; Filename: "{uninstallexe}";      IconFilename: "{app}\icon.ico"; Comment: "Remove {#AppName} from this computer"

; Desktop shortcut  —  only created if the user ticked the task
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; IconFilename: "{app}\icon.ico"; Comment: "{#AppDescription}"; Tasks: desktopicon

; Data folder shortcut  —  only created if the user ticked the task
Name: "{userdesktop}\{#AppName} — My Prompts"; Filename: "{userdocs}\{#AppDataFolder}"; Comment: "Open your saved prompts folder"; Tasks: datafoldershort


; =============================================================================
;  [Run]  —  actions executed immediately after install finishes
; =============================================================================
[Run]
Filename: "{app}\{#AppExeName}"; \
  Description: "{cm:LaunchAfterInstall}"; \
  Flags: nowait postinstall skipifsilent; \
  WorkingDir: "{app}"


; =============================================================================
;  [Registry]  —  .plp file type association (Prompt Library Pack)
; =============================================================================
[Registry]

; Register the .plp extension
Root: HKCU; Subkey: "Software\Classes\.plp"; \
  ValueType: string; ValueName: ""; ValueData: "{#AppShortName}.PackFile"; \
  Flags: uninsdeletevalue

; ProgID  —  human-readable name in Open With dialogs
Root: HKCU; Subkey: "Software\Classes\{#AppShortName}.PackFile"; \
  ValueType: string; ValueName: ""; ValueData: "Prompt Library Pack"; \
  Flags: uninsdeletekey

; Friendly description shown in File Explorer details column
Root: HKCU; Subkey: "Software\Classes\{#AppShortName}.PackFile"; \
  ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Prompt Library Pack"

; Default icon  —  first icon resource from the exe
Root: HKCU; Subkey: "Software\Classes\{#AppShortName}.PackFile\DefaultIcon"; \
  ValueType: string; ValueName: ""; ValueData: "{app}\icon.ico,0"

; Open command  —  passes the .plp file path as the first argument to the app
Root: HKCU; Subkey: "Software\Classes\{#AppShortName}.PackFile\shell\open\command"; \
  ValueType: string; ValueName: ""; ValueData: """{app}\{#AppExeName}"" ""%1"""

; Prompt Windows Shell to refresh file type icons after registration
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Explorer\FileExts\.plp"; \
  Flags: uninsdeletekey


; =============================================================================
;  [UninstallRun]  —  executed before files are removed during uninstall
; =============================================================================
[UninstallRun]
; Terminate any running instance before the uninstaller tries to delete the exe.
Filename: "taskkill.exe"; \
  Parameters: "/F /IM ""{#AppExeName}"""; \
  Flags: runhidden; \
  RunOnceId: "KillAppBeforeUninstall"


; =============================================================================
;  [UninstallDelete]  —  additional cleanup on uninstall
; =============================================================================
[UninstallDelete]
; Remove any log files written by the app next to the executable.
Type: files; Name: "{app}\error.log"
Type: files; Name: "{app}\*.log"


; =============================================================================
;  [Code]  —  Pascal scripting
; =============================================================================
[Code]

// ─────────────────────────────────────────────────────────────────────────────
//  Globals
// ─────────────────────────────────────────────────────────────────────────────
var
  DeleteDataCheckbox: TNewCheckBox;


// ─────────────────────────────────────────────────────────────────────────────
//  InitializeSetup
//  Called before the wizard is shown. Return False to abort the installer.
// ─────────────────────────────────────────────────────────────────────────────
function InitializeSetup(): Boolean;
begin
  Result := True;
  // AppId handles upgrade detection automatically.
  // Existing installs are updated in-place — no manual uninstall needed.
end;


// ─────────────────────────────────────────────────────────────────────────────
//  CurStepChanged
//  Fires at each stage of the install pipeline.
// ─────────────────────────────────────────────────────────────────────────────
procedure CurStepChanged(CurStep: TSetupStep);
begin
  case CurStep of
    ssInstall:
      begin
        // Pre-install: reserved for future pre-processing logic.
      end;
    ssPostInstall:
      begin
        // Post-install: reserved for future post-processing logic.
      end;
  end;
end;


// ─────────────────────────────────────────────────────────────────────────────
//  InitializeUninstall
//  Shows a confirmation dialog before the uninstaller begins.
//  Returns False to cancel the uninstall.
// ─────────────────────────────────────────────────────────────────────────────
function InitializeUninstall(): Boolean;
begin
  Result := MsgBox(
    CustomMessage('UninstallConfirm'),
    mbConfirmation,
    MB_YESNO
  ) = IDYES;
end;


// ─────────────────────────────────────────────────────────────────────────────
//  InitializeUninstallProgressForm
//  Appends an opt-in "delete my data" checkbox to the uninstall progress form.
// ─────────────────────────────────────────────────────────────────────────────
procedure InitializeUninstallProgressForm();
begin
  DeleteDataCheckbox           := TNewCheckBox.Create(UninstallProgressForm);
  DeleteDataCheckbox.Parent    := UninstallProgressForm.InnerPage;
  DeleteDataCheckbox.Left      := UninstallProgressForm.InnerPage.Left;
  DeleteDataCheckbox.Top       := UninstallProgressForm.InnerPage.ClientHeight - 40;
  DeleteDataCheckbox.Width     := UninstallProgressForm.InnerPage.ClientWidth;
  DeleteDataCheckbox.Height    := 20;
  DeleteDataCheckbox.Caption   := CustomMessage('DeleteDataOnUninstall');
  DeleteDataCheckbox.Checked   := False;
end;


// ─────────────────────────────────────────────────────────────────────────────
//  CurUninstallStepChanged
//  After uninstall completes: optionally deletes the user data folder
//  if the user checked the opt-in checkbox.
// ─────────────────────────────────────────────────────────────────────────────
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  DataPath: String;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    if Assigned(DeleteDataCheckbox) and DeleteDataCheckbox.Checked then
    begin
      DataPath := ExpandConstant('{userdocs}\{#AppDataFolder}');
      if DirExists(DataPath) then
      begin
        if MsgBox(
          CustomMessage('UninstallDataWarning'),
          mbError,
          MB_YESNO
        ) = IDYES then
        begin
          DelTree(DataPath, True, True, True);
        end;
      end;
    end;
  end;
end;
