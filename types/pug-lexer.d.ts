export = index;

declare function index(str: string, options: index.Options): any;
declare namespace index {
  interface Options {
    filename?: string;
    plugins?: string[];
  }
}