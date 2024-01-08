1、调用链：
updateContainer
=> scheduleUpdateOnFiber
<(是否是同步lane)>
==是==> performSyncWorkOnRoot => renderRootSync => workLoopSync
==否==> ensureRootIsScheduled => 三种情况 SyncLanePriority、SyncBatchedLanePriority 和其他优先级
=>SyncLanePriority 是最高的优先级，用于同步更新。这意味着更新将立即执行，不会被中断。这通常用于处理紧急的更新，比如用户输入。
=>SyncBatchedLanePriority 用于处理同步但可以批量处理的更新。这种优先级比 SyncLanePriority 低，允许React将多个更新合并到一个批次中。
=>其他优先级 其他优先级通常用于并发模式（Concurrent Mode）下的更新，这些更新可以被中断和重新安排。这包括从最低优先级的空闲更新到各种级别的中等优先级更新。

2、在react18以前大多数更新都是同步执行的，这意味着他们不会被中断，他们是被scheduler立即执行，且放在一个单独的队列中(syncQueue)中执行，会等执行完毕才结束，所以时间切片等概念在这里无用，它们并不会被时间切片中断。[代码](https://github1s.com/facebook/react/blob/v17.0.2/packages/react-reconciler/src/SchedulerWithReactIntegration.new.js#L177)
