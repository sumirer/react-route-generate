export * from './types/config'

export interface IAutoRoute {
    routeName: string;
    lazy?: boolean;
    keepAlive?: boolean,
    cacheWithParams?: Array<string>
}

export function autoGenerateRoute(options: IAutoRoute) {
    return (target: any) => target;
}