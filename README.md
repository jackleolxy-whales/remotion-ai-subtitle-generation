# Auto Subtitle Generator (Powered by Remotion)

A powerful tool to automatically generate TikTok-style subtitled videos from your raw footage. Upload a video, and let the AI handle the rest!

## ✨ Features

- **🎙️ Automatic Transcription**: Uses OpenAI's Whisper model to accurately transcribe speech to text.
- **🎨 Dual Subtitle Modes**:
  - **Bouncing Words**: Dynamic word-by-word animation for high-energy videos.
  - **Full Sentences (Karaoke)**: Sentence-level display with precise word-level karaoke highlighting.
- **⚙️ Customizable Styles**:
  - Adjust **Font Size**.
  - Pick your favorite **Font Color**.
  - Set a custom **Highlight Color** for the karaoke effect.
- **🚀 Web Interface**: Easy-to-use drag-and-drop interface for uploading, processing, and previewing videos.

## 🛠️ Built With

- **[Remotion](https://www.remotion.dev/)**: The core engine for programmatic video creation in React.
- **[OpenAI Whisper](https://github.com/openai/whisper)**: State-of-the-art speech recognition.
- **Node.js & Express**: Backend server for file handling and job processing.

## 🚀 Getting Started

### Prerequisites

1.  **Node.js**: Install from [nodejs.org](https://nodejs.org/).
2.  **Python 3**: Required for Whisper.
3.  **FFmpeg**: Required for media processing.
4.  **OpenAI Whisper**: Install via pip:
    ```bash
    pip install openai-whisper
    ```

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Application

Start the local server:

```bash
node server/index.js
```

Then open your browser and navigate to:
[http://localhost:8000](http://localhost:8000)

## 🙌 Acknowledgements

This project is built on top of the amazing open-source work by the **[Remotion](https://github.com/remotion-dev/remotion)** team. Their framework makes it possible to create videos programmatically using React, which is the backbone of this application.

Special thanks to the Remotion community for their templates and inspiration!

## 📄 License

This project is based on the Remotion template. Please refer to the [Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) for usage terms, especially regarding commercial use.
