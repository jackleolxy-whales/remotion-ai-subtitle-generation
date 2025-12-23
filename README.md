# Auto Subtitle Generator (Powered by Remotion)

A powerful tool to automatically generate TikTok-style subtitled videos from your raw footage. Upload a video, and let the AI handle the rest!

## ✨ Features

- **🎙️ Automatic Transcription**: Uses OpenAI's Whisper model (Medium) to accurately transcribe speech to text.
- **🎨 Dual Subtitle Modes**:
  - **Bouncing Words**: Dynamic word-by-word animation for high-energy videos.
  - **Full Sentences (Karaoke)**: Sentence-level display with precise word-level karaoke highlighting.
- **⚙️ Customizable Styles & Position**:
  - **Live Preview**: See your changes in real-time before processing.
  - **Subtitle Position**: Drag to adjust the vertical position of subtitles.
  - **Font Styling**: Customize Font Size, Font Color, and Highlight Color.
- **🚀 Web Interface**: 
  - Modern side-by-side layout.
  - Drag-and-drop video upload.
  - Real-time status updates.

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
npm run dev
```

Then open your browser and navigate to:
[http://localhost:8000](http://localhost:8000)

If you want to open the Remotion Studio directly to inspect the video template:
```bash
npm run studio
```

## 🙌 Acknowledgements

This project is built on top of the amazing open-source work by the **[Remotion](https://github.com/remotion-dev/remotion)** team. Their framework makes it possible to create videos programmatically using React, which is the backbone of this application.

Special thanks to the Remotion community for their templates and inspiration!

## 📄 License

This project is based on the Remotion template. Please refer to the [Remotion License](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md) for usage terms, especially regarding commercial use.
