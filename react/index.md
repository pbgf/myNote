* fiber是协程的一种实现，fiber最早出现是1996年在windows中出现，作为轻量级线程由程序员控制。react中的fiber也是协程的一种实现。
* 为什么react实现协程没有用generator？
  1. Generator的传染性：不能满足代数效应的另一个特点——可以跨层级将中断抛出去
  2. 优先级调度问题：Generator本身并不支持优先级调度，这可能无法满足React团队对任务调度的需求。
  3. 调度让出机制：React Fiber实现了自己的调度让出机制，这个机制是基于“Fiber”这个执行单元的。React通过让出控制权并检查现在剩余时间的方式来调度任务，这个机制比Generator的语法层面让出机制更加灵活和高效。
* 简单解释下代数效应，以及在react中的代数效应
  代数效应其实就是“可以像传递参数一样传递副作用”。而在react里，在类组件时代，虽然也可以用函数式组件，但是函数是没有状态的，为了实现状态，react通过 “暂停” “effect handler” "恢复" 来实现了useState ，让函数有了状态。光有了状态还不行，如果函数本身有副作用需要处理怎么办，所以react提供了“effect handler” 即 —— useEffect
  (代数效应和monad都是解决副作用的方法，他俩在语言层面的实现分别是OCaml5和haskell)

其他：
* react分为两大循环scheduler和reconciler。reconciler会通过scheduler来调度任务，其中的代码都在(packages/react-reconciler/src/SchedulerWithReactIntegration.new.js)中。