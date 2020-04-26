const
    webpack = require("webpack");
const path = require("path");

const config = {
    entry: ["babel-polyfill", "./src/index.js"],
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "main.js"
    },
    devtool: "source-map",
    module: {
        rules: [
            {
                test: /\.js$/,
                use: "babel-loader",
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    "style-loader",
                    "css-loader"
                ]
            },
            {
                test: /\.scss$/,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader"
                ]
            },
            {
                test: /\.png$/,
                use: [
                    {
                        loader: "url-loader",
                        options: {
                            mimetype: "image/png"
                        }
                    }
                ]
            },
            {
                test: /\.obj$/,
                use: [
                    {
                        loader: "raw-loader"
                    }
                ]
            }
        ]
    }
};

module.exports = config;