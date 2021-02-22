import {argsert} from './argsert.js';
import {isPromise} from './utils/is-promise.js';
import {YargsInstance, Arguments} from './yargs-factory.js';

export class GlobalMiddleware {
  globalMiddleware: Middleware[] = [];
  yargs: YargsInstance;
  frozens: Array<Middleware[]> = [];
  constructor(yargs: YargsInstance) {
    this.yargs = yargs;
  }
  addMiddleware(
    callback: MiddlewareCallback | MiddlewareCallback[],
    applyBeforeValidation: boolean,
    global = true
  ): YargsInstance {
    argsert(
      '<array|function> [boolean] [boolean]',
      [callback, applyBeforeValidation, global],
      arguments.length
    );
    if (Array.isArray(callback)) {
      for (let i = 0; i < callback.length; i++) {
        if (typeof callback[i] !== 'function') {
          throw Error('middleware must be a function');
        }
        const m = callback[i] as Middleware;
        m.applyBeforeValidation = applyBeforeValidation;
        m.global = global;
      }
      Array.prototype.push.apply(
        this.globalMiddleware,
        callback as Middleware[]
      );
    } else if (typeof callback === 'function') {
      const m = callback as Middleware;
      m.applyBeforeValidation = applyBeforeValidation;
      m.global = global;
      this.globalMiddleware.push(callback as Middleware);
    }
    return this.yargs;
  }
  // For "coerce" middleware, only one middleware instance can be registered
  // per option:
  addCoerceMiddleware(
    callback: MiddlewareCallback | MiddlewareCallback[],
    option: string
  ): YargsInstance {
    const aliases = this.yargs.getAliases();
    this.globalMiddleware = this.globalMiddleware.filter(m => {
      return true;
    });
    return this.addMiddleware(callback, true, true);
  }
  getMiddleware() {
    return this.globalMiddleware;
  }
  freeze() {
    this.frozens.push([...this.globalMiddleware]);
  }
  unfreeze() {
    const frozen = this.frozens.pop();
    if (frozen !== undefined) this.globalMiddleware = frozen;
  }
  reset() {
    this.globalMiddleware = this.globalMiddleware.filter(m => m.global);
  }
}

export function commandMiddlewareFactory(
  commandMiddleware?: MiddlewareCallback[]
): Middleware[] {
  if (!commandMiddleware) return [];
  return commandMiddleware.map(middleware => {
    (middleware as Middleware).applyBeforeValidation = false;
    return middleware;
  }) as Middleware[];
}

export function applyMiddleware(
  argv: Arguments | Promise<Arguments>,
  yargs: YargsInstance,
  middlewares: Middleware[],
  beforeValidation: boolean
) {
  return middlewares.reduce<Arguments | Promise<Arguments>>(
    (acc, middleware) => {
      if (middleware.applyBeforeValidation !== beforeValidation) {
        return acc;
      }

      if (isPromise(acc)) {
        return acc
          .then(initialObj =>
            Promise.all<Arguments, Partial<Arguments>>([
              initialObj,
              middleware(initialObj, yargs),
            ])
          )
          .then(([initialObj, middlewareObj]) =>
            Object.assign(initialObj, middlewareObj)
          );
      } else {
        const result = middleware(acc, yargs);
        return isPromise(result)
          ? result.then(middlewareObj => Object.assign(acc, middlewareObj))
          : Object.assign(acc, result);
      }
    },
    argv
  );
}

export interface MiddlewareCallback {
  (argv: Arguments, yargs: YargsInstance):
    | Partial<Arguments>
    | Promise<Partial<Arguments>>;
}

export interface Middleware extends MiddlewareCallback {
  applyBeforeValidation: boolean;
  global: boolean;
  option?: string;
}
