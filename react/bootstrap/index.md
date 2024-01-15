这里记录 react的启动
react应用的入口通常是 ReactDOM.render（在 React 17 及以前）或 createRoot（在 React 18）。
legacy 模式: ReactDOM.render(<App />, rootNode). 这是当前 React app 使用的方式. 这个模式可能不支持这些新功能(concurrent 支持的所有功能).

1、legacy 模式: ReactDOM.render(<App />, rootNode). 这是react<18版本使用的启动方式.
```
// LegacyRoot
ReactDOM.render(<App />, document.getElementById('root'), (dom) => {}); // 支持callback回调, 参数是一个dom对象
```
2、Concurrent 模式: react18支持的模式，发挥了fiber架构的优势，支持可中断渲染。
// ConcurrentRoot
```
// 1. 创建ReactDOMRoot对象
const reactDOMRoot = ReactDOM.createRoot(document.getElementById('root'));
// 2. 调用render
reactDOMRoot.render(<App />); // 不支持回调
```
关于react的启动流程，下面偷个懒，因为已经有大佬梳理的比较清楚了，直接贴大佬的图(来源于https://github.com/7kms/react-illustration-series/blob/main/docs/main/bootstrap.md)：
![Alt text](image.png)
有关 是哪里 决定了整个fiber树的构建模式，看以下代码(createHostRootFiber)：
```
export function createHostRootFiber(tag: RootTag): Fiber {
  let mode;
  if (tag === ConcurrentRoot) {
    mode = ConcurrentMode | BlockingMode | StrictMode;
  } else if (tag === BlockingRoot) {
    mode = BlockingMode | StrictMode;
  } else {
    mode = NoMode;
  }
  return createFiber(HostRoot, null, null, mode); // 注意这里设置的mode属性是由RootTag决定的
}
```

所以fiber的mode由createHostRootFiber决定了，而tag是与 3 种RootTag(ConcurrentRoot,BlockingRoot,LegacyRoot)关联起来的
所以用ReactDOM.render那么就是同步构建，用createRoot就是并发的构建即可中断。

我们继续看legacy模式的渲染函数代码
```
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>,
  children: ReactNodeList,
  container: Container,
  forceHydrate: boolean,
  callback: ?Function,
) {
  let root: RootType = (container._reactRootContainer: any);
  let fiberRoot;
  if (!root) {
    // 初次调用, root还未初始化, 会进入此分支
    //1. 创建ReactDOMRoot对象, 初始化react应用环境
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
    fiberRoot = root._internalRoot;
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function () {
        // instance最终指向 children(入参: 如<App/>)生成的dom节点
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // 2. 更新容器
    unbatchedUpdates(() => {
      updateContainer(children, fiberRoot, parentComponent, callback);
    });
  } else {
    // root已经初始化, 二次调用render会进入
    // 1. 获取FiberRoot对象
    fiberRoot = root._internalRoot;
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function () {
        const instance = getPublicRootInstance(fiberRoot);
        originalCallback.call(instance);
      };
    }
    // 2. 调用更新
    updateContainer(children, fiberRoot, parentComponent, callback);
  }
  return getPublicRootInstance(fiberRoot);
}
```
我们可以看到其中调用了一个updateContainer函数。updateContainer函数位于react-reconciler包中, 它串联了react-dom与react-reconciler.
```
export function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): Lane {
  const current = container.current;
  // 1. 获取当前时间戳, 计算本次更新的优先级
  const eventTime = requestEventTime();
  const lane = requestUpdateLane(current);

  // 2. 设置fiber.updateQueue
  const update = createUpdate(eventTime, lane);
  update.payload = { element };
  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    update.callback = callback;
  }
  //把更新加入到队列中 ，更新队列是链表实现
  enqueueUpdate(current, update);

  // 3. 进入reconciler运作流程中的`输入`环节
  scheduleUpdateOnFiber(current, lane, eventTime);
  return lane;
}
```
后续可以到Reconciler中继续深入了解