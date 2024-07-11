背景：

在做准星微前端接入的时候，看到了分享的微前端实现window对象隔离的代码，觉得比较有意思，但是感觉可能并不一定是最合适的方案，于是想从网上了解并整理出尽可能多的实现window对象隔离的方案。



设置window的新属性或替换属性时候，设置到代理的新对象上。
get的时候，先判断该属性是否在代理的对象上，若不在，则返回window对象上的该属性值，若在直接返回代理对象上的值。
即通过代理对象来代替window存储对window对象的改动，访问时先访问该代理对象。

实现方式一：
```javascript
// 来自内部微前端文章
function proxyWindow(jsStr) {
    const o = {};
    let proxy = null;
    const handler = {
        set(target, key, value) {
            return Reflect.set(target, key, value);
        },
        has(target, key) {
            return true;
        },
        get(target, key) {
            if (Reflect.has(target, key)) {
                return Reflect.get(target, key);
            }
            if (typeof window[key] === 'function') {
                return window[key].bind(window);
            }
            if (key === 'window') {
                return proxy
            }
            return window[key];
        }
    }
    proxy = new Proxy(o, handler);
    const fun = new Function('window',
        `
            with(window){
                ${jsStr}
            }
        `
    );
    fun(proxy);
    return proxy;
}
 
 
const jsStr = `
    window.test = function() {
        console.log('test');
    }
    window.alert = function(str) {
        console.log('alert:' + str);
    }
    atob = function() {
        return str;
    }
    const str = window.btoa('just a test');
    console.log(str);
    alert('test')
`;
 
const fakeWindow = proxyWindow(jsStr);
fakeWindow.test();
console.log('global test', window.test);
console.log('global btoa', window.btoa)
console.log('global atob', window.atob)
console.log('global alert', window.alert)
```
但是这种实现方式也会有一定的问题，他只对根对象的set做了代理，如果要是更改了子对象比如 history对象的一些属性，那么还是会污染到其他的window对象。

实现方式二：
```javascript
class SandboxWindow {
    constructor(options, context, frameWindow){
    return new Proxy(frameWindow,{
      set(target, name, value){
        if(Object.keys(context).includes(name)){
            context[name] = value;
        }
        target[name] = value;
      },
      get(target,name){
        // 优先使用共享对象
        if(Object.keys(context).includes(name)){
            return context[name];
        }
        if( typeof target[ name ] === 'function' && /^[a-z]/.test( name ) ){
          return target[ name ].bind && target[ name ].bind( target );
        }else{
          return target[ name ];
        }
      }
    })
  }
  //  ...
}
 
const iframe = document.createElement('iframe',{url:'about:blank'});
document.body.appendChild(iframe);
const sandboxGlobal = iframe.contentWindow;
// 需要全局共享的变量
const context = { document:window.document, history: window.histroy }
const newSandBoxWindow = new SandboxWindow({}, context, sandboxGlobal)
// newSandBoxWindow.history 全局对象
// newSandBoxWindow.abc 为 'abc' 沙箱环境全局变量
// window.abc 为 undefined
```
实现方式二通过 iframe 标签获取window对象，再代理这个新window对象，实现了真正意义上的隔离，同时把需要共享的属性比如document取出来，放到上下文对象中，get的时候先判断是否在上下文中，然后再取值。

使用创建iframe标签的方式比较取巧，有没有更好一点的方法呢

前面介绍的是网上找到的解决方案，下面介绍下qiankun实现沙箱的解决方案：

qiankun实现沙箱的方式有三种：legacySandbox、proxySandbox、snapshotSandbox。

legacySandbox:

在单实例的场景，每次只会进来一个子应用，切换出去后，window对象又会回复到最初的状态。所以我们可以在单例运行时，记录所有的改动，在该应用卸载的时候把所有改动还原。在qiankun中，记录了三种改变：

addedPropsMapInSandbox： 存储在子应用运行时期间新增的全局变量，用于卸载子应用时还原主应用全局变量；
modifiedPropsOriginalValueMapInSandbox：存储在子应用运行期间更新的全局变量，用于卸载子应用时还原主应用全局变量；
currentUpdatedPropsValueMap：持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做 snapshot ;

