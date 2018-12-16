import { Executor, Task, Context, FileName, Helpers as h } from 'dopees-chain';
import { promises as fsp } from 'fs';
import * as parser from 'pug-parser';
import * as lexer from 'pug-lexer';
import * as codeGen from 'pug-code-gen';
import { default as ast, NodeType } from './ast-helpers';
import * as fspath from 'path';
import * as fs from 'fs';
import * as wrap from 'pug-runtime/wrap';
import * as walk from 'pug-walk';

interface AstCache {
  ast: parser.Node;
  mtime: Date
}

const ah = ast;

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

export function pug(options?: Options) {
  const opts = options || { };
  return async (task: Task, context: Context) => {
    const name = task.name;
    if (name instanceof FileName) {
      if (name.path.endsWith('.html')) {
        const startTs = Date.now();
        // [css <--- scss] case
        let source: string;
        if (opts.sourceResolver) {
          source = opts.sourceResolver(name.path, name.basePath);
        } else {
          source = name.path.replace(/\.html$/, '.pug');
        }
        // FIXME: fix targetPath...
        let pugTask = Task.file(source, name.basePath, { targetPath: fspath.dirname(name.path) });
        context.log('pug', task, `resolved source => ${pugTask.name}`);
        // execute dependency (.pug), possibly triggering subdependencies....
        pugTask = await context.execute(pugTask);

        // check if file already exists...
        const mtime = await fsp.stat(name.path).then(stats => stats.mtime, () => null);
        if (mtime) {
          // check if source if older (no direct mtime as some dependency of the source could have changed instead of
          // the source itself)...
          const sourceMtime = await h.getMtime(pugTask, context);
          if (sourceMtime && sourceMtime <= mtime) {
            // no need to recompile html, linked resources may have changed though...
            return;
          }
        }
        const pugName = <FileName>pugTask.name;
        // in all other cases ---> compile....
        const options : codeGen.Options = {
          // ...sassOptions,
          pretty: false,
          // file: source,
          // data: await context.getContents(scssTask, 'utf-8'),
          // outFile: name.path,
          // sourceMap: true
        };
        const contents = await context.getContents(pugTask, 'utf-8');
        // NOTE: ast mtime?
        let ast : parser.Node;
        {
          const cached = await context.storage.getObject<AstCache>(`!pug.ast!${pugName.path}`);
          if (cached) {
            context.log('pug', task, 'using cached AST');
            ast = cached.ast;
          } else {
            context.log('pug', task, 'parsing pug...');
            ast = parsePug(contents, source);
            context.log('pug', task, 'done parsing pug');
          }
        }
        if (false !== opts.inlineCss) {
          context.log('pug', task, 'inlining css');
          // pug task has been prcessed, so we are safe to use this...
          const deps = (<Dependencies>(await context.storage.getObject<Dependencies>(`!pug.deps!${pugName.path}`))).deps;
          const csss: StringMap = {};
          await Promise.all(deps.map(async dep => {
            if (dep.endsWith('.css')) {
              const subtask = await context.execute(Task.file(dep, context.basePath));
              csss[dep] = await context.getContents(subtask, 'utf-8');
            }
          }));
          // TODO: better deep clone
          ast = JSON.parse(JSON.stringify(ast));
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
          context.log('pug', task, 'inlining css done');
        }
        const htmlContents = wrap(generateHtml(ast, options));
        context.log('pug', task, 'storing html');
        const res = await context.saveContents(task, Buffer.from(htmlContents(), 'utf-8'), true);
        context.log('pug', task, 'done', Date.now() - startTs);
        return res;
      } else if (name.path.endsWith('.pug')) {
        // [pug <--- pug dependencies] case
        const startTs = Date.now();
        context.log('pug:dep', task, 'starting...');
        let mtime: Date;
        try {
          const stats = await fsp.stat(name.path);
          mtime = stats.mtime;
        } catch (e) {
          throw new Error(`file not found: ${name.path}`);
        }
        let deps: string[];
        let ast: parser.Node | null = null;
        const entry = await context.storage.getObject<Dependencies>(`!pug.deps!${name.path}`);
        if (entry && entry.mtime <= mtime) {
          // dependencies did not change
          context.log('pug:dep', task, 'using cached dependencies');
          deps = entry.deps;
        } else {
          context.log('pug:dep', task, 'resolving dependencies...');
          const data = await context.getContents(task);
          const contents = data.toString('utf-8');
          context.log('pug:dep', task, 'parsing pug...');
          ast = parsePug(contents, name.path);
          context.log('pug:dep', task, 'done parsing pug');
          // FIXME: fix targetPath...
          deps = collectDependencies(name.path, task.state.targetPath, ast, [fspath.dirname(name.path), name.basePath || context.basePath]);
        }
        if (deps.length) {
          const depTasks = deps.map(dep => Task.file(dep, name.basePath));
          context.log('pug:dep', task, `done resolving dependencies => ${depTasks.map(t => t.name).join(', ')}`);
          const mtimes = [mtime];
          await Promise.all(depTasks.map(async t => {
            const depTask = await context.execute(t);
            mtimes.push(await h.getMtime(depTask, context) || mtime);
          }))
          const mtimeMilliseconds = Math.max.apply(Math, mtimes.map(date => date.getTime()));
          mtime = new Date();
          mtime.setTime(mtimeMilliseconds);
        } else {
          context.log('pug:dep', task, 'done resolving dependencies => none');
        }
        // cache ast
        if (ast) {
          const astCache : AstCache = { mtime, ast }
          await context.storage.setObject(`!pug.ast!${name.path}`, astCache);
        }
        // cache dependencies
        await context.storage.setObject(`!pug.deps!${name.path}`, { mtime, deps });
        const final = await h.setMtime(task, mtime, context);
        context.log('pug:dep', task, 'done', Date.now() - startTs);
        return final;
      }
    }
  };
}