# time-quacker

**time-quacker** is a desktop application built with **Electron** that leverages hand gesture recognition to announce the current time and automate various actions. Designed for productivity and accessibility, it provides a hands-free way to interact with your computer.

**GitHub Repository:**  
[github.com/Hara-XY-Innovation-Lab/time-quacker/tree/main](https://github.com/10sp/time-quacker/tree/main)

## Features

- **Hand Gesture Recognition:** Control the app and trigger actions using simple hand movements.
- **Time Announcement:** Announces the current time aloud on gesture command.
- **Automation:** Supports automating routine desktop actions via gestures.
- **Cross-Platform:** Built with Electron, primarily targeting Windows (NSIS installer).

## Installation

### Prerequisites

- **Node.js** (v14 or higher recommended)
- **npm** (comes with Node.js)
- **Windows OS** (NSIS installer provided)

### Steps

1. **Clone the repository:**
   ```sh
   git clone https://github.com/10sp/time-quacker.git
   cd time-quacker
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Run the app in development mode:**
   ```sh
   npm start
   ```

## Building

- **Pack (development build):**
  ```sh
  npm run pack
  ```
- **Distributable (installer):**
  ```sh
  npm run dist
  ```

The Windows installer will be generated using NSIS.

## Project Structure

```
src/
├── main/
│   ├── cameraManager.js
│   ├── detectionController.js
│   ├── main.js
│   ├── preload.js
│   ├── splashImageManager.js
│   ├── tray.js
│   └── windows.js
├── renderer/
│   ├── components/
│   │   ├── Button.js
│   │   ├── CameraSelector.js
│   │   └── TimerDisplay.js
│   ├── features/
│   │   ├── pomodoro/
│   │   │   ├── pomodoro.js
│   │   │   ├── state.js
│   │   │   ├── timer.js
│   │   │   ├── time.js
│   │   │   └── speech.js
│   │   ├── gestures/
│   │   └── weather/
│   │       └── weather.js
│   ├── renderer.js
│   ├── index.html
│   ├── splash.html
│   └── services/
│       └── gestureService.js
├── shared/
│   ├── config.js
│   ├── eventSystem.js
│   ├── logger.js
│   ├── stateManager.js
│   └── appState.js
└── Assets/
```

| File/Folder   | Purpose                                      |
|---------------|----------------------------------------------|
| `src/main/`   | Main Electron process files                  |
| `src/renderer/` | Frontend UI and gesture recognition logic  |
| `src/shared/` | Shared utilities and configuration           |
| `Assets/`     | Images, sounds, and other static resources   |

> **Important:**  
> Place all images, audio files, and other static assets required by your app inside the `Assets` folder. This ensures they are correctly included in both development and packaged builds.

## Scripts

| Command         | Description                         |
|-----------------|-------------------------------------|
| `npm start`     | Launches the Electron app           |
| `npm run pack`  | Builds app directory (no installer) |
| `npm run dist`  | Builds distributable installer      |

## Configuration

The app is configured for Windows with the following Electron Builder settings:

```json
"build": {
  "appId": "om.namah.gestureautomation",
  "win": { "target": "nsis" },
  "files": [
    "src/main/**/*",
    "src/renderer/**/*",
    "Assets/**/*"
  ]
}
```

## Keywords

gesture, automation, time, quacker, electron

## Author

**Shiv Patil**

## License

ISC

## Contributing

Pull requests and feature suggestions are welcome. Please ensure your code is clean and well-documented.

For issues or questions, please open an issue on the [GitHub repository](https://github.com/10sp/time-quacker/tree/main).