```javascript
/** 修改全局对象window方法 */
const setWindowProp = (prop,value,isDel)=>{
     if (value === undefined || isDel) {
    delete window[prop];
  } else {
    window[prop] = value;
  }
}

class Sandbox {
    name;
    proxy = null;
    /** 沙箱期间新增的全局变量 */
    addedPropsMap = new Map();

    /** 沙箱期间更新的全局变量 */
    modifiedPropsOriginalValueMap = new Map();
 
    /** 持续记录更新的(新增和修改的)全局变量的 map，用于在任意时刻做沙箱激活 */
    currentUpdatedPropsValueMap = new Map();
  /** 应用沙箱被激活 */
    active() {
      // 根据之前修改的记录重新修改window的属性，即还原沙箱之前的状态
      this.currentUpdatedPropsValueMap.forEach((v, p) => setWindowProp(p, v));
    }
  /** 应用沙箱被卸载 */
    inactive() {
      // 1 将沙箱期间修改的属性还原为原先的属性
      this.modifiedPropsOriginalValueMap.forEach((v, p) => setWindowProp(p, v));
      // 2 将沙箱期间新增的全局变量消除
      this.addedPropsMap.forEach((_, p) => setWindowProp(p, undefined, true));
    }
 
    constructor(name) {
      this.name = name;
      const fakeWindow = Object.create(null);
      const { addedPropsMap, modifiedPropsOriginalValueMap, currentUpdatedPropsValueMap } = this;
      const proxy = new Proxy(fakeWindow, {
        set(_, prop, value) {
            if(!window.hasOwnProperty(prop)){
              // 如果window上没有的属性，记录到新增属性里
              addedPropsMap.set(prop, value);
            }else if(!modifiedPropsOriginalValueMap.has(prop)){
               // 如果当前window对象有该属性，且未更新过，则记录该属性在window上的初始值
              const originalValue = window[prop];
              modifiedPropsOriginalValueMap.set(prop,originalValue);
            }
            // 记录修改属性以及修改后的值
            currentUpdatedPropsValueMap.set(prop, value);
            // 设置值到全局window上
            setWindowProp(prop,value);
            console.log('window.prop',window[prop])
            return true;
        },
        get(target, prop) {
          return window[prop];
        },
      });
      this.proxy = proxy;
    }
  }
 
  // 初始化一个沙箱
  const newSandBox = new Sandbox('app1');
    const proxyWindow = newSandBox.proxy;
    proxyWindow.test = 1;
  console.log(window.test, proxyWindow.test) // 1 1;

 // 关闭沙箱
    newSandBox.inactive();
  console.log(window.test, proxyWindow.test); // undefined undefined;

 // 重启沙箱
    newSandBox.active();
  console.log(window.test, proxyWindow.test) // 1 1 ;
```
proxySandbox：

但是单实例是不够的，我们也会遇到多实例的模式，即同一个页面同时存在多个子应用。qiankun中的proxySandbox就是一种适用多实例的情况的沙箱实现。他通过创建多个window对象的副本fakeWindow来实现多实例。

