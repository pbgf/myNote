createDocumentFragment 类似于react 的 <></> 即把documentFragment 插入到dom中时，只会渲染子元素，根元素 documentFragment 并不会渲染。比如需要往ul下插入1w个li的时候 比较合适，能减少dom操作的同时，也不会在ul和li之间引入多余的根元素。
为什么说createDocumentFragment 不会引发回流？
这个说法有点容易让人误解，mdn中的原话是
 `因为文档片段存在于内存中，并不在 DOM 树中，所以将子元素插入到文档片段时不会引起页面回流`
注意他说的是将子元素插入到“文档片段”，不是插入到文档流中，而“文档片段”就是 createDocumentFragment 方法创建出来的。
总的来说，在最后插入到文档流的时候会触发一次回流，但相比直接操作已经在文档流中的元素，往其子元素中添加元素，从n次dom渲染 减少到了1次。