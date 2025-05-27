export const MainFunctions = {
    init() {
        this.scene = this.el.sceneEl
        this.requestCamera = this.requestCamera.bind(this)

        this.requestCamera()

    },
    requestCamera () { // Request camera access and set up the video feed
        let cameraView
        const constraints =  {
            audio: false,
            aspectRation: 9/16,
            video: {
                facingMode: 'environment',
                width: { min: 640, ideal: 1280, max:1920},
                height: { min: 480, ideal: 720, max: 1080},
            }
        }

        // Check if the camera feed element exists
        if (document.querySelector('#cameraFeed')) {
            cameraView = document.querySelector('#cameraFeed')
        } else {
            console.log('camera feed does not exist, creating one.')
            const cameraFeed = document.createElement('video')
            cameraFeed.setAttribute('id', 'cameraFeed')
            cameraFeed.setAttribute('autoplay', '')
            cameraFeed.setAttribute('playsinline', '')
            document.body.prepend(cameraFeed)
            cameraView = cameraFeed
        }
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia(constraints).then(stream => {
                const [video] = stream.getVideoTracks()

                // For debugging purposes, you can log the video track capabilities
                // const capabilities = video.getCapabilities()
                // console.log('Camera capabilities: ', capabilities)
                video.applyConstraints({
                    advanced: [
                        { zoom: 1.0 },
                        
                    ]
                })
                cameraView.srcObject = stream
                this.scene.emit('camera-ready')
            }).catch (err => {
                console.log('Error accessing camera: ', err)
                this.scene.emit('camera-error')
            })
        }

    }
}