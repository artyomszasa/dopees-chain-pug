/// <reference types="node" />
import { Task, Context, derived } from 'dopees-chain';
export interface PugLocals {
    [key: string]: any;
}
export interface Options {
    targetRoot: string;
    subfolders?: boolean;
    sourceRoot?: string;
    targetExt?: string;
    sourceResolver?: (path: string, basePath?: string) => string;
    inlineCss?: boolean;
    locals?: PugLocals | ((path: string) => PugLocals | undefined);
}
interface PugMapperState extends derived.FileMapperState {
    inlineCss?: boolean;
    locals?: PugLocals | ((path: string) => PugLocals | undefined);
}
export interface PugMapperAst {
    /** boxed pug ast */
    boxedAst: any;
}
export declare class PugMapper extends derived.FileMapper<Options, PugMapperAst, PugMapperState> {
    name: string;
    protected createSourceTask(_: PugMapperState, task: Task, sourcePath: string, context: Context): Task;
    protected generate(state: PugMapperState, task: Task, innerState: PugMapperAst, context: Context): Buffer | Promise<Buffer>;
    protected readSource(state: PugMapperState, task: Task, context: Context): Promise<PugMapperAst>;
    protected init(options: Options): PugMapperState;
    protected process(state: PugMapperState, task: Task, sourceTask: Task, innerState: PugMapperAst, context: Context): Promise<PugMapperAst>;
}
export declare class PugDependencyResolver extends derived.FileDependencyResolver<Options, PugMapperAst, derived.FileDependencyResolverState & {
    inlineCss?: boolean;
    innerStateKey: string;
    dependenciesKey: string;
}> {
    name: string;
    protected readSource(_: any, task: Task, context: Context): Promise<PugMapperAst>;
    protected readDependencies(_: any, task: Task, innerState: PugMapperAst, context: Context): string[];
    protected init(options: Options): derived.FileDependencyResolverState & {
        inlineCss?: boolean;
        innerStateKey: string;
        dependenciesKey: string;
    };
}
export declare function pug(options?: Options): import("dopees-chain").Executor;
export {};
