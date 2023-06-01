import * as fs from "fs";
import path from "path";
import { GenerateRouteConfig } from "../libs/types/config";

export const TARGET_CONFIG_NAME = "router.config.ts";

export function getRootDir() {
  return process.cwd();
}

export function getConfigPath() {
  return path.resolve(getRootDir(), TARGET_CONFIG_NAME);
}
//import { GenerateRouteConfig } from "react-route-generate";

// const routeConfig: GenerateRouteConfig = {
//     /**
//      * scan file base path
//      */
//     baseDir: "src/pages",
//     /**
//      * setup generate file output path
//      */
//     outputDir: "src/router",
//     /**
//      * config file output name,this file can use in project
//      */
//     outFileName: "routeConfig",
//     /**
//      * output file ext, default is \`.ts\`
//      */
//     outFileExt: "ts",
//     /**
//      * load file match regex
//      */
//     match: "**/*.ts",
//   };
  
//   export default routeConfig;

export function tryCreateConfigFile() {
  const configPath = getConfigPath();

  if (!fs.existsSync(configPath)) {
    // const file = fs.readFileSync(configPath);
    fs.writeFileSync(configPath,`
const routeConfig = {
  /**
   * scan file base path
   */
  baseDir: "src/pages",
  /**
   * setup generate file output path
   */
  outputDir: "src/router",
  /**
   * config file output name,this file can use in project
   */
  outFileName: "routeConfig",
  /**
   * output file ext, default is \`.ts\`
   */
  outFileExt: "ts",
  /**
   * load file match regex
   */
  match: "**/*.ts",
};

export default routeConfig;

    `);
  } else {
    console.log("The configuration file already exists..");
  }
}

export function getConfigFile(): GenerateRouteConfig {
  const path = getConfigPath();
  if (fs.existsSync(path)) {
    const config = require(path).default;
    return config;
  } else {
    console.warn(
      "The configuration file does not exist. Attempting to create a default configuration.."
    );
    tryCreateConfigFile();
    return getConfigFile();
  }
}
