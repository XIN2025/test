// babel.config.js

module.exports = function (api) {
  api.cache(true);
  const plugins = [
    [
      require.resolve("babel-plugin-module-resolver"),
      {
        root: ["./"],
        alias: {
          "@": "./",
        },
      },
    ],
  ];

  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    plugins,
  };
};
