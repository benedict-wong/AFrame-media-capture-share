const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/app.js', // Entry point for your app
  devtool: 'inline-source-map',
  devServer: {
    server: 'https',
    allowedHosts: ['.ngrok.io'],
    port: 3000,
    hot: true,
    open: true,
  },
  output: {
    filename: 'bundle.js', // Output JavaScript file
    path: path.resolve(__dirname, 'dist'), // Output directory
    clean: true, // Clean the output directory before each build
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.ejs', // Use your index.html as a template
      filename: 'index.html', // Output HTML file
    }),
  ],
  module: {
    rules: [
      {
        test: /\.html$/, // Match .html files
        loader: 'html-loader', // Use html-loader to process HTML files
        options: {
          esModule: false, // Disable ES modules for compatibility
        },
      },
      {
        test: /\.js$/, // Match .js files
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader', // Optional: Transpile modern JavaScript
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
        // Creates style nodes from JS strings
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: true
            }
          },
          // Compiles Sass -> CSS
          'sass-loader'
        ]
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: true
            }
          }
        ]
      },
      {
        test: /\.(mp4|png|jpe?g|gif|webm)$/i,
        type: 'asset/resource',
        exclude: /models/
      },
      {
        test: /\.(mp3|svg|m4a|ico|vtt|woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource'
      },
      {
        test: /\.(glb|obj|fbx)$/i,
        loader: 'file-loader',
        options: {
          esModule: false,
          outputPath: '/assets/models',
          publicPath: 'assets/models/'
        }
      },
      {
        test: /\.gltf$/,
        loader: 'gltf-loader',
        options: {
          esModule: false,
          outputPath: '/assets/models',
          publicPath: 'assets/models/'
        }
      },
      {
        test: /models.*\.(mp4|bin|png|jpe?g|gif|webm)$/,
        loader: 'file-loader',
        options: {
          esModule: false,
          outputPath: '/assets/models/gltf-assets',
          publicPath: './gltf-assets/'
        }
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/sync',
      },
    ],
  },
  experiments: {
    asyncWebAssembly: true,
  },
  mode: 'development', // Change to 'production' for production builds
};