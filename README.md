# Aura Financial Expense Book - Mobile Deployment Guide

Welcome to the **Aura Ledger deployment matrix**. This reference guide details the step-by-step procedures to build, package, and compile your Aura web application into a fully installable **Android APK** file to run on any smartphone device.

---

## 🛠️ Option 1: Native Mobile Wrapping via Capacitor (Highly Recommended)
Capacitor is the official open-source cross-platform native runtime from Ionic. It injects a modern native shell to wrap your React/Vite app into a responsive hybrid Android program.

### Step 1: Install Capacitor Dependencies
Run the following commands in your local app workspace root folder:
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Step 2: Initialize Capacitor Config
Initialize Capacitor and specify the custom App Name and Android package name (e.g., `com.ravi.auraexpense`):
```bash
npx cap init "Aura Expense" "com.ravi.auraexpense" --web-dir=dist
```

### Step 3: Bundle your Production Assets
Compile your React/Vite application into the optimized `/dist` build output folder:
```bash
npm run build
```

### Step 4: Inject the Android Native Project
Generate the local native Android scaffolding within your workspace:
```bash
npx cap add android
```

### Step 5: Sync Web Assets to Android Shell
Whenever you make updates to your React/Vite code, build it and sync it over to the Android project directory:
```bash
npm run build
npx cap sync
```

### Step 6: Package the Installable APK
To build and export the runnable `.apk`, launch the project inside **Android Studio**:
```bash
npx cap open android
```
1. Once Android Studio compiles the project, go to the top menu and select **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Android Studio will build the binary. Select **Locate** from the pop-up notification.
3. Your installable **`app-debug.apk`** is located in: `android/app/build/outputs/apk/debug/`.
4. Transfer this `.apk` to your phone via USB or Google Drive and install it!

---

## 🌩️ Option 2: PWABuilder No-Code Cloud Packaging (Easiest Way)
If your Aura app is uploaded/hosted on a public IP address or web server (e.g., Netlify, Vercel, Firebase Hosting, Cloud Run), you can generate an installable APK in 3 clicks with zero terminal setup.

### Step 1: Generate App Icons and Manifest
Review your `public/manifest.json` ensuring complete icons are attached.

### Step 2: Input URL on PWABuilder
1. Open your browser and navigate to **[PWABuilder.com](https://www.pwabuilder.com/)**.
2. Input your public URL (e.g., `https://aura-ledger.example.com`) and click **Test**.
3. PWABuilder will scan your cashbook to verify PWA parameters.

### Step 3: Build & Download Package
1. On the results page, click **Generate APK** (Android).
2. Choose **LlamaPack/TWA** or Standard APK options.
3. Click **Generate** and download the resulting zip archive folder.
4. Extract the `.apk` file directly on your desktop, send it to your phone, and install.

---

## 🛡️ Option 3: Command Line Trusted Web Activities using Bubblewrap
Bubblewrap CLI allows command-line developers to construct, sign, and compile PWAs into Google Play Store ready APK packages.

### Step 1: Install Bubblewrap CLI GLOBALLY
```bash
npm install -g @bubblewrap/cli
```

### Step 2: Setup Development Environment
Bubblewrap requires Java JDK 11+ and Android SDK. Run the setup check to automatically configure folders:
```bash
bubblewrap doctor
```

### Step 3: Initialize trust activities
Bubblewrap reads your public manifest.json metadata:
```bash
bubblewrap init --manifest=https://your-app-url/manifest.json
```

### Step 4: Build and Compile Sign APK
Bubblewrap will generate keys and sign the program:
```bash
bubblewrap build
```
The output produces:
- **`app-release-signed.apk`** - Fully validated, production-ready, installable app file!

---

## 📲 Installing the APK on your Smartphone
To sideload the native Aura APK on your phone, follow these steps:
1. Transfer the `.apk` file to your mobile device memory.
2. Open your favorite **Files** manager app on your Android phone and select the transfered `.apk`.
3. If prompted with *“Install from Unknown Sources”* safety prompts, tap **Settings** and toggle **Allow installation from this source**.
4. Tap **Install** and launch Aura immediately from your phone desktop grid!

---

## ☁️ Firebase Cloud Sync & Upgrades Deep-Dive

This section explains how your transaction history and settings are preserved when upgrading Aura or switching to a new device, and how the synchronization protocol secures and manages your financial ledgers.

### 🌐 1. How the App Identifies Your Device
Your device's secure identity relies on **Firebase Authentication** and **Firebase Firestore** integration:
* **Secure Google Authentication**: In the profile menu container, you can trigger the **Sync to Google Cloud** gateway, which authenticates you securely using your standard Google Account.
* **Persistent Authentication State**: Firebase Auth stores secure OAuth credentials locally. When you launch the app (even after closing it entirely or rebooting your phone), the auth state listener is verified silently in the background, matching you with your unique, immutable cloud user identifier (`uid`).
* **Multi-Device Support**: Because identification is tied to your Google Account (not to specific device hardware), your ledger can be synchronized simultaneously across multiple smartphones, tablets, or desktop web browsers.

### 🔄 2. The Cloud Synchronization Protocol
Aura runs a reliable backup and reconciliation loop designed to prevent accidental data loss:
* **Instant Cloud Backups**: Whenever you add, edit, or delete a transaction, calculate savings, or update your profiles, Aura automatically fires write operations to your Firestore document vaults.
* **Intelligent Double-Sided Reconciliation (Merge State)**:
  1. On application startup or when Google Auth triggers, Aura retrieves your cloud-stored ledger from Firestore.
  2. It performs a **two-sided merge reconciliation** based on transaction ID hashes:
     * If a transaction is found in the cloud database but is missing in the local database (such as logs created on another phone), it is downloaded and synced immediately.
     * If a transaction exists locally but is not yet stored in the cloud (such as logs added while offline), the app appends it safely and issues an automatic backup command to upload the missing records.
     * Profile preferences (custom username, monthly budget ceilings, visual avatar choices) are synchronized and synchronized from the central cloud database as well.

### 📲 3. Installing App Upgrades (APK Upgrades)
When you build a new application version and install it on top of an existing version on your smartphone (such as side-loading another compiled `.apk`), your data is completely safe:
* **Storage Sandbox Preservation**: Android respects local storage domains. Placing a new app update on top of the old version preserves the internal `localStorage` sandbox and secure auth state cookies. Your logged details and user settings will load automatically on launch.
* **Automatic Cloud Restoration**: Even if you delete your data, clear browser caches, or uninstall the app completely:
  1. Simply tap **Sync to Google Cloud** in the visual profile panel and complete Google sign-in.
  2. Tap the **Restore** portal in the Cloud Crypt Vault.
  3. Aura will securely fetch your entire transaction repository and reconstruct your financial canvas to 100% completion in real-time.
* **No-Loss Migration Guarantee**: If there are changes to fields or properties in future releases, the reconciliation logic converts older schema entities into modern shapes without removing any field histories.

