* fiber是协程的一种实现，fiber最早出现是1996年在windows中出现，作为轻量级线程由程序员控制。react中的fiber也是协程的一种实现。
* 为什么react实现协程没有用generator？
  1. Generator的传染性：Generator允许代码在执行过程中暂停和恢复，这可能会影响React的响应性和性能。
  2. 优先级调度问题：Generator本身并不支持优先级调度，这可能无法满足React团队对任务调度的需求。
  3. 调度让出机制：React Fiber实现了自己的调度让出机制，这个机制是基于“Fiber”这个执行单元的。React通过让出控制权并检查现在剩余时间的方式来调度任务，这个机制比Generator的语法层面让出机制更加灵活和高效。
