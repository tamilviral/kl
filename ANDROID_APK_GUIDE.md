# Kerala Lottery - Android APK Conversion Guide

This project has been transformed from a standalone web script into a **full Android APK mobile application**.

---

## 🚀 How to Build the APK

### Method 1: Using the 1-Click Batch Script
Double-click:
```bat
build-apk.bat
```
This script will:
1. Automatically generate and sync all Android launcher and adaptive icons (`mipmap-mdpi` through `mipmap-xxxhdpi`) from `icon-512.png`.
2. Synchronize all web files (`index.html`, `style.css`, `app.js`, `manifest.json`, etc.) into Android assets.
3. Check and configure the Java & Android SDK environment.
4. Automatically compile the APK with Gradle and copy `KeralaLottery-debug.apk` directly to this folder.

---

### Method 2: In Android Studio (Recommended)
1. Open **Android Studio**.
2. Select **Open** and choose either:
   - `C:\Users\Administrator\AndroidStudioProjects\KeralaLotteryResult`
   - or the mirrored project at `c:\Users\Administrator\Desktop\lottery Result\android`
3. Click **Build > Build Bundle(s) / APK(s) > Build APK(s)** in the top menu.
4. When finished, click **locate** to get your `.apk` file!
5. You can also connect your Android phone via USB and click **Run (▶)** to install and launch directly on your device.

---

## 🛠 What Was Changed & Optimized for Android APK

