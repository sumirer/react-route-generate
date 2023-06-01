import { tryCreateConfigFile } from "./createConfig";
import { loadAllFile } from "./generate";

const args = process.argv

const params = args.slice(2);

if(params.length === 0){
    console.error('please command:react-route-generate config or react-route-generate generate');
}

if(params[0] === 'config'){
    tryCreateConfigFile();
}

if(params[0] === 'generate'){
    loadAllFile();
}