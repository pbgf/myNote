```javascript
/**
 * 提供一个异步执行调度方法
 * 该方法需要具备：
 *   1. 当调用执行方法 on，会按照 *调用的先后顺序* 执行回调 onSuccess
 *   2. （可选实现能力）执行方法 on 在调用后，会返回一个 cancel 句柄，执行后，*无论异步方法执行成功或者失败* 都不响应
 *   3. （可选实现能力）超时时间 3秒，超时需要返回 TimeoutError，并且不再响应其他状态
 */
interface IAsyncScheduler {
  on(promise: PromiseLike<any>, onSuccess?: Function, onError?: Function): () => void;
}

// 根据题干描述要求，完成该类的实现，可以任意定义成员
class AsyncScheduler {
    constructor() {
        this.cbs = [];
        this.index = 0;
        this.cancel = [];
    }
    on(promise, onSuccess, onError) {
        const index = this.index++;
        let state = 'pending';
        promise.then(() => {
            state = 'resolved';
            this.cbs[index] = onSuccess;
            for (let i=0;i<this.cbs.length;i++) {
                const cb = this.cbs[i];
                if (cb === undefined) break;
                if (typeof cb === 'function') {
                    if(this.cancel[i]) continue;
                    cb();
                    this.cbs[i] = true;
                }
            }
        });
        setTimeout(() => {
            if (state === 'pending') {
                this.cancel[index] = true;
                throw new Error('TimeoutError');
            }
        }, 3000);
        return () => {
            this.cancel[index] = true;
        };
    }
}

// 以下是 Demo 代码
// 模拟一个耗时的异步
const delay = (wait) => new Promise((resolve) => setTimeout(() => resolve(0), wait));

const scheduler = new AsyncScheduler();

// 模拟1秒的异步
const cancel1 = scheduler.on(
	delay(1000),
  () => console.log(1),
  (err: Error) => console.error(err),
);

// 模拟0.5秒的异步
const cancel2 = scheduler.on(
  delay(500),
  () => console.log(2),
  (err: Error) => console.error(err),
);

// 模拟超时
const cancel3 = scheduler.on(
  delay(4000),
  () => console.log(3),
  (err: Error) => console.error(err),
);

// 期望执行打印结果顺序：1 2 TimeoutError 的异常日志
// 1秒内执行 cancel1() 的执行结果 2 TimeoutError 的异常日志
// 0.5秒内执行 cancel2() 的执行结果 1 TimeoutError 的异常日志
// 3秒内执行 cancel3() 的执行结果 1 2
```