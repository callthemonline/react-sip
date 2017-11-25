Upgrading `react-sip`
===

0.4 → 0.5
---

There are several breaking changes in `<SipProvider/>` due to its refactoring.
The component now supports prop updates, such as new host, port, user and password already after the component has been initialised.
It is now not necessary to know the connection details in advance and so they can be defined lazily.
A change in connection details creates a new instance of `JsSIP` and the old object (if any) is stopped.

Things to take into account while refactoring:

*   The shape of context has changed, so your child components that consume `<SipProvider/>`’s info or trigger callbacks require revision.
*   `<SipProvider/>`’s props are now passed down the tree as context to make UI easier to implement. If you're passing them to child components yourself, you can now remove this custom code in favour of what `<SipProvider/>` puts into context.
*   When you specify `contextTypes` in your child components, you can now `import { sipType, callType } from 'react-sip'` to make your code shorter (see [lib/types.js](https://github.com/callthemonline/react-sip/blob/master/src/lib/types.js)).
*   `<SipProvider/>`’s `port` prop type has changed from `string` to `number`.
*   previously undocumented experimental `uri` prop was removed
