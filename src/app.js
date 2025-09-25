import * as guiHTML from './screens/gui.html'

import './styles/main.scss'
import './styles/share.scss'

import { ScreenshotShare } from './components/screenshot-share'
import { VideoWatermarkShare } from './components/video-share'
import { MainFunctions } from './components/functions'


document.body.style.touchAction = 'none'
document.body.insertAdjacentHTML('afterbegin', guiHTML)


const components = {
    'screenshot-share': ScreenshotShare,
    'video-share': VideoWatermarkShare,
    'main-functions': MainFunctions
}

const registerComponents = components => 
    Object.keys(components).map(k => 
        AFRAME.registerComponent(k, components[k]))

registerComponents(components)