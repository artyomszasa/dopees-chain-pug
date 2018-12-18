import { Task, Context, FileName, Helpers as h, derived, Executors, PathResolver, ReversePathResolver } from 'dopees-chain';
import * as parser from 'pug-parser';
import * as lexer from 'pug-lexer';
import * as codeGen from 'pug-code-gen';
import { default as ast, NodeType } from './ast-helpers';
import * as fspath from 'path';
import * as fs from 'fs';
import * as wrap from 'pug-runtime/wrap';
import * as walk from 'pug-walk';

const fileExistsSync = (path: string) => {
  try {
    fs.accessSync(path)
    return true;
  } catch (e) {
    return false;
  }
}

const parsePug = (contents: string, path: string) => {
  const tokens = lexer(contents, { filename: path });
  return parser(tokens, { filename: path, src: contents });
}

const generateHtml = (ast: parser.Node, options?: codeGen.Options) => {
  return codeGen(ast, options || {});
}

const resolveDependency = (path: string, includePaths: string[], rootPath: string) => {
  let folder: string;
  let fname: string;
  if (path.includes(fspath.sep)) {
    folder = fspath.dirname(path);
    fname = fspath.basename(path);
  } else {
    folder = '';
    fname = path;
  }
  if (!fname.endsWith('.pug')) {
    fname = fname + '.pug';
  }
  for (const basePath of includePaths) {
    let candidate = fspath.normalize(fspath.join(basePath, path));
    if (fileExistsSync(candidate)) {
      return candidate;
    }
    if (!fname.startsWith('_')) {
      candidate = fspath.normalize(fspath.join(basePath, folder, '_' + fname));
      if (fileExistsSync(candidate)) {
        return candidate;
      }
    }
  }
  throw new Error(`could not resolve ${path} while processing ${rootPath}, search paths: ${includePaths}`);
}

const unquote = (txt?: string|null) => {
  if (!txt) {
    return txt;
  }
  if (txt.startsWith('\'') && txt.endsWith('\'')) {
    return txt.substr(1, txt.length - 2).replace('\\\'', '\'');
  }
  return txt;
}

const getLinkHref = (n: parser.Node) => {
  if (ast.isTag(n) && n.name.toLowerCase() === 'link' && n.attrs.some(attr => attr.name.toLowerCase() === 'rel' && attr.val.toLowerCase() === '\'stylesheet\'')) {
    const href = n.attrs.find(attr => attr.name.toLowerCase() === 'href');
    if (href) {
      return unquote(href.val);
    }
  }
  return null;
}

const collectDependencies = (path: string, targetPath: string, node: parser.Node, includePaths: string[]) => {
  const deps : string[] = [];
  const rootPath = fspath.dirname(path);
  walk(node, n => {
    const href = getLinkHref(n);
    if (href) {
      deps.push(fspath.normalize(fspath.join(targetPath, href)));
      return false;
    } else if (ast.isInclude(n) && n.file && n.file.filename) {
      deps.push(resolveDependency(n.file.filename, includePaths, rootPath));
      return false;
    }
    return true;
  });
  return deps;
}

export interface Options {
  targetRoot: string;
  subfolders?: boolean;
  sourceRoot?: string
  targetExt?: string;
  sourceResolver?: (path: string, basePath?: string) => string;
  inlineCss?: boolean;
}

interface Dependencies {
  readonly mtime: Date;
  readonly deps: string[];
}

interface StringMap {
  [name: string]: string
}

interface PugMapperState extends derived.FileMapperState {
  inlineCss?: boolean;
}

// NOTE: to avoid non-standard dependencies from pug libraries, inner state is opaque object.
export interface PugMapperAst {
  /** boxed pug ast */
  boxedAst: any
}

function box(ast: parser.Node): PugMapperAst { return { boxedAst: <any>ast }; }
function unbox(box: PugMapperAst) { return <parser.Node>box.boxedAst; }


