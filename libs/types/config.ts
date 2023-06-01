export interface GenerateRouteConfig {
    /**
     * scan file base path
     */
    baseDir: string;
    /**
     * setup generate file output path
     */
    outputDir: string;
    /**
     * config file output name,this file can use in project
     */
    outFileName: string;
    /**
     * output file ext, default is \`.ts\`
     */
    outFileExt: string;
    /**
     * load file match regex
     */
    match: string,
}