React SIP
=========

React wrapper for [jssip](https://github.com/versatica/JsSIP).

> The module is work-in-progress! Contributions welcome!

Installation
-----

```bash
npm install react-sip
```


Usage
-----

```js
// src/index.js
import { SipProvider } from './components/SipProvider';
import App from './components/App';

// define sipHost, sipPort, sipUser, sipPassword, sipDebug, iceServerUrls

ReactDOM.render(
  <SipProvider
    host={sipHost}
    port={sipPort}
    user={sipUser}
    password={sipPassword}
    debug={sipDebug} // true / false
    iceServers={[ // optional
      {
        urls: iceServerUrls,
      },
    ]}
  >
    <App />
  </SipProvider>
  document.getElementById('root'),
);
```

Child components get access to this context:

```yaml
sipId: PropTypes.string
sipStatus: PropTypes.string
sipSessionExists: PropTypes.bool
sipSessionIsActive: PropTypes.bool
sipErrorLog: PropTypes.array
```
