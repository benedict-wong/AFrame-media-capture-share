/*
Enables sharing of custom title, text, URL, and files via native device functionality. 
Supports screenshotting the a-scene (for A-Frame usage) or full screen (if hideUI is false) when screenshotMode is true. 
Watermarks can be added with specified positions, widths, and heights.
*/

import html2canvas from 'html2canvas'
export const ScreenshotShare = {
  schema: {
    selector: { type: 'string', default: '#Share_CTA' },
    title: { type: 'string' },
    text: { type: 'string' },
    url: { type: 'string' },
    mediaButton: {type: 'string'},
    watermarks: { type: 'array' }, // file extensions necessary
    watermarkPositions: { type: 'array' },
    watermarkMaxWidths: { type: 'array' },
    watermarkMaxHeights: { type: 'array' },
    // hideUI: { type: 'boolean', default: 'true' },
    files: { type: 'array' }, // file extension necessary
    folder: { type: 'string' }
  },
  init () {
    const mime = require('mime')
    this.recordButton
    const shareCTA = document.querySelector(this.data.selector)
    this.fileArr = []
    const folder = this.data.folder ? `${this.data.folder}/` : ''
    this.scene = this.el.sceneEl
    this.options = {
      allowTaint: true,
      useCORS: true,
      scrollX: window.scrollX, // Ensure the screenshot captures the visible portion
      scrollY: window.scrollY,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    }

    this.watermarks = this.data.watermarks;
    this.watermarkPositions = this.data.watermarkPositions || []
    this.watermarkMaxWidths = this.data.watermarkMaxWidths || []
    this.watermarkMaxHeights = this.data.watermarkMaxHeights || []

    this.canShareTogether = this.canShareTogether.bind(this)
    this.getCoordinates = this.getCoordinates.bind(this)
    this.scaleToFit = this.scaleToFit.bind(this)
    this.urltoFile = this.urltoFile.bind(this)
    this.saveAs = this.saveAs.bind(this)
    this.takeScreenshot = this.takeScreenshot.bind(this)

    // Set variables for each watermark image in the array and iterate it with watermarkImageObj1, watermarkImageObj2, etc.

    this.scope = {}

    if (this.watermarks && this.watermarks.length > 0) {
      for (let i = 0; i < this.wwatermarks.length; i++) {
        this.scope['watermarkImageObj' + i] = new Image()
        this.scope['watermarkImageObj' + i].crossOrigin = 'anonymous'
        let watermarkImageSrc
        try {
          watermarkImageSrc = `../assets/sharing/${this.wwatermarks[i]}`
        } catch (e) {
          console.log('watermark does not exist')
        }
        if (watermarkImageSrc) { this.scope['watermarkImageObj' + i].src = watermarkImageSrc }
      }
  }

    // Hacky fix for iOS error NotAllowedError: The request is not allowed by the user agent or the platform in the current context, possibly because the user denied permission
    // Set an invisible iframe inside the document and use the iframe's navigator to share the content and hard reload the iframe every time instead of the whole document.

    const hiddeniFrame = document.createElement('iframe')
    const hiddeniFrameBlob = new Blob(['<!DOCTYPE html><html>'], { type: 'text/html' })
    hiddeniFrame.src = URL.createObjectURL(hiddeniFrameBlob)

    hiddeniFrame.style.display = 'none'

    document.documentElement.appendChild(hiddeniFrame)

    // If you need to dynamically swap out watermark sources after init:

    // scene.addEventListener('swapWatermark', (event) => {
    //   console.log(event.detail)
    //   scope['watermarkImageObj' + 1].src = `../../../public/sharing/${event.detail}`
    // })

    // Check if iOS version is below 16. If it is return false because text and files cannot be shared together

    if (!this.data.mediaButton) {
      // create a record button if not provided
      this.recordButton = document.createElement('div');
      this.recordButton.id = 'snapshot-container'
      this.recordButton.classList.add('cantap')
      this.recordButton.textContent = 'Hold to Record';
      document.getElementById('body-content').appendChild(this.recordButton);
    } else {
      this.recordButton = document.querySelector(this.data.mediaButton);
    }
    
    this.recordButton.addEventListener('click', () => {
      console.log('taking screenshot')
      this.takeScreenshot()
    })

     
    // if sharing together is possible, add title, text, url and files to the shareData, otherwise only add the files.
    const share = () => {
      let ShareData
      if (canShareTogether()) {
        ShareData = {
          title: this.data.title,
          text: this.data.text,
          url: this.data.url,
          files: this.fileArr
        }
      } else {
        ShareData = {
          files: this.fileArr
        }
      }

      console.log('clicked share button')

      try {
        console.log(this.data.files)
        if (this.data.files.length > 0) {
          // this.fileArr.length = 0 // if file sharing is persistent throughout clicks, uncomment this to reset the file array to prevent sharing duplicates
          this.data.files.forEach(currFile => {
            if (typeof currFile === 'string' || currFile instanceof String) {
              // Do nothing
            } else {
              currFile.toString()
            }
            fetch(`../assets/sharing/${folder}${currFile}`).then(function (response) {
              return response.blob()
            })
              .then(function (blob) {
                const file = new File([blob], currFile, { type: mime.getType(currFile) })
                this.fileArr.push(file)
                console.log(file)
              })
            navigator.share(ShareData)
          })
        }else {
          navigator.share(ShareData)
        }

        console.log(ShareData.text + ShareData.url)
      } catch (err) {
        alert(err)
        navigator.clipboard.writeText(`${ShareData.title} ${ShareData.text} ${ShareData.url}`).then(() => {
          if (this.data.files.length > 0) {
            this.data.files.forEach(currFile => {
              const a = document.createElement('a')
              a.href = require(`../assets/sharing/${currFile}`)
              a.download = 'share-image'
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            })
          }

          window.alert('Text copied to clipboard and files downloaded')
        })
      }
    }

    shareCTA.addEventListener('click', () => {
      share()
    })

  },
  canShareTogether () {
    const userAgent = window.navigator.userAgent.toLowerCase()
    // const start = agent.indexOf('OS')
    if (userAgent.match(/iphone|ipad|ipod/i)) {
      let osVersion = 'unknown'
      osVersion = /OS (\d+)_(\d+)_?(\d+)?/.exec(navigator.appVersion)
      const osVersionFull = osVersion[1] + '.' + osVersion[2] + '.' + (osVersion[3] | 0)
      const osVersionShort = osVersion[1]
      // alert(osVersionShort)

      return osVersionShort >= 16
      // alert(window.Number(agent.substr(start + 3, 3).replace('_', '.')))
      // return window.Number(agent.substr(start + 3, 3).replace('_', '.')) >= 16
    } else {
      console.log('not iOS')
      return true
    }
  },
  urltoFile (url, filename, mimeType) {
    return (fetch(url)
      .then(function (res) { return res.arrayBuffer() })
      .then(function (buf) { return new File([buf], filename, { type: mimeType }) })
    )
  },
  saveAs (uri, filename) {
    const link = document.createElement('a')

    if (typeof link.download === 'string') {
      link.href = uri
      link.download = filename

      // Firefox requires the link to be in the body
      document.body.appendChild(link)

      // simulate click
      link.click()

      // remove the link when done
      document.body.removeChild(link)
    } else {
      window.open(uri)
    }
  },
  getCoordinates (position, imageWidth, imageHeight, canvasWidth, canvasHeight) {
    const xCenter = canvasWidth / 2 - imageWidth / 2
    console.log(canvasWidth)
    console.log(imageWidth)
    console.log(xCenter)
    const yCenter = canvasHeight / 2 - imageHeight / 2
    switch (position) {
      case 'topLeft':
        return [0, 0]
      case 'topCenter':
        return [xCenter, 0]
      case 'topRight':
        return [canvasWidth - imageWidth, 0]
      case 'bottomLeft':
        return [0, canvasHeight - imageHeight]
      case 'bottomCenter':
        return [xCenter, canvasHeight - imageHeight]
      case 'bottomRight':
        return [canvasWidth - imageWidth, canvasHeight - imageHeight]
      case 'middleLeft':
        return [0, yCenter]
      case 'middleCenter':
        return [xCenter, yCenter]
      case 'middleRight':
        return [canvasWidth - imageWidth, yCenter]
      default:
        return [0, 0]
    }
  },
  scaleToFit (width, height, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height)
    return [width * scale, height * scale]
  },
  takeScreenshot() {
    const screenshotTarget = this.el.sceneEl
    html2canvas(screenshotTarget, this.options).then((canvas) => {
      console.log(canvas)
      const context = canvas.getContext('2d')

      // For each watermark in the watermark array, scale to fit it within the screenshot canvas, and place the watermark in its proper watermark position. (start, center, end)

      // for (let i = 0; i < watermarks.length; i++) {
      //   const maxWidth = context.canvas.style.width.replace('px', '') * (watermarkMaxWidths[i] || 20) / 100
      //   const maxHeight = context.canvas.style.height.replace('px', '') * (watermarkMaxHeights[i] || 20) / 100
      //   const [width, height] = this.scaleToFit(scope['watermarkImageObj' + i].naturalWidth, scope['watermarkImageObj' + i].naturalHeight, maxWidth, maxHeight)
      //   const [x, y] = this.getCoordinates(watermarkPositions[i], width, height, context.canvas.style.width.replace('px', ''), context.canvas.style.height.replace('px', ''))
      //   context.drawImage(scope['watermarkImageObj' + i], x, y, width, height)
      // }

      // EXPERIMENTAL: draw each watermark image as a layer on top of the canvas, scaling it to fit the canvas and placing it in its proper position.
      console.log(this.watermarks.length)
      for (let i = 0; i < this.watermarks.length; i++) {
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
      
        // Set the temporary canvas dimensions to match the main canvas
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
      
        const maxWidth = canvas.width * (this.watermarkMaxWidths[i] || 20) / 100;
        const maxHeight = canvas.height * (this.watermarkMaxHeights[i] || 20) / 100;
      
        const [width, height] = this.scaleToFit(
          this.scope['watermarkImageObj' + i].naturalWidth,
          this.scope['watermarkImageObj' + i].naturalHeight,
          maxWidth,
          maxHeight
        );
      
        const [x, y] = this.getCoordinates(
          this.watermarkPositions[i],
          width,
          height,
          canvas.width,
          canvas.height
        );
      
        // Draw the watermark on the temporary canvas
        tempContext.drawImage(scope['watermarkImageObj' + i], x, y, width, height);
      
        // Draw the temporary canvas onto the main canvas
        context.drawImage(tempCanvas, 0, 0);
      }


      // Once all images are drawn, display the screenshot preview with a close button, download and sharing button.
      // The styles for this container below can be changed in share.scss

      // if the sharingPreviewContainer already exists, remove it first to prevent duplicates when injecting a new one.
      if (document.getElementById('sharingPreviewContainer')) {
        document.getElementById('sharingPreviewContainer').remove()
      }

      document.body.insertAdjacentHTML('beforeend', '<div id="sharingPreviewContainer">\n' +
          '    <button id="sharingCloseBtn" class="cantap">&#x2715</button>\n' +
          '    <div id="sharingPreviewBtns">\n' +
          '      <div id="sharingDownloadBtn" class="cantap">DOWNLOAD</div>\n' +
          '      <div id="sharingShareBtn" class="cantap">SHARE</div>\n' +
          '    </div>\n' +
          '  </div>')
      const imagePreview = document.getElementById('sharingPreviewContainer')
      if (document.getElementById('sharingPreview')) document.getElementById('sharingPreview').remove()
      canvas.setAttribute('id', 'sharingPreview')
      imagePreview.prepend(canvas)
      if (imagePreview) imagePreview.style.display = 'flex'

      // Download the file if download button is clicked.

      this.urltoFile(canvas.toDataURL('image/png', 1), 'share-image.png', 'image/png').then((file) => {
        this.fileArr.length = 0 // Reset this.fileArr to prevent the newest image from not being shared
        this.fileArr.push(file)
        console.log(file)
        document.getElementById('sharingDownloadBtn').addEventListener('click', () => {
          if (window.dataLayer) window.dataLayer.push({ event: 'Event: Download Clicked' })
          this.saveAs(canvas.toDataURL(), 'share-image.png')
        })

        // share the file and copy if sharing button is clicked. Utilize the fix for iOS to prevent NotAllowedError from going off due to sharing new file
        document.getElementById('sharingShareBtn').addEventListener('click', () => {
          if (window.dataLayer) window.dataLayer.push({ event: 'Event: Share Clicked' })
          hiddeniFrame.contentWindow.navigator.share(ShareData).then(() => {
            hiddeniFrame.contentWindow.location.reload()
          }).catch((err) => {
            console.log(err)
            hiddeniFrame.contentWindow.location.reload()
          })

          // if the device version is detected to be iOS 15 or below, copy the share copy to the clipboard instead and alert the user as such.
          if (!canShareTogether()) {
            navigator.clipboard.writeText(`${this.data.title} ${this.data.text} ${this.data.url}`)
            alert('iOS 15 or below detected, text copied to clipboard')
          }
        })
      })
    })
  }
}