### 1. Web Scripts & Mobile Optimizations
- **Offline QR Code Libraries**: Downloaded `html5-qrcode.min.js` and `qrcode.min.js` locally into the project (no longer depends on external CDNs so the APK works 100% offline).
- **Mobile Viewport**: Added `viewport-fit=cover`, `user-scalable=no`, and mobile web app meta tags to [index.html](file:///c:/Users/Administrator/Desktop/lottery%20Result/index.html).
- **Hardware Back Button Bridge**: Added `window.handleAndroidBackButton()` in [app.js](file:///c:/Users/Administrator/Desktop/lottery%20Result/app.js) so pressing the Android device Back button cleanly closes open modals, navigates from individual result back to the public portal, or exits gracefully.
- **Safe Area Insets & Touch Tweaks**: Added CSS safe area insets (`env(safe-area-inset-top)`, `env(safe-area-inset-bottom)`) in [style.css](file:///c:/Users/Administrator/Desktop/lottery%20Result/style.css) so content never overlaps with phone notches or navigation bars.
- **PWA Manifest & Adaptive App Icons**: Created [manifest.json](file:///c:/Users/Administrator/Desktop/lottery%20Result/manifest.json) and generated high-resolution gold-and-sapphire icons (`icon-192.png`, `icon-512.png`).

### 2. Native Android Code & Manifest
- **High-Performance WebView**: Configured `MainActivity.kt` with hardware acceleration, `domStorageEnabled = true` (ensuring localStorage lottery results persist between launches), and dark background to eliminate white flashing on start.
- **Native Camera Permissions**: Implemented `WebChromeClient.onPermissionRequest` in `MainActivity.kt` so the live ticket QR scanner gets automatic permission.
- **Native File Chooser**: Implemented `WebChromeClient.onShowFileChooser` allowing CSV file imports and image uploads directly from the Android file picker.
- **Permissions Configured in `AndroidManifest.xml`**:
  - `INTERNET` & `ACCESS_NETWORK_STATE`
  - `CAMERA` (for QR scanner)
  - `VIBRATE` (for haptic feedback)
  - `READ_EXTERNAL_STORAGE` / `READ_MEDIA_IMAGES` (for CSV & ticket file uploads)

### 3. Google Ads & Monetization System
- **5 High-Conversion Ad Placements**:
  1. **Top Leaderboard Banner**: Positioned right below the header on the public results portal.
  2. **Mid-Content Sponsored Banner**: Positioned between ticket verification and latest results list.
  3. **Official Gazette Result Banner**: Positioned directly on the individual lottery result gazette page.
  4. **Sticky Bottom Mobile Banner**: Fixed at the bottom of mobile screens with a close/collapse button.
  5. **Interstitial Ad Modal (Optional)**: Can display a 3-second sponsored break before ticket verification.
- **Ad Settings Control in Admin**:
  - Open Admin > **Account & Ad Settings**.
  - Configure your **Google Publisher ID** (`ca-pub-XXXXXXXXXXXXXXXX`) and custom **Ad Slot IDs**.
  - Toggle **Test Ad Mode** (on by default to safely test layout without Google policy violations).
  - Toggle **Sticky Bottom Ad** and **Interstitial on Verify**.
  - Click **Save Ad Settings** or **Refresh & Preview Ads** for instant live updates.
- **Auto-hidden from Official Printouts**: Ads are automatically stripped via `@media print` so official Kerala Government Gazette prints/PDFs remain 100% clean and authentic.

---

## 🔄 How Edits to Index Page Show on the Mobile App

You now have **3 ways** to update the mobile app whenever you edit `index.html` or update lottery results:

### 1. Real-Time Cloud Sync (No APK Rebuilding Needed)
- Open Admin > **Mobile App & Sync** (or **Account Settings > Cloud Sync**).
- Whenever you enter new lottery results or publish draws in the Dashboard, they automatically push to **Firebase Realtime Database**.
- Any user opening the mobile app receives the latest results in real-time within seconds!
- You can also edit the **Live Announcement Banner** (Headline, Tag, and Text) right inside the Dashboard to display breaking notices on the mobile app's index page instantly.

### 2. Live Web Server / Hosted App URL (Instant Code & Design Updates)
- If you host the web project online (e.g. on Firebase Hosting, GitHub Pages, or local Wi-Fi dev server like `http://192.168.1.10:5500`):
  1. Open Admin > **Mobile App & Sync**.
  2. Enter your live website URL in **Live Web URL** and click **Save Server URL**.
  3. The Android APK will automatically load that live hosted page directly!
  4. Any edits made to `index.html`, CSS, or JS on your server appear immediately on mobile devices without reinstalling the APK.
  5. If the server goes offline or has no internet, the app automatically falls back to the built-in offline assets.

### 3. Local Offline Asset Sync & 1-Click APK Builder
- When you edit `index.html`, `style.css`, or `app.js` locally in your folder:
  - **Option A (Automated Watcher)**: Double-click `auto-sync.bat`. It will watch `index.html` and copy any edits to Android assets in real-time as soon as you save.
  - **Option B (1-Click Sync)**: Double-click `sync-to-android.bat` to sync all web assets and icons.
  - **Option C (1-Click APK Compile)**: Double-click `build-apk.bat` to sync all web assets and compile `KeralaLottery-debug.apk`.

---

## ⚙️ Mobile App & Dashboard Navigation
- **From Mobile / Public Portal to Dashboard**:
  - Tap the **⚙️ Dashboard** button in the top header.
  - On phones, tap **⚙️ Dashboard** in the bottom navigation bar.
- **From Dashboard to Mobile App**:
  - Click the **🎟️ View Mobile App** button in the dashboard top navigation bar to preview the mobile layout anytime.

---

## 🗑️ Deletions & Modifications Synchronization

Whenever you delete or modify anything in the **Admin Panel**:
1. **Draw Deletions**: When you delete a draw from the Admin Panel, it sends a direct `DELETE` request to Firebase and pushes the updated draw catalog. The mobile app automatically detects the removal on its next background poll (within seconds) and removes the deleted draw from the phone's storage and screen.
2. **Result / Prize Number Modifications**: When you edit ticket numbers, prize amounts, dates, or venues in the Admin Panel and save/publish, the updated draw replaces the previous data in Firebase. All mobile apps receive the latest numbers and redraw the results screen automatically.
3. **Lottery Schemes & Notifications**: Adding, editing, or deleting lottery schemes (`customLotteryTypes`) or notifications in the Admin Panel automatically synchronizes across Firebase and all mobile app devices.
4. **Data Reset**: Clicking **`Reset Data`** in the Admin Panel restores defaults and broadcasts the clean state to Firebase and all connected mobile apps.
5. **Pending Push Queue**: If multiple edits or deletes happen in quick succession, they are queued and guaranteed to push to Firebase without being dropped by in-flight network requests.


