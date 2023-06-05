
const routeConfig = {
  /**
   * scan file base path
   */
  baseDir: "test",
  /**
   * setup generate file output path
   */
  outputDir: "test/router",
  /**
   * config file output name,this file can use in project
   */
  outFileName: "routeConfig",
  /**
   * output file ext, default is `.ts`
   */
  outFileExt: "ts",
  /**
   * load file match regex
   */
  match: "**/*.ts",
  baseUrl: 'test',
  rootDir: './',
  paths: {
    '@/': ['*']
  }
};
exports.default = routeConfig;
    