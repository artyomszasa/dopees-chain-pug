"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// see: https://github.com/pugjs/pug-ast-spec/blob/master/parser.md
var NodeType;
(function (NodeType) {
    NodeType["Block"] = "Block";
    NodeType["Doctype"] = "Doctype";
    NodeType["Comment"] = "Comment";
    NodeType["BlockComment"] = "BlockComment";
    NodeType["Text"] = "Text";
    NodeType["Tag"] = "Tag";
    NodeType["InterpolatedTag"] = "InterpolatedTag";
    NodeType["Code"] = "Code";
    NodeType["Conditional"] = "Conditional";
    NodeType["Case"] = "Case";
    NodeType["When"] = "When";
    NodeType["While"] = "While";
    NodeType["Each"] = "Each";
    NodeType["Mixin"] = "Mixin";
    NodeType["MixinBlock"] = "MixinBlock";
    NodeType["YieldBlock"] = "YieldBlock";
    NodeType["FileReference"] = "FileReference";
    NodeType["Include"] = "Include";
    NodeType["IncludeFilter"] = "IncludeFilter";
    NodeType["Extends"] = "Extends";
    NodeType["NamedBlock"] = "NamedBlock";
    NodeType["Filter"] = "Filter";
})(NodeType = exports.NodeType || (exports.NodeType = {}));
class AstHelpers {
    static isBlock(node) { return node.type === NodeType.Block; }
    static isDoctype(node) { return node.type === NodeType.Doctype; }
    static isComment(node) { return node.type === NodeType.Comment; }
    static isBlockComment(node) { return node.type === NodeType.BlockComment; }
    static isText(node) { return node.type === NodeType.Text; }
    static isTag(node) { return node.type === NodeType.Tag; }
    static isInterpolatedTag(node) { return node.type === NodeType.InterpolatedTag; }
    static isCode(node) { return node.type === NodeType.Code; }
    static isConditional(node) { return node.type === NodeType.Conditional; }
    static isCase(node) { return node.type === NodeType.Case; }
    static isWhen(node) { return node.type === NodeType.When; }
    static isWhile(node) { return node.type === NodeType.While; }
    static isEach(node) { return node.type === NodeType.Each; }
    static isMixin(node) { return node.type === NodeType.Mixin; }
    static isMixinBlock(node) { return node.type === NodeType.MixinBlock; }
    static isYieldBlock(node) { return node.type === NodeType.YieldBlock; }
    static isFileReference(node) { return node.type === NodeType.FileReference; }
    static isInclude(node) { return node.type === NodeType.Include; }
    static isIncludeFilter(node) { return node.type === NodeType.IncludeFilter; }
    static isExtends(node) { return node.type === NodeType.Extends; }
    static isNamedBlock(node) { return node.type === NodeType.NamedBlock; }
    static isFilter(node) { return node.type === NodeType.Filter; }
    static traverse(node, action) {
        if (!node) {
            return;
        }
        action(node);
        if (AstHelpers.isBlock(node) || AstHelpers.isNamedBlock(node)) {
            node.nodes.forEach(n => AstHelpers.traverse(n, action));
        }
        else if (AstHelpers.isBlockComment(node) || AstHelpers.isTag(node) || AstHelpers.isInterpolatedTag(node) || AstHelpers.isCase(node) || AstHelpers.isWhile(node) || AstHelpers.isWhile(node)) {
            AstHelpers.traverse(node.block, action);
        }
        if (AstHelpers.isConditional(node)) {
            AstHelpers.traverse(node.alternate, action);
        }
    }
}
exports.default = AstHelpers;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN0LWhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvYXN0LWhlbHBlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFHQSxtRUFBbUU7QUFDbkUsSUFBWSxRQXVCWDtBQXZCRCxXQUFZLFFBQVE7SUFDbEIsMkJBQWUsQ0FBQTtJQUNmLCtCQUFtQixDQUFBO0lBQ25CLCtCQUFtQixDQUFBO0lBQ25CLHlDQUE2QixDQUFBO0lBQzdCLHlCQUFhLENBQUE7SUFDYix1QkFBVyxDQUFBO0lBQ1gsK0NBQW1DLENBQUE7SUFDbkMseUJBQWEsQ0FBQTtJQUNiLHVDQUEyQixDQUFBO0lBQzNCLHlCQUFhLENBQUE7SUFDYix5QkFBYSxDQUFBO0lBQ2IsMkJBQWUsQ0FBQTtJQUNmLHlCQUFhLENBQUE7SUFDYiwyQkFBZSxDQUFBO0lBQ2YscUNBQXlCLENBQUE7SUFDekIscUNBQXlCLENBQUE7SUFDekIsMkNBQStCLENBQUE7SUFDL0IsK0JBQW1CLENBQUE7SUFDbkIsMkNBQStCLENBQUE7SUFDL0IsK0JBQW1CLENBQUE7SUFDbkIscUNBQXlCLENBQUE7SUFDekIsNkJBQWlCLENBQUE7QUFDbkIsQ0FBQyxFQXZCVyxRQUFRLEdBQVIsZ0JBQVEsS0FBUixnQkFBUSxRQXVCbkI7QUFFRCxNQUFxQixVQUFVO0lBQzdCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBVSxJQUFtQixPQUFPLElBQUksQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDbEYsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFVLElBQXFCLE9BQU8sSUFBSSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUN4RixNQUFNLENBQUMsU0FBUyxDQUFDLElBQVUsSUFBcUIsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBQ3hGLE1BQU0sQ0FBQyxjQUFj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