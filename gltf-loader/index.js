// SOURCE: https://github.com/mientjan/gltf-webpack-loader
// updated for use with webpack 5
const loaderUtils = require('loader-utils')
const path = require('path')
const schema = require('./options.json')
const { validate } = require('webpack/node_modules/schema-utils')

const regExternal = /^https?:\/\//
const regFileUrl = /\.(gif|png|bin|jpe?g)$/

function isExternalURL (url) {
  return regExternal.test(url)
}

function isFileUrl (url) {
  return regFileUrl.test(url)
}

function deepReplace (obj, replace) {
  if (obj instanceof Array) {
    obj.forEach((value, key) => {
      const valueType = typeof obj[key]

      if (valueType === 'object') {
        deepReplace(obj[key], replace)
      } else {
        replace(obj, key, obj[key])
      }
    })
  } else if (typeof obj === 'object') {
    Object.keys(obj).forEach(key => {
      const valueType = typeof obj[key]

      if (valueType === 'object') {
        deepReplace(obj[key], replace)
      } else {
        replace(obj, key, obj[key])
      }
    })
  }
}

/**
 * Allows you to import external files into a json value.
 * Can be used for any value, in an object or array.
 */
module.exports = function WebpackGLTFLoader (content) {
  const callback = this.async()  // eslint-disable-line
  const options = this.getOptions() || {}
  validate(schema, options, 'Webpack GLTF Loader')
  const context = options.context || this.rootContext

  const url = loaderUtils.interpolateName(this, options.name, {
    context,
    content,
    regExp: options.regExp
  })

  content = typeof content === 'string' ? JSON.parse(content) : content

  let outputPath = url
  const completeResolve = []

  deepReplace(content, (obj, key, value) => {
    if (!isExternalURL(value) && isFileUrl(value)) {
      if (!/^(\.\/|\.\.\/)/.test(value)) {
        value = `./${value}`
      }

      completeResolve.push(new Promise(resolve => {
        this.loadModule(`${value}`, (err, result, sourceMap, module) => {
          if (err) console.warn(err)
          const match = /"([\w\W]+)"/.exec(result)

          if (match && match.length > 1) {
            obj[key] = path.relative(path.dirname(url), match[1])
          }

          resolve(match)
        })
      }))
    }
  })

  Promise.all(completeResolve).then(data => {
    content = JSON.stringify(content)
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029')

    if (options.outputPath) {
      if (typeof options.outputPath === 'function') {
        outputPath = options.outputPath(url, this.resourcePath, context)
      } else {
        outputPath = path.posix.join(options.outputPath, url)
      }
    }

    this.emitFile(outputPath, content)

    let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`

    if (options.publicPath) {
      if (typeof options.publicPath === 'function') {
        publicPath = options.publicPath(url, this.resourcePath, context)
      } else {
        publicPath = `${options.publicPath.endsWith('/')
          ? options.publicPath
          : `${options.publicPath}/`}${url}`
      }

      publicPath = JSON.stringify(publicPath)
    }

    this.callback(null, `module.exports = ${publicPath};`)
  })
}
