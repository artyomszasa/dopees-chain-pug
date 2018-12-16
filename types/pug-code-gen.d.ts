import { Node } from "pug-parser";

export = index;
declare function index(ast: Node, options: index.Options): any;
declare namespace index {
  interface Options {
    pretty?: boolean;
    compileDebug?: boolean;
    doctype?: string;
    globals?: string[];
    self?: boolean;
  }
}