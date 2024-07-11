webpack实现样式的热更新，需要通过创建style标签还有script标签，但是这种方式会导致head里快速膨胀，并且会导致未样式化内容闪烁，而vite使用了可构造样式表来避免这种问题。

可构造样式表 和表面意思一样 是为了CssStyleSheet可直接构造而设计的，在document和shadow dom下都可以使用。

使用可构造样式表：

1、通过new CSSStyleSheet()构造一个样式表

2、改变可构造样式表

insertRule(rule，index)  往cssRules属性里插入rule
deleteRule(rule，index)  从cssRules属性里删除rule
replace(text) 异步替换cssRules
replaceSync(text)  同步的replace
3、通过adoptedStyleSheets使用可构造样式表
```javascript
// Construct the CSSStyleSheet
const stylesheet = new CSSStyleSheet();

// Add some CSS
stylesheet.replaceSync('body { background: #000 !important; }')
// OR stylesheet.replace, which returns a Promise instead

// Tell the document to adopt your new stylesheet.
// Note that this also works with Shadow Roots.
document.adoptedStyleSheets = [...document.adoptedStyleSheets, stylesheet];
adoptedStyleSheets是一个数组，包含了document和shadow下所有被采用的样式表。
```

引用：

https://stackoverflow.com/questions/8209086/javascript-can-i-dynamically-create-a-cssstylesheet-object-and-insert-it

https://wicg.github.io/construct-stylesheets/

https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_shadow_DOM