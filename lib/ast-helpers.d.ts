import { Node, Block, Doctype, Comment, BlockComment, Text, Tag, InterpolatedTag, Code, Conditional, Case, When, While, Each, Mixin, MixinBlock, YieldBlock, FileReference, Include, IncludeFilter, Extends, NamedBlock, Filter } from "pug-parser";
export declare enum NodeType {
    Block = "Block",
    Doctype = "Doctype",
    Comment = "Comment",
    BlockComment = "BlockComment",
    Text = "Text",
    Tag = "Tag",
    InterpolatedTag = "InterpolatedTag",
    Code = "Code",
    Conditional = "Conditional",
    Case = "Case",
    When = "When",
    While = "While",
    Each = "Each",
    Mixin = "Mixin",
    MixinBlock = "MixinBlock",
    YieldBlock = "YieldBlock",
    FileReference = "FileReference",
    Include = "Include",
    IncludeFilter = "IncludeFilter",
    Extends = "Extends",
    NamedBlock = "NamedBlock",
    Filter = "Filter"
}
export default class AstHelpers {
    static isBlock(node: Node): node is Block;
    static isDoctype(node: Node): node is Doctype;
    static isComment(node: Node): node is Comment;
    static isBlockComment(node: Node): node is BlockComment;
    static isText(node: Node): node is Text;
    static isTag(node: Node): node is Tag;
    static isInterpolatedTag(node: Node): node is InterpolatedTag;
    static isCode(node: Node): node is Code;
    static isConditional(node: Node): node is Conditional;
    static isCase(node: Node): node is Case;
    static isWhen(node: Node): node is When;
    static isWhile(node: Node): node is While;
    static isEach(node: Node): node is Each;
    static isMixin(node: Node): node is Mixin;
    static isMixinBlock(node: Node): node is MixinBlock;
    static isYieldBlock(node: Node): node is YieldBlock;
    static isFileReference(node: Node): node is FileReference;
    static isInclude(node: Node): node is Include;
    static isIncludeFilter(node: Node): node is IncludeFilter;
    static isExtends(node: Node): node is Extends;
    static isNamedBlock(node: Node): node is NamedBlock;
    static isFilter(node: Node): node is Filter;
    static traverse(node: Node | null, action: (node: Node) => void): void;
}