export class PugMapper extends derived.FileMapper<Options, PugMapperAst, PugMapperState> {
  name = 'pug';
  protected createSourceTask(_: PugMapperState, task: Task, sourcePath: string, context: Context): Task {
    return Task.file(sourcePath, context.basePath, { targetPath: fspath.dirname((<FileName>task.name).path) });
  }
  protected generate(state: PugMapperState, task: Task, innerState: PugMapperAst, context: Context): Buffer | Promise<Buffer> {
    const options : codeGen.Options = {
      // ...sassOptions,
      pretty: false,
      // file: source,
      // data: await context.getContents(scssTask, 'utf-8'),
      // outFile: name.path,
      // sourceMap: true
    };
    return Buffer.from(wrap(generateHtml(unbox(innerState) , options))(), 'utf-8');
  }
  protected async readSource(state: PugMapperState, task: Task, context: Context) {
    const contents = await context.getContents(task, 'utf-8');
    return box(parsePug(contents, (<FileName>task.name).path));
  }
  protected init(options: Options): PugMapperState {
    const extension = `.${options.targetExt || 'html'}`;
    let sourceResolver: PathResolver;
    if (options.sourceResolver) {
      sourceResolver = options.sourceResolver;
    } else if (options.sourceRoot) {
      sourceResolver = ReversePathResolver.from({
        sourceRoot: options.sourceRoot,
        targetRoot: options.targetRoot,
        sourceExt: 'pug',
        targetExt: 'html'
      });
    } else {
      sourceResolver = ((path: string) => path.replace(/\.html$/, '.pug'));
    }
    return {
      inlineCss: options.inlineCss,
      innerStateKey: 'pug.ast',
      selector: (path: string, context: Context) => {
        const absoluteTargetRoot = fspath.normalize(fspath.join(context.basePath, options.targetRoot));
        return path.endsWith(extension) && PathResolver.match(path, absoluteTargetRoot, options.subfolders);
      },
      sourceResolver: sourceResolver
    };
  }
  protected async process(state: PugMapperState, task: Task, sourceTask: Task, innerState: PugMapperAst, context: Context): Promise<PugMapperAst> {
    if (state.inlineCss !== false) {
      const name = <FileName>task.name;
      context.log(this.name, task, 'inlining css');
      // pug task has been prcessed, so we are safe to use this...
      const deps = (<{ deps: string[] }>(await context.storage.getObject<Dependencies>(`!pug.dependencies!${(<FileName>sourceTask.name).path}`))).deps;
      const csss: StringMap = {};
      await Promise.all(deps.map(async dep => {
        if (dep.endsWith('.css')) {
          const subtask = await context.execute(Task.file(dep, context.basePath));
          csss[dep] = await context.getContents(subtask, 'utf-8');
        }
      }));
      // TODO: better deep clone
      const ast = <parser.Node>JSON.parse(JSON.stringify(unbox(innerState)));
      walk(ast, (node, replace) => {
        const href = getLinkHref(node);
        if (href) {
          const fullHref = fspath.normalize(fspath.join(fspath.dirname(name.path), href));
          const contents = csss[fullHref];
          if (contents) {
            context.log('pug', task, `inlining ${href}`);
            const replacement : parser.Tag = {
              name: 'style',
              attrs: <parser.Attribute[]>[],
              attributeBlocks: [],
              type: NodeType.Tag,
              block: <parser.Block>{
                type: NodeType.Block,
                nodes: [<parser.Text>{
                  type: NodeType.Text,
                  val: contents
                }]
              }
            };
            replace(replacement);
            return false;
          }
        }
        return true;
      });
      context.log(this.name, task, 'inlining css done');
      return box(ast);
    }
    return innerState;
  }
}

export class PugDependencyResolver extends derived.FileDependencyResolver<Options, PugMapperAst, derived.FileDependencyResolverState & { inlineCss?: boolean, innerStateKey: string, dependenciesKey: string }> {
  name = 'pug:deps';
  protected async readSource(_: any, task: Task, context: Context) {
    const contents = await context.getContents(task, 'utf-8');
    return box(parsePug(contents, (<FileName>task.name).path));
  }
  protected readDependencies(_: any, task: Task, innerState: PugMapperAst, context: Context) {
    const name = <FileName>task.name;
    return collectDependencies(name.path, task.state.targetPath, unbox(innerState), [fspath.dirname(name.path), name.basePath || context.basePath])
  }
  protected init(options: Options): derived.FileDependencyResolverState & { inlineCss?: boolean, innerStateKey: string; dependenciesKey: string; } {
    return {
      inlineCss: options.inlineCss,
      innerStateKey: 'pug.ast',
      dependenciesKey: 'pug.dependencies',
      selector: (path: string) => path.endsWith('.pug')
    };
  }
}

export function pug(options?: Options) {
  if (!options) {
    throw new Error('targetRoot must be defined.');
  }
  return Executors.combine(
    new PugMapper().createExecutor(options),
    new PugDependencyResolver().createExecutor(options)
  );
}