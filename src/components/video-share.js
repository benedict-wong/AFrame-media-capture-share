const {FFmpeg, fetchFile } = require('@ffmpeg/ffmpeg');

export const VideoWatermarkShare = {
  schema: {
    selector: { type: 'string', default: '#Share_CTA' },
    mediaButton: {type: 'string'},
    title: { type: 'string' },
    text: { type: 'string' },
    url: { type: 'string' },
    watermarks: { type: 'array' }, // Array of watermark image paths
    watermarkPositions: { type: 'array' }, // Array of positions (e.g., 'topLeft', 'topCenter')
    files: { type: 'array' }, // Array of video files
  },

  init() {
    const shareCTA = document.querySelector(this.data.selector);
    this.recordButton = null;
    this.recordingTimeout
    if (!this.data.mediaButton) {
      // create a record button if not provided
      this.recordButton = document.createElement('div');
      this.recordButton.id = 'snapshot-container'
      this.recordButton.classList.add('cantap')
      this.recordButton.textContent = 'Hold to Record';
      document.getElementById('body-content').appendChild(this.recordButton);
    } else {
      // use the provided media button
      this.recordButton = document.querySelector(this.data.mediaButton);
    }
    const ffmpeg = new FFmpeg()
    let mediaRecorder;
    let recordedChunks = [];

    // Set up video recording
    const setupRecording = async () => {
      console.log('Setting up video recording...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunks, { type: 'video/mp4' });
        const recordedFile = new File([recordedBlob], 'recorded-video.mp4', { type: 'video/mp4' });
        this.data.files = [recordedFile];
        alert('Recording complete. You can now process the video.');
      };
    };

    // Start recording when the button is pressed
    this.recordButton.addEventListener('touchstart', () => {
      if (!mediaRecorder) {
        console.error('MediaRecorder is not initialized. Please wait for setup.');
        return;
      }
      recordedChunks = [];
      this.recordingTimeout = setTimeout(() => {
        mediaRecorder.start();
        console.log('Recording started...');
      }, 1000); // Start recording after 1 second delay to avoid accidental clicks
      
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 15000); // Stop recording after 15 seconds
    });

    // Stop recording when the button is released
    this.recordButton.addEventListener('touchend', () => {
      if (!mediaRecorder) {
        console.error('MediaRecorder is not initialized. Please wait for setup.');
        return;
      }
      // Clear timeout if the button is released before 1 second
      clearTimeout(this.recordingTimeout);
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      } else {
        console.log('Recording was not started.')
      }
    });

    // Process the video with watermarks
    const processVideo = async () => {
      if (!this.data.files.length || !this.data.watermarks.length) {
        alert('Please provide a video and watermark(s).');
        return;
      }

      // Load FFmpeg
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }

      // Write the video file to FFmpeg's virtual filesystem
      const videoFile = this.data.files[0];
      ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(videoFile));

      // Write watermark files to FFmpeg's virtual filesystem
      for (let i = 0; i < this.data.watermarks.length; i++) {
        const watermarkFile = this.data.watermarks[i];
        ffmpeg.FS('writeFile', `watermark${i}.png`, await fetchFile(watermarkFile));
      }

      // Build the FFmpeg filter_complex string for multiple watermarks
      const filterComplex = this.data.watermarks
        .map((_, i) => {
          const position = this.data.watermarkPositions[i] || 'topLeft';
          const [x, y] = this.getCoordinates(position);
          return `[1:v]overlay=${x}:${y}`;
        })
        .join(',');

      // Run FFmpeg to overlay the watermarks
      await ffmpeg.run(
        '-i', 'input.mp4', // Input video
        ...this.data.watermarks.flatMap((_, i) => ['-i', `watermark${i}.png`]), // Input watermarks
        '-filter_complex', filterComplex, // Apply watermark overlays
        '-c:v', 'libx264', // Encode video with H.264 codec
        '-crf', '23', // Set quality (lower is better)
        '-preset', 'fast', // Set encoding speed
        'output.mp4' // Output video
      );

      // Read the output video file from FFmpeg's virtual filesystem
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const videoURL = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));

      // Allow download or sharing
      this.handleDownloadOrShare(videoURL);
    };

    shareCTA.addEventListener('click', processVideo);

    // Initialize recording setup
    this.el.sceneEl.addEventListener('camera-ready',  () => {
      setupRecording()
    })
    
  },

  getCoordinates(position) {
    switch (position) {
      case 'topLeft': return ['10', '10'];
      case 'topCenter': return ['(W-w)/2', '10'];
      case 'topRight': return ['W-w-10', '10'];
      case 'bottomLeft': return ['10', 'H-h-10'];
      case 'bottomCenter': return ['(W-w)/2', 'H-h-10'];
      case 'bottomRight': return ['W-w-10', 'H-h-10'];
      case 'middleCenter': return ['(W-w)/2', '(H-h)/2'];
      default: return ['10', '10'];
    }
  },

  handleDownloadOrShare(videoURL) {
    // Create a download link
    const downloadLink = document.createElement('a');
    downloadLink.href = videoURL;
    downloadLink.download = 'watermarked-video.mp4';
    downloadLink.textContent = 'Download Watermarked Video';
    document.body.appendChild(downloadLink);

    // Optionally, share the video using the Web Share API
    if (navigator.share) {
      navigator.share({
        title: this.data.title,
        text: this.data.text,
        url: this.data.url,
        files: [new File([videoURL], 'watermarked-video.mp4', { type: 'video/mp4' })],
      }).catch((err) => console.error('Error sharing:', err));
    }
  },
};