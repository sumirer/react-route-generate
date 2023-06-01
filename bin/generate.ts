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
  if (sourceFile) {
    ts.forEachChild(sourceFile, (node) => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          const ls = (node as ts.ClassDeclaration).modifiers;
          ls?.forEach((item) => {
            if (
              ts.isDecorator(item) &&
              (
                (item.expression as ts.CallExpression)
                  .expression as ts.Identifier
              ).escapedText === ROUTE_DECORATOR_NAME
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
    return getDecoratorInfo(routeGenerateDecorator) as IFileDecoratorInfo;
  }
}

function getDecoratorInfo(decorator: ts.Decorator) {
  const expression = decorator.expression as ts.CallExpression;
  const args = expression.arguments;
  if (args.length === 1) {
    const params = (args[0] as ts.ObjectLiteralExpression)
      .properties as ts.NodeArray<ts.PropertyAssignment>;
    const result = {};
    params.forEach((item) => {
      const name = (item.name as ts.Identifier).escapedText || "";
      const initializer = item.initializer;
      switch (initializer.kind) {
        case ts.SyntaxKind.TrueKeyword:
          Object.assign(result, { [name]: true });
          break;
        case ts.SyntaxKind.FalseKeyword:
          Object.assign(result, { [name]: false });
          break;
        case ts.SyntaxKind.ArrayLiteralExpression:
          Object.assign(result, {
            [name]: (initializer as ts.ArrayLiteralExpression).elements.map(
              (item) => {
                switch (item.kind) {
                  case ts.SyntaxKind.StringLiteral:
                    return (item as ts.StringLiteral).text;
                  case ts.SyntaxKind.TrueKeyword:
                    return true;
                  case ts.SyntaxKind.FalseKeyword:
                    return false;
                  default:
                    return undefined;
                }
              }
            ),
          });
        case ts.SyntaxKind.StringLiteral:
          Object.assign(result, {
            [name]: (initializer as ts.StringLiteral).text,
          });
          break;
        default:
          break;
      }
    });
    return result;
  }
}

function getFileContent(info: Array<IFileDecoratorInfo>): string {
  const basePath = process.cwd();
  let headerImportContent: string[] = [`import React, {lazy} from 'react';`];
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
      const pathName = item.fileName
        .replace(basePath + "/", "")
        .replace(/\.[ts|tsx|jsx|js]/, "");
      const targetFileName = pathName.split("/").pop() || "";
      const importTarget = upcaseFirstKeyword(targetFileName);
      if (!isLazy) {
        headerImportContent.push(`import ${importTarget} from '${pathName}'`);
      }
      return `
    {
       path: '${item.routeName}',
       component: ${
         isLazy ? `lazy(() => import(\'${pathName}\'))` : importTarget
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
  fs.writeFileSync(targetFilePath, getFileContent(info));
  beforeGenerate(targetFilePath)
  console.log('route file generate success\nsee: '+ targetFilePath);
}

function upcaseFirstKeyword(name: string): string {
  if (name.length <= 1) {
    return name;
  }
  return name[0].toUpperCase() + name.slice(1);
}


function beforeGenerate(targetFile: string){
    const nodeModules = path.resolve(process.cwd(), 'node_modules')
    if(fs.existsSync(path.resolve(nodeModules, 'eslint'))){
        exec('eslint --fix ' + targetFile)
    }else if(fs.existsSync(path.resolve(nodeModules, 'prettier'))){
        exec(`prettier -c --write "${targetFile}"`)
    }
}