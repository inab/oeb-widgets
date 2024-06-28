const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
    mode: 'development',
    entry: {
        LoaderWidgets: './components/LoaderWidgets.vue',
        ScatterPlot: './components/ScatterPlot.vue',
        BarPlot: './components/BarPlot.vue',
        BoxPlot: './components/BoxPlot.vue',
        IndexPage: './pages/index.vue',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
        libraryTarget: 'umd',
        globalObject: 'this',
        library: 'oeb-widgets',
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
        // this will apply to both plain `.js` files
        // AND `<script>` blocks in `.vue` files
        {
          test: /\.js$/,
          loader: 'babel-loader'
        },
        // this will apply to both plain `.css` files
        // AND `<style>` blocks in `.vue` files
        {
          test: /\.css$/,
          use: [
            'vue-style-loader',
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
        new VueLoaderPlugin(),
    ],
};