createFakeWindow 是创建window副本的函数：
```javascript
function createFakeWindow(global: Window) {
  // map always has the fastest performance in has check scenario
  // map在has和check时有着更好的性能
  // see https://jsperf.com/array-indexof-vs-set-has/23
  const propertiesWithGetter = new Map<PropertyKey, boolean>();
  const fakeWindow = {} as FakeWindow;

  // 从window对象拷贝不可配置的属性
  // 举个例子：window、document、location这些都是挂在Window上的属性，他们都是不可配置的
  // 拷贝出来到fakeWindow上，就间接避免了子应用直接操作全局对象上的这些属性方法
  Object.getOwnPropertyNames(global)
    .filter((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(global, p);
      // 如果属性不存在descriptor或者属性描述符的configurable为false的话
      return !descriptor?.configurable;
    })
    .forEach((p) => {
      const descriptor = Object.getOwnPropertyDescriptor(global, p);
      if (descriptor) {
        // 判断当前的属性是否有getter
        const hasGetter = Object.prototype.hasOwnProperty.call(
          descriptor,
          "get"
        );

        // 为有getter的属性设置查询索引
        if (hasGetter) propertiesWithGetter.set(p, true);

        // freeze the descriptor to avoid being modified by zone.js
        // zone.js will overwrite Object.defineProperty
        // 拷贝属性到fakeWindow对象上
        Object.defineProperty(fakeWindow, p, Object.freeze(descriptor));
      }
    });

  return {
    fakeWindow,
    propertiesWithGetter,
  };
}
```
```javascript
export default class ProxySandbox implements SandBox {
  /** window 值变更记录 */
  private updatedValueSet = new Set<PropertyKey>();

  name: string;

  type: SandBoxType;

  proxy: WindowProxy;

  sandboxRunning = true;

  active() {
    if (!this.sandboxRunning) activeSandboxCount++;
    this.sandboxRunning = true;
  }

  inactive() {
    if (process.env.NODE_ENV === 'development') {
      console.info(`[qiankun:sandbox] ${this.name} modified global properties restore...`, [
        ...this.updatedValueSet.keys(),
      ]);
    }

    this.sandboxRunning = false;
  }

  constructor(name: string) {
    const rawWindow = window;
    // window副本和上面说的有getter的属性的索引
    const { fakeWindow, propertiesWithGetter } = createFakeWindow(rawWindow);

    const descriptorTargetMap = new Map<PropertyKey, SymbolTarget>();
    const hasOwnProperty = (key: PropertyKey) =>
      fakeWindow.hasOwnProperty(key) || rawWindow.hasOwnProperty(key);

    const proxy = new Proxy(fakeWindow, {
      set(target: FakeWindow, p: PropertyKey, value: any): boolean {
        if (sandboxRunning) {
          // 在fakeWindow上设置属性值
          target[p] = value;
          // 记录属性值的变更
          updatedValueSet.add(p);

          return true;
        }

        // 在 strict-mode 下，Proxy 的 handler.set 返回 false 会抛出 TypeError，在沙箱卸载的情况下应该忽略错误
        return true;
      },

      get(target: FakeWindow, p: PropertyKey): any {
        // 一些特殊属性处理

        // 避免window.window 或 window.self 或window.top 穿透sandbox
        if (p === "top" || p === "window" || p === "self") {
          return proxy;
        }

        const value = propertiesWithGetter.has(p)
              ? (rawWindow as any)[p]
              : p in target
              ? (target as any)[p]
              : (rawWindow as any)[p];
        return getTargetValue(rawWindow, value);
      },
      // trap in operator
      // see https://github.com/styled-components/styled-components/blob/master/packages/styled-components/src/constants.js#L12
      has(target: FakeWindow, p: string | number | symbol): boolean {
        return p in unscopables || p in target || p in rawWindow;
      },

      getOwnPropertyDescriptor(target: FakeWindow, p: string | number | symbol): PropertyDescriptor | undefined {
        /*
         as the descriptor of top/self/window/mockTop in raw window are configurable but not in proxy target, we need to get it from target to avoid TypeError
         see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy/handler/getOwnPropertyDescriptor
         > A property cannot be reported as non-configurable, if it does not exists as an own property of the target object or if it exists as a configurable own property of the target object.
         */
      },

      defineProperty(target: Window, p: PropertyKey, attributes: PropertyDescriptor): boolean {
        const from = descriptorTargetMap.get(p);
        /*
         Descriptor must be defined to native window while it comes from native window via Object.getOwnPropertyDescriptor(window, p),
         otherwise it would cause a TypeError with illegal invocation.
         */
        switch (from) {
          case 'rawWindow':
            return Reflect.defineProperty(rawWindow, p, attributes);
          default:
            return Reflect.defineProperty(target, p, attributes);
        }
      },

      deleteProperty(target: FakeWindow, p: string | number | symbol): boolean {
        if (target.hasOwnProperty(p)) {
          // @ts-ignore
          delete target[p];
          updatedValueSet.delete(p);

          return true;
        }

        return true;
      },
    });

    this.proxy = proxy;
  }
}
```
这种方式不会污染到window对象，每个实例都会生成一个 fakeWindow 和 propertiesWithGetter，所以可以多实例共存。因为window等有原生getter函数的属性，不能通过defineProperty定义到fakeWindow上，所以需要一个propertiesWithGetter来记录这些属性，后面反问这些属性的时候 还是到原生window对象上去访问。

snapshotSandbox：

但是qiankun考虑到会有某些浏览器还不支持proxy的情况，所以为了预防这种情况，qiankun做了降级处理：在应用激活时生成快照，退出时通过diff恢复到快照的状态。

