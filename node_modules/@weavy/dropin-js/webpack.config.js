/* eslint-env node */

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');

const versionRegExp = new RegExp("<VersionPrefix>(.*)</VersionPrefix>", "gm");

module.exports = (env) => {
  let weavyVersion, versionFile, weavyPackage;
  const packageFilePath = path.resolve(__dirname, './package.json');
  const versionFilePath = path.resolve(__dirname, '../../Directory.Build.props');

  if (env?.weavyversion) {
    weavyVersion = env.weavyversion;
  }

  if (!weavyVersion && fs.existsSync(packageFilePath)) {
    try {
      weavyPackage = require(packageFilePath);
      weavyVersion = weavyPackage.version;
    } catch (e) {
      console.error("Could not parse Weavy version from package.json");
    }
  }

  if (!weavyVersion && fs.existsSync(versionFilePath)) {
    try {
      versionFile = fs.readFileSync(versionFilePath, 'utf8');
      weavyVersion = versionRegExp.exec(versionFile)[1];
    } catch (e) {
      console.error("Could not parse Weavy version from Directory.Build.props");
    }
  }

  console.log("Weavy v" + weavyVersion);

  const config = {
    mode: "production",
    target: "web",
    entry: {
      "weavy-dropin": {
        import: './weavy-dropin.js',
        library: {
          name: { root: 'Weavy' },
          type: 'umd',
          export: 'default'
        }
      }
    },
    output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      publicPath: "", // Needed for SystemJS compatibility
      clean: true
    },
    plugins: [
      new ESLintPlugin(),
      new webpack.DefinePlugin({
        WEAVY_DEVELOPMENT: JSON.stringify(env?.development ? true : false),
        WEAVY_PRODUCTION: JSON.stringify(env?.production ? true : false),
        WEAVY_VERSION: JSON.stringify(weavyVersion)
      })
    ],
    module: {
      rules: [
        /* The following two needed for @material */
        {
          test: /\.m?js/,
          exclude: [
            path.resolve(__dirname, "scripts/")
          ],
          type: "javascript/auto",
        },
        {
          test: /\.m?js/,
          exclude: [
            path.resolve(__dirname, "scripts/")
          ],
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.m?js$/,
          include: [
            path.resolve(__dirname, "scripts/")
          ],
          /*exclude: [
              /node_modules/
          ],*/
          use: {
            loader: 'babel-loader'
          },
        },
        {
          test: /\.tsx?$/,
          use: {
            loader: 'ts-loader'
          },
          exclude: /node_modules/,
        },
        {
          test: /\.s[ac]ss$/i,
          use: [
            // Translates CSS into CommonJS
            {
              loader: "css-loader",
              options: {
                exportType: "string"
              },
            },
            // Compiles Sass to CSS
            "sass-loader",
          ],
        },
      ]
    },
    optimization: {
      minimizer: [new TerserPlugin({
        extractComments: false,
      })],
    },
    resolve: {
      extensions: ['.ts', '.js', '.json']
    },
  };

  const devConfig = Object.assign({}, config, {
    mode: "development",
    devtool: 'inline-source-map',
  });

  return env?.production ? config : devConfig;
}
