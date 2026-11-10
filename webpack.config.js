const { resolve } = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => ({
    entry: {
        analysis: "./src/index.tsx"
    },
    output: {
        filename: "[name].bundle.js",
        path: resolve("./dist"),
        publicPath: "/",
        clean: true
    },
    resolve: {
        extensions: [ ".js", ".jsx", ".ts", ".tsx", ".json" ],
        alias: {
            "@": resolve("./src")
        }
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/i,
                exclude: /node_modules/,
                use: "babel-loader"
            },
            {
                test: /\.css$/i,
                use: [
                    "style-loader",
                    {
                        loader: "css-loader",
                        options: {
                            modules: {
                                namedExport: true,
                                exportLocalsConvention: "camelCaseOnly",
                                localIdentName: "[name]__[local]--[hash:base64:5]"
                            }
                        }
                    }
                ]
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "public", to: "." }
            ]
        })
    ],
    devServer: {
        static: {
            directory: resolve("./dist")
        },
        port: 8080,
        historyApiFallback: true,
        hot: true,
        devMiddleware: {
            writeToDisk: true
        }
    },
    devtool: argv.mode == "production" ? false : "eval-source-map"
});
