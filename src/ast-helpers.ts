import { Node, Block, Doctype, Comment, BlockComment, Text, Tag, InterpolatedTag, Code, Conditional, Case,
  When, While, Each, Mixin, MixinBlock, YieldBlock, FileReference, Include, IncludeFilter, Extends, NamedBlock, Filter } from "pug-parser";

// see: https://github.com/pugjs/pug-ast-spec/blob/master/parser.md
export enum NodeType {
  Block = 'Block',
  Doctype = 'Doctype',
  Comment = 'Comment',
  BlockComment = 'BlockComment',
  Text = 'Text',
  Tag = 'Tag',
  InterpolatedTag = 'InterpolatedTag',
  Code = 'Code',
  Conditional = 'Conditional',
  Case = 'Case',
  When = 'When',
  While = 'While',
  Each = 'Each',
  Mixin = 'Mixin',
  MixinBlock = 'MixinBlock',
  YieldBlock = 'YieldBlock',
  FileReference = 'FileReference',
  Include = 'Include',
  IncludeFilter = 'IncludeFilter',
  Extends = 'Extends',
  NamedBlock = 'NamedBlock',
  Filter = 'Filter'
}

export default class AstHelpers {
  static isBlock(node: Node): node is Block { return node.type === NodeType.Block; }
  static isDoctype(node: Node): node is Doctype { return node.type === NodeType.Doctype; }
  static isComment(node: Node): node is Comment { return node.type === NodeType.Comment; }
  static isBlockComment(node: Node): node is BlockComment { return node.type === NodeType.BlockComment; }
  static isText(node: Node): node is Text { return node.type === NodeType.Text; }
  static isTag(node: Node): node is Tag { return node.type === NodeType.Tag; }
  static isInterpolatedTag(node: Node): node is InterpolatedTag { return node.type === NodeType.InterpolatedTag; }
  static isCode(node: Node): node is Code { return node.type === NodeType.Code; }
  static isConditional(node: Node): node is Conditional { return node.type === NodeType.Conditional; }
  static isCase(node: Node): node is Case { return node.type === NodeType.Case; }
  static isWhen(node: Node): node is When { return node.type === NodeType.When; }
  static isWhile(node: Node): node is While { return node.type === NodeType.While; }
  static isEach(node: Node): node is Each { return node.type === NodeType.Each; }
  static isMixin(node: Node): node is Mixin { return node.type === NodeType.Mixin; }
  static isMixinBlock(node: Node): node is MixinBlock { return node.type === NodeType.MixinBlock; }
  static isYieldBlock(node: Node): node is YieldBlock { return node.type === NodeType.YieldBlock; }
  static isFileReference(node: Node): node is FileReference { return node.type === NodeType.FileReference; }
  static isInclude(node: Node): node is Include { return node.type === NodeType.Include; }
  static isIncludeFilter(node: Node): node is IncludeFilter { return node.type === NodeType.IncludeFilter; }
  static isExtends(node: Node): node is Extends { return node.type === NodeType.Extends; }
  static isNamedBlock(node: Node): node is NamedBlock { return node.type === NodeType.NamedBlock; }
  static isFilter(node: Node): node is Filter { return node.type === NodeType.Filter; }
  static traverse(node: Node|null, action: (node: Node) => void) {
    if (!node) {
      return;
    }
    action(node);
    if (AstHelpers.isBlock(node) || AstHelpers.isNamedBlock(node)) {
      node.nodes.forEach(n => AstHelpers.traverse(n, action));
    } else if (AstHelpers.isBlockComment(node) || AstHelpers.isTag(node) || AstHelpers.isInterpolatedTag(node) || AstHelpers.isCase(node) || AstHelpers.isWhile(node) || AstHelpers.isWhile(node)) {
      AstHelpers.traverse(node.block, action);
    }
    if (AstHelpers.isConditional(node)) {
      AstHelpers.traverse(node.alternate, action);
    }
  }
}