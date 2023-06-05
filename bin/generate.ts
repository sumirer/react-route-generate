import * as ts from "typescript";
import { getConfigFile } from "./createConfig";
import * as fs from "fs";
import path from "path";
import { GenerateRouteConfig } from "../libs/types/config";
import { JsxEmit } from "typescript";
import { exec } from "child_process";

interface IFileDecoratorInfo {
  fileName: string;
  keepAlive?: boolean;
  lazy?: boolean;
  routeName: string;
  cacheWithParams?: Array<string>;
  className?: string;
}

const ROUTE_DECORATOR_NAME = "autoGenerateRoute";

export function loadAllFile() {
  const config = getConfigFile();
  const dirPath = path.resolve(process.cwd(), config.baseDir);
  const fsState = fs.statSync(dirPath);
  const fileList: string[] = [];
  readDir(config, fsState, dirPath, (file) => {
    // fileContentCallback(file);
    fileList.push(file);
  });
  //   console.log("get match file", fileList);
  const getFileDecoratorInfo = parseFileContent(fileList);
  createRouteFile(config, getFileDecoratorInfo);
}

function readDir(
  config: GenerateRouteConfig,
  state: fs.Stats,
  filePath: string,
  matchCallback: (filePath: string) => void
) {
  if (state.isDirectory()) {
    fs.readdirSync(filePath).forEach((file) => {
      readDir(
        config,
        fs.statSync(path.resolve(filePath, file)),
        path.resolve(filePath, file),
        matchCallback
      );
    });
  } else {
    const matchTest = (config.match || "**/*.ts")
      .replace(/\./g, `\.`)
      .replace(/\*+/g, "(.*)");
    if (new RegExp(matchTest).test(filePath)) {
      matchCallback(filePath);
    }
  }
}

function parseFileContent(files: string[]): IFileDecoratorInfo[] {
  const program = ts.createProgram(files, {
    experimentalDecorators: true,
    jsx: JsxEmit.React,
    target: ts.ScriptTarget.ES2022,
    allowJs: true,
  });
  return files
    .map((item) => {
      const fileInfo = getSourceFileInfo(program.getSourceFile(item));
      if (fileInfo) {
        return {
          fileName: item,
          ...fileInfo,
        };
      }
      // return getSourceFileInfo(program.getSourceFile(item));
    })
    .filter(Boolean) as Array<IFileDecoratorInfo>;
}

function getSourceFileInfo(
  sourceFile?: ts.SourceFile
): Omit<IFileDecoratorInfo, "fileName"> | undefined {
  let routeGenerateDecorator: ts.Decorator | undefined;
  let className: string | undefined;
  if (sourceFile) {
    ts.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          className = (
            (node as ts.ClassDeclaration)?.name as ts.Identifier
          )?.escapedText?.toString();
          const ls = (node as ts.ClassDeclaration).modifiers;
          ls?.forEach((item) => {
            if (
              ts.isDecorator(item) &&
              (
                (item.expression as ts.CallExpression)
                  ?.expression as ts.Identifier
              )?.escapedText === ROUTE_DECORATOR_NAME
            ) {
              routeGenerateDecorator = item;
            }
          });
          break;
        default:
          break;
      }
      //   return node;
    });
  }
  if (routeGenerateDecorator) {
    return getDecoratorInfo(
      routeGenerateDecorator,
      className
    ) as IFileDecoratorInfo;
  }
}

function getDecoratorInfo(decorator: ts.Decorator, className?: string) {
  const expression = decorator.expression as ts.CallExpression;
  const args = expression.arguments;
  if (args.length === 1) {
    const params = (args[0] as ts.ObjectLiteralExpression)
      .properties as ts.NodeArray<ts.PropertyAssignment>;
    const result = { className };
    params.forEach((item) => {
      const name = (item.name as ts.Identifier).escapedText || "";
      const initializer = item.initializer;
      const literalResult = getLiteralResult(initializer);
      if (literalResult !== undefined) {
        Object.assign(result, { [name]: literalResult });
      }
    });
    return result;
  }
}

function getLiteralResult(
  literal: ts.Expression
): boolean | string | Array<any> | undefined {
  switch (literal.kind) {
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.StringLiteral:
      return (literal as ts.StringLiteral).text;
    case ts.SyntaxKind.NumericLiteral:
      return (literal as ts.NumericLiteral).text;
    case ts.SyntaxKind.ArrayLiteralExpression:
      return (literal as ts.ArrayLiteralExpression).elements.map((item) =>
        getLiteralResult(item)
      );
    default:
      return undefined;
  }
}

function getFileContent(
  info: Array<IFileDecoratorInfo>,
  config: GenerateRouteConfig
): string {
  //   const basePath = process.cwd();
  let headerImportContent: string[] = [`import React, {lazy} from 'react';`];
  const getProjectRootPath = path.resolve(config.rootDir, config.baseUrl);
  const fileTipMessage = `
/**
 * this file auto generate by react-route-generate, do not modify
 *  这个文件由插件自动生成请不要修改
 */
  `;
  const fileContent = `

export const router = [
    ${info.map((item) => {
      const isLazy = !!item.lazy;
      let pathName = item.fileName
        // .replace(basePath + '/', "")
        .replace(getProjectRootPath + "/", "")
        .replace(/(\.ts|\.tsx|\.jsx|\.js)+$/, "");
      // 替换常用标识符
      if (config.paths["@/"]) {
        pathName = `@/${pathName}`;
      }
      if (pathName.endsWith("index")) {
        pathName.replace(/\/index+$/, "");
      }
      const targetFileName = pathName.split("/").pop() || "";
      const importTarget = upcaseFirstKeyword(targetFileName);
      if (!isLazy) {
        headerImportContent.push(
          `import ${item.className || importTarget} from '${pathName}'`
        );
      }
      return `
    {
       path: '${item.routeName}',
       component: ${
         isLazy
           ? `lazy(() => import(\'${pathName}\'))`
           : item.className || importTarget
       },
       ${item.keepAlive === true ? "keepAlive: true," : ""}
       ${
         item.cacheWithParams
           ? `cacheKeys: [${item.cacheWithParams
               .map((name) => `'${name}'`)
               .join(",")}]`
           : ""
       }
    }
        `;
    })}
]

    `;
  return `
${headerImportContent.join("\n")}

${fileTipMessage}

${fileContent}
    `;
}

function createRouteFile(
  config: GenerateRouteConfig,
  info: Array<IFileDecoratorInfo>
) {
  const targetPath = path.resolve(
    process.cwd(),
    config.outputDir || "src/router"
  );
  const targetFilePath = path.resolve(
    targetPath,
    (config.outFileName || "routerConfig") + "." + (config.outFileExt || "ts")
  );
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath);
  }
  fs.writeFileSync(targetFilePath, getFileContent(info, config));
  beforeGenerate(targetFilePath);
  console.log("route file generate success\nsee: " + targetFilePath);
}

function upcaseFirstKeyword(name: string): string {
  if (name.length <= 1) {
    return name;
  }
  return name[0].toUpperCase() + name.slice(1);
}

function beforeGenerate(targetFile: string) {
  const nodeModules = path.resolve(process.cwd(), "node_modules");
  if (fs.existsSync(path.resolve(nodeModules, "eslint"))) {
    exec("eslint --fix " + targetFile);
  } else if (fs.existsSync(path.resolve(nodeModules, "prettier"))) {
    exec(`prettier -c --write "${targetFile}"`);
  }
}
