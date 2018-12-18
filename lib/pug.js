"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dopees_chain_1 = require("dopees-chain");
const parser = require("pug-parser");
const lexer = require("pug-lexer");
const codeGen = require("pug-code-gen");
const ast_helpers_1 = require("./ast-helpers");
const fspath = require("path");
const fs = require("fs");
const wrap = require("pug-runtime/wrap");
const walk = require("pug-walk");
const fileExistsSync = (path) => {
    try {
        fs.accessSync(path);
        return true;
    }
    catch (e) {
        return false;
    }
};
const parsePug = (contents, path) => {
    const tokens = lexer(contents, { filename: path });
    return parser(tokens, { filename: path, src: contents });
};
const generateHtml = (ast, options) => {
    return codeGen(ast, options || {});
};
const resolveDependency = (path, includePaths, rootPath) => {
    let folder;
    let fname;
    if (path.includes(fspath.sep)) {
        folder = fspath.dirname(path);
        fname = fspath.basename(path);
    }
    else {
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
};
const unquote = (txt) => {
    if (!txt) {
        return txt;
    }
    if (txt.startsWith('\'') && txt.endsWith('\'')) {
        return txt.substr(1, txt.length - 2).replace('\\\'', '\'');
    }
    return txt;
};
const getLinkHref = (n) => {
    if (ast_helpers_1.default.isTag(n) && n.name.toLowerCase() === 'link' && n.attrs.some(attr => attr.name.toLowerCase() === 'rel' && attr.val.toLowerCase() === '\'stylesheet\'')) {
        const href = n.attrs.find(attr => attr.name.toLowerCase() === 'href');
        if (href) {
            return unquote(href.val);
        }
    }
    return null;
};
const collectDependencies = (path, targetPath, node, includePaths) => {
    const deps = [];
    const rootPath = fspath.dirname(path);
    walk(node, n => {
        const href = getLinkHref(n);
        if (href) {
            deps.push(fspath.normalize(fspath.join(targetPath, href)));
            return false;
        }
        else if (ast_helpers_1.default.isInclude(n) && n.file && n.file.filename) {
            deps.push(resolveDependency(n.file.filename, includePaths, rootPath));
            return false;
        }
        return true;
    });
    return deps;
};
function box(ast) { return { boxedAst: ast }; }
function unbox(box) { return box.boxedAst; }
class PugMapper extends dopees_chain_1.derived.FileMapper {
    constructor() {
        super(...arguments);
        this.name = 'pug';
    }
    createSourceTask(_, task, sourcePath, context) {
        return dopees_chain_1.Task.file(sourcePath, context.basePath, { targetPath: fspath.dirname(task.name.path) });
    }
    generate(state, task, innerState, context) {
        const options = {
            // ...sassOptions,
            pretty: false,
        };
        return Buffer.from(wrap(generateHtml(unbox(innerState), options))(), 'utf-8');
    }
    async readSource(state, task, context) {
        const contents = await context.getContents(task, 'utf-8');
        return box(parsePug(contents, task.name.path));
    }
    init(options) {
        const extension = `.${options.targetExt || 'html'}`;
        let sourceResolver;
        if (options.sourceResolver) {
            sourceResolver = options.sourceResolver;
        }
        else if (options.sourceRoot) {
            sourceResolver = dopees_chain_1.ReversePathResolver.from({
                sourceRoot: options.sourceRoot,
                targetRoot: options.targetRoot,
                sourceExt: 'pug',
                targetExt: 'html'
            });
        }
        else {
            sourceResolver = ((path) => path.replace(/\.html$/, '.pug'));
        }
        return {
            inlineCss: options.inlineCss,
            innerStateKey: 'pug.ast',
            selector: (path, context) => {
                const absoluteTargetRoot = fspath.normalize(fspath.join(context.basePath, options.targetRoot));
                return path.endsWith(extension) && dopees_chain_1.PathResolver.match(path, absoluteTargetRoot, options.subfolders);
            },
            sourceResolver: sourceResolver
        };
    }
    async process(state, task, sourceTask, innerState, context) {
        if (state.inlineCss !== false) {
            const name = task.name;
            context.log(this.name, task, 'inlining css');
            // pug task has been prcessed, so we are safe to use this...
            const deps = (await context.storage.getObject(`!pug.dependencies!${sourceTask.name.path}`)).deps;
            const csss = {};
            await Promise.all(deps.map(async (dep) => {
                if (dep.endsWith('.css')) {
                    const subtask = await context.execute(dopees_chain_1.Task.file(dep, context.basePath));
                    csss[dep] = await context.getContents(subtask, 'utf-8');
                }
            }));
            // TODO: better deep clone
            const ast = JSON.parse(JSON.stringify(unbox(innerState)));
            walk(ast, (node, replace) => {
                const href = getLinkHref(node);
                if (href) {
                    const fullHref = fspath.normalize(fspath.join(fspath.dirname(name.path), href));
                    const contents = csss[fullHref];
                    if (contents) {
                        context.log('pug', task, `inlining ${href}`);
                        const replacement = {
                            name: 'style',
                            attrs: [],
                            attributeBlocks: [],
                            type: ast_helpers_1.NodeType.Tag,
                            block: {
                                type: ast_helpers_1.NodeType.Block,
                                nodes: [{
                                        type: ast_helpers_1.NodeType.Text,
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
exports.PugMapper = PugMapper;
class PugDependencyResolver extends dopees_chain_1.derived.FileDependencyResolver {
    constructor() {
        super(...arguments);
        this.name = 'pug:deps';
    }
    async readSource(_, task, context) {
        const contents = await context.getContents(task, 'utf-8');
        return box(parsePug(contents, task.name.path));
    }
    readDependencies(_, task, innerState, context) {
        const name = task.name;
        return collectDependencies(name.path, task.state.targetPath, unbox(innerState), [fspath.dirname(name.path), name.basePath || context.basePath]);
    }
    init(options) {
        return {
            inlineCss: options.inlineCss,
            innerStateKey: 'pug.ast',
            dependenciesKey: 'pug.dependencies',
            selector: (path) => path.endsWith('.pug')
        };
    }
}
exports.PugDependencyResolver = PugDependencyResolver;
function pug(options) {
    if (!options) {
        throw new Error('targetRoot must be defined.');
    }
    return dopees_chain_1.Executors.combine(new PugMapper().createExecutor(options), new PugDependencyResolver().createExecutor(options));
}
exports.pug = pug;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3B1Zy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLCtDQUE0SDtBQUM1SCxxQ0FBcUM7QUFDckMsbUNBQW1DO0FBQ25DLHdDQUF3QztBQUN4QywrQ0FBeUQ7QUFDekQsK0JBQStCO0FBQy9CLHlCQUF5QjtBQUN6Qix5Q0FBeUM7QUFDekMsaUNBQWlDO0FBRWpDLE1BQU0sY0FBYyxHQUFHLENBQUMsSUFBWSxFQUFFLEVBQUU7SUFDdEMsSUFBSTtRQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsT0FBTyxLQUFLLENBQUM7S0FDZDtBQUNILENBQUMsQ0FBQTtBQUVELE1BQU0sUUFBUSxHQUFHLENBQUMsUUFBZ0IsRUFBRSxJQUFZLEVBQUUsRUFBRTtJQUNsRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbkQsT0FBTyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUE7QUFFRCxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQWdCLEVBQUUsT0FBeUIsRUFBRSxFQUFFO0lBQ25FLE9BQU8sT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLElBQUksRUFBRSxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFBO0FBRUQsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLElBQVksRUFBRSxZQUFzQixFQUFFLFFBQWdCLEVBQUUsRUFBRTtJQUNuRixJQUFJLE1BQWMsQ0FBQztJQUNuQixJQUFJLEtBQWEsQ0FBQztJQUNsQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FB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