# Deployment Checklist — Prompt Library Pro

## ✓ What's Complete

### Backend (Python/Flask)
- ✓ Licence database schema created
- ✓ 218 licence keys generated and loaded
- ✓ Three API endpoints added to `app.py`
  - `POST /api/licence/validate` — activate key
  - `POST /api/licence/check` — verify key
  - `GET /api/licence/status` — check status
- ✓ All syntax verified

### Frontend (HTML/JS)
- ✓ Licence key UI added to Settings panel
- ✓ JavaScript handlers written and wired into BOOTSTRAP
- ✓ Cache-bust hash updated
- ✓ All syntax verified

### Installer
- ✓ `PromptLibrary.iss` updated
- ✓ Includes documentation

### Scripts & Documentation
- ✓ `generate_keys.py` — generate new keys anytime
- ✓ `init_licences.py` — load keys into database
- ✓ `LICENCE_SYSTEM.md` — full setup documentation
- ✓ `all_keys_to_load.txt` — 218 keys ready for Payhip

---

## Step 1: Build the Installer

**On your Windows machine:**

```bash
cd C:\Users\Eugene Phillips\Documents\GitHub\Prompt-Library-Update
BUILD_INSTALLER.bat
```

This creates:
```
installer/PromptLibraryPro_Setup_PreRelease_2.exe
```

---

## Step 2: Upload to Payhip

### Product 1: Application (Free Download)

Go to **Payhip → Products → New**

- **Name:** Prompt Library Pro
- **Price:** Free (or paid, your choice)
- **Type:** Software/Application
- **Description:**
  ```
  Prompt Library Pro — Your local-first AI prompt library.
  
  Features:
  • Prompt Forge — build and refine prompts
  • Tone Calibrator — match exact tone/voice
  • Prompt Optimizer — improve prompts systematically
  • Context Bank — store and insert context
  • Snippets — reusable text blocks
  • Prompt Components — build from templates
  • Chains — string multiple prompts together
  • Roles — define personas for prompts
  • Variables — dynamic prompt templating
  • In-app AI executor — test prompts instantly
  • 100% local — no cloud, no accounts, no subscription
  
  Pro features require a licence key (sold separately).
  Free version available with limited features.
  ```
- **Upload File:** `installer/PromptLibraryPro_Setup_PreRelease_2.exe`

### Product 2: Licence Key

Go to **Payhip → Products → New**

- **Name:** Prompt Library Pro — Licence Key
- **Price:** $60
- **Type:** Digital Product / License
- **Description:**
  ```
  Unlock Pro features in Prompt Library.
  
  You'll receive a unique licence key via email.
  
  Installation:
  1. Download and install Prompt Library Pro (free)
  2. Launch the app
  3. Go to Settings → Licence Key
  4. Paste your key
  5. Features unlock instantly
  
  Features unlocked:
  • Advanced Chains
  • Prompt Analytics
  • Custom Components
  • Priority support
  ```

**License Key Settings:**
- Select: **"From a list"** (NOT Autogenerate)
- **Paste all keys below** ↓

---

## Keys for Payhip

Copy and paste all keys from `all_keys_to_load.txt` (starting at line 5, skip the header):

```
52URXRZXXEMHAWRC
6DJC62VCX88WSXPP
6FH3GAGB89TVTGDP
[... 215 more keys ...]
W0AG-65F7-T5IC
```

(You already have this file. Just copy all 218 keys into Payhip's licence key field.)

---

## Step 3: Test Locally

1. **Uninstall** any existing version
2. **Download** `PromptLibraryPro_Setup_PreRelease_2.exe`
3. **Run the installer**
4. **Launch the app**
5. **Go to Settings → Licence Key**
6. **Test with one of your keys:**
   - Paste any key from `all_keys_to_load.txt`
   - Click "Activate Licence"
   - Should show: ✓ Licence activated successfully

---

## Step 4: Go Live on Payhip

1. **Both products created?** ✓
2. **Licence keys uploaded?** ✓
3. **App tested locally?** ✓
4. **Ready to publish?** → Click "Publish" on both products

---

## Files Summary

**In your project root:**

| File | Purpose |
|------|---------|
| `app.py` | Flask backend + licence API |
| `static/app.js` | Frontend JS (with licence handlers) |
| `static/index.html` | UI (Settings panel added) |
| `PromptLibrary.iss` | Installer script |
| `BUILD_INSTALLER.bat` | Compile the installer |
| `generate_keys.py` | Generate new licence keys |
| `init_licences.py` | Load keys into database |
| `all_keys_to_load.txt` | **218 keys for Payhip** |
| `LICENCE_SYSTEM.md` | Full documentation |
| `dist/PromptLibrary.exe` | Compiled app |
| `installer/PromptLibraryPro_Setup_PreRelease_2.exe` | Final installer (after BUILD_INSTALLER.bat) |

---

## Next: Generate More Keys

When you're running low on keys:

```bash
python3 generate_keys.py 500
python3 init_licences.py keys_batch_500.txt
```

Then add the new batch to Payhip's licence settings.

---

## Support

All documentation included in the installer.

Customers can:
- Go to Settings → Licence Key to enter their key
- See `LICENCE_SYSTEM.md` for full details
- Email you if they have issues

---

**Ready to build? Run `BUILD_INSTALLER.bat` now.**
