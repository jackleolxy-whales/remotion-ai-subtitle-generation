const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/out', express.static(path.join(__dirname, 'out')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Job store (in-memory)
const jobs = new Map();

app.post('/api/upload', upload.fields([
    { name: 'video', maxCount: 1 },
    { name: 'watermark', maxCount: 1 }
]), (req, res) => {
    if (!req.files || !req.files.video) {
        return res.status(400).json({ error: 'No video uploaded' });
    }

    const videoFile = req.files.video[0];
    const watermarkFile = req.files.watermark ? req.files.watermark[0] : null;

    const mode = req.body.mode || 'word'; // 'word' or 'sentence'
    const fontSize = req.body.fontSize ? parseInt(req.body.fontSize) : 60;
    const fontColor = req.body.fontColor || '#FFFFFF';
    const highlightColor = req.body.highlightColor || '#FFE600';
    const outlineColor = req.body.outlineColor || '#000000';
    const outlineSize = req.body.outlineSize ? parseInt(req.body.outlineSize) : 5;
    const subtitleY = req.body.subtitleY ? parseInt(req.body.subtitleY) : 80;
    const originalVolume = req.body.originalVolume !== undefined ? parseFloat(req.body.originalVolume) : 1;
    const subtitleBgEnabled = req.body.subtitleBgEnabled === 'true';
    const subtitleBgColor = req.body.subtitleBgColor || '#7B8793';
    const subtitleBgRadius = req.body.subtitleBgRadius ? parseInt(req.body.subtitleBgRadius) : 25;
    const subtitleBgPadX = req.body.subtitleBgPadX ? parseInt(req.body.subtitleBgPadX) : 10;
    const subtitleBgPadY = req.body.subtitleBgPadY ? parseInt(req.body.subtitleBgPadY) : 5;
    const subtitleBgOpacity = req.body.subtitleBgOpacity ? parseFloat(req.body.subtitleBgOpacity) : 0.4;

    // Watermark params
    const watermarkOpacity = req.body.watermarkOpacity ? parseFloat(req.body.watermarkOpacity) : 0.8;
    const watermarkSize = req.body.watermarkSize ? parseInt(req.body.watermarkSize) : 20;
    const watermarkX = req.body.watermarkX ? parseInt(req.body.watermarkX) : 10;
    const watermarkY = req.body.watermarkY ? parseInt(req.body.watermarkY) : 10;

    const jobId = videoFile.filename.split('.')[0];
    const job = {
        id: jobId,
        status: 'queued',
        step: 'uploaded',
        inputPath: videoFile.path,
        originalName: videoFile.originalname,
        mode: mode,
        fontSize: fontSize,
        fontColor: fontColor,
        highlightColor: highlightColor,
        outlineColor: outlineColor,
        outlineSize: outlineSize,
        subtitleY: subtitleY,
        originalVolume,
        subtitleBgEnabled,
        subtitleBgColor,
        subtitleBgRadius,
        subtitleBgPadX,
        subtitleBgPadY,
        subtitleBgOpacity,
        watermarkPath: watermarkFile ? watermarkFile.path : null,
        watermarkOpacity,
        watermarkSize,
        watermarkX,
        watermarkY,
        createdAt: Date.now()
    };

    jobs.set(jobId, job);
    
    // Start processing async
    processJob(jobId);

    res.json({ jobId });
});

app.get('/api/status/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    res.json(job);
});

async function processJob(jobId) {
    const job = jobs.get(jobId);
    const projectRoot = path.resolve(__dirname, '..');
    
    try {
        // Step 1: Transcribe
        job.status = 'processing';
        job.step = 'transcribing';
        
        const pythonScript = path.join(projectRoot, 'python-transcribe.py');
        console.log(`[Job ${jobId}] Starting transcription (Mode: ${job.mode})...`);
        
        await runCommand('python3', [pythonScript, job.inputPath, 'medium', job.mode], projectRoot);
        
        // Python script outputs json to the same directory as input (if we modified it) 
        // OR it outputs to public/ folder based on current implementation.
        // Let's check python-transcribe.py behavior.
        // Current implementation: 
        // base_name = os.path.splitext(os.path.basename(video_path))[0]
        // output_path = os.path.join("public", f"{base_name}.json")
        // We need to find where the JSON is.
        
        const baseName = path.basename(job.inputPath, path.extname(job.inputPath));
        // The python script as written puts it in 'public' relative to CWD.
        // If we run from projectRoot, it goes to projectRoot/public/baseName.json
        // Wait, the python script uses `os.path.basename` of the input file.
        // Our input file is in server/uploads/filename.mp4.
        // So baseName is filename.
        
        const jsonPath = path.join(projectRoot, 'public', `${baseName}.json`);
        
        if (!fs.existsSync(jsonPath)) {
            throw new Error(`Subtitle file not found at ${jsonPath}`);
        }
        
        const subtitles = await fs.readJson(jsonPath);
        
        // Step 2: Prepare Props
        job.step = 'rendering';
        console.log(`[Job ${jobId}] Starting rendering...`);
        
        const videoUrl = `http://localhost:${PORT}/uploads/${path.basename(job.inputPath)}`;
        const watermarkUrl = job.watermarkPath ? `http://localhost:${PORT}/uploads/${path.basename(job.watermarkPath)}` : null;

        const props = {
            src: videoUrl,
            subtitles: subtitles,
            fontSize: job.fontSize || 50,
            fontColor: job.fontColor || 'white',
            highlightColor: job.highlightColor || 'yellow',
            outlineColor: job.outlineColor || 'black',
            outlineSize: job.outlineSize || 5,
            subtitleY: job.subtitleY || 80,
            originalVolume: job.originalVolume,
            subtitleBgEnabled: job.subtitleBgEnabled,
            subtitleBgColor: job.subtitleBgColor,
            subtitleBgRadius: job.subtitleBgRadius,
            subtitleBgPadX: job.subtitleBgPadX,
            subtitleBgPadY: job.subtitleBgPadY,
            subtitleBgOpacity: job.subtitleBgOpacity,
            watermarkUrl,
            watermarkOpacity: job.watermarkOpacity,
            watermarkSize: job.watermarkSize,
            watermarkX: job.watermarkX,
            watermarkY: job.watermarkY
        };
        
        const propsFile = path.join(__dirname, 'uploads', `${jobId}.props.json`);
        await fs.writeJson(propsFile, props);
        
        // Step 3: Render
        const outputPath = path.join(__dirname, 'out', `${jobId}.mp4`);
        
        // Ensure out directory exists
        await fs.ensureDir(path.dirname(outputPath));

        // Command: npx remotion render src/index.ts CaptionedVideo [out] --props=[propsFile]
        // Note: Using --gl=angle or --gl=swiftshader might be needed on some systems, 
        // but let's try default first. On macOS default usually works.
        await runCommand('npx', [
            'remotion', 'render',
            'src/index.ts',
            'CaptionedVideo',
            outputPath,
            `--props=${propsFile}`,
            '--concurrency=1' // Safer for resources
        ], projectRoot);
        
        job.status = 'completed';
        job.url = `/out/${jobId}.mp4`;
        
        // Cleanup temp files
        // fs.unlink(propsFile).catch(() => {});
        // fs.unlink(jsonPath).catch(() => {}); // Maybe keep for debug
        
    } catch (error) {
        console.error(`[Job ${jobId}] Failed:`, error);
        job.status = 'failed';
        job.error = error.message;
    }
}

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { cwd });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
            // console.log(data.toString()); // Optional: log output
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error(data.toString()); // Log stderr to see progress
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command failed with code ${code}: ${stderr}`));
            }
        });
    });
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
