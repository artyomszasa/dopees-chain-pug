import * as parser from 'pug-parser';
export = index;
declare function index(ast: parser.Node, before: (node: parser.Node, replace: (newNode: parser.Node) => void) => boolean, after?: (node: parser.Node) => boolean): parser.Node;
declare namespace index { }