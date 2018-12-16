export = index;
declare function index(tokens: any, options: index.Options): index.Node;
declare namespace index {
  interface Options {
    filename?: string,
    plugins?: string[],
    src?: string
  }
  interface Node {
    type: string;
    line?: number;            // line number of the start position of the node
    column?: number;   // column number at the starting position of the node
    filename?: string; // the name of the file the node originally belongs to
  }
  interface Block extends Node {
    nodes: Node[];
  }
  interface AttributedNode extends Node {
    attrs: Attribute[];                      // all the individual attributes of the node
    attributeBlocks: JavaScriptExpression []; // all the &attributes expressions effective on this node
  }

  interface BlockNode extends Node {
    block: Block | null;
  }

  interface ExpressionNode extends Node {
    expr: JavaScriptExpression;
  }

  interface PlaceholderNode extends Node { }

  interface ValueNode extends Node {
    val: string;
  }

  interface Attribute {
    /** the name of the attribute */
    name: string;
    /** JavaScript expression returning the value of the attribute */
    val: JavaScriptExpression;
    /** if the value must be HTML-escaped before being buffered */
    mustEscape: boolean;
  }

  type JavaScriptExpression = string;
  type JavaScriptIdentifier = string;

  interface Doctype extends ValueNode { }

  interface CommonComment extends ValueNode {
    /** whether the comment should appear when rendered */
    buffer: boolean;
  }

  interface Comment extends CommonComment { }

  interface BlockComment extends BlockNode, CommonComment { }

  interface Text extends ValueNode { }

  interface CommonTag extends AttributedNode, BlockNode {
    /** if the tag is explicitly stated as self-closing */
    selfClosing?: boolean;
    /** if the tag is defined as an inline tag as opposed to a block-level tag */
    isInline?: boolean;
  }

  interface Tag extends CommonTag {
    /** the name of the tag */
    name: string;
  }

  interface InterpolatedTag extends CommonTag, ExpressionNode { }

  interface Code extends BlockNode, ValueNode {
    /** if the value of the piece of code is buffered in the template */
    buffer: boolean;
    /** if the value must be HTML-escaped before being buffered */
    mustEscape: boolean;
    /** whether the node is the result of a string interpolation */
    isInline: boolean;
  }

  interface Conditional extends Node {
    test: JavaScriptExpression;
    consequent: Block;
    alternate: Conditional | Block | null;
  }

  interface Case extends BlockNode, ExpressionNode {
    block: WhenBlock;
  }

  interface WhenBlock extends Block {
    nodes: When[];
  }

  interface When extends BlockNode, ExpressionNode {
    expr: JavaScriptExpression | "default";
  }

  interface While extends BlockNode {
    test: JavaScriptExpression;
  }

  interface Each extends BlockNode {
    /** the object or array that is being looped */
    obj: JavaScriptExpression;
    /** the variable name of the value of a specific object property or array member */
    val: JavaScriptIdentifier;
    /** the variable name, if any, of the object property name or array index of `val` */
    key: JavaScriptIdentifier | null;
    /** the else expression */
    alternate: Block | null;
  }

  interface Mixin extends AttributedNode, BlockNode {
    name: JavaScriptIdentifier;       // the name of the mixin
    call: boolean;                    // if this node is a mixin call (as opposed to mixin definition)
    args: string;                     // list of arguments (declared in case of mixin definition, or specified in case of mixin call)
  }

  interface MixinBlock extends PlaceholderNode { }

  interface YieldBlock extends PlaceholderNode { }

  interface FileReference extends Node {
    path: string;
  }

  interface FileNode extends Node {
    file: FileReference;
  }

  interface Include extends BlockNode, FileNode { }

  interface IncludeFilter extends FilterNode { }

  interface Extends extends FileNode { }

  interface NamedBlock extends PlaceholderNode {
    name: string;
    mode: "replace" | "append" | "prepend";
    nodes: Node[]; // no elements if the NamedBlock is a placeholder
  }

  interface FilterNode extends Node {
    name: string;
    attrs: Attribute[]; // filter options
  }

  interface Filter extends FilterNode, BlockNode { }
}