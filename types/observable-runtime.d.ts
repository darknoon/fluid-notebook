declare module "@observablehq/runtime" {
  class Runtime {
    /** Returns a new runtime. If builtins is specified, each property on the builtins object defines a builtin variable for the runtime. These builtins are available as named inputs to any defined variables on any module associated with this runtime. If builtins is not specified, it defaults to the standard library. If a global function is specified, it will be invoked with the name of any unresolved reference, and must return the corresponding value or undefined (to trigger a ReferenceError); if global is not specified, unresolved values will be resolved from the global window. */

    constructor();
    constructor(
      builtins: { [key: string]: any },
      // Global object for runtime
      global?: { [key: string]: any }
    );

    module(): Module;
    module(define: any, observer: Inspector): Module;
  }
  interface VariableInspector {
    pending(): void;
    fulfilled(value: any): void;
    rejected(error: Error): void;
  }

  type Inspector = (name: string) => VariableInspector;

  class Module {
    variable(inspector: VariableInspector): Variable;

    redefine(name: string, value: Value): this;
    redefine(name: string, deps: string[], value: any): this;
  }

  type BaseValue = number | string;
  type Value = (() => BaseValue) | BaseValue;

  class Variable {
    // Value can either be a function or constant value
    define(value: Value): this;
    define(name: string, value: Value): this;
    define(deps: string[], value: Value): this;
    define(name: string, deps: string[], value: any): this;
  }
}
