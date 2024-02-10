### 前言
首先，我们先来定义这个同步异步，一般我们说的同步异步是感知上的，如下面的例子
```javascript
  constructor(props) {
    super(props);
    this.state = {
      data: 'data'
    }
  }

  componentDidMount() {
    this.setState({
      data: 'did mount state'
    })

    console.log("did mount state ", this.state.data);
    // did mount state data

    setTimeout(() => {
      this.setState({
        data: 'setTimeout'
      })

      console.log("setTimeout ", this.state.data);
    })
  }
```
这里的例子，第一处打印结果是 `data` , 而第二处打印则是 `setTimeout`，从直接上看来第一处是异步的，而第二处是同步的，这也是大多是面试想要考察的问题，因为在实际编码中也会问到，原因也比较简单。
### 同步
在react源码中(react18的源码暂不涉及)，有这样一段代码
```javascript
function scheduleUpdateOnFiber(fiber, expirationTime) {
    // 省略不重要的源码
    // .....
    if (executionContext === NoContext) {
        // Flush the synchronous work now, unless we're already working or inside
        // a batch. This is intentionally inside scheduleUpdateOnFiber instead of
        // scheduleCallbackForFiber to preserve the ability to schedule a callback
        // without immediately flushing it. We only do this for user-initiated
        // updates, to preserve historical behavior of legacy mode.
        flushSyncCallbackQueue();
    }
}
```
我们可以看到，如果只执行上下文为空，那么则会通过 flushSyncCallbackQueue 去同步执行更新，所以在class组件中打印出来的就会是最新的了。(在函数组件中，因为闭包的原因，即使是同步的打印出来 依然还是旧的state)
而除了这种executionContext === NoContext的情况以外，还有其他情况吗，当然有。在useEffectLayout中，setState也是同步执行的，因为最后的commit阶段(fiber的begin、complete、commit三阶段)，还会通过调用 flushSyncCallbackQueue([源码](https://github1s.com/facebook/react/blob/v17.0.1/packages/react-reconciler/src/ReactFiberWorkLoop.new.js#L2114-L2115)) 去清空同步回调队列，而setState 添加的更新任务 则刚好在这个队列中。
### 异步
setState为什么是异步的就很好解释。首先，我们假设一次setState是由点击的处理函数开始的，那么一次setState要经历哪些流程呢，这里可以回顾之前的文档，不赘述，总之会经过react的协调 通过scheduler开启一次异步任务([源码](https://github1s.com/facebook/react/blob/v17.0.1/packages/react-reconciler/src/SchedulerWithReactIntegration.new.js#L144-L145))。所以setState在正常情况下，都是异步的。