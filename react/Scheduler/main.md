要点：

1. 最小堆的原理
2. 最小堆通过sortIndex排序
3. 调度器执行顺序：requestHostCallback => MessageChannel onmessage(performWorkUntilDeadline) => flushWork => workLoop
4. unstable_scheduleCallback是供外部调用 往队列中push任务的函数，根据任务开始时间判断是push到任务队列中还是计时器队列中