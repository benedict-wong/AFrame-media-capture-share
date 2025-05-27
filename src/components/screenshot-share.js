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
    screenshotMode: { type: 'boolean', default: 'false' },
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
    const shareCTA = document.querySelector(this.data.selector)
    const fileArr = []
    const folder = this.data.folder ? `${this.data.folder}/` : ''
    const scene = this.el.sceneEl
    const options = {
      allowTaint: true,
      useCORS: true,
      scrollX: window.scrollX, // Ensure the screenshot captures the visible portion
      scrollY: window.scrollY,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight
    }

    const watermarks = this.data.watermarks
    const watermarkPositions = this.data.watermarkPositions
    const watermarkMaxWidths = this.data.watermarkMaxWidths
    const watermarkMaxHeights = this.data.watermarkMaxHeights

    // Set variables for each watermark image in the array and iterate it with watermarkImageObj1, watermarkImageObj2, etc.

    const scope = {}

    if (watermarks.length > 0) {
      for (let i = 0; i < watermarks.length; i++) {
        scope['watermarkImageObj' + i] = new Image()
        scope['watermarkImageObj' + i].crossOrigin = 'anonymous'
        let watermarkImageSrc
        try {
          watermarkImageSrc = `../assets/sharing/${watermarks[i]}`
        } catch (e) {
          console.log('watermark does not exist')
        }
        if (watermarkImageSrc) { scope['watermarkImageObj' + i].src = watermarkImageSrc }
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

    const canShareTogether = () => {
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
        }

    // if sharing together is possible, add title, text, url and files to the shareData, otherwise only add the files.
    const share = () => {
      let ShareData
      if (canShareTogether()) {
        ShareData = {
          title: this.data.title,
          text: this.data.text,
          url: this.data.url,
          files: fileArr
        }
      } else {
        ShareData = {
          files: fileArr
        }
      }

      console.log('clicked share button')

      try {
        console.log(this.data.files)
        if (this.data.files.length > 0) {
          // fileArr.length = 0 // if file sharing is persistent throughout clicks, uncomment this to reset the file array to prevent sharing duplicates
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
                fileArr.push(file)
                console.log(file)
              })
            navigator.share(ShareData)
          })
        } else if (this.data.screenshotMode) {
          const screenshotTarget = document.body
          html2canvas(screenshotTarget, options).then((canvas) => {
            console.log(canvas)
            const context = canvas.getContext('2d')

            // For each watermark in the watermark array, scale to fit it within the screenshot canvas, and place the watermark in its proper watermark position. (start, center, end)

            for (let i = 0; i < watermarks.length; i++) {
              const maxWidth = context.canvas.style.width.replace('px', '') * (watermarkMaxWidths[i] || 20) / 100
              const maxHeight = context.canvas.style.height.replace('px', '') * (watermarkMaxHeights[i] || 20) / 100
              const [width, height] = scaleToFit(scope['watermarkImageObj' + i].naturalWidth, scope['watermarkImageObj' + i].naturalHeight, maxWidth, maxHeight)
              const [x, y] = getCoordinates(watermarkPositions[i], width, height, context.canvas.style.width.replace('px', ''), context.canvas.style.height.replace('px', ''))
              context.drawImage(scope['watermarkImageObj' + i], x, y, width, height)
            }

            // Once all images are draw, display the screenshot preview with a close button, download and sharing button.
            // The styles for this container below can be changed in sharing.scss

            scene.insertAdjacentHTML('beforeend', '<div id="sharingPreviewContainer">\n' +
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

            urltoFile(canvas.toDataURL('image/png', 1), 'share-image.png', 'image/png').then((file) => {
              fileArr.length = 0 // Reset fileArr to prevent the newest image from not being shared
              fileArr.push(file)
              console.log(file)
              document.getElementById('sharingDownloadBtn').addEventListener('click', () => {
                if (window.dataLayer) window.dataLayer.push({ event: 'Event: Download Clicked' })
                saveAs(canvas.toDataURL(), 'share-image.png')
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
        } else {
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

    function urltoFile (url, filename, mimeType) {
      return (fetch(url)
        .then(function (res) { return res.arrayBuffer() })
        .then(function (buf) { return new File([buf], filename, { type: mimeType }) })
      )
    }
    function saveAs (uri, filename) {
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
    }

    function getCoordinates (position, imageWidth, imageHeight, canvasWidth, canvasHeight) {
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
    }

    

    function scaleToFit (width, height, maxWidth, maxHeight) {
      const scale = Math.min(maxWidth / width, maxHeight / height)
      return [width * scale, height * scale]
    }
  }
}
