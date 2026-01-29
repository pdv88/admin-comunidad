# Habiio Mobile App

This is the React Native mobile application for the Habiio community management platform, built with **Expo** and **NativeWind**.

## Prerequisites

Before running the project, ensure you have the following installed:

- **Node.js**: [Download](https://nodejs.org/)
- **Expo Go** (Mobile App): Download from the App Store or Google Play Store on your physical device to test without an emulator.

### For Emulators (Optional)

If you wish to run the app on your computer's simulator/emulator:

- **iOS Simulator** (Mac only):
  - Install **Xcode** from the Mac App Store.
  - Open Xcode -> Settings -> Components -> Install a Simulator Runtime (e.g., iOS 17).

- **Android Emulator**:
  - Download and install [Android Studio](https://developer.android.com/studio).
  - During installation, select "Android SDK", "Android SDK Platform-tools", and "Android Virtual Device".
  - Open Android Studio -> More Actions -> Virtual Device Manager -> Create Device.
  - **Environment Variables**: You must add the Android SDK to your path. Add this to your `~/.zshrc` or `~/.bash_profile`:
    ```bash
    export ANDROID_HOME=$HOME/Library/Android/sdk
    export PATH=$PATH:$ANDROID_HOME/emulator
    export PATH=$PATH:$ANDROID_HOME/platform-tools
    ```

## Installation

1. Navigate to the project directory:
   ```bash
   cd habiio-mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

Start the development server:

```bash
npx expo start
```

### Options:
- **Scan QR Code**: Use the **Expo Go** app on your phone to scan the QR code displayed in the terminal. **(Easiest method)**
- **Press `i`**: Opens the app in the iOS Simulator (Mac only).
- **Press `a`**: Opens the app in the Android Emulator (requires Android Studio setup).
- **Press `w`**: Runs the app in a web browser.

## Project Structure

- `app/`: Expo Router pages and layouts.
  - `(auth)/`: Public authentication screens (Login, Register, Welcome).
  - `(app)/`: Protected application screens (Dashboard, Menu, etc.).
- `components/`: Reusable UI components.
- `context/`: React Contexts (AuthContext, etc.).
- `constants/`: Configuration constants.

## Troubleshooting

- **Android SDK not found**: Ensure you have installed Android Studio and set the *Environment Variables* as shown above.
- **Expo Go connection issues**: Ensure your phone and computer are on the *same Wi-Fi network*.
