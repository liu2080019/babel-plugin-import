'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _path = require('path');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Plugin = function () {
  function Plugin(libraryName, libraryDirectory, resources, style, types) {
    _classCallCheck(this, Plugin);

    this.specified = null;
    this.libraryObjs = null;
    this.selectedMethods = null;
    this.libraryName = libraryName;
    this.libraryDirectory = typeof libraryDirectory === 'undefined' ? 'lib' : libraryDirectory;
    this.resources = resources;
    this.style = style || false;
    this.types = types;
  }

  _createClass(Plugin, [{
    key: 'importMethod',
    value: function importMethod(methodName, file, opts) {
      if (!this.selectedMethods[methodName]) {
        var libraryDirectory = this.libraryDirectory;
        var style = this.style;
        var transformedMethodName = this.resources[methodName];
        var path = winPath((0, _path.join)(this.libraryName, libraryDirectory, transformedMethodName));
        this.selectedMethods[methodName] = file.addImport(path, 'default');
        if (style === true) {
          file.addImport(path + '/style', 'style');
        } else if (style === 'css') {
          file.addImport(path + '/style/css', 'style');
        }
      }
      return this.selectedMethods[methodName];
    }
  }, {
    key: 'buildExpressionHandler',
    value: function buildExpressionHandler(node, props, path, opts) {
      var _this = this;

      var file = path.hub.file;

      var types = this.types;
      props.forEach(function (prop) {
        if (!types.isIdentifier(node[prop])) return;
        if (_this.specified[node[prop].name]) {
          node[prop] = _this.importMethod(node[prop].name, file, opts);
        }
      });
    }
  }, {
    key: 'buildDeclaratorHandler',
    value: function buildDeclaratorHandler(node, prop, path, opts) {
      var file = path.hub.file;

      var types = this.types;
      if (!types.isIdentifier(node[prop])) return;
      if (this.specified[node[prop].name]) {
        node[prop] = this.importMethod(node[prop].name, file, opts);
      }
    }
  }, {
    key: 'Program',
    value: function Program() {
      this.specified = Object.create(null);
      this.libraryObjs = Object.create(null);
      this.selectedMethods = Object.create(null);
    }
  }, {
    key: 'ImportDeclaration',
    value: function ImportDeclaration(path, _ref) {
      var _this2 = this;

      var opts = _ref.opts;
      var node = path.node;

      // path maybe removed by prev instances.

      if (!node) return;

      var value = node.source.value;

      var libraryName = this.libraryName;
      var types = this.types;
      if (value === libraryName) {
        node.specifiers.forEach(function (spec) {
          if (types.isImportSpecifier(spec)) {
            _this2.specified[spec.local.name] = spec.imported.name;
          } else {
            _this2.libraryObjs[spec.local.name] = true;
          }
        });
        path.remove();
      }
    }
  }, {
    key: 'CallExpression',
    value: function CallExpression(path, _ref2) {
      var _this3 = this;

      var opts = _ref2.opts;
      var node = path.node;
      var file = path.hub.file;
      var _node$callee = node.callee,
          name = _node$callee.name,
          object = _node$callee.object,
          property = _node$callee.property;

      var types = this.types;

      if (types.isIdentifier(node.callee)) {
        if (this.specified[name]) {
          node.callee = this.importMethod(this.specified[name], file, opts);
        }
      }

      node.arguments = node.arguments.map(function (arg) {
        var argName = arg.name;

        if (_this3.specified[argName] && path.scope.hasBinding(argName) && path.scope.getBinding(argName).path.type === 'ImportSpecifier') {
          return _this3.importMethod(_this3.specified[argName], file, opts);
        }
        return arg;
      });
    }
  }, {
    key: 'MemberExpression',
    value: function MemberExpression(path, _ref3) {
      var opts = _ref3.opts;
      var node = path.node;
      var file = path.hub.file;

      // multiple instance check.

      if (!node.object || !node.object.name) return;

      if (this.libraryObjs[node.object.name]) {
        // antd.Button -> _Button
        path.replaceWith(this.importMethod(node.property.name, file, opts));
      } else if (this.specified[node.object.name]) {
        node.object = this.importMethod(this.specified[node.object.name], file, opts);
      }
    }
  }, {
    key: 'Property',
    value: function Property(path, _ref4) {
      var opts = _ref4.opts;
      var node = path.node;

      this.buildDeclaratorHandler(node, 'value', path, opts);
    }
  }, {
    key: 'VariableDeclarator',
    value: function VariableDeclarator(path, _ref5) {
      var opts = _ref5.opts;
      var node = path.node;

      this.buildDeclaratorHandler(node, 'init', path, opts);
    }
  }, {
    key: 'LogicalExpression',
    value: function LogicalExpression(path, _ref6) {
      var opts = _ref6.opts;
      var node = path.node;

      this.buildExpressionHandler(node, ['left', 'right'], path, opts);
    }
  }, {
    key: 'ConditionalExpression',
    value: function ConditionalExpression(path, _ref7) {
      var opts = _ref7.opts;
      var node = path.node;

      this.buildExpressionHandler(node, ['test', 'consequent', 'alternate'], path, opts);
    }
  }, {
    key: 'IfStatement',
    value: function IfStatement(path, _ref8) {
      var opts = _ref8.opts;
      var node = path.node;

      this.buildExpressionHandler(node, ['test'], path, opts);
      this.buildExpressionHandler(node.test, ['left', 'right'], path, opts);
    }
  }, {
    key: 'ExpressionStatement',
    value: function ExpressionStatement(path, _ref9) {
      var opts = _ref9.opts;
      var node = path.node;
      var types = this.types;

      if (types.isAssignmentExpression(node.expression)) {
        this.buildExpressionHandler(node.expression, ['right'], path, opts);
      }
    }
  }, {
    key: 'ExportDefaultDeclaration',
    value: function ExportDefaultDeclaration(path, _ref10) {
      var opts = _ref10.opts;
      var node = path.node;

      this.buildExpressionHandler(node, ['declaration'], path, opts);
    }
  }]);

  return Plugin;
}();

exports.default = Plugin;


function winPath(path) {
  return path.replace(/\\/g, '/');
}
module.exports = exports['default'];