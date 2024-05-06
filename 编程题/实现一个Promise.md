要点：
* 内部 resolve 函数 接收两个参数，其一为promise对象，其二为值。resolve函数负责改变传入的promise的状态以及尝试去清空`延迟队列`
    * 如果resolve接收的值类型是promise，需要等待该promise状态为fulfilled，且取出值再更新到内部状态value中
* then 方法内部 接收一个外部传入的处理函数，then方法需要生成一个新的MyPromise
* Handler存储 onfulfilled处理函数 和 下一个promise
* handler函数 接收当前promise和Handler，首先判断当前promise状态
    * 如果当前promise状态为3 (resolve传入的不是值类型而是promise类型)，则通过迭代找到状态不为3的promise为止，把这个promise设置为当前promise
    * 如果当前promise状态为pending，那么把Handler添加到`延迟队列`中
    * 如果当前promise状态为fulfilled，那么首先调用Handler中的onfulfilled处理函数，其`返回值`和`下一个promise`作为resolve函数的两个参数传入调用