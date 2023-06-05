# react-route-generate

[English]('./README.MD')

## 使用
在任意地方执行以下命令，全局安装此工具
```bash
npm install react-route-generate -g
```
将工具安装到全局命令

然后在需要使用的项目中再次安装此工具包
```bash
npm install react-route-generate --dev
```
你就可以在项目中使用此工具了

## 作用
工具可以使用注解的方式声明路由，并生成指定的配置文件，包括以下配置
```ts
export interface IAutoRoute {
  routeName: string;
  lazy?: boolean;
  keepAlive?: boolean;
  cacheWithParams?: Array<string>;
}
```
此配置用于生成指定配置，在runtime阶段并未产生实质作用,实现如下
```ts
export function autoGenerateRoute(options: IAutoRoute) {
  return (target: any) => target;
}
```

## 使用
在项目中，你只需要在需要生成路由配置的地方添加`autoGenerateRoute`注解即可
```ts
...
import { autoGenerateRoute } from 'react-route-generate';

@autoGenerateRoute({
  routeName: '/createArchive',
})
@inject(`app`)
@observer
export default class CreateArchivePage extends BasePage<CreateArchiveStore> {
    ...
}
```
这样你就得到了一个路由声明，然后在项目根目录执行命令
```bash
react-route-generate generate
```
你就可以得到一个路由配置文件
```ts
import React, { lazy } from 'react';
import CreateArchivePage from '@/pages/Archives/CreateArchive';

/**
 * this file auto generate by react-route-generate, do not modify
 *  这个文件由插件自动生成请不要修改
 */

export const router = [
  {
    path: '/createArchive',
    component: CreateArchivePage,
  },
];

```
注解支持React的lazy方法，你只需要设置`lazy`为`true`即可
```ts
...
import { autoGenerateRoute } from 'react-route-generate';

@autoGenerateRoute({
  keepAlive: true,
  routeName: '/archiveDetails',
  lazy: true,
})
@inject(`app`)
@observer
@withActivation
export default class ArchiveDetailsPage
  extends BasePage<ArchiveDetailsStore>
  implements IKeepAlive
{
    ...
}
```
生成的配置文件如下
```ts
...
  {
    path: '/archiveDetails',
    component: lazy(() => import('@/pages/Archives/ArchiveDetails')),
    keepAlive: true,
  },
...
```
插件只负责生成配置文件，`keepAlive`和路由使用的具体使用需要自行实现

## 配置

工具存在配置文件`router.config.ts`,作用于插件的表现
```ts
const routeConfig = {
  /**
   * scan file base path
   */
  baseDir: "src/pages",
  /**
   * setup generate file output path
   */
  outputDir: "src/routes",
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
  /**
   * replace alias
   */
  paths: {
      '@/': ['*']
  },

  /**
   * base project url, with tsconfig
   */
  baseUrl: 'src',

  /**
   * project root dir, with tsconfig
   */
  rootDir: './' 
};
exports.default = routeConfig;
    
    
```

配置由插件首次运行生成，无需自行创建

- ### baseDir
  设置插件查找的文件目录，用于查找存在注解的文件

- ### outDir
  设置生成文件的输出目录

- ### outFileName
  设置输出文件的名称

- ### outFileExt
  设置输出文件的文件类型

- ### match
  设置注解文件匹配的正则表达式

- ### paths
  用于生成别名路由

- ### baseUrl
  设置根目录，用于路径生成，设置可以跟随`tsconfig.json`

- ### rootDir
  设置根目录，用于路径生成，设置同`tsconfig.json